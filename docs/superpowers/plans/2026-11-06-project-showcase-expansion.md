# Project Showcase Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the BytesFX Our Work showcase to seven published projects — adding Medication Reminder and Shikaku, correcting the Active Paw + PawScout and Pivot Parlor presentations, and strengthening every case study — without touching the backend, the deployment or the design system.

**Architecture:** The existing static catalogue/renderer pipeline stays exactly as it is. `src/showcase-content.js` remains the single source of editorial truth; `src/showcase-html.js` renders escaped, build-time HTML; Vite injects it into static shells. The expansion edits that pipeline, adds two project shells and two images, and retires the undeployed `/projects/bytesfx/` case page that the nine-route count does not allow.

**Tech Stack:** Existing Vite 7, semantic HTML, CSS, plain JavaScript, Node's built-in test runner, the existing Playwright CLI review scripts. No new dependency, no new framework, no package installation.

**Spec:** [Project showcase expansion design](../specs/2026-11-05-project-showcase-expansion-design.md) — the plan argues from this spec; the spec travels with it.

---

## Start or resume here

1. Read the [spec](../specs/2026-11-05-project-showcase-expansion-design.md), this plan, [our-work-status.md](our-work-status.md) and `AGENTS.md`, `GRAPHITE.md`, `ARAMID.md`.
2. Run `aramid handover show` from the repository root. Resume only a verified handover; one marked NOT VERIFIED requires the owner.
3. Run these from the checkout root and inspect every result before editing:

```powershell
Get-Location
git branch --show-current
git rev-parse HEAD
git status --short
git log -5 --oneline
python -m graphite check .
```

4. Confirm the base is right before writing anything: `git branch --show-current` must print `ux/our-work-navigation` and `git rev-parse HEAD` must print `a93054f` (the tip of that branch). If either differs, stop and ask the owner.
5. Preserve every untracked owner file. `git status --short` in this checkout lists `AGENTS.md`, `ANTIGRAVITY.md`, `GRAPHITE.md`, `aramid.toml`, `output/`, `.claude/` and more. Never use `git add .` or `git add -A`; stage exact paths.
6. The plan's task checkboxes are the completion list. `our-work-status.md` records position and evidence, not a second task list.

### Base reconciliation — read this before Task 1

Two branches carry overlapping work, and the spec was written against the older one:

| Branch | Content | State |
|---|---|---|
| `ux/project-showcase` (isolated worktree at `C:\Users\fbmac\atlas\Codex\.codex_state\user_home\worktrees\626f\Bytes-Web`) | PS01–PS10; merged as PR #104 and deployed live on 5 Nov 2026. Five case studies, no BytesFX case page. Holds the **untracked** spec file. | Deployed. Do not develop here. |
| `ux/our-work-navigation` (**this checkout**, `F:\Projects\BytesFX Website\Bytes-Web`) | Released `main` (`2008892`) plus six commits: Our Work navigation, Pivot Parlor as a platform, repository links removed, and a documentation-audit rewrite of all six case studies with workflow diagrams. | Unmerged, unreviewed, and the richer source. |

`git diff --name-status ux/our-work-navigation ux/project-showcase -- bytes-website/` returns **no additions**: the navigation branch already contains every website file the showcase branch has. **This plan implements on `ux/our-work-navigation`, in this checkout.** The older branch's five case studies are that branch's five case studies plus the extra `/projects/bytesfx/` page; the expansion retires that page (see Fixed decisions).

The spec was written at 18:09 on 5 Nov against the showcase branch's five case studies. Wherever the spec gives a value, the spec wins. Where the spec is silent, the navigation branch's evidence-backed copy stays. Section *Fixed decisions* below lists every conflict and its resolution.

---

## Global Constraints

Copied verbatim from the spec; every task inherits them.

- **Catalogue:** exactly seven published records, in this order: `pivot-parlor`, `active-paw`, `bytesai-learning`, `cafe-bookings`, `file-converter`, `medication-reminder`, `shikaku`. `featuredOrder` applies only to the AI Chatbot page and stays `pivot-parlor`=1, `active-paw`=2, `bytesai-learning`=3. The draft `bytescrm` record stays in the catalogue but is excluded from routes, cards, metadata and the sitemap.
- **No new dependencies, frameworks, iframes, stock imagery or AI-generated images.** No package installation.
- **No fabricated content:** no invented application screens, customer results, testimonials, usage numbers, revenue claims, clinical claims, or unsupported feature demonstrations.
- **No backend, database, entitlement, pricing, authentication, chatbot, worker or source-project changes.**
- **No merge, push, PR or deployment without separate explicit owner release authorization.** A push to `main` deploys all three production components.
- **Banned filler terms in new or updated project copy:** `seamless`, `cutting-edge`, `robust`, `innovative`, `delve`, `leverage`, `elevate`, `empower`, `world-class`, `next-generation`, `revolutionary`, `game-changing`.
- **Card summary length:** roughly 25–35 words. The spec's own suggested summaries are ~19 words, so the band enforced by the test is 12–40 words.
- **Card capabilities:** at most three, shown as short noun phrases.
- **Images:** 1440 × 1000 PNG under `bytes-website/public/projects/`. The four existing BytesFX workflow images (`bytesfx-pipeline.png`, `bytesfx-lead.png`, `bytesfx-proposal.png`, `bytesfx-chat.png`) stay unchanged.
- **Capture:** GET/HEAD only. No chats, bookings, payments, accounts, scores, supplier imports or real medication records are submitted. Every capture is reviewed for personal data, credentials, unintended real records, unreadable text, poor crops and blank/loading frames.
- **Live destinations are allowlisted.** Only these hosts may appear in a `liveUrl`: `web.bytesfx.com`, `pivotparlor.com`, `activepaw.co.uk`, `learn.bytesai.uk`, `cafe.bytesfx.com`, `file-converter.bmorris0565.workers.dev`, `medication.bytesfx.com`, `shikaku.bytesai.uk`.
- **Design system:** reuse `--ink-*`, `--text*`, `--amber`, `--mint`, `--line*`, `--font-*`, `--s-*`. No one-off colours, no gradient text, no glass cards, no badges, no emoji, no glow, no grain, no floating shapes, no stock illustrations.
- **Gate:** run `aramid check --staged` and `git diff --cached --check` before every commit. Never pass `--no-verify` to `git commit` or `git push`.
- **Isolation:** work only inside this repository. The two new projects are captured from their **live public hosts**; their repositories are read for documentation only if the owner approves it at review, and no code from them is run.

---

## Review Focus

Five failure modes the spec implies that no single task's test exercises on its own. Each is pinned to the task that owns the code.

