# LONG ROAD HOME private website

Self-contained repository source for the password-protected film presentation. Use a **private GitHub repository** for this private film material. Put this folder's contents in the repository root, including the dotfiles.

The trailer is approximately 66 MB. Push with GitHub Desktop or Git rather than the browser uploader. No Git LFS setup is required for the included files.

## Included

Website HTML/CSS/JavaScript, referenced images and video, font/license, Node authentication server, security tests, build/password helpers, and Docker/Caddy deployment configuration. No full movie, screenplay, research notes, real secrets, session database, or duplicate build is included.

## Run locally

Requires Node 24 or later; there are no npm dependencies to install.

1. Copy `.env.example` to `.env`.
2. Generate a hash with `node scripts/set-password.mjs`. Enter the desired access password on stdin, then end input with Ctrl-D. Put the resulting salted hash in PASSWORD_HASH in `.env`; never put the actual password in source. Terminal input is visible, so use hidden input or a secret manager if needed.
3. Run:

```sh
npm run build
npm test
npm run preview
```

Visit http://127.0.0.1:4177. If the existing preview is running, stop it first or change both PORT and APP_ORIGIN to a free matching port. `.env`, generated dist, and local state are ignored by Git. Configure the password separately on each deployment; the original working preview remains configured outside this repository.

## Deploy with HTTPS

**This is a server application, not a GitHub Pages site.** GitHub hosts the source; the Node server enforces access to pages and media.

Use a Docker-capable Linux host with a domain pointing to it:

1. Set DOMAIN (hostname only) and PASSWORD_HASH in a private deployment `.env` or secret environment. Keep secrets out of commits.
2. Allow inbound ports 80 and 443. Do not publish Node port 4177.
3. Run `docker compose up -d --build`. The Dockerfile builds from source, so no committed dist folder is needed.
4. Caddy obtains HTTPS certificates and forwards requests to the protected app. Verify login, media rejection before login, trailer seeking, and LOCK SITE on the actual domain before sharing it.

Compose stores sessions and rate limits in a persistent volume. TRUST_PROXY is enabled because Caddy overwrites X-Real-IP and Node has no public port mapping. Do not expose Node directly with TRUST_PROXY enabled or add an upstream proxy without reviewing client-IP trust.

Production cookies are Secure, HttpOnly and SameSite=Strict, with no persistent browser expiry. Sessions expire after four hours server-side. LOCK SITE revokes the token. Five failed attempts per client cause a 15-minute lockout; a global cap also applies. Protected responses use no-store and noindex headers. There is no public media bucket or static-file bypass.

To change the password, generate a fresh hash and replace the hosting secret. Revoke existing sessions separately by clearing the sessions table in access.sqlite, or deliberately replacing the access-data volume (which also clears rate-limit history). Never commit the database.

## Update

Edit copy/credits in src/index.html, styles in src/film.css and src/entrance.css, and interactions in the corresponding JavaScript files. Keep media filenames neutral. Add an approved WebVTT caption track when supplied; none is included.

Run `npm run build` and `npm test` after edits. The six security tests cover authentication, session-only production cookies, protected byte ranges, logout revocation, file allowlisting, and persistent rate limiting. Hosted HTTPS and device playback should be checked after deployment. The Docker configuration is supplied but was not run in this packaging step.
