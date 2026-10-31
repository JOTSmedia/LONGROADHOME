# Long Road Home — Film Website

An interactive film showcase with a perspective-shifting 3D gallery, film synopsis, and the V2 trailer. Responsive layouts, keyboard-accessible controls, and reduced-motion support are included.

## Upload to GitHub

1. Create an empty GitHub repository.
2. Choose **Add file → Upload files**.
3. Upload the contents of this folder directly to the repository root, keeping the `assets` folder intact. The root should contain `index.html`, `style.css`, and `app.js`.
4. Commit the files.

No installation or build step is needed. This folder is independent of the private Sites deployment and contains no Sites credentials or Git history.

## Publish with GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, select your default branch and **/ (root)**, and save. Availability depends on your GitHub plan and repository visibility. Publishing makes the included film images and trailer available to the site's visitors.

All asset paths are relative, so the site also works beneath a repository URL path.

## Preview locally

Open `index.html` in a browser, or run `python3 -m http.server 8000` from this folder and visit http://localhost:8000.

## Files

- `index.html`: content and trailer player
- `style.css`: layout and visual styles
- `app.js`: 3D gallery controls and image viewer
- `assets/`: film stills and the web-optimized V2 trailer

The trailer is a web-optimized copy of `LONGROADHOME_TRAILER_v2.mp4`, not the full feature film. Original movie files are not included. Fonts load from Google Fonts, with local fallback fonts when offline.

## Rights

No open-source or media license is granted by this package. Confirm the intended repository visibility before uploading film materials.
