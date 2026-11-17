# Project showcase expansion design

Status: owner-approved scope, ready for implementation planning. This document authorizes planning only; it does not authorize merge or deployment.

## Purpose and why

Expand the existing BytesFX project showcase so potential clients can judge the range and depth of the work rather than read generic project summaries. Add Medication Reminder and Shikaku, correct the presentation of Active Paw + PawScout and Pivot Parlor, and strengthen every existing project case study.

The existing visual world is worth preserving: deep petrol surfaces, warm amber actions, mint metadata, Bricolage Grotesque display type, Geist body copy, real product screens, and a clear return to the BytesFX trial. This is refinement, not a replacement visual world.

## Goals

- Publish seven project cards and seven static project case studies beneath the existing project index.
- Keep BytesFX Chat & Sales as the leading product proof on the project index and retain the existing three-featured-project limit on the AI Chatbot page.
- Make system relationships explicit, especially Active Paw's customised Shopify theme working with the PawScout backend and Pivot Parlor's multi-tenant shop creation and individually branded tenant frontends.
- Use concrete, restrained editorial copy and meaningful real interface images.
- Improve hierarchy, scanning, image consistency, case-study readability, and responsive behavior through the existing design tokens.
- Verify catalogue contracts, built routes, links, images, accessibility, responsive layouts, and the production build before owner review.

## Non-goals and anti-goals

- No backend, database, entitlement, pricing, authentication, chatbot, worker, or source-project changes.
- No new UI framework, package installation, external iframe, stock-photo library, or AI image generation.
- No fabricated application screens, customer results, testimonials, usage numbers, revenue claims, clinical claims, or unsupported feature demonstrations.
- No generic agency filler, buzzword-heavy copy, decorative gradients, floating blobs, emoji decoration, excessive pills, glassmorphism for its own sake, or motion added merely to appear polished.
- No separate public case study for PawScout: Active Paw + PawScout is one project with two cooperating parts.
- No publication of BytesCRM; its existing draft boundary remains unchanged.
- No merge or deployment without later explicit owner release authorization.

## Approved project catalogue

The published catalogue contains these seven records. `featuredOrder` applies only to the AI Chatbot page. The project index shows every published record in the order listed here.

| Order | ID | Public title | Kind label | Live destination | Featured order |
|---|---|---|---|---|---|
| 1 | `pivot-parlor` | Pivot Parlor | Platform | `https://pivotparlor.com/ferdyms-barber-shop-014` | 1 |
| 2 | `active-paw` | Active Paw + PawScout | Live store | `https://activepaw.co.uk/` | 2 |
| 3 | `bytesai-learning` | BytesAI Learning | Owned product | `https://learn.bytesai.uk/` | 3 |
| 4 | `cafe-bookings` | BytesFX Cafe & Bookings | Demonstration | `https://cafe.bytesfx.com/` | null |
| 5 | `file-converter` | File Converter | Owned product | `https://file-converter.bmorris0565.workers.dev/` | null |
| 6 | `medication-reminder` | Medication Reminder | Owned product | `https://medication.bytesfx.com/` | null |
| 7 | `shikaku` | Shikaku: Puzzle Quest | Owned product | `https://shikaku.bytesai.uk/` | null |

Add `platform` to the renderer's kind labels for Pivot Parlor. Keep the existing live-store, owned-product, and demonstration distinctions. Preserve the existing draft BytesCRM record and exclude it from routes, cards, metadata, and the sitemap.

### Pivot Parlor

Present a multi-tenant shop-creation platform, not a single barber-shop website. Explain that `pivotparlor.com` lets a salon or barbershop create a shop and that each shop can have its own branded frontend design. The example tenant demonstrates services, team content, booking, and a scripted sample assistant. Do not imply that the example assistant is the BytesFX chatbot or that a booking was completed during verification.

Suggested card summary: "A multi-tenant platform where salons and barbershops create shops with individually branded frontends, supported by booking and staff-scheduling workflows."

### Active Paw + PawScout