1. **A banned filler term survives in a static shell.** The five existing case-study shells carry their own `<title>`, `<meta name="description">` and `og:` copy as literal HTML, outside the catalogue. Editorial checks over the catalogue cannot see them, and the shells are where summaries get re-typed by hand. → Task 6.
2. **The featured-three limit on `/ai-chatbot/` silently grows.** The catalogue goes from six published records to seven; a naive "show everything featured" change would put four projects on the chatbot page. The spec keeps that page at exactly three. → Task 1.
3. **The index's product proof duplicates the AI Chatbot page's workflow section.** The spec asks for a compact lead on the index and explicitly forbids duplicating the chatbot page's full workflow there. A copy-paste of `productProofHTML` into the index would satisfy a naive "must contain the pipeline image" test and still break the spec. → Task 2.
4. **A captured image carries a real record instead of the synthetic sample.** Medication Reminder's schedule view is captured from a live app that stores real users' reminders in browser storage; a stray profile or an account-linked schedule would look correct in review. The failure is invisible in the file, only in the pixels. → Task 5.
5. **A captured image is technically valid but blank.** The build audit compares PNG header dimensions to metadata; a screenshot taken before the app rendered is still 1440 × 1000 with the right bytes. Only a visual check catches it. → Task 5.

---

## Planned file map

| File | Responsibility in this plan |
|---|---|
| `bytes-website/src/showcase-content.js` | The seven published records, their editorial copy, workflow data, destinations and image metadata; the untouched `bytescrm` draft |
| `bytes-website/src/showcase-html.js` | Renderer: card, case study, index, product-proof feature; the live-host allowlist; kind labels |
| `bytes-website/src/showcase-flow.js` | Unchanged — the workflow renderer and its validator the new records satisfy |
| `bytes-website/src/showcase.css` | Card, index and case-study styles; only touched if a task needs a token-level fix |
| `bytes-website/src/html-text.js` | Unchanged — the escaping helper the renderer and the editorial test both use |
| `bytes-website/projects/index.html` | The Our Work index shell; its `<title>`, description and `og:` copy follow the index introduction |
| `bytes-website/projects/{pivot-parlor,active-paw,bytesai-learning,cafe-bookings,file-converter}/index.html` | Five existing case-study shells: metadata updated to match the catalogue |
| `bytes-website/projects/{medication-reminder,shikaku}/index.html` | Two new case-study shells, created from the pivot shell |
| `bytes-website/projects/bytesfx/index.html` | **Deleted** — the retired BytesFX case page |
| `bytes-website/vite.config.js` | Build inputs: two added, one removed |
| `bytes-website/public/sitemap.xml` | Two case URLs added, one removed |
| `bytes-website/public/projects/*.png` | Seven recaptured project images; the four BytesFX workflow images untouched |
| `bytes-website/scripts/capture-showcase-assets.mjs` | The isolated capture workflow: seven recaptures, GET-only, synthetic medication schedule |
| `bytes-website/scripts/test-showcase-content.mjs` | Catalogue and renderer contract tests |
| `bytes-website/scripts/test-showcase-editorial.mjs` | **New** — banned terms and required relationship language |
| `bytes-website/scripts/check-showcase-pages.mjs` | Built-output audit: nine routes, shell/catalogue parity, sitemap, drafts, images |
| `bytes-website/scripts/review-our-work.mjs` | Browser review of the index and shared navigation |
| `bytes-website/scripts/review-system-cases.mjs` | Browser review of every case study across four widths |
| `bytes-website/package.json` | The `build` script gains the editorial test |
| `docs/superpowers/evidence/project-showcase/assets.md` | The asset manifest: source, state, dimensions, size, alt meaning, synthetic status |
| `docs/superpowers/plans/our-work-status.md` | The live checkpoint, updated at the end |

---

## Fixed decisions

Decisions this plan makes so the implementer never has to guess. Each is a place where the spec, the navigation branch and the deployed site could each be followed.

1. **The BytesFX catalogue record is retired.** The spec's catalogue is exactly seven records and none of them is `bytesfx`; the spec's verification counts nine built routes (chatbot, index, seven cases). The navigation branch's `/projects/bytesfx/` case page was never deployed — `main` ships five case studies — so retiring it removes nothing from the live site. BytesFX keeps its role as the leading product proof: the index's product-proof feature (Task 2) and the AI Chatbot page's existing `#product-workflow` section both stay, and the four `bytesfx-*.png` images stay.
2. **The index leads with a purpose-built product-proof feature, not a project card.** It shows the existing `/projects/bytesfx-pipeline.png`, the synthetic-data caption, and two actions: *View project* → `/ai-chatbot/#product-workflow`, *Explore the chatbot* → `/ai-chatbot/`. It does not link to `/projects/bytesfx/`, and it does not restate the chatbot page's full workflow.
3. **Pivot Parlor's card destination is the tenant demo; the platform homepage becomes the case study's example image.** The spec's catalogue table pins the live destination to `https://pivotparlor.com/ferdyms-barber-shop-014`; the navigation branch had moved it to the platform root and used the platform root as the main image. The spec's value wins for the destination and for the card image (the tenant storefront); the navigation branch's `pivot-platform.png` is preserved as the case study's example section, so the platform framing survives. The tenant's own page says its services, prices and team are illustrative and that its assistant uses scripted replies — the copy must not imply otherwise.
4. **The case-study section order does not change.** The spec says "keep the established sequence"; the navigation branch's sequence (The problem → What we built → scope sections → Our delivery scope → capabilities and note → Explore this project → workflow → example → return) already carries it. The spec's names "Explore the workflow", "What you can inspect" and "Technical work" map onto the existing workflow section, the capabilities aside and the delivery scope respectively. **Do not rename headings** — the Technical work/repository section was removed deliberately in `ea2d1f8` and must stay removed.
5. **The navigation branch's evidence-backed copy is kept wherever the spec is silent.** The spec gives card summaries for Pivot Parlor, Active Paw + PawScout, Medication Reminder and Shikaku; those four strings are used verbatim. BytesAI Learning, BytesFX Cafe & Bookings and File Converter keep their navigation-branch summaries, adjusted only where the global constraints require it.
6. **Both new projects are captured from their live hosts, not from their repositories.** `https://medication.bytesfx.com/` and `https://shikaku.bytesai.uk/` are public, GET-only surfaces. Medication Reminder's schedule view is produced by seeding the browser's own `localStorage` — a client-side store — after accepting the app's "Continue on this device" choice; no account is created and no request other than GET/HEAD is allowed through. The repositories are not run and not modified. If the owner prefers, a documentation-only read of the two public repositories is permitted for copy accuracy (the navigation branch had the same permission for six repositories); that is a copy input, not an execution input, and needs the owner's nod at review.
7. **The two new records are owned products.** `kind: "owned-product"` for both; the existing `owned-product`, `live-store`, `demonstration` and `platform` labels are unchanged and `platform` is already rendered as *Platform*.
8. **A case study keeps the enquiry return, not the trial return.** The spec's sequence mentions "the trial return"; the deployed case pages end with the enquiry block (*What would you like to build?* → `/#contact`), and the trial action is in the shared navigation and the footer of every page. The retired BytesFX case page was the only page ending in the trial block. Changing the return block would be an unrequested redesign; the trial link is already asserted on every built route.

