# LONG ROAD HOME

This folder is ready for GitHub Pages. No server, paid service, or build step is needed after upload.

## Replace the old upload

Upload the CONTENTS of this folder to the root of your LONGROADHOME repository:

- index.html
- gate.js
- screening.bin
- fonts/ (whole folder)
- .nojekyll (if your uploader shows hidden files)

Keep the folder structure intact. Do not upload this enclosing folder itself. index.html must be at the repository root, beside this README.

Remove the previous public/, worker/, and scripts/ folders from the published repository. They belong to the earlier server-hosted package. Any previously committed unencrypted media may remain accessible in Git history; a fresh repository is needed if that history must not be public.

In repository Settings → Pages, publish the main branch from / (root). Open https://jotsmedia.github.io/LONGROADHOME/ after the deployment finishes. The homepage will show the password screen instead of this README.

The site and trailer are encrypted and unlocked in the visitor's browser. The password is not stored in these files. The configured five-digit password is susceptible to offline guessing; this is a lightweight screening gate, not strong access control. Refreshing or choosing LOCK SCREENING requires the password again. An authorized viewer can still save the trailer.

The larger encrypted screening file downloads when ENTER SCREENING is pressed. Modern browsers with Web Crypto and HTTPS are required. GitHub Pages supplies HTTPS. No payment, API key, or extra hosting service is required by this package.