Use this exact combined title everywhere, including page metadata. Give one card, one case study, and one public live-store action. State explicitly that Active Paw is the customised Shopify theme and customer-facing storefront, while PawScout is the backend working behind it. Explain their cooperation in the implementation and walkthrough, including demand-led product discovery and the backend catalogue/commerce workflow. Do not present internal administration as a public demo or claim that visitors can inspect supplier imports, fulfilment, or AI decisions.

Suggested card summary: "A customised Active Paw Shopify theme works with the PawScout backend to support demand-led product discovery, catalogue management and commerce automation."

### BytesAI Learning

Expand beyond course discovery to verified-free course curation, provider/category exploration, personalised guidance, the learning quiz, progress tracking, and AI assistance documented by the project. Distinguish what a public visitor can inspect from signed-in or administrative capabilities. Do not claim assistant quality or learning outcomes.

### BytesFX Cafe & Bookings

Explain the hospitality content and booking workflow, including menu, soft play, party information, calendar, and the isolated demonstration boundary. Synthetic submissions and unavailable real reservations must not be presented as customer usage. Keep the public demonstration label.

### File Converter

Lead with browser-based, on-device conversion and the device-local saved-file library. Cover supported document/data/image workflows, native reading views, and shared-browser storage considerations. Product privacy statements come from its documentation; do not present this showcase as an independent security audit.

### Medication Reminder

Repository: `https://github.com/jared0565/Medication-Reminder`.

Present a privacy-focused browser/installable PWA with local schedules and reminders, offline-capable local use, optional account features, encrypted pairing/synchronization, and account/data controls. Describe it as an organisational aid, not a medical device, and make no clinical or health-outcome claims. Use only a synthetic sample schedule in screenshots and identify it in the alt text or caption.

Suggested card summary: "A privacy-focused reminder PWA combines local schedules and notifications with optional encrypted synchronization across paired devices."

### Shikaku: Puzzle Quest

Repository: `https://github.com/jared0565/shikaku`.

Present a playable browser logic game with solo puzzles, real-time 1v1 battles, ELO matchmaking, leaderboards, accounts, and QR sharing. Do not state a puzzle count: the repository metadata and existing portfolio copy disagree. Use the public guest flow for capture; do not create an account, enter matchmaking, or submit scores.

Suggested card summary: "A playable logic-puzzle experience combines solo challenges with real-time 1v1 battles, rankings and cross-device QR sharing."

## Page and case-study structure

### Project index

Retain the shared navigation, footer, and trial return. Refine the introduction to "What we've built" with a concise statement about owned products, a live store, platforms, and clearly labelled demonstrations.

Lead with a compact BytesFX Chat & Sales product-proof feature using the existing actual pipeline screenshot and synthetic-data caption. Link "View project" to `/ai-chatbot/#product-workflow` and "Explore the chatbot" to `/ai-chatbot/`. Do not duplicate the full AI Chatbot page's workflow section on the index.

Follow with all seven project cards in the approved order. Each card contains a real screenshot, title, kind label, one concrete summary, at most three specific capabilities, an internal View project action, and a named external live action. Keep the index scannable rather than turning cards into full case studies.

### Case studies

Every project has a static `/projects/<id>/` page using the existing shared shell and renderer. Keep the established sequence: The problem, What we built, Explore the workflow, What you can inspect, Technical work, and the trial return.

Make the system relationship a dedicated, explicit part of `implementation` for Active Paw + PawScout and Pivot Parlor. Distinguish documented backend/signed-in capabilities from what the public visitor can test. Use unique title, meta description, Open Graph copy, canonical URL, useful image alt text, and a truthful screenshot caption. Add the two new routes to Vite and the sitemap and update the five existing shells whose title or summary changes.

## Visual refinement

