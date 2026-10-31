LONG ROAD HOME — GitHub Pages upload

This is the GitHub Pages version. It needs no Node server or build step.

REPLACE the previous repository contents with this folder's contents. Do not merely add these files on top: delete the old unencrypted assets folder, film.js, film.css, entrance.html, server files, and any other previous film files. Keep index.html at the repository root. Include media and fonts folders.

GitHub Pages settings: deploy from your chosen branch, root folder. All paths are relative and work under /LONGROADHOME/.

The original requested password is configured. Incorrect entries display INCORRECT. LOCK SITE clears access for this tab. Access is retained only in tab session storage, with a four-hour limit; browser session restoration can retain it.

The film page, film styling/scripts and every production image/video are AES-256-GCM encrypted. The key is derived with PBKDF2-SHA256 (600,000 iterations). No plaintext access password or decryption key is included in these upload files. Only the title entrance, font and gate code are public. The trailer loads only after WATCH TRAILER.

Static-host limitation: there is no server authorization or server-side rate limiting. A short numeric password can be guessed offline. An authorized viewer can save decrypted material. Old files and Git history from the earlier upload are not removed by this replacement; existing publicly published media cannot be recalled. A private repository is preferable.

Password/content updates require rebuilding the encrypted package from the private WEBSITE source, using scripts/build-github-pages.mjs and the chosen password on stdin. Do not upload the private source, research, full movie or screenplay.
