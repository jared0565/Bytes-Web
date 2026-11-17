# Audit: Pivot Parlor case study, branch feat/pivot-case-study-refresh

Audited 17 Nov 2026, about 03:35 to 03:50Z. Target: `/projects/pivot-parlor/`, plus the Pivot card on `/`, `/ai-chatbot/` and `/projects/`. Built from HEAD `2791649` and served by `vite preview` on 127.0.0.1. The audit was read-only and nothing was changed.

How the evidence was gathered:
- the impeccable detector, by URL, at 1280×800 and 390×844;
- Playwright measurements at 1440, 768 and 390px, run through the browser tool with external requests aborted;
- reading the built HTML and the branch diff.

It was done in-thread, with no subagents, per the owner's rule.

Evidence limits:
- Image weights below come from **file sizes on disk**, plus the per-page *initial* transfer.
- A full-scroll transfer total was attempted but is invalid: the browser cache served the images, so the totals equalled the initial ones.
- `/` showed 0 KB initially only because its project cards sit below the fold.

## Audit health score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Workspace screenshots carry their information in text that renders at about 3 to 5px; alt and caption text only summarise it |
| 2 | Performance | 2 | The Pivot card image went from 133 KB to 1,010 KB, and the case page's images from about 354 KB to about 2.36 MB; the hero is lazy-loaded above the fold |
| 3 | Theming | 4 | The new CSS reuses existing tokens only (`--line-strong`); no hard-coded values |
| 4 | Responsive | 3 | No overflow at 1440, 768, 390 or 320px, nor at 200% text; but at 768px the grid makes frames 344px wide, narrower than on a phone |
| 5 | Implementation integrity | 3 | Coherent with the showcase system. Two copy claims are less precise than the evidence. The strongest evidence sits below the workflow diagram |
| **Total** | | **15/20** | **Good** |

## Implementation integrity verdict

**Pass.** The branch extends the existing showcase system rather than bolting on a one-off:
- the `screens` field is validated at publication;
- output is escaped;
- it is rendered with the same figure, caption and border conventions as the case hero;
- every claim in the record traces to the 17 Nov handoff.

All seven detector findings are site-wide patterns, not branch code:
- the amber button glow (3 hits);
- body text lines of about 89 to 90 characters in the case-body column (3 hits);
- the primary-font notice.

The weaknesses are presentation and weight, not correctness.

## Corrections to my own earlier rulings

- **"1.0 MB is within existing practice"** (Task 2 ledger) used the wrong comparison: it compared against Active Paw. Before and after, this branch made the Pivot card image 7.6× heavier, and that image appears on three pages. It is a regression this branch caused.
- **"Workspace frames hard to read on phones" (deferred minor)** understated it. The measured UI text size is:

  | Width | Frame shown | UI text |
  |---|---|---|
  | 1440px | 574px | about 5.2px |
  | 768px | 344px | about 3.1px |
  | 390px | 350px | about 3.2px |

  The section is illegible at every width. The code-level self-review missed both points.

## Findings introduced or made worse by this branch

**[P1] Workspace screenshots are unreadable at every width**
- Location: `projectScreensHTML` and `.showcase-screen-grid` (two columns down to 768px); the six `pivot-*.png` frames.
- Category: responsive and accessibility.
- Impact: the spec's "operational evidence" reads as six dark rectangles. About 17% of each frame is the 240px sidebar. Nothing offers a full-size view, although the site's own `productProofHTML` adds "Open full-size … screenshot" links under its screenshots.
- Recommendation:
  - one column at every width (about 1180px wide on desktop, so UI text is about 10.6px);
  - crop the 240px sidebar, so the main panel shows at about 1.0× on desktop. Record the new hashes in the evidence doc;
  - add a full-size link in each caption.
- Command: `$impeccable adapt`.

**[P1] Image weight regression on the conversion path**

| File (bytes on disk) | Was (main) | Now |
|---|---|---|
| Pivot card image on `/`, `/ai-chatbot/`, `/projects/` | `pivot-platform.png` 133,294 | `pivot-parlor.png` 1,010,400 |
| All images on the case page | about 354 KB | about 2.36 MB |

