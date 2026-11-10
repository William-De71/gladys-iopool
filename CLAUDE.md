# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** for the iopool EcO pool probe: a
Node.js service (Node 22+, ESM, no build step) that runs in its own sandboxed
Docker container and talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. iopool has no local API: the integration reads
the official iopool public API (`GET https://api.iopool.com/v1/pools`, header
`x-api-key`, documented at
https://help.iopool.com/en/articles/5537423-iopool-public-api), read-only,
every 10 minutes by default: one request returns every pool of the account.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/widgets.test.js          # one file
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check   # store checks
scripts/build-cover.sh                    # cover.jpg from docs/assets/cover.svg
docs/illustrations/render.sh              # docs/assets/widgets.<lang>.png
node .github/scripts/release.mjs next     # the version the next release would get
```

## Architecture

```
index.js                SDK wiring only (new GladysIntegration + createApp)
src/app.js              every handler, registered before connect()
src/iopool-api.js       iopool API client: x-api-key, error kinds
src/read.js             API answers -> plain snapshots (null, never 0, when unknown)
src/watcher.js          the timer loop, snapshots, one round at a time
src/tracker.js          snapshots -> scene trigger transitions (pure logic)
src/events.js           scene trigger payloads and scene action outputs
src/device.js           one device per pool, its states
src/widgets.js          the "pool" dashboard widget
src/config.js           configuration (API key, interval, language)
src/i18n.js             runtime texts, en / fr / de / es
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md   user documentation, re-hosted by the store
docs/illustrations/     generated widget images (render.sh, gen.mjs, render.js)
.github/scripts/release.mjs         version, changelog, bump (tested in test/)
```

## Rules

- **External ids are forever**, and so is every key users store: device and
  feature external ids (built on the iopool pool id, never on a name),
  feature `category` / `type` / `unit` / `min` / `max` / `step`, the pool mode
  option values of the triggers, the keys of `config_schema`, `actions`, the widget and its
  settings, scene triggers (fields, options, variables) and scene actions
  (fields, outputs). `test/structure.test.js` compares them to
  `test/fixtures/discovery.baseline.json`: never update the baseline to make a
  test pass without a documented migration.
- **Recommended filtration** is `duration` / `integer` in minutes (iopool
  sends hours): "6 h 30" stays exact. "Action required" and "pool mode" are
  `text` / `text`. Do not change them without a migration (the Discovery
  "Update" button compares category, type and unit).
- **No colors of our own**: iopool publishes no ideal ranges; the widget only
  repeats what iopool says (action required), it never rates the water.
- **`should_poll` stays false**: iopool is read on the integration's own
  timer (5 to 60 minutes), beyond what Gladys polls. It never resyncs on
  existing devices. The API is read-only: every feature is read-only.
- **The first round is a baseline**: no scene event replays history after a
  restart or an API key change. A scene action never fires a scene trigger.
  `measures_stopped` never fires in passive wintering (`WINTER`).
- **The container rootfs is read-only.** Write only under `/data`. Never log
  the API key.
- **Four languages.** Every user-facing text (manifest, runtime messages in
  `src/i18n.js`, `docs/*.md`, README) exists in English, French, German and
  Spanish. `test/i18n.test.js` checks it.
- **Widget images.** After any change to the content of the widget, run
  `docs/illustrations/render.sh` again and look at the four PNG files.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, the lockfile or the manifest, nor the `docker_image` tag.
  The version stays below 1.0.0 until the maintainer runs the Release workflow
  with `release-as: 1.0.0`.
- **Changelog.** Never edit CHANGELOG.md by hand, it is generated at the
  release. Write the PR title as the line the user will read.
- **Commits and PR titles** follow Conventional Commits, in English: `feat` ->
  minor, `fix` / `perf` -> patch, `!` or `BREAKING CHANGE:` -> major (minor
  below 1.0.0); `docs`, `chore`, `ci`, `test`, `style`, `refactor`, `build`
  release nothing.
- **Manifest.** Texts are objects `{ "en", "fr", "de", "es" }`; the catalog
  `description` holds 10 to 100 characters per language; the file stays under
  100 KB. A field older cores do not know needs a higher `gladys_version`
  minimum (see `src/constants.js` of the integration-store). Transport:
  `["cloud"]`.
- **Forum drafts** (`.github/forum-*.md`) are never committed.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.