---

### Task 1: The catalogue becomes seven published records

**Files:**
- Modify: `bytes-website/src/showcase-content.js` (delete the `bytesfx` record; add `medication-reminder` and `shikaku` after `file-converter`; leave `bytescrm` as the draft)
- Modify: `bytes-website/src/showcase-html.js` (`LIVE_HOSTS` gains `medication.bytesfx.com` and `shikaku.bytesai.uk`)
- Modify: `bytes-website/scripts/test-showcase-content.mjs`
- Test: `bytes-website/scripts/test-showcase-content.mjs`

**Interfaces:**
- Consumes: the record shape validated by `publishedProjects()` — `id`, `title`, `kind`, `publishState`, `caseStudyPath`, `liveUrl`, `liveActionLabel`, `featuredOrder`, `summary`, `problem`, `implementation`, `note`, `capabilities[]`, `deliveryScope[]`, `walkthrough[]`, `repositoryUrls[]`, `evidence[]`, `sections[]` (1–6, each `{title, body}`), `workflow` (`{title, description, lanes[]}`, 1–4 lanes, 2–5 steps each, optional `ownerAction: boolean`), `image` (`{src, alt, width, height}`), optional `imageCaption`, optional `example` (`{title, caption, actionLabel, image, url}`).
- Produces: `publishedProjects(projects)` returning the seven records in catalogue order; `featuredProjects(projects)` returning `['pivot-parlor','active-paw','bytesai-learning']`.

- [x] **Step 1: Write the failing test**

Add to `bytes-website/scripts/test-showcase-content.mjs`:

```js
test('the published catalogue is the seven approved projects in order', () => {
  assert.deepEqual(publishedProjects(projects).map(p => p.id), [
    'pivot-parlor', 'active-paw', 'bytesai-learning',
    'cafe-bookings', 'file-converter', 'medication-reminder', 'shikaku'
  ]);
});

test('the retired BytesFX record is gone from the catalogue', () => {
  assert.equal(projects.some(p => p.id === 'bytesfx'), false);
});

test('the new project destinations are allowlisted and other hosts fail closed', () => {
  const medication = structuredClone(projects.find(p => p.id === 'medication-reminder'));
  const shikaku = structuredClone(projects.find(p => p.id === 'shikaku'));
  assert.equal(medication.liveUrl, 'https://medication.bytesfx.com/');
  assert.equal(shikaku.liveUrl, 'https://shikaku.bytesai.uk/');
  const p = sample(); p.liveUrl = 'https://medication.example.com/';
  assert.throws(() => publishedProjects([p]), /URL/);
});

test('the featured set stays at three while the catalogue grows', () => {
  assert.equal(featuredProjects(projects).length, 3);
  assert.deepEqual(featuredProjects(projects).map(p => p.id), ['pivot-parlor','active-paw','bytesai-learning']);
});

test('the medication reminder image is labelled as synthetic', () => {
  const medication = publishedProjects(projects).find(p => p.id === 'medication-reminder');
  assert.match(medication.image.alt, /synthetic|sample/i);
  assert.match(medication.imageCaption, /synthetic/i);
});
```

Change the count in the existing test `draft content never reaches published records or featured order` from `6` to `7`.

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: FAIL — `publishedProjects(projects).length` is `6`, `projects.find(p => p.id === 'medication-reminder')` is `undefined`.

- [x] **Step 3: Delete the `bytesfx` record and add the two new records**

In `bytes-website/src/showcase-content.js`, remove the object whose `id` is `bytesfx` (its `caseStudyPath`, `image`, `walkthrough`, `sections` and `workflow` go with it). Leave the `bytescrm` record exactly as it is.

Append these two records after the `file-converter` record, in this order. The copy is fixed by the spec; keep it verbatim.

`medication-reminder`:

```
id: "medication-reminder"
title: "Medication Reminder"
kind: "owned-product"
publishState: "published"
featuredOrder: null
liveUrl: "https://medication.bytesfx.com/"
liveActionLabel: "Open the app"
caseStudyPath: "/projects/medication-reminder/"
repositoryUrls: ["https://github.com/jared0565/Medication-Reminder"]
summary: "A privacy-focused reminder PWA combines local schedules and notifications with optional encrypted synchronization across paired devices."
capabilities: ["Local schedules and reminders", "Offline use on one device", "Encrypted pairing and synchronization"]
deliveryScope: ["PWA schedule, reminder and notification experience",
                "Local-first storage and device-only privacy controls",
                "Optional account, pairing and encrypted synchronization",
                "Worker API for pairing claims and cross-device sync",
                "Packaging, deployment and documentation"]
problem: "A daily medicine routine needs reminders that keep working without an account and without handing the schedule to a service, while sharing across devices should stay a deliberate choice."
implementation: "BytesFX built Medication Reminder as a local-first progressive web app. Schedules, dose records and settings live in the browser on the device, so the app opens and reminds offline. An account is optional and unlocks pairing, where a device is encrypted and claimed before any schedule moves between devices. The app presents what is stored locally and what has been shared, so the person using it can see which is which."
walkthrough: ["Open the schedules view to see the daily routine.",
               "Review the settings and the app's local-only storage boundary.",
               "See pairing and encrypted synchronization offered as an optional, account-backed step."]
note: "An organisational aid, not a medical device. No clinical or health-outcome claim is made. Screenshots show a synthetic sample schedule; no real medication record is shown."
image.src: "/projects/medication-reminder.png"
image.alt: "Medication Reminder schedules view with a synthetic sample routine of three reminder times"
image.width: 1440
image.height: 1000
imageCaption: "Medication Reminder's schedules view. Synthetic sample reminders; no real medication record is shown."
sections: [{title: "Local by default", body: "..."},
           {title: "Sharing is a deliberate step", body: "..."}]
workflow: {title: "How the reminder works", description: "...", lanes: [...2 lanes...]}
evidence: ["docs/superpowers/evidence/project-showcase/assets.md"]
```

`shikaku`:

```
id: "shikaku"
title: "Shikaku: Puzzle Quest"
kind: "owned-product"
publishState: "published"
featuredOrder: null
liveUrl: "https://shikaku.bytesai.uk/"
liveActionLabel: "Play Shikaku"
caseStudyPath: "/projects/shikaku/"
repositoryUrls: ["https://github.com/jared0565/shikaku"]
summary: "A playable logic-puzzle experience combines solo challenges with real-time 1v1 battles, rankings and cross-device QR sharing."
capabilities: ["Solo logic puzzles", "Real-time 1v1 battles", "ELO rankings and leaderboards"]
deliveryScope: ["Puzzle board, level set and game rules",
                "Real-time multiplayer battles over edge functions",
                "ELO matchmaking and leaderboard storage",
                "Accounts, QR sharing and session resume",
                "Static hosting, edge functions and delivery"]
problem: "A logic puzzle needs enough depth to hold attention, a way to play against another person, and a record of how a player improves."
implementation: "BytesFX built Shikaku as a browser game: a solo puzzle mode with a level set, a real-time 1v1 arena, ELO-based matchmaking, leaderboards, accounts and QR sharing between devices. Solo play works as a guest; an account is what unlocks rankings, matchmaking and sharing."
walkthrough: ["Open the puzzle board and read the rules.",
               "Play a solo puzzle as a guest.",
               "See the battle arena and leaderboard entries."]
note: "A game. Guest play was used for capture: no account was created, no matchmaking entered and no score submitted. No puzzle count is claimed, because the published material disagrees."
image.src: "/projects/shikaku.png"
image.alt: "Shikaku puzzle board with a numbered grid, ready for a guest to play"
image.width: 1440
image.height: 1000
imageCaption: "Shikaku's guest puzzle board. Captured without an account; no score was submitted."
sections: [{title: "...", body: "..."}, {title: "...", body: "..."}]
workflow: {title: "How a session runs", description: "...", lanes: [...2 lanes...]}
evidence: ["docs/superpowers/evidence/project-showcase/assets.md"]
```

For each of the two records, the `sections` bodies and the workflow lanes are written by the implementer, following the pattern the navigation branch's records already use: each section body names the actor, the interface and the boundary; each workflow lane has 2–5 steps whose `body` is one concrete sentence, with `ownerAction: true` on a step that a person must confirm. Every string must pass the banned-terms list and the 12–40-word band where it is a summary.

- [x] **Step 4: Allowlist the two new hosts**

In `bytes-website/src/showcase-html.js`, change:

```js
const LIVE_HOSTS = new Set(['web.bytesfx.com','pivotparlor.com','activepaw.co.uk','learn.bytesai.uk','cafe.bytesfx.com','file-converter.bmorris0565.workers.dev']);
```

to add `'medication.bytesfx.com'` and `'shikaku.bytesai.uk'`.

- [x] **Step 5: Run the test to verify it passes**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: PASS — all tests green.

- [x] **Step 6: Run the whole build to confirm nothing else broke**

Run: `npm run build` from `bytes-website/`
Expected: the build passes consent, navigation and catalogue checks and the Vite build, then `check-showcase-pages.mjs` fails with `missing built page` for `/projects/medication-reminder/` and `/projects/shikaku/`. That failure is expected at this point — the two case-study shells arrive in Task 4. Everything before it must pass.

- [x] **Step 7: Commit**

```powershell
git add bytes-website/src/showcase-content.js bytes-website/src/showcase-html.js bytes-website/scripts/test-showcase-content.mjs
git diff --cached --check
aramid check --staged
git commit -m "feat(showcase): publish seven projects and retire the BytesFX case record"
```

---

### Task 2: The index leads with the BytesFX product proof

**Files:**
- Modify: `bytes-website/src/showcase-html.js` (`projectIndexHTML`, and the deletion of `bytesfxScreensHTML` and the `isBytesFX` branch in `projectCaseHTML`)
- Modify: `bytes-website/scripts/test-showcase-content.mjs`
- Test: `bytes-website/scripts/test-showcase-content.mjs`

**Interfaces:**
- Consumes: `publishedProjects()`, `kindLabels`, `escapeHTML` (all from `showcase-html.js`); the image `/projects/bytesfx-pipeline.png` at 1440 × 1000.
- Produces: `projectIndexHTML(records)` returning the index section; the index contains exactly seven `data-project="<id>"` cards in catalogue order, preceded by the product-proof feature.

- [x] **Step 1: Write the failing test**

Replace the existing test `the catalogue leads with the owned BytesFX system and labels sample data` with:

```js
test('the index leads with the BytesFX product proof and lists seven project cards', () => {
  const html = projectIndexHTML(projects);
  assert.ok(html.includes('/projects/bytesfx-pipeline.png'));
  assert.ok(html.includes('href="/ai-chatbot/#product-workflow"'));
  assert.ok(html.includes('href="/ai-chatbot/"'));
  assert.ok(html.includes('synthetic'), 'the product proof must label its sample data');
  assert.ok(!html.includes('data-project="bytesfx"'), 'the retired record must not appear as a card');
  const ids = [...html.matchAll(/data-project="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['pivot-parlor','active-paw','bytesai-learning','cafe-bookings','file-converter','medication-reminder','shikaku']);
  assert.ok(html.indexOf('bytesfx-pipeline.png') < html.indexOf('data-project="pivot-parlor"'));
  assert.ok(!html.includes('showcase-workflow'), 'the index must not repeat the chatbot page workflow');
  assert.ok(!html.includes('bytesfx-lead.png') && !html.includes('bytesfx-proposal.png'), 'the lead and proposal screens stay on the chatbot page');
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: FAIL — the index still renders a `bytesfx` flagship card and no `/ai-chatbot/#product-workflow` link.

- [x] **Step 3: Replace the flagship card with the product-proof feature**

In `projectIndexHTML`, remove the `flagship` lookup and the `showcase-flagship` block, and insert a product-proof feature before the card grid:

- an `<img>` of `/projects/bytesfx-pipeline.png` with `width="1440" height="1000"` and alt text naming it as the actual BytesFX dashboard with invented contacts and amounts;
- a caption containing the words *synthetic sample data*;
- two links: *View project* → `/ai-chatbot/#product-workflow`, *Explore the chatbot* → `/ai-chatbot/`;
- no workflow list, no lead/proposal screens, no pipeline steps — those stay on the AI Chatbot page.

Reuse `imageHTML()` so the image keeps the escaped-attribute and dimension contract.

- [x] **Step 4: Remove the BytesFX-only case branches**

Delete the `bytesfxScreensHTML` function and the `const isBytesFX = ...` / `bytesfxScreensHTML() + trialHTML()` branch in `projectCaseHTML`, so every case study ends with the enquiry return block. `trialHTML()` becomes unused — delete it too, and check no other module imports it.

- [x] **Step 5: Run the test to verify it passes**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: PASS.

- [x] **Step 6: Commit**

```powershell
git add bytes-website/src/showcase-html.js bytes-website/scripts/test-showcase-content.mjs
git diff --cached --check
aramid check --staged
git commit -m "feat(showcase): lead the work index with the BytesFX product proof"
```

---

### Task 3: Card contract — three capabilities, readable summaries

**Files:**
- Modify: `bytes-website/src/showcase-html.js` (`projectCardHTML`)
- Modify: `bytes-website/src/showcase-content.js` (the summaries named in Fixed decision 5)
- Modify: `bytes-website/scripts/test-showcase-content.mjs`
- Test: `bytes-website/scripts/test-showcase-content.mjs`

**Interfaces:**
- Consumes: the published records from Task 1.
- Produces: `projectCardHTML(record, headingLevel)` — unchanged signature; a card contains at most three capability items.