- Category: performance.
- Measured initial image transfer: the case page loads 987 KB at both 1440 and 390px (the hero only). `/projects/` loads 3.8 MB at 1440 and 2.7 MB at 390, of which the Pivot card is 987 KB.
- Impact:
  - The case hero is the page's largest above-the-fold element, yet it is `loading="lazy"`, which delays it.
  - There is no `srcset`, so phones download 1440px PNGs to display them at 350px.
  - The two shop captures are photographic PNGs.
- Recommendation:
  - Re-encode the PNGs with Pillow. It is available through `python -P`, although impeccable found no CLI converter. The dashboard frames are flat UI and should shrink a lot; photo frames need a visual check for banding.
  - Load the case-page hero eagerly with `fetchpriority="high"`. This touches `imageHTML` and `projectCaseHTML` for every case page.
  - A `.webp` option would mean widening `validateImage`, which is a schema change, so leave it for later.
- Command: `$impeccable optimize`.

**[P2] Two copy claims are less precise than the evidence**
- Location: `bytes-website/src/showcase-content.js`, the Pivot `implementation` and `note` fields.
- Category: implementation integrity.
- Impact: the owner's rule is "no claim without evidence".
  - "…produces a branded booking website, using the owner’s details as its only source." The report says the owner's facts are the only source of *claims*. The imagery is generated, so the sentence reads wider than the evidence. Suggested wording: "…produces a branded booking website, with every factual claim traced to the owner’s details."
  - "a few photos were supplied separately". Per the report, the separately made photos are three service photos and all six team portraits, 9 of the roughly 27 images on the two shops. Suggested wording: "the team portraits and three service photos were supplied separately."
- Command: `$impeccable clarify`.

**[P2] The strongest evidence is buried below the workflow diagram**
- Location: `projectCaseHTML` order (body, workflow, example, screens).
- Category: implementation integrity (layout).

  | Section | Starts at, 1440px (page 7,302px) | Starts at, 390px (page 10,546px) |
  |---|---|---|
  | Second shop | 3,799px (52%) | 6,072px (58%) |
  | Workspace | 5,092px (70%) | 6,942px (66%) |

- Impact: a visitor who stops after the text and the diagram never sees the second shop or the workspace, which are the proof the spec asked for.
- Recommendation: render example and screens before the workflow on case pages that have them. Only the Pivot case uses `example` or `screens` on this branch.
- Command: `$impeccable layout`.

**[P2] The capture script cannot detect overlays returning**
- Location: `bytes-website/scripts/capture-pivot-shops.mjs`.
- Category: implementation integrity (tooling).
- Impact: the guards check the demo notice and image loading only. If Pivot Parlor renames `pp_cookie_consent`, `pp-install-dismissed` or `.pp-chat-fab`, the 11 Nov failure (a cookie card in the frame) would recur silently.
- Recommendation: throw if a visible element holds the cookie card text ("Cookies & privacy", or a visible "Got it" button), or if the chat button is visible.
- Command: `$impeccable harden`.

**[P3] The built-page audit crashes rather than reporting a missing screen image**
- Location: `check-showcase-pages.mjs`, the PNG dimension loop (`readFileSync`).
- Impact: a missing file gives a stack trace instead of a `[showcase]` failure line. The broken-path check reports it first, so this is only a clarity problem. The existing hero check has the same pattern.
- Command: `$impeccable harden`.

## Already site-wide, visible here (not caused by this branch)

- The amber glow on primary buttons.
- Body lines of about 89 characters in the case-body column.
- A generic `og:image` (`og-trial.jpg`) on the case page.
- Two divider rules between the workflow and the example.
- A 0px gap between the example heading and its image, measured at 1440, 768 and 390.
- The case hero lazy-loaded through `imageHTML`. That last one is counted in the P1 above because this branch made the hero 4.6× heavier.

## Positive findings

- **Contrast:** 8.57:1 for body text, captions and the screens intro on `rgb(7,18,22)`.
- **Structure:** one `h1`, and a logical h2 → h3 → h4 order.
- **Images:** every image has alt text and true width and height.
- **Keyboard:** focus is visible on both shop links.
- **Touch:** no link in the case content is under 44px tall.
- **Layout:** no horizontal overflow at any of the four widths, nor at 200% text on 390px.
- **Safety:** `screens` fails closed, with 8 malformed shapes tested, and all text is escaped.
- **Claims:** the editorial test pins the handoff's claims.
- **Captures:** read-only, with refusal guards.
- **Evidence:** first-hand checks are separated from the Pivot agent's claims.

