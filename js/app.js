(function () {
  'use strict';

  var CONTENT_URL = 'data/laws.json';
  var FETCH_TIMEOUT_MS = 10000;
  var REQUIRED_FIELDS = ['title', 'short', 'defined', 'scenario'];

  var state = { laws: [], credits: null, search: '', loaded: false };
  var main = document.getElementById('main');

  /* ---------- Content loader ---------- */

  // Validate raw parsed JSON into law objects. Skips bad records and logs them.
  function parseContent(data) {
    var rawLaws = data && Array.isArray(data.laws) ? data.laws : null;
    if (!rawLaws) throw new Error('Content has no laws array');
    var seen = {};
    var laws = [];
    rawLaws.forEach(function (rec, index) {
      var id = rec && Number.isInteger(rec.number) ? rec.number : 'position ' + (index + 1);
      var ok = true;
      if (!rec || typeof rec !== 'object') { console.warn('Law ' + id + ': invalid record'); return; }
      if (!Number.isInteger(rec.number) || rec.number < 1 || rec.number > 48) {
        console.warn('Law ' + id + ': invalid field number');
        ok = false;
      }
      REQUIRED_FIELDS.forEach(function (f) {
        if (typeof rec[f] !== 'string' || rec[f].trim() === '') {
          console.warn('Law ' + id + ': missing or empty field ' + f);
          ok = false;
        }
      });
      if (!ok) return;
      if (seen[rec.number]) { console.warn('Duplicate law number ' + rec.number + ' skipped'); return; }
      seen[rec.number] = true;
      laws.push({ number: rec.number, title: rec.title, short: rec.short, defined: rec.defined, scenario: rec.scenario });
    });
    laws.sort(function (a, b) { return a.number - b.number; });
    return { laws: laws, credits: data.credits || null };
  }

  // Serialize one law back to Content_File JSON (round-trips with parseContent).
  function prettyPrintLaw(law) {
    return JSON.stringify({
      number: law.number,
      title: law.title,
      short: law.short,
      defined: law.defined,
      scenario: law.scenario
    }, null, 2);
  }
  window.prettyPrintLaw = prettyPrintLaw;
  window.parseContent = parseContent;

  function loadContent() {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
    return fetch(CONTENT_URL, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        var parsed = parseContent(data);
        state.laws = parsed.laws;
        state.credits = parsed.credits;
        state.loaded = true;
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function show(nodes, focusTarget) {
    stopNarration();
    main.replaceChildren.apply(main, nodes);
    var target = focusTarget || main.querySelector('h1');
    if (target) {
      target.setAttribute('tabindex', '-1');
      setTimeout(function () { target.focus({ preventScroll: false }); }, 0);
    }
    window.scrollTo(0, 0);
  }

  function setActiveNav(name) {
    document.querySelectorAll('nav a').forEach(function (a) {
      if (a.getAttribute('data-nav') === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- Views ---------- */

  function renderLoading() {
    var p = el('p', { text: 'Loading the laws…', role: 'status' });
    main.replaceChildren(el('div', { class: 'status' }, [p]));
  }

  function renderError() {
    setActiveNav('');
    var retry = el('button', { class: 'btn', type: 'button', text: 'Try again' });
    retry.addEventListener('click', start);
    show([el('div', { class: 'status', role: 'alert' }, [
      el('h1', { text: 'Content failed to load' }),
      el('p', { text: 'The laws could not be loaded. Check your connection, and make sure the site is served over http.' }),
      retry
    ])]);
  }

  function matches(law, query) {
    var q = query.trim().toLowerCase();
    if (!q) return true;
    return String(law.number).indexOf(q) !== -1 ||
      law.title.toLowerCase().indexOf(q) !== -1 ||
      law.short.toLowerCase().indexOf(q) !== -1;
  }

  function renderIndex() {
    setActiveNav('index');
    var h1 = el('h1', { text: 'The 48 Laws of Power' });
    var hero = el('section', { class: 'hero' }, [
      h1,
      el('p', { text: 'Pick a law. Read it in a line, then in plain words, then through a real-life scene.' })
    ]);

    var input = el('input', { id: 'search', type: 'search', maxlength: '100', autocomplete: 'off', placeholder: 'e.g. timing, 33, trust' });
    input.value = state.search;
    var search = el('div', { class: 'search', role: 'search' }, [
      el('label', { for: 'search', text: 'Search the laws' }),
      input
    ]);

    var list = el('ul', { class: 'grid' });
    var empty = el('p', { class: 'empty', role: 'status' });

    function draw() {
      list.replaceChildren();
      var count = 0;
      state.laws.forEach(function (law) {
        if (!matches(law, state.search)) return;
        count++;
        var a = el('a', { class: 'card', href: '#/law/' + law.number }, [
          el('span', { class: 'num', text: String(law.number) }),
          el('h2', { text: law.title }),
          el('p', { text: law.short })
        ]);
        list.appendChild(el('li', null, [a]));
      });
      empty.textContent = count === 0 ? 'No laws found.' : '';
    }

    input.addEventListener('input', function () {
      state.search = input.value;
      draw();
    });
    draw();
    show([hero, search, list, empty], h1);
  }

  function layer(cls, heading, text) {
    var p = text ? el('p', { text: text }) : el('p', { class: 'unavailable', text: 'This content is unavailable.' });
    return el('section', { class: 'layer ' + cls }, [el('h2', { text: heading }), p]);
  }

  function pagerLink(label, num, cls) {
    if (!num) return el('span', { class: 'btn ' + cls, 'aria-disabled': 'true', text: label });
    return el('a', { class: 'btn ' + cls, href: '#/law/' + num, text: label });
  }

  function renderLaw(num) {
    var law = state.laws.filter(function (l) { return l.number === num; })[0];
    if (!law) return renderNotFound();
    setActiveNav('');
    var has = function (n) { return state.laws.some(function (l) { return l.number === n; }); };
    var prev = has(num - 1) ? num - 1 : null;
    var next = has(num + 1) ? num + 1 : null;

    var h1 = el('h1', { text: law.title });
    var article = el('article', { class: 'law' }, [
      el('a', { class: 'btn ghost back', href: '#/', text: '← All laws' }),
      el('div', { class: 'law-head' }, [
        el('p', { class: 'law-num', text: 'Law ' + law.number }),
        makeListenButton()
      ]),
      h1,
      layer('short', 'In short', law.short),
      layer('defined', 'Defined', law.defined),
      layer('scenario', 'Real-life scenario', law.scenario),
      el('div', { class: 'pager' }, [
        pagerLink('← Previous law', prev, 'ghost'),
        pagerLink('Next law →', next, '')
      ])
    ]);
    show([article], h1);
  }

  function renderCredits() {
    setActiveNav('credits');
    var c = state.credits || {};
    var h1 = el('h1', { text: c.heading || 'Credits' });
    var dev = el('div', { class: 'dev' }, [
      el('p', { class: 'dev-label', text: c.developerLabel || 'Developer' }),
      el('p', { class: 'dev-name', text: c.developerName || '' })
    ]);
    var section = el('section', { class: 'credits' }, [
      h1,
      dev,
      el('p', { text: c.attribution || '' }),
      el('p', { text: c.disclaimer || '' }),
      el('a', { class: 'btn', href: '#/', text: c.backLabel || 'Back to all laws' })
    ]);
    show([section], h1);
  }

  function renderNotFound() {
    setActiveNav('');
    var h1 = el('h1', { text: 'Page not found' });
    show([el('div', { class: 'status' }, [
      h1,
      el('p', { text: 'That law does not exist. Laws are numbered 1 to 48.' }),
      el('a', { class: 'btn', href: '#/', text: 'Go to all laws' })
    ])], h1);
  }

  /* ---------- Router ---------- */

  function route() {
    if (!state.loaded) return;
    var hash = location.hash.replace(/^#/, '') || '/';
    var m = hash.match(/^\/law\/(.*)$/);
    if (hash === '/' || hash === '') return renderIndex();
    if (hash === '/credits') return renderCredits();
    if (m) {
      var n = /^[1-9]\d*$/.test(m[1]) ? parseInt(m[1], 10) : NaN;
      if (n >= 1 && n <= 48) return renderLaw(n);
    }
    renderNotFound();
  }

  window.addEventListener('hashchange', route);

  /* ---------- Theme ---------- */

  var toggle = document.getElementById('theme-toggle');
  var icon = document.getElementById('theme-icon');

  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function reflectTheme() {
    var t = currentTheme();
    toggle.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    icon.textContent = t === 'dark' ? '☾' : '☀';
    toggle.setAttribute('aria-label', t === 'dark' ? 'Dark theme on. Switch to light theme' : 'Light theme on. Switch to dark theme');
  }

  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
    reflectTheme();
  });
  reflectTheme();

  /* ---------- Narration (text to speech) ---------- */

  var synth = window.speechSynthesis;
  var speechSupported = !!(synth && window.SpeechSynthesisUtterance);
  var narrating = false;
  var indianVoice = null;

  // Pick an Indian English voice if the browser or system has one.
  function pickVoice() {
    if (!speechSupported) return;
    var voices = synth.getVoices();

    // Higher score = smoother and more natural. Natural/online neural voices rank first.
    function score(v) {
      var s = 0;
      if (/^en[-_]IN$/i.test(v.lang)) s += 100;
      else if (/india|neerja|prabhat|heera|ravi|rishi/i.test(v.name)) s += 60;
      else return -1;
      if (/natural/i.test(v.name)) s += 50;
      if (/online/i.test(v.name)) s += 20;
      if (/neerja/i.test(v.name)) s += 10;
      if (/prabhat/i.test(v.name)) s += 8;
      if (/google/i.test(v.name)) s += 15;
      if (v.localService === false) s += 5;
      return s;
    }

    indianVoice = voices
      .map(function (v) { return { v: v, s: score(v) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.v; })[0] || null;
    if (indianVoice) console.info('Narration voice:', indianVoice.name, indianVoice.lang);
  }
  if (speechSupported) {
    pickVoice();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
  }

  // Build a Listen / Stop button. It is placed beside the law number.
  function makeListenButton() {
    if (!speechSupported) return null;
    var btn = el('button', { class: 'btn ghost listen-btn', type: 'button', 'aria-pressed': 'false' }, [
      el('span', { 'aria-hidden': 'true', class: 'listen-icon', text: '🔊' })
    ]);
    btn.setAttribute('aria-label', 'Read this law aloud');
    btn.setAttribute('title', 'Read this law aloud');
    btn.addEventListener('click', function () {
      if (narrating) stopNarration(); else startNarration();
    });
    return btn;
  }

  function reflectListen() {
    document.querySelectorAll('.listen-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', narrating ? 'true' : 'false');
      btn.setAttribute('aria-label', narrating ? 'Stop reading aloud' : 'Read this law aloud');
      btn.setAttribute('title', narrating ? 'Stop reading aloud' : 'Read this law aloud');
      btn.querySelector('.listen-icon').textContent = narrating ? '⏹' : '🔊';
    });
  }

  function stopNarration() {
    if (!synth) return;
    narrating = false;
    synth.cancel();
    reflectListen();
  }

  // Build the text to read from what is on screen (skips buttons, search box and links).
  function narrationParts() {
    var parts = [];
    main.querySelectorAll('h1, h2, p, .num').forEach(function (node) {
      if (node.closest('.search, .btn, .pager, [role="status"]:empty')) return;
      var t = node.textContent.trim();
      if (!t) return;
      if (node.classList.contains('num')) t = 'Law ' + t;
      if (!/[.!?:]$/.test(t)) t += '.';
      parts.push(t);
    });
    return parts;
  }

  function startNarration() {
    // Speak one sentence at a time: smoother pauses, and avoids browsers cutting off long text.
    var parts = [];
    narrationParts().forEach(function (p) {
      (p.match(/[^.!?]+[.!?]+["')]*|[^.!?]+$/g) || [p]).forEach(function (s) {
        s = s.trim();
        if (s) parts.push(s);
      });
    });
    if (!parts.length) return;
    synth.cancel();
    narrating = true;
    reflectListen();
    var i = 0;
    function next() {
      if (!narrating) return;
      if (i >= parts.length) { narrating = false; reflectListen(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]);
      u.lang = 'en-IN';
      if (indianVoice) u.voice = indianVoice;
      u.rate = 0.92;
      u.pitch = 1;
      u.onend = next;
      u.onerror = function () { narrating = false; reflectListen(); };
      synth.speak(u);
    }
    next();
  }

  if (speechSupported) {
    window.addEventListener('beforeunload', function () { synth.cancel(); });
  }

  /* ---------- Start ---------- */

  function start() {
    renderLoading();
    loadContent().then(route).catch(function (err) {
      console.error('Content load failed:', err);
      renderError();
    });
  }

  start();
})();
