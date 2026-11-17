# Showcase expansion verification

Verified 6 November 2026 on `ux/our-work-navigation` in `F:\Projects\BytesFX Website\Bytes-Web`. Plan `docs/superpowers/plans/2026-11-06-project-showcase-expansion.md` (committed `080b33f`), spec `docs/superpowers/specs/2026-11-05-project-showcase-expansion-design.md`. Implementation commits `d42f815` (catalogue), `1f283fc` (index lead), `046402d` (card copy), `598b2c0` (routes and shells), `4258e70` (images), `2a44d9b` (editorial test), `fa8fd31` (browser review), `b5b7590` (polish).

| Check | Command | Result |
|---|---|---|
| Website build | `npm --prefix bytes-website run build` | Exit 0. Consent checks, navigation tests, 18 catalogue tests, 5 editorial tests, Vite build, chatbot output check, and the showcase audit: *9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified*. |
| Output mutation self-test | `node bytes-website/scripts/check-showcase-pages.mjs --self-test` | Exit 0; five deliberately broken output mutations detected. |
| Case-study browser review | `bytes-website/scripts/review-system-cases.mjs` | 344/344 checks; zero runtime errors; zero production writes. Run twice: after Task 7 and again after the polish batch. |
| Index and navigation browser review | `bytes-website/scripts/review-our-work.mjs` | 308/308 checks; zero runtime errors; zero production writes. Run twice, same two points. |
| Editorial red proof | injected `seamless` into the Shikaku summary, ran the editorial test | Failed as required, naming `shikaku uses the banned term "seamless"`; the injection was reverted and the build returned to green. |
| Mutation self-test, negative finding | ran the self-test after Task 3 | Reported `checker mutation escaped detection`: the mutant still targeted Pivot Parlor's old card image. The mutant now targets the pipeline screenshot the chatbot page always shows, and all five mutations are detected again. |
| Image capture | `bytes-website/scripts/capture-showcase-assets.mjs` over the public live sites | Seven project images recaptured at 1440 × 1000 in one pass. 22 non-GET/HEAD requests blocked across six hosts; zero production writes forwarded. Every image reviewed by eye. |
| Mechanical detector | Impeccable `detect --json` over the changed styles and shells | 30 findings, all outside the index-to-case-study path (legacy site stylesheet, chat widget, homepage ticker, dashboard and onboarding sheets). None in `src/showcase.css`. |
| Commit gate | `aramid check --staged` before every commit | *no findings*, 0 open in the ledger, on all nine commits. |
| Whitespace gate | `git diff --cached --check` before every commit | Exit 0 on all nine commits. |

## What the expansion changed

- The catalogue publishes seven records in the approved order: Pivot Parlor, Active Paw + PawScout, BytesAI Learning, BytesFX Cafe & Bookings, File Converter, Medication Reminder, Shikaku. The BytesFX record is retired with its undeployed case page; the draft BytesCRM record is untouched and still excluded from routes, cards, metadata and the sitemap.
- The index leads with a product-proof feature — the actual pipeline screenshot, the synthetic-data caption, and two links into the chatbot page — instead of a project card, and it does not repeat the chatbot page's workflow.
- Nine built routes: the chatbot page, the work index and seven case studies. Seven case URLs in the sitemap.
- Each case-study shell's title, description and Open Graph copy is checked against the catalogue record, so a re-typed summary fails the build instead of drifting.

## Boundaries that held

- No package installed, no backend, worker, entitlement, pricing or authentication change.
- The four BytesFX workflow images (`bytesfx-pipeline.png`, `bytesfx-lead.png`, `bytesfx-proposal.png`, `bytesfx-chat.png`) are byte-unchanged from 5 November.
- Medication Reminder shows a synthetic sample schedule seeded in the browser's own storage: no account, no pairing, no sync, no real medication record. Shikaku shows the guest puzzle board: no account, no matchmaking, no score submitted.
- No chat, booking, payment, supplier import or account was submitted anywhere. Every write attempt was blocked before it reached a network.
- No merge, push, pull request or deployment was performed. A push to `main` deploys the chatbot API, the CRM API and the website, and needs separate explicit owner authorization.

## Review artifacts

Local review files, not staged: `output/playwright/our-work/` (index, homepage and Pivot Parlor at 1440 and 390, chatbot preview), `output/playwright/system-cases/` (each case's workflow diagram and the Active Paw case page), `output/playwright/polish/` (the medication case page at 1440 and 390 and the index lead).
