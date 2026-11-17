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

**Recaptured 2026-11-17 03:54:15 UTC** after the audit added overlay guards. The script now refuses a frame showing a cookie notice, chat button or install prompt.
- **Guard proof:** a probe run with the consent keys cleared and the chat button left visible was refused with `pivot-parlor: overlay in frame: cookie notice: Cookies & privacy; cookie notice: We use only strictly necessary cookies t; cookie notice: Got it; chat button: Open chat`.
- **Clean run:** it passed with the same titles. It blocked the same two challenge POSTs and had no page errors.

## Images now used (under bytes-website/public/projects)

The files in use are derived from the captures by `bytes-website/scripts/optimize-pivot-images.py`, run with `python -P`.
- **Shop captures:** quantised to a 256-colour palette with Floyd–Steinberg dithering.
- **Workspace frames:** the 240px navigation sidebar is cropped, empty space below the content is trimmed to 40px, and they are quantised to 256 colours without dithering.

A second run of the script leaves all eight files byte-identical. For the workspace frames, the original hash in brackets is the one the handoff report vouches for (20/20 match). The 03:20:53 shop captures were superseded by the 03:54:15 recapture.

| File | Pixels | Size (bytes) | SHA256 (in use) | Source |
|---|---|---|---|---|
| pivot-parlor.png | 1440 × 1000 | 557329 | b786126b11dbc5ea3e19bd3f01dd9b2aa0a4195868d0c1348e6bcda27593b208 | Live capture 03:54:15, FerdyM's Barber Shop demo, re-encoded |
| pivot-linden-lark.png | 1440 × 1000 | 388388 | f978a8eb061e8ad3fe3c1e8a99db0192ec12752389e058e9cc06d06613d31c87 | Live capture 03:54:15, Linden & Lark Hair Studio demo, re-encoded |
| pivot-bookings.png | 1200 × 1000 | 36521 | c97ec8d2d8fef1990b005e54d3b343d7c3a12adc88f64898f42d378a0f32db3e | Handoff 03-owner-bookings-desktop (original 8179a67a…a29044a), cropped |
| pivot-walkin-queue.png | 1200 × 500 | 16556 | 604786e3f89ac83adea95abb26ebf6d4291e3697464f6f12b26a3f14d5992df4 | Handoff 04-owner-walkin-queue-desktop (original f679723d…5ad486), cropped |
| pivot-till.png | 1200 × 780 | 33171 | f9e2422ad5fccadd4d92680084fd199ee0e9663d7ce14a7f872e0b29e1b147f4 | Handoff 05-owner-till-desktop (original 73fff929…fb42a3f), cropped |
| pivot-inventory.png | 1200 × 1000 | 36501 | d77733e1ace880982cae37bda4a1bcd5123891043a6826599024d0f81a5cbb7a | Handoff 06-owner-inventory-desktop (original b4288182…c991ec4), cropped |
| pivot-staff-today.png | 1200 × 725 | 23471 | 495e4b2473a6f0252a98ebaede334832c1e514752692a21241a8f9763e465390 | Handoff 08-staff-today-desktop (original 580fc4fd…e3b2), cropped |
| pivot-operator-onboarding.png | 1200 × 781 | 50633 | f23fef08c786749434d4ce4d32c7bbf8908f8d6293b18c2942142a8ae6a0a4ef | Handoff 10-operator-new-shop-desktop (original 2089cce7…cf294ba), cropped |

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

### Second review, after the audit fixes (17 Nov 2026, between 03:56 and 04:04 UTC)

`npm run build` passed. `check-showcase-pages.mjs --self-test` detected 6 of 6 negative mutations; the new one is a missing case image. Same four pages, same four widths, same network rule. Results on all 16 pairs:
- no overflow;
- one `h1`;
- no unloaded image;
- no page errors.

On the case page:
- **Order.** The second shop and the workspace now render before the workflow diagram. They start at 24% and 35% of the page at 1440px (previously 52% and 70%), and at 35% and 41% at 390px (previously 58% and 66%).
- **Grid.** One column at every width. Frames show at 1180 of 1200px at 1440 (0.98×), 720px at 768 (0.60×), 350px at 390 (0.29×) and 280px at 320 (0.23×).
- **Full-size links.** Each frame has an "Open full-size screenshot" link with the caption as hidden text for screen readers. `/projects/pivot-till.png` returned 200 `image/png`, and keyboard focus on the first link is visible.
- **Hero.** It loads with `loading="eager" fetchpriority="high"`; card images on `/`, `/projects/` and `/ai-chatbot/` stay lazy in the built HTML.
- **Example heading.** The gap between the example heading and its image is now 20px at every width (previously 0).
- **Divider.** Only one full-width rule separates the last frame from the workflow, so the earlier double divider is gone.
- **Image weight.** The case page's initial image transfer was 544 KB at every width (previously 987 KB).

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