- [x] **Step 1: Write the failing test**

```js
test('a card lists at most three capabilities', () => {
  for (const p of publishedProjects(projects)) {
    const html = projectCardHTML(p);
    const items = (html.match(/<li>/g) || []).length;
    assert.ok(items <= 3, p.id + ' lists ' + items + ' capabilities');
  }
});

test('published summaries stay inside a readable band', () => {
  for (const p of publishedProjects(projects)) {
    const words = p.summary.trim().split(/\s+/).length;
    assert.ok(words >= 12 && words <= 40, p.id + ' summary is ' + words + ' words');
  }
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: FAIL — every card currently renders four capabilities.

- [x] **Step 3: Cap the capabilities in the renderer**

In `projectCardHTML`, render `p.capabilities.slice(0, 3)` instead of `p.capabilities`. The case-study page keeps the full list; only the card is capped.

- [x] **Step 4: Apply the spec's four card summaries**

In `bytes-website/src/showcase-content.js`, set these four `summary` values verbatim from the spec:

```js
// pivot-parlor
"A multi-tenant platform where salons and barbershops create shops with individually branded frontends, supported by booking and staff-scheduling workflows."
// active-paw
"A customised Active Paw Shopify theme works with the PawScout backend to support demand-led product discovery, catalogue management and commerce automation."
// medication-reminder
"A privacy-focused reminder PWA combines local schedules and notifications with optional encrypted synchronization across paired devices."
// shikaku
"A playable logic-puzzle experience combines solo challenges with real-time 1v1 battles, rankings and cross-device QR sharing."
```

Leave `bytesai-learning`, `cafe-bookings` and `file-converter` summaries as the navigation branch wrote them; Task 6's editorial test proves they carry no banned term.

- [x] **Step 5: Confirm the three retained records cover the spec's scope for them**

The navigation branch's records for BytesAI Learning, BytesFX Cafe & Bookings and File Converter stay, but the spec names specific scope for each. Read each record's `implementation`, `sections`, `capabilities` and `note` against the spec and edit only what is missing:

- **BytesAI Learning** must reach beyond course discovery: verified-free course curation, provider and category exploration, personalised guidance, the learning quiz, progress tracking and the project's AI assistance. It must distinguish what a public visitor can inspect from signed-in or administrative capability, and make no claim about assistant quality or learning outcomes.
- **BytesFX Cafe & Bookings** must explain the hospitality content and booking workflow — menu, soft play, party information, calendar — and the isolated demonstration boundary. A synthetic submission or an unavailable real reservation must never read as customer usage.
- **File Converter** must lead with browser-based on-device conversion and the device-local saved-file library, cover the supported document, data and image workflows and the native reading views, and mention shared-browser storage. Its privacy statements come from its own documentation; the showcase is not a security audit and must not read as one.

Also confirm that the Active Paw and Pivot Parlor `implementation` fields keep their system relationship explicit — the theme working with the backend, and the platform creating individually branded tenant frontends — because the spec requires the relationship to be a dedicated, explicit part of `implementation`.

- [x] **Step 6: Point the Pivot Parlor card at the tenant demo**

In `bytes-website/src/showcase-content.js`, change the `pivot-parlor` record:

- `liveUrl` → `https://pivotparlor.com/ferdyms-barber-shop-014` (the spec's catalogue value);
- `liveActionLabel` → `Explore the demo shop`;
- `image` → `{src: '/projects/pivot-parlor.png', alt: 'Ferdy's Barber Shop: a Pivot Parlor tenant storefront with its own branding, services and team', width: 1440, height: 1000}` — the recaptured tenant storefront;
- `imageCaption` → `Ferdy's Barber Shop: one tenant storefront created with Pivot Parlor. Services, prices and team are illustrative, and the sample assistant uses scripted replies.`;
- `example` → the platform overview: `{title: 'The platform that creates it', caption: "Pivot Parlor's platform homepage: a salon or barbershop creates a shop and gives it its own branded frontend.", actionLabel: 'Explore the platform', image: {src: '/projects/pivot-platform.png', alt: 'Pivot Parlor platform homepage introducing branded shop creation, scheduling and booking', width: 1440, height: 1000}, url: 'https://pivotparlor.com/'}`;
- `walkthrough` → three steps that point at the platform first and the tenant second, and that repeat the illustrative/scripted caveat.

`pivot-platform.png` is not recaptured; it is the existing image and keeps its dimensions.

- [x] **Step 7: Run the test to verify it passes**

Run: `node --test scripts/test-showcase-content.mjs` from `bytes-website/`
Expected: PASS.

- [x] **Step 8: Commit**

```powershell
git add bytes-website/src/showcase-html.js bytes-website/src/showcase-content.js bytes-website/scripts/test-showcase-content.mjs
git diff --cached --check
aramid check --staged
git commit -m "feat(showcase): tighten project card copy to the approved summaries"
```

---

### Task 4: Nine routes — two new case studies, five updated shells, one retired

**Files:**
- Create: `bytes-website/projects/medication-reminder/index.html`
- Create: `bytes-website/projects/shikaku/index.html`
- Modify: `bytes-website/projects/{pivot-parlor,active-paw,bytesai-learning,cafe-bookings,file-converter}/index.html` (metadata only)
- Modify: `bytes-website/projects/index.html` (index metadata only)
- Modify: `bytes-website/vite.config.js`
- Modify: `bytes-website/public/sitemap.xml`
- Delete: `bytes-website/projects/bytesfx/index.html`
- Test: `bytes-website/scripts/check-showcase-pages.mjs`

**Interfaces:**
- Consumes: the catalogue from Task 1; each shell's `<!--@project-page-->` placeholder, replaced at build time by `projectCaseHTML`.
- Produces: nine built routes — `/ai-chatbot/`, `/projects/` and seven case studies — and seven case URLs in the sitemap.

- [x] **Step 1: Write the failing test**

In `bytes-website/scripts/check-showcase-pages.mjs`, the route list is already derived from the catalogue, so the failure appears as a missing built page. Add the explicit assertions the spec names:

```js
import { publishedProjects, featuredProjects, kindLabels, escapeHTML } from '../src/showcase-html.js';
// ...
check(publicProjects.length === 7, 'seven published projects expected');
const map = read('sitemap.xml');
const caseUrls = publicProjects.map(p => 'https://web.bytesfx.com' + p.caseStudyPath);
check(caseUrls.every(u => map.includes('<loc>' + u + '</loc>')), 'sitemap case URL missing');
```

Move the existing `const map = read('sitemap.xml');` line above the route loop so the sitemap is available there, and inside the per-route loop add shell/catalogue parity for the case routes:

