# LONG ROAD HOME

Upload the contents of this folder directly to the root of a private GitHub repository. `index.html` is at the top level, with all styles, scripts, images, fonts and the official trailer included.

## Files

- `index.html`, `film.css`, `film.js`: the film website.
- `entrance.html`, `entrance.css`, `entrance.js`: the password entrance.
- `assets/`: all required imagery, fonts/licence and videos.
- `server.mjs`: server-enforced password protection, sessions and protected video streaming.
- `package.json`, `scripts/`: build, startup and password setup.
- `Dockerfile`, `compose.yaml`, `Caddyfile`: HTTPS hosting.
- `tests/`: security checks.

No full movie, screenplay, research, real password, session database or duplicate build is included.

## Upload versus hosting

GitHub stores the website files. Run the included Node server to host the protected website; uploading to a static host or GitHub Pages does not enforce its password protection. Keep the repository private because it contains film imagery and the trailer.

The included trailer is a 720p upload-sized copy, retaining the original edit, audio stream, 24fps rate and 16:9 aspect ratio. Each file is below 25 MiB, so the visible website files and folders can be added through GitHub's browser uploader. GitHub Desktop or Git can also upload the entire folder, including the hidden configuration files.

## Local preview

Requires Node 24 or newer, with no npm dependencies to install.

1. Copy `.env.example` to `.env`.
2. Run `node scripts/set-password.mjs`, enter the access password on stdin, then finish input with Ctrl-D. Put the output hash in PASSWORD_HASH inside `.env`. This command does not hide typed input. Never put the actual password in source.
3. Run `npm run build`, then `npm test`, then `npm run preview`.
4. Open http://127.0.0.1:4177. If the original preview is still running, use another port and update both PORT and APP_ORIGIN in `.env`.

The original working preview is unchanged. The upload folder intentionally contains no real credentials; set the password secret on the destination host.

## HTTPS deployment

On a Docker-capable host with a domain pointing to it, set DOMAIN (hostname only) and PASSWORD_HASH in private environment settings or an untracked `.env`, then run:

```sh
docker compose up -d --build
```

The Dockerfile builds the top-level website files automatically. Caddy obtains HTTPS certificates. Permit inbound ports 80 and 443; do not publish the app's port 4177. Sessions and rate limits are persisted in a Docker volume.

TRUST_PROXY is enabled only because Caddy overwrites X-Real-IP and Node is confined to the private Docker network. Do not expose Node directly or introduce another proxy without reviewing that trust configuration.

Production uses Secure, HttpOnly, SameSite=Strict session cookies. Server sessions expire after four hours; LOCK SITE revokes them. Five failed attempts per client cause a 15-minute lockout. Protected responses are no-store and noindex. No media bucket or static-file bypass is provided.

After changing the password hash, revoke existing sessions by clearing the sessions table in the access database or deliberately replacing the access-data volume (also clearing rate-limit history). Never commit `.env` or the database.

## Editing

Edit the top-level HTML, CSS and JavaScript directly. Rebuild and run the tests after changes. Media references use neutral filenames. No approved caption track was supplied; add a reviewed WebVTT track when available. Verify hosted HTTPS, sign-out and phone playback before sharing a deployed link.
