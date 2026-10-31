# Long Road Home protected screening site

Upload this folder's contents to a PRIVATE repository. Film assets are included; a public repository would expose them independently of the website password.

This version requires server hosting. GitHub Pages cannot run its password protection. Do not deploy the public/ folder directly.

The server source is worker/index.js. Set SITE_PASSWORD as a secret in the hosting environment; no password is included in this repository. Use a Cloudflare Workers-compatible host. Create .openai/hosting.json containing {} for the standalone build, run npm run build, and deploy dist/server/index.js as the worker entrypoint without any public static-assets binding. The built worker includes and protects every asset.

No dependencies are needed to build. Node 22+ recommended. The site includes the trailer, not the full film.
