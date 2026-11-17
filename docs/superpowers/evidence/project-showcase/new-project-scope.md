# Scope evidence for the two new projects

Recorded 6 November 2026 while writing the Medication Reminder and Shikaku case studies. The
design spec names each project's repository as the source for its description
(`docs/superpowers/specs/2026-11-05-project-showcase-expansion-design.md`), so the claims below
are traced to the product's own documentation and structure, and to the public live surfaces.

Read boundary: documentation, file structure and public GET requests only. No code from either
repository was run, executed or modified; no account was created on either product; nothing was
written to either service.

## Medication Reminder — `github.com/jared0565/Medication-Reminder`

| Claim in the case study | Where it is supported |
|---|---|
| A progressive web app that installs on a phone or desktop | `web/manifest.webmanifest`, `web/sw.js` |
| Schedules, dose records and settings live in the browser on the device | `web/app.js` reads and writes `medication-reminder-schedule-v1`, `medication-reminder-taken-v1` and `medication-reminder-settings-v1` through the `web/access.js` storage wrapper |
| The app opens and reminds without a connection | `web/sw.js` service worker; the app reads its schedule from local storage and never requires the API to render |
| An account is optional and unlocks pairing | `README.md` § "Public user flow" and § "Pairing and sync protocol" |
| A second device is encrypted and claimed before any schedule moves | `README.md` § "Authenticated device pairing (widget)"; `worker/migrations/0003_scoped_pairing_credentials.sql` |
| Worker API for pairing claims and cross-device sync | `worker/` with its own `wrangler.jsonc` and the pairing-credential and scoped-source migrations |
| Packaging, deployment and documentation | `packaging/`, `scripts/`, `build/`, `README.md` |
| The public surface at `https://medication.bytesfx.com/` | Read with GET only; the capture seeds the browser's own storage and no account, pairing or sync was performed |

## Shikaku: Puzzle Quest — `github.com/jared0565/shikaku`

| Claim in the case study | Where it is supported |
|---|---|
| A playable browser logic puzzle | `index.html`, `game.js`, `levels.js`, `audit_levels.js` |
| Solo play works as a guest | The live quest screen shows a `Guest` badge and level 1 unlocked without an account; captured that way |
| Real-time 1v1 battles | `functions/match.js` and `functions/session.js` |
| ELO matchmaking and leaderboards | `functions/leaderboard.js`, `functions/players.js`, and the `LEADERBOARD_KV` binding in `wrangler.toml` |
| Accounts | `functions/auth.js` |
| QR sharing between devices | `functions/share.js` |
| Static hosting and edge functions | `wrangler.toml` (`pages_build_output_dir`), `_headers`, `functions/` |

No puzzle count is claimed: the repository metadata and the published material disagree, and the
case study says so.
