# The 48 Laws of Power

A simple website that explains each of the 48 laws in three steps: a short line, a clear meaning, and a real-life scenario. It has dark and light themes, a handwriting font, and a Listen button.

Built with plain HTML, CSS and JavaScript. All law text is in `data/laws.json`.

Developer: **Monish Bairagi**

## Run on your computer

Do not double-click `index.html`. Browsers block reading the JSON file that way. Start a small server instead:

```
python -m http.server 8000
```

Then open http://localhost:8000

## Deploy to GitHub Pages

1. Create a new repository on GitHub, for example `laws-of-power`.
2. Upload all files in this folder (`index.html`, `css`, `js`, `data`, `.nojekyll`, `README.md`) to the repository root.
3. Open the repository on GitHub: **Settings -> Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/ (root)**, then click **Save**.
6. Wait about one minute. Your site will be at `https://<your-username>.github.io/laws-of-power/`.

Notes:
- All file paths are relative, so the site works under the `/laws-of-power/` sub-path.
- Page links use `#/` (hash links), so refreshing or sharing a law link works without any server setup.
- File names are lowercase. GitHub Pages is case-sensitive, so keep them that way.
- The `.kiro` and `.vscode` folders are not needed on GitHub. You can leave them out.
