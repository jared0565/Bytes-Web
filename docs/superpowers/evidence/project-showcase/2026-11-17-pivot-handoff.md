# Pivot Parlor handoff review, 17 November 2026

Source: the handoff report prepared by Pivot Parlor's own agent at the owner's request, `F:\Projects\Pivot Parlor\pp-showcase\docs\handoff\2026-11-17-bytesfx-handoff-for-bytesfx.md`, with its capture folder `2026-11-17-bytesfx-captures\`. Both were read here at the owner's direction; nothing in Pivot Parlor's repository was changed. Plan: `docs/superpowers/plans/2026-11-17-pivot-case-study-refresh.md`. Spec: `docs/superpowers/specs/2026-11-06-pivot-representative-demo-design.md`.

## Evidence grade

- **Verified here, first-hand.**
  - All 20 capture files match the report's SHA256 and pixel sizes (20/20).
  - The six frames used below were re-hashed after copying, and all six match.
  - Eight desktop frames were inspected by eye. No personal data, token or AI model name was seen.
  - The two public demo pages were captured live (below).
- **The Pivot agent's claims, not verified here:**
  - production commit `8444a26`;
  - the claim grades;
  - the generation trace;
  - transaction safety;
  - the responsive review.

  Several of these are inherited on their side as well: the Stripe sandbox (from a runbook), the 6 Nov generation trace, contrast, and production row counts (their read-only query was blocked).
- **Acceptance table, per the report.**
  - Met: generation fidelity, visual completeness, content consistency, responsive usability, transaction safety and operational evidence.
  - Partly met: shop variation. The headline type, imagery, palette, section mix and content differ, but the two sites share one page frame and body font. The case-study copy says "section mix within a shared page framework" for that reason.

## Claims the page relies on (from the report)

- Demo addresses are `https://pivotparlor.com/ferdyms-barber-shop-demo` and `https://pivotparlor.com/linden-and-lark-demo`. These slugs are fixed in code. `-014` is a legacy alias backed by an internal test shop.
- The shop name is `FerdyM's Barber Shop`, with a straight apostrophe (U+0027) as the product writes it.
- The operator opens each shop and the owner completes setup. Shops do not sign up and create themselves.
- Deposits and card payments are built and switched on per shop, but production runs in test mode.
- Confirmations and reminders are email only. There is no SMS, push or offline mode.
- Site generation uses the owner's details as its only source, and untraceable claims are dropped. A regenerated live site waits for the owner to publish it.
- A few demo photos (three service photos and all six team portraits) were made outside the platform.

## Do not claim

- That shops create themselves.
- Live deposits or card payments.
- SMS or push reminders.
- Offline use or an app-store app.
- Real shops, customers, bookings, revenue, ratings, reviews, awards or testimonials.
- An AI chat on the demos.
- That every demo image came from the platform.
- Fully automatic publishing.
- Any speed, cost or time figure.
- Any platform price.

## Live captures (Bytes-Web, read-only)

Script: `bytes-website/scripts/capture-pivot-shops.mjs`. It ran through the Playwright browser tool's run-code at a 1440 × 1000 viewport, device scale 1, with every non-GET/HEAD request aborted.

| Run (UTC) | URL | Page title | Result |
|---|---|---|---|
| 2026-11-17 03:20:53 | https://pivotparlor.com/ferdyms-barber-shop-demo | FerdyM's Barber Shop \| Precise Grooming in Deptford SE8 (demo) | Demo notice visible, 0 unloaded images |
| 2026-11-17 03:20:53 | https://pivotparlor.com/linden-and-lark-demo | Linden & Lark Hair Studio \| Clifton, Bristol (demo) | Demo notice visible, 0 unloaded images |

The run blocked two requests, both Cloudflare challenge POSTs under `/cdn-cgi/challenge-platform/`. There were no page errors. An earlier run at 03:20:24 was identical except that the browser scrollbar showed, so it was replaced.