```js
const record = publicProjects.find(p => route === p.caseStudyPath);
if (record) {
  check(html.includes('<meta name="description" content="' + escapeHTML(record.summary) + '">'), route + ': shell description differs from the catalogue summary');
  check(html.includes('<meta property="og:description" content="' + escapeHTML(record.summary) + '">'), route + ': og description differs from the catalogue summary');
  check(html.includes('<meta property="og:title" content="' + escapeHTML(record.title + ' | BytesFX Project') + '">'), route + ': og title differs from the catalogue title');
}
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm run build` from `bytes-website/`
Expected: FAIL — `check-showcase-pages.mjs` reports a missing built page for `/projects/medication-reminder/` and `/projects/shikaku/`, and the retired `/projects/bytesfx/` route.

- [x] **Step 3: Create the two new shells**

Copy `bytes-website/projects/pivot-parlor/index.html` twice. In each copy change only the `<head>` metadata and keep the body, nav, footer and `<script type="module" src="/src/projects-page.js">` exactly as they are:

`projects/medication-reminder/index.html`:

```html
<title>Medication Reminder | BytesFX Project</title>
<meta name="description" content="A privacy-focused reminder PWA combines local schedules and notifications with optional encrypted synchronization across paired devices.">
<link rel="canonical" href="https://web.bytesfx.com/projects/medication-reminder/">
<meta property="og:title" content="Medication Reminder | BytesFX Project">
<meta property="og:description" content="A privacy-focused reminder PWA combines local schedules and notifications with optional encrypted synchronization across paired devices.">
<meta property="og:url" content="https://web.bytesfx.com/projects/medication-reminder/">
```

`projects/shikaku/index.html`: the same pattern with `Shikaku: Puzzle Quest | BytesFX Project`, the Shikaku summary, and `/projects/shikaku/`.

- [x] **Step 4: Update the five existing shells' metadata**

For each of the five existing case shells, make `<meta name="description">`, `<meta property="og:description">` and `<meta property="og:title">` match the catalogue record exactly:

- `pivot-parlor`: the new multi-tenant summary; `<title>` stays `Pivot Parlor | BytesFX Project`.
- `active-paw`: the new Active Paw + PawScout summary; `<title>` becomes `Active Paw + PawScout | BytesFX Project`; `og:title` likewise; `og:description` the summary.
- `bytesai-learning`, `cafe-bookings`, `file-converter`: descriptions and og copy stay as they are unless Task 3 or Task 6 changed the catalogue summary — check each against the catalogue rather than assuming.

The `og:image` tag stays `https://web.bytesfx.com/og-trial.jpg` in every shell; the spec does not ask for per-project social images.

Write the description and og copy with the same escaping `escapeHTML` applies — `&` as `&amp;`, `<` as `&lt;`, `>` as `&gt;`, `"` as `&quot;`, `'` as `&#39;`. The parity check in step 1 compares against the escaped form, so a hand-typed apostrophe fails it.

- [x] **Step 5: Update the index shell's metadata**

`bytes-website/projects/index.html`: set the `<title>`, description and og copy to match the index introduction the renderer now produces — *What we've built* / *Built by BytesFX* and the one-line statement about owned products, a live store, platforms and clearly labelled demonstrations.

- [x] **Step 6: Update the Vite inputs and the sitemap**

`bytes-website/vite.config.js`: add `'medication-reminder': here('./projects/medication-reminder/index.html')` and `'shikaku': here('./projects/shikaku/index.html')` to `build.rollupOptions.input`, and remove the `bytesfx:` entry.

`bytes-website/public/sitemap.xml`: add the two case URLs in catalogue order after the existing case URLs, and remove the `<url><loc>https://web.bytesfx.com/projects/bytesfx/</loc></url>` entry if it is present.

- [x] **Step 7: Delete the retired case page**

Delete `bytes-website/projects/bytesfx/index.html`. It was never deployed, so nothing live points at it.

- [x] **Step 8: Run the build to verify it passes**

Run: `npm run build` from `bytes-website/`
Expected: PASS — the audit reports `9 built pages`, no missing page, no shell/catalogue mismatch.

- [x] **Step 9: Commit**

```powershell
git add bytes-website/projects bytes-website/vite.config.js bytes-website/public/sitemap.xml bytes-website/scripts/check-showcase-pages.mjs
git diff --cached --check
aramid check --staged
git commit -m "feat(showcase): publish the medication reminder and shikaku case studies"
```

---

### Task 5: Recapture the seven project images

**Files:**
- Modify: `bytes-website/scripts/capture-showcase-assets.mjs`
- Modify: `bytes-website/public/projects/{pivot-parlor,active-paw,bytesai-learning,cafe-bookings,file-converter}.png`
- Create: `bytes-website/public/projects/{medication-reminder,shikaku}.png`
- Modify: `docs/superpowers/evidence/project-showcase/assets.md`
- Test: the capture script's own output plus `npm run build`'s PNG-dimension check

**Interfaces:**
- Consumes: the capture workflow in `scripts/capture-showcase-assets.mjs` — a Playwright CLI `run-code` file that blocks every non-GET/HEAD request, mocks the CRM and chat APIs, and writes to `bytes-website/public/projects/`.
- Produces: seven 1440 × 1000 PNG files whose declared dimensions match the catalogue metadata; a manifest row per image.

- [x] **Step 1: Extend the capture list**

In the capture script's list of external targets, keep the five existing entries, change Pivot Parlor's target to `https://pivotparlor.com/ferdyms-barber-shop-014` (it already is), and add:

```js
['medication-reminder','https://medication.bytesfx.com/'],
['shikaku','https://shikaku.bytesai.uk/']
```

- [x] **Step 2: Add the Medication Reminder capture**

The live app opens with a choice — *Continue on this device* — before its schedule view. The capture must:

1. `page.goto('https://medication.bytesfx.com/')`, then click the *Continue on this device* control.
2. Seed the browser's own storage with a synthetic schedule using `page.addInitScript`, so the app reads it on the next load:

```js
await page.addInitScript(() => {
  localStorage.setItem('medication-reminder-schedule-v1', JSON.stringify({
    version: 1,
    timezone: 'Europe/London',
    events: [
      { id: 'sample-morning', enabled: true, time: '08:00', label: 'Sample morning routine',
        medicines: ['Sample medication A - 10mg', 'Sample medication B - 5ml'],
        instructions: 'Synthetic sample entry. Not a real medication record.',
        days: ['mon','tue','wed','thu','fri','sat','sun'], start_date: null, end_date: null },
      { id: 'sample-midday', enabled: true, time: '13:00', label: 'Sample midday routine',
        medicines: ['Sample medication C - 1 tablet'],
        instructions: 'Synthetic sample entry. Not a real medication record.',
        days: ['mon','tue','wed','thu','fri','sat','sun'], start_date: null, end_date: null },
      { id: 'sample-evening', enabled: true, time: '20:00', label: 'Sample evening routine',
        medicines: ['Sample medication D - 2 tablets'],
        instructions: 'Synthetic sample entry. Not a real medication record.',
        days: ['mon','tue','wed','thu','fri','sat','sun'], start_date: null, end_date: null }
    ]
  }));
});
```