- Preserve the current palette, typography, spacing tokens, navigation, buttons, and footer. Reuse `--ink-*`, `--text*`, `--amber`, `--mint`, `--line*`, `--font-*`, and `--s-*` rather than introducing one-off colors or fonts.
- Strengthen editorial hierarchy through layout, whitespace, type scale, and meaningful screenshots, not decoration.
- Use consistent screenshot frames and aspect ratios with stable dimensions, intentional crops, and readable focal states. Avoid tiny full-page text and repetitive hero-only images when a workflow screen explains the product better.
- Keep card summaries to roughly 25–35 words and capability items to short noun phrases. Use parallel structure where helpful, but do not force every sentence into a slogan or a rule of three.
- Use a comfortable case-study measure, clear section spacing, visible focus states, logical keyboard order, 44px minimum action targets, and reduced-motion behavior.
- Do not add gradient text, generic glass cards, decorative badges, emoji, glow effects, grain, floating shapes, stock illustrations, or generated artwork.

## Editorial quality bar

Write plain, concrete English that names the actor, interface, or workflow. Prefer "the theme sends visitor demand to PawScout" over "leverages cutting-edge AI to deliver seamless experiences." Use natural cadence and specific detail rather than inflated marketing language.

Do not use these filler terms in new or updated project copy: `seamless`, `cutting-edge`, `robust`, `innovative`, `delve`, `leverage`, `elevate`, `empower`, `world-class`, `next-generation`, `revolutionary`, or `game-changing`. Do not invent numbers to make copy sound substantial. Keep caveats short and place them beside the relevant capability rather than repeating generic disclaimers.

Run the Impeccable polish workflow over the whole index-to-case-study path. Classify issues as missing tokens, one-off implementations, conceptual mismatches, or local defects and fix at the narrowest correct level. Read the craft floor before UI edits. Run the mechanical detector once, inspect desktop and mobile together, fix findings in one batch, and allow one confirmation pass. The new owner-directed expansion has its own two-pass visual budget; it does not reuse the completed pass count from the initial showcase.

## Image requirements

- Use actual product/application interfaces only. No AI-generated illustrations, stock imagery, fabricated dashboards, invented browser chrome, or promotional composites.
- Recapture all seven public project images with the isolated capture workflow so framing and quality are reviewed together. Keep the four existing BytesFX workflow images unchanged.
- Use 1440 × 1000 PNG files under `bytes-website/public/projects/` to preserve the existing metadata and validation contract.
- Capture meaningful states: Pivot's tenant storefront, Active Paw's actual store, BytesAI course discovery, the cafe booking interface, File Converter's working interface, Medication Reminder's actual schedule UI with synthetic sample content, and Shikaku's playable guest interface.
- Block every non-GET/HEAD request during capture. Do not submit chats, bookings, payments, accounts, scores, supplier imports, or real medication records.
- Inspect every image for personal data, credentials, unintended real records, confusing sample values, unreadable text, poor crops, and blank/loading frames. Record source, state, dimensions, byte size, alt meaning, and synthetic-data status in the asset manifest.

## Verification and release boundary

- Extend the existing Node catalogue tests and built-output audit; do not add a new test framework.
- Assert seven published projects, the existing featured order, the combined Active Paw + PawScout title, the Platform label, both new HTTPS hosts, two new static routes, seven sitemap case URLs, and absence of the draft CRM.
- Add a focused editorial test for the banned filler terms and required Active Paw/Pivot relationship language.
- Verify every built page has one H1, unique title/description, canonical and trial links, valid local assets, declared PNG dimensions, and no iframe or unfilled marker.
- Run the existing website build and output mutation self-test. Update browser verification to cover nine routes (AI Chatbot, index, seven cases) at 320, 390, 768, and 1440px, plus keyboard use, 200% text, reduced motion, image loading, and all project actions.
- Use localhost for screenshots. Complete the bounded Impeccable desktop/mobile inspection, one detector run, one fix batch, and at most one confirmation pass. Preserve screenshots and sanitized evidence.
- Run `aramid check --staged` and `git diff --cached --check` before each authorized implementation commit. Never use `--no-verify`.
- Preserve untracked `aramid.toml` and `output/playwright/showcase/` owner artifacts; do not stage them.
- Stop with a reviewed feature branch and evidence for owner approval. A push to `main` deploys all three production components and requires separate explicit release authorization.