## Images now used (under bytes-website/public/projects)

| File | Pixels | Bytes | SHA256 | Source |
|---|---|---|---|---|
| pivot-parlor.png | 1440 × 1000 | 1010400 | fc870c4f72b395e3097345ef5b28ba7e7af04fe8672b94c7f27e44d7081ae2b4 | Live capture, FerdyM's Barber Shop demo |
| pivot-linden-lark.png | 1440 × 1000 | 790695 | 9a93d4f5bba437ba09a9d2c298cabd78a309bc63707397a06ea419ea2d3f5599 | Live capture, Linden & Lark Hair Studio demo |
| pivot-bookings.png | 1440 × 1000 | 114302 | 8179a67a4bb7df3a72d8251b82e540edeb54ab099cfe9ebcc8beb7a48a29044a | Handoff 03-owner-bookings-desktop |
| pivot-walkin-queue.png | 1440 × 1000 | 67500 | f679723d209ba74c345ceb63c2fee1a37e2de6f82c9fe3b9458e2885bc5ad486 | Handoff 04-owner-walkin-queue-desktop |
| pivot-till.png | 1440 × 1000 | 100813 | 73fff92972775430c6e50a6c2022ec1f018ea99f446f13b115d053b12fb42a3f | Handoff 05-owner-till-desktop |
| pivot-inventory.png | 1440 × 1000 | 110103 | b428818291ad863441bf1b44a9234f742aed67abc9a5edbc205c482c2c991ec4 | Handoff 06-owner-inventory-desktop |
| pivot-staff-today.png | 1440 × 1000 | 66792 | 580fc4fd1f923ea2a046017fdc88f1aa62a396c6b0eeb987bcb98d978cc3e3b2 | Handoff 08-staff-today-desktop |
| pivot-operator-onboarding.png | 1440 × 1000 | 100392 | 2089cce736853e7a56c99f55860d89360063ff3f3be2f0c1491f0e617cf294ba | Handoff 10-operator-new-shop-desktop |

The workspace frames come from a local copy of the platform with synthetic data, per the report. Left out:

- 01 shows a setup fee;
- 02 clips the Sunday column;
- 07 overlaps 06;
- 09 shows an empty "AI MODEL" column.

`pivot-platform.png` (the platform homepage) was retired from the page.

## Browser review of the built site (local preview, 17 Nov 2026)

`npm run build` passed. `check-showcase-pages.mjs --self-test` detected all five negative mutations.

The review loaded `/projects/pivot-parlor/`, `/projects/`, `/` and `/ai-chatbot/` from `vite preview` at 1440, 768, 390 and 320px. Only local GETs and Google Fonts were allowed; the site's two external API reads were aborted. Results on all 16 page and width pairs:

- no horizontal overflow;
- exactly one `h1`;
- no unloaded image after eager loading;
- no page errors.

On the case page:

- the screen grid holds 6 figures, in 2 columns at 1440 and 768px and 1 column at 390 and 320px;
- both shop links ("Explore the demo shop", "Explore Linden & Lark") show a visible focus outline;
- the Pivot card on `/projects/`, `/` and `/ai-chatbot/` shows `/projects/pivot-parlor.png`.

Full-page captures paint lazy images as blank boxes. Viewport captures scrolled to each section show every frame rendered. At 390px the workspace frames are legible as screenshots, but their small text is not.

## Pivot-side defects, for the owner to pass to Pivot Parlor

- Linden & Lark's header logo tile is unreadable at header size.
- The home-screen short name is "FerdyM's Bar".
- "neutralize" uses US spelling.
- The "Three expert barbers available to book" chip is unedited generated wording.
- The owner rota clips Sunday at 1440px.
- The operator shop table runs off the edge on phones.
- The Revenue chart is empty with sample data.
- The sidebar shows an internal account id.
- The operator list has an "AI MODEL" column label.