## Recommended actions

1. **[P1] `$impeccable adapt`**: one-column workspace grid, cropped sidebar and full-size links.
2. **[P1] `$impeccable optimize`**: re-encode the PNGs and load the case hero eagerly.
3. **[P2] `$impeccable clarify`**: the two copy-precision fixes (recommended by default).
4. **[P2] `$impeccable layout`**: put the second shop and the workspace before the workflow.
5. **[P2] `$impeccable harden`**: overlay guards in the capture script, and a clean failure for a missing PNG.
6. **`$impeccable polish`**: final pass.

None of these block on correctness. Each is a source change: plan first, then the owner's "go".

## After the fixes (17 Nov 2026, measured between 03:56 and 04:04Z)

All five findings were fixed on the same branch in five commits (`5f2c168`, `9d2d0c8`, `d1eb107`, `1186055`, plus the commit that records this section). The figures below were re-measured on a fresh build served by `vite preview`, using the same widths and network rule as the audit.

| Measure | Before | After |
|---|---|---|
| Pivot card image, bytes on disk | 1,010,400 | 557,329 (`main` had 133,294) |
| All case-page images, bytes on disk | about 2.36 MB | 1,142,570 |
| Case page, initial image transfer | 987 KB | 544 KB (every width) |
| `/projects/`, initial image transfer, 1440 / 390 | 3.8 MB / 2.7 MB | 3,359 KB / 2,239 KB |
| Workspace frame scale, 1440 / 768 / 390 | 0.40 / 0.24 / 0.24 | 0.98 / 0.60 / 0.29, plus a full-size link per frame |
| Second shop starts at, 1440 / 390 | 52% / 58% | 24% / 35% |
| Workspace starts at, 1440 / 390 | 70% / 66% | 35% / 41% |
| Case hero | `loading="lazy"` | `loading="eager" fetchpriority="high"` |
| Gap between example heading and image | 0px | 20px |

The capture script refused a probe run with the consent keys cleared and named the cookie notice, its Got it button and the chat button. The built-page audit now reports a missing case image by name; previously it crashed with ENOENT. Its self-test detects 6 of 6 negative mutations.

The double divider (a pre-existing finding) went away when the sections moved: only one full-width rule now separates the last frame from the workflow.

**Detector re-run:**
- **1280:** 8 hits — the amber glow 3, line length 4, the primary font 1.
- **390:** 4 hits — the glow 2, the edge-flush footer paragraph 1, the font 1.
- **New hit:** one long-line hit at 1280, a workspace caption of about 105 characters. Captions follow the site-wide caption rule (`.showcase-case figcaption`, `max-width:75ch` at 0.88rem), which the hero caption already uses; the one-column grid now lets captions reach it. Left as is to keep the change inside this page; listed below.

### Re-scored

| # | Dimension | Before | After | Why |
|---|---|---|---|---|
| 1 | Accessibility | 3 | 4 | Frames readable on desktop; every frame has a named full-size link; focus visible |
| 2 | Performance | 2 | 3 | Weight about halved and the hero loads first; the card is still about 4× `main`'s, with no `srcset` |
| 3 | Theming | 4 | 4 | One new spacing rule, using an existing value |
| 4 | Responsive | 3 | 3 | One column at every width, no overflow; on phones the frames are overview-only, with the full-size link carrying detail |
| 5 | Implementation integrity | 3 | 4 | Copy matches the evidence; proof precedes the diagram; capture and audit guards proved |
| **Total** | | **15/20** | **18/20** | **Excellent** |

### Remaining, for the owner to choose

- **Caption length.** Workspace captions reach the site's 75ch caption rule, about 105 characters per line at 1280. Fixing it means a narrower caption rule for the screen grid, or a lower site-wide value.
- **Card image weight.** It is still about 4× the old platform card. A `srcset` or WebP version would mean widening `validateImage`, which is a schema change.
- **Phones.** The workspace frames are overview-scale (0.29×) at 390px; detail is one tap away through the full-size link.
