# tufted-titmouse

A **content pack** for [content-platform](https://github.com/BennettDISH/content-platform),
shipped as a deployable player. Content packs are named after birds; kingfisher carries the
general web-page set — **tufted-titmouse is the personal sandbox**: activities and
experiments not meant for client sites. Same architecture, same vendored renderer, zero
shared runtime with kingfisher.

**The placement rule:** anything a client site could use goes in **kingfisher** (as an
in-page block — that's where matching, compare slider, and speed sort ended up, in
`src/packs/learning/`). Only personal/experimental stuff lives here. This pack still
carries copies of those three components so existing titmouse-rendered projects keep
working, but their canonical home (and their library entries) is kingfisher.

The same code serves two jobs:

- **Editor live preview** — the CMS embeds this app in an iframe and streams the draft
  over postMessage as you type (`/?embed=1&hostOrigin=<cms origin>`).
- **The published activity** — `/?src=<public content URL>` or `/p/<slug>` fetches a
  published bundle and renders it for real learners (embed it in an LMS via iframe).

The protocol contract lives in the CMS repo: `docs/PLAYER-PROTOCOL.md`.

## Layout

- `src/App.jsx` — the runtime shell (handshake, fetch, error boundary). Rarely changes.
- `src/packs/activities/` — the **activities pack**: one React component per library type.
  **This is where activity development happens.**
- `src/registry.js` — merges packs into the `typeKey → component` map.
- `library/activities-library.json` — the JSON contract this pack implements (type keys,
  fields, theme tokens). Install/update it on a CMS with `npm run install-library`.
- `src/vendor/` — the CMS's pure rendering core (schemas, validation, renderer, protocol),
  **synced, never hand-edited**. Refresh from a local content-platform checkout with
  `npm run sync-vendor`, review the diff, commit.

## Porting the next activity

The originals live in `portfolio/public/embedded-projects/simple/activities/` — each is a
standalone HTML file with an inline `window.activityData` config. To port one:

1. Read the original's config shape; design the schema for it in
   `library/activities-library.json` (fields, template from the original's config,
   `aiGuidance` so generation writes good content).
2. Add a component for its type key in `src/packs/activities/index.jsx` and register it in
   `src/registry.js`. SSR-safe: browser APIs only in effects/handlers.
3. Add it to `scripts/sample-document.mjs`, run `npm run make-sample` + `npm run check`.
4. Push (Railway deploys), then `npm run install-library` to update the CMS contract.

Still to port (check the placement rule first — most of these belong in kingfisher):
branching activity, drag flow chart, jar/word sorting, temp gauge, and the media-based
ones (decision video, audio activity) once they get R2-backed video/audio fields.

## Dev

- `npm run dev` — Vite dev server; `/?src=/sample-content.json` renders the demo bundle.
- `npm run make-sample` — rebuild `public/sample-content.json` after library/sample edits.
- `npm run check` — SSR render check of the sample (or a live URL passed as an arg).
- Point a CMS project's library at `http://localhost:5173` (embed path `/?embed=1`) to
  live-preview against local pack code.

## Deploy

Railway service on this repo; `railway.toml` covers build/start. After the first deploy,
install the library pointing at the service URL:

    CMS_URL=... CMS_SERVICE_TOKEN=... npm run install-library -- --target-url https://<service-url>