3. Reload, wait for the schedule view to render, and screenshot at 1440 × 1000 to `bytes-website/public/projects/medication-reminder.png`.

The seeded names must be visibly synthetic (`Sample medication A`) and must never contain a real medication, dose, or a person's name. Every non-GET/HEAD request stays blocked by the script's existing route rule, so no pairing, sync or account write reaches the service.

- [x] **Step 3: Add the Shikaku capture**

Navigate to `https://shikaku.bytesai.uk/`, wait for the puzzle board to render (the board's numbered grid), and screenshot at 1440 × 1000 to `bytes-website/public/projects/shikaku.png`. Do not register, do not enter matchmaking, do not submit a score — the capture is the guest screen only.

- [x] **Step 4: Recapture the five existing project images**

Re-run the same loop for `pivot-parlor`, `active-paw`, `bytesai-learning`, `cafe-bookings` and `file-converter` so all seven images share one framing, one viewport and one review pass.

- [x] **Step 5: Review every image by eye before continuing**

Open all seven PNGs. For each one confirm: no personal data, no credentials, no unintended real records, no confusing sample values, text readable at card size, an intentional crop, and no blank or loading frame. The medication image must show the seeded sample routine; the Shikaku image must show a rendered board, not a spinner.

- [x] **Step 6: Update the asset manifest**

In `docs/superpowers/evidence/project-showcase/assets.md`, add a row per image with: project id, source URL, the state captured, pixel dimensions, byte size, the meaning of the alt text, and whether the content is synthetic. Update the rows for the five recaptured images and remove any row for the retired BytesFX card image if one exists. `pivot-platform.png` stays in the manifest as the Pivot Parlor example image.

- [x] **Step 7: Run the build to verify the dimensions**

Run: `npm run build` from `bytes-website/`
Expected: PASS — the audit reads each PNG's IHDR and compares it with the catalogue metadata; a mismatch in either dimension fails the build.

- [x] **Step 8: Commit**

```powershell
git add bytes-website/scripts/capture-showcase-assets.mjs bytes-website/public/projects docs/superpowers/evidence/project-showcase/assets.md
git diff --cached --check
aramid check --staged
git commit -m "feat(showcase): recapture the seven project interfaces"
```

---

### Task 6: Editorial contract — banned terms and required relationship language

**Files:**
- Create: `bytes-website/scripts/test-showcase-editorial.mjs`
- Modify: `bytes-website/package.json` (the `build` script)
- Test: `bytes-website/scripts/test-showcase-editorial.mjs`

**Interfaces:**
- Consumes: `projects` from `src/showcase-content.js`; `publishedProjects`, `projectCardHTML`, `projectCaseHTML` from `src/showcase-html.js`; `escapeHTML` re-exported from `src/showcase-html.js`.
- Produces: `node --test scripts/test-showcase-editorial.mjs`, wired into `npm run build`.

- [x] **Step 1: Write the failing test**

Create `bytes-website/scripts/test-showcase-editorial.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from '../src/showcase-content.js';
import { publishedProjects, projectCardHTML, projectCaseHTML } from '../src/showcase-html.js';

const BANNED = ['seamless','cutting-edge','robust','innovative','delve','leverage','elevate','empower','world-class','next-generation','revolutionary','game-changing'];

const textOf = record => [
  record.title, record.summary, record.problem, record.implementation, record.note,
  record.liveActionLabel, ...(record.capabilities || []), ...(record.deliveryScope || []),
  ...(record.walkthrough || []), ...(record.sections || []).map(s => s.title + ' ' + s.body),
  ...(record.workflow ? [record.workflow.title, record.workflow.description,
    ...record.workflow.lanes.flatMap(l => [l.title, ...l.steps.flatMap(s => [s.title, s.body])])] : [])
].join(' ').toLowerCase();

test('no published project copy uses a banned filler term', () => {
  for (const p of publishedProjects(projects)) {
    for (const term of BANNED) {
      assert.ok(!textOf(p).includes(term), p.id + ' uses the banned term "' + term + '"');
    }
  }
});

test('the rendered cards and case studies are free of banned terms', () => {
  for (const p of publishedProjects(projects)) {
    const html = (projectCardHTML(p) + projectCaseHTML(p)).toLowerCase();
    for (const term of BANNED) {
      assert.ok(!html.includes(term), p.id + ' renders the banned term "' + term + '"');
    }
  }
});

test('the Active Paw and PawScout relationship is explicit', () => {
  const p = publishedProjects(projects).find(x => x.id === 'active-paw');
  assert.equal(p.title, 'Active Paw + PawScout');
  const text = textOf(p);
  assert.ok(text.includes('pawscout'), 'PawScout must be named');
  assert.ok(text.includes('shopify'), 'the Shopify theme must be named');
  assert.ok(text.includes('theme'), 'the theme must be named as the storefront');
});

test('the Pivot Parlor platform relationship is explicit', () => {
  const p = publishedProjects(projects).find(x => x.id === 'pivot-parlor');
  const text = textOf(p);
  assert.ok(text.includes('multi-tenant'), 'the multi-tenant model must be named');
  assert.ok(text.includes('branded'), 'the branded frontends must be named');
});
```

- [x] **Step 2: Run the test to verify it fails or passes honestly**

Run: `node --test scripts/test-showcase-editorial.mjs` from `bytes-website/`
Expected: PASS if no record carries a banned term, and a named failure naming the offending project and term if one does. Either outcome is informative; a failure means Task 3's copy needs editing before it can proceed, and the failure message names exactly which record and term.

- [x] **Step 3: Wire the test into the build**

In `bytes-website/package.json`, insert `node --test scripts/test-showcase-editorial.mjs` into the `build` script, immediately after `node --test scripts/test-showcase-content.mjs`.

- [x] **Step 4: Run the build**

Run: `npm run build` from `bytes-website/`
Expected: PASS, with the editorial suite counted among the build's tests.

- [x] **Step 5: Commit**

```powershell
git add bytes-website/scripts/test-showcase-editorial.mjs bytes-website/package.json
git diff --cached --check
aramid check --staged
git commit -m "test(showcase): enforce the editorial vocabulary and system relationships"
```

---

### Task 7: Nine-route browser review

**Files:**
- Modify: `bytes-website/scripts/review-system-cases.mjs`
- Modify: `bytes-website/scripts/review-our-work.mjs`
- Modify: `bytes-website/scripts/check-showcase-pages.mjs`
- Test: the two review scripts and the build audit

**Interfaces:**
- Consumes: the local production preview at `http://127.0.0.1:4173` (`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` from `bytes-website/`).
- Produces: a pass/fail record for every route at every width, saved under `output/playwright/` (never staged).

- [x] **Step 1: Update the case-study review for seven cases and four widths**

In `bytes-website/scripts/review-system-cases.mjs`:

- the case count check becomes `cases.length===7`;
- the width list becomes `[1440, 768, 390, 320]`;
- the case list is read from the catalogue (`[data-project]` on `/projects/`) rather than hard-coded, so the new cases are covered automatically;
- the scope-count check `=== 2` becomes `=== p.sections.length`, read per case — the two new records carry the two sections Task 1 defines, and this keeps the check honest if a section count changes;
- add a per-case check that the case's own `data-project` slug appears in the URL, and that its kind label is rendered.

- [x] **Step 2: Add the action and keyboard checks the spec names**

In the same file, for the index and each case, verify: every card's *View project* link opens the matching case route; every card's external action carries the project's live-action label; the keyboard reaches every card action and every case-page action in order (tab from the page start reaches the first action, and focus is visible); images under `/projects/` all load (`naturalWidth > 0`); and `prefers-reduced-motion` is honoured (the review already runs with `reducedMotion: 'reduce'`).

- [x] **Step 3: Update the index review**

In `bytes-website/scripts/review-our-work.mjs`:

- the case count becomes `7` in both places it is asserted;
- the flagship-card check is replaced by a product-proof check: the index contains the pipeline image, the *View project* link resolves to `/ai-chatbot/#product-workflow` and the *Explore the chatbot* link to `/ai-chatbot/`;
- the retired route is removed from the screenshot list and from `routes`;
- the route list keeps the seven case routes read from the catalogue.

- [x] **Step 4: Strengthen the built-output audit**

In `bytes-website/scripts/check-showcase-pages.mjs`, add:

- the nine-route count assertion and the seven-case sitemap assertion from Task 4;
- an assertion that no built page contains `href="/projects/bytesfx/"`;
- an assertion that each case page's `<title>` is unique and matches `<project title> | BytesFX Project`;
- an assertion that the index contains no `data-project="bytesfx"`.

- [x] **Step 5: Run the build, the mutation self-test and the reviews**

Run, from `bytes-website/`:

```powershell
npm run build
node scripts/check-showcase-pages.mjs --self-test
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

The `--self-test` run must report that the negative mutations were detected; a mutation that escapes detection means the checker no longer proves what it claims, and the checker must be tightened before the reviews are trusted.

Then, in a second shell, the review scripts through the existing Playwright CLI:

```powershell
playwright-cli run-code --filename bytes-website/scripts/review-system-cases.mjs --raw
playwright-cli run-code --filename bytes-website/scripts/review-our-work.mjs --raw
```

Expected: both return `failures: []` and `productionWritesForwarded: 0`. Any failure names the width, the route and the check.

- [x] **Step 6: Commit**

```powershell
git add bytes-website/scripts/review-system-cases.mjs bytes-website/scripts/review-our-work.mjs bytes-website/scripts/check-showcase-pages.mjs
git diff --cached --check
aramid check --staged
git commit -m "test(showcase): review all nine routes across four widths"
```

---

### Task 8: Impeccable polish

**Files:**
- Modify: only the files the polish findings name — expected: `bytes-website/src/showcase.css`, possibly `bytes-website/src/showcase-html.js`

**Interfaces:**
- Consumes: the `impeccable` skill (Skill tool, `impeccable`) and its polish workflow; the built preview at `http://127.0.0.1:4173`.
- Produces: a reviewed visual pass, not a redesign.

- [x] **Step 1: Read the craft floor and run the detector once**

Invoke the `impeccable` skill and follow its polish workflow on the index-to-case-study path: read the craft floor before any UI edit, then run the mechanical detector **once**.

- [x] **Step 2: Inspect desktop and mobile together**

Look at `/projects/`, `/projects/medication-reminder/` and `/projects/shikaku/` at 1440 and 390 side by side. The index must stay scannable: seven cards with real screenshots, one summary each, at most three capabilities, and two clear actions per card.

- [x] **Step 3: Classify and fix at the narrowest correct level**

Classify each finding as a missing token, a one-off implementation, a conceptual mismatch or a local defect, and fix it at that level. Reuse `--ink-*`, `--text*`, `--amber`, `--mint`, `--line*`, `--font-*` and `--s-*`. Add no new colour, no gradient text, no glass card, no badge, no emoji, no glow, no grain, no floating shape, no motion added only to look polished.

- [x] **Step 4: Fix in one batch, then one confirmation pass**

Apply all findings in one batch, then allow **one** confirmation pass. The expansion has its own two-pass visual budget; the showcase's completed passes are not reused and not re-counted.

- [x] **Step 5: Re-run the build and the reviews**

Run: `npm run build`, then the two review scripts as in Task 7.
Expected: PASS, with the same check counts or more, and no new failure.

- [x] **Step 6: Commit**

```powershell
git add bytes-website/src/showcase.css bytes-website/src/showcase-html.js
git diff --cached --check
aramid check --staged
git commit -m "style(showcase): polish the work index and case-study path"
```

Stage only the files actually changed; if a file was not changed, do not stage it.

---

### Task 9: Evidence, status and handover

**Files:**
- Modify: `docs/superpowers/plans/our-work-status.md`
- Modify: `docs/superpowers/evidence/project-showcase/verification.md`
- Create: `docs/superpowers/evidence/project-showcase/expansion-verification.md`

**Interfaces:**
- Consumes: the check results from Tasks 1–8.
- Produces: the review record the owner reads before deciding on release.

- [x] **Step 1: Write the expansion verification record**

Create `docs/superpowers/evidence/project-showcase/expansion-verification.md` recording, for each task: the command run, its exit status, and what it proved. Include the build result, the catalogue and editorial test results, the built-output audit's route count, the two review scripts' check counts, and the image review outcome from Task 5 step 5.

- [x] **Step 2: Update the verification evidence**

Append to `docs/superpowers/evidence/project-showcase/verification.md` the new route set, the recaptured image inventory and the two new projects' boundaries (what a public visitor can inspect, and what needs an account).

- [x] **Step 3: Update the status checkpoint**

In `docs/superpowers/plans/our-work-status.md`, add a section recording: the branch, the commit range, what was implemented, what was validated with which commands, the two-pass visual budget consumed, the remaining boundary (no merge, no push, no PR, no deployment), and the next step (owner review). Preserve the existing sections; they are the history of the previous checkpoint.

- [x] **Step 4: Record the handover**

Run, from the repository root:

```powershell
aramid handover write --file docs/superpowers/plans/our-work-status.md --author Claude --replace
```

- [x] **Step 5: Commit**

```powershell
git add docs/superpowers/plans/our-work-status.md docs/superpowers/evidence/project-showcase
git diff --cached --check
aramid check --staged
git commit -m "docs(showcase): record the expansion verification checkpoint"
```

---

## Stop here

This plan ends with a reviewed feature branch and evidence. It does not merge, push, open a PR or deploy. A push to `main` deploys the chatbot API, the CRM API and the website, so release needs separate explicit owner authorization, and the owner reviews the local preview before that.
