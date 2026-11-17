# Execution ledger — project showcase expansion

Repo: F:\Projects\BytesFX Website\Bytes-Web — branch `ux/our-work-navigation`, BASE `080b33f`.
Spec: docs/superpowers/specs/2026-11-05-project-showcase-expansion-design.md (owner-approved scope; the binding authority).
Execution: native (executing-plans). The plan is the argument; the spec is the authority.

## Pre-flight scan (shared interfaces between tasks)

- T1 produces `publishedProjects()` → 7 records in catalogue order, `featuredProjects()` → 3 ids.
  T2, T3, T4, T6 and T7 consume both. Consistent: no naming conflict, no signature change.
- T1 removes the `bytesfx` catalogue record. T2's Step 1 replaces the existing test
  `the catalogue leads with the owned BytesFX system and labels sample data`, which dereferences
  `projects.find(p => p.id === 'bytesfx')`. **Conflict** — between T1 and T2 that test throws on an
  undefined record, so T1's own "suite passes" step cannot hold.
  → Ruling R1 below.
- T3 changes Pivot Parlor's `summary`, `liveUrl` and `image`. T4 Step 4 updates the five existing
  shells' metadata to match the catalogue. T3 precedes T4, and T4's text says to check each shell
  against the catalogue rather than assume. Consistent.
- T6 creates `scripts/test-showcase-editorial.mjs` and adds it to the `build` script in
  `bytes-website/package.json`. T7 and T8 run `npm run build`. Consistent.
- T7 Step 1 asks the browser-side review script to compare the scope-section count with
  `p.sections.length`. The review script runs inside the Playwright page and cannot import the
  catalogue. **Conflict** → Ruling R3 below.

## Rulings

- R1 — Task 1 also deletes the existing test `the catalogue leads with the owned BytesFX system and
  labels sample data`. It asserts on the `bytesfx` record that Task 1 removes, so it cannot survive
  the change; Task 2 adds the replacement test for the product-proof index lead. Deleting it in
  Task 1 (rather than waiting for Task 2) is what keeps Task 1's own suite green. — Cost if wrong:
  one commit is rewritten to restore it, and the index-lead assertion reappears in Task 2 anyway.
- R2 — Task 6's editorial test is a guard over content that may already comply, so it can pass on
  first run. The plan's Step 2 therefore requires a red proof: inject a banned term into one
  record, watch the test fail, then revert. A guard that has never been seen to fail is not a
  guard. — Cost if wrong: a vacuous test ships; the red proof removes that risk at no cost.
- R3 — Task 7's browser-side scope-section check stays `>= 2`. The exact per-record count is
  enforced by the node-side build audit (`check-showcase-pages.mjs`), which reads the catalogue
  directly; the browser script cannot. — Cost if wrong: the browser check is one notch weaker
  than the plan implied, while the exact check still exists in the build audit.
Task 1: complete (commits 080b33f..d42f815, tests: node --test bytes-website/scripts/test-showcase-content.mjs → ℹ duration_ms 115.7662)

- R4 — Task 1 Step 6 predicted the build would fail with `missing built page`; it failed with an
  uncaught ENOENT instead, because `check-showcase-pages.mjs` reads each project's PNG without
  guarding it and the two new images do not exist until Task 5. The substance holds: the build must
  not pass before the routes and images exist. No code change in Task 1. Task 4, which already edits
  that file, will guard the image read so a missing image is reported as a failure rather than
  crashing the checker. — Cost if wrong: the checker crashes instead of listing its findings, which is
  less readable but still fails the build.

- R5 — Task 2 Step 1 said to *replace* the bytesfx index test, but R1 had already removed it in
  Task 1. Task 2 therefore *adds* the new index test with the planned assertions. — Cost if
  wrong: none; the same assertions run either way.
- R6 — Task 2 also adds the product-proof feature's CSS to `bytes-website/src/showcase.css`. The
  plan named no CSS for this task, but the new block would otherwise ship unstyled between
  Tasks 2 and 8. The rules reuse existing tokens only (`--line-strong`, `--text-dim`,
  `--font-display`) and the mobile rule joins the existing 767px single-column list.
  Task 8 refines it. — Cost if wrong: Task 8 revisits the same file anyway.
Task 2: complete (commits d42f815..1f283fc, tests: node --test bytes-website/scripts/test-showcase-content.mjs → ℹ duration_ms 186.2858)

- R7 — Task 3 also removed the card's dead `p.id==='bytesfx'` synthetic-sample paragraph. It
  belonged to the record Task 1 retired, and Task 2 removed the other BytesFX branches.
  — Cost if wrong: none; no published record can reach it.
- R8 — The spec asks BytesAI Learning's case to cover verified-free course curation.
  Rather than assert that from the project repository, which this repository's isolation
  rule puts out of reach without the owner's approval, it was checked against the public
  product at https://learn.bytesai.uk/, whose own copy says it curates and verifies free AI
  courses and marks each course free. The case now states that, together with provider and
  category browsing and the personalised guidance. The claim is the product's own public claim.
  — Cost if wrong: one line of the case study changes if the product stops saying it.
Task 3: complete (commits 1f283fc..046402d, tests: node --test bytes-website/scripts/test-showcase-content.mjs → ℹ duration_ms 125.6353)
Task 4: complete (commits 046402d..4258e70, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)
Task 5: complete (commits 046402d..4258e70, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)

- R9 — The repository does not build green between Tasks 1 and 5, by construction: the
  catalogue published in Task 1 points at two case-study routes (Task 4) and two images
  (Task 5) that do not exist yet, and the built-output audit reports each missing one.
  The plan's Task 4 Step 8 expected a passing build at the end of Task 4, which the
  image task's ordering makes impossible, so Task 4's verification is the same green build
  run after Task 5. The first green build is at Task 5 and every state is verified.
  — Cost if wrong: none; the end state is green and each earlier failure named the artefact
  that had not arrived yet.
- R10 — The capture ran with an absolute output root because the browser session's working
  directory is the session's primary directory, not the checkout. The committed script keeps the
  repository's convention (paths relative to the checkout root, as its header states) and the
  run used the same code with only that one constant changed.
  — Cost if wrong: the committed script would write to the wrong place if run from a
  different working directory, which is exactly what its header warns about.
- R11 — The capture script needed two corrections the first pass exposed, both now in the
  committed file: the synthetic fixture is only parsed when the response is JSON (a running
  preview server answers HTML for that path), and a cookie banner or the Pivot Parlor install
  prompt is dismissed before the shot. The first pass had produced three images covered by an
  overlay; all seven were recaptured and reviewed by eye afterwards.
  — Cost if wrong: a covered image, which the eye review would have caught anyway.
Task 6: complete (commits 4258e70..2a44d9b, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)
- R12 — The output checker's negative-mutation self-test targeted `src="/projects/pivot-platform.png"` on the chatbot page. Task 3 moved Pivot Parlor's card image to the tenant storefront, so that string was no longer there and the mutation became a no-op: the self-test reported "checker mutation escaped detection". The mutant now targets the pipeline screenshot the chatbot page always shows, and all five mutations are detected again. The self-test found this on its own, which is what it is for. — Cost if wrong: none; the guard is back in force.
- R13 — The two review scripts were run through the Playwright browser tool's code runner rather than the repository's `playwright-cli run-code`, because the installed playwright.exe has no `run-code` command. The script source is unchanged; only the screenshot output paths were made absolute, because the browser session's working directory is the session's primary directory rather than the checkout. Results: 344/344 case checks and 308/308 index checks, no runtime errors, no production writes. — Cost if wrong: none; the checks that ran are the committed ones.
Task 7: complete (commits 2a44d9b..fa8fd31, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)
- R14 — The Impeccable detector reported thirty findings against the three case-study shells, and every one of them sits outside the index-to-case-study path: the legacy site stylesheet (gradient text, violet accents), the chat widget's typing and status dots, the homepage's ticker marquee, and the dashboard and onboarding sheets. The detector scans each page's whole style graph, so it attributes them to the page rather than to the element. The showcase's own stylesheet produced no finding, and the pages the path loads do not use the flagged rules: the brand logo's `.highlight` is a solid colour, not a gradient. Fixing them would mean changing the site's shared visual world, which the design spec forbids. — Cost if wrong: pre-existing slop elsewhere on the site stays, which is the site's own backlog and not this expansion's.
- R15 — The craft floor bans a kicker above a heading. The showcase's "Built by BytesFX" and "Workflow" labels are that pattern, and they are the site's established one: the same kicker appears on the chatbot page, the homepage and the legal pages. Removing it from the showcase alone would make these pages disagree with the rest of the site; removing it site-wide is a redesign of the shared visual world, which the spec forbids. The incumbent pattern was kept, and the workflow's 01/02/03 step numbers stay because the sequence is the information there. — Cost if wrong: the pages carry a pattern the craft floor would rather not see, which the owner can change in one pass later.
Task 8: complete (commits fa8fd31..b5b7590, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)
Task 9: complete (commits b5b7590..99e20b2, tests: npm --prefix bytes-website run build → [showcase] 9 built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified)
- R16 — **The branch's baseline is stale, and the retirement premise is now false.** `origin/main` moved to `fae34e7` (PR #105, "Make Our Work prominent and expand system case studies", merged and deployed on 5 November), a squash of this branch's own six commits. Verified independently: `git diff a93054f fae34e7` is empty, `https://web.bytesfx.com/projects/bytesfx/` answers HTTP 200, and the live sitemap lists it. The plan's Fixed Decision 1 — "the case page was never deployed, main ships five case studies, so retiring it removes nothing from the live site" — was true when written and is false now. The branch was deliberately **not** rebased or merged: rebasing means resolving eleven conflicts, and which way the bytesfx page resolves is the owner's decision (retire it and lose a live, linked URL, and the project has no redirect mechanism today; or keep it and reverse Fixed Decision 1). What was done instead is to make the gate loud: the built-output audit now fails if the built case set differs from the catalogue, or if the sitemap lists the retired route. — Cost if wrong: the branch is merged as-is and ships an unfilled `<!--@project-page-->` at a URL search engines already know.
- R17 — Review fix: the catalogue rejects a featured rank above three instead of letting the featured slice hide the record. Test: *a featured rank beyond the three featured slots is rejected, not silently dropped*. — Cost if wrong: a project the owner meant to feature has to be given rank 1–3 or no rank; that is the intent.
- R18 — Review fix: the editorial guard now reads the eight static case-study shells and the work index renderer, not only the catalogue. Red proof: `seamless` injected into the Shikaku shell title made the test fail, and the injection was reverted. — Cost if wrong: none; the copy is clean today and now stays clean.
- R19 — Review fix: the built-output audit asserts that the built case set equals the catalogue's seven slugs and that the sitemap lists no retired route; both are covered by new self-test mutants, so the guard is now seven mutations rather than five. — Cost if wrong: none.
- R20 — Review fix: `scripts/verify-showcase-ui.mjs` no longer visits the retired route and now names all seven published cases; the capture's overlay dismissal matches the real button label ("Got it", with no exclamation mark) and the Pivot platform image is captured again, so the two Pivot frames no longer carry the site's cookie banner. — Cost if wrong: none.
- R21 — Review issue 5 (the architectural claims): the review could not substantiate "Worker API for pairing claims and cross-device sync" or Shikaku's "edge functions" from this checkout, because those claims are about the products' own repositories. They are supported — Medication Reminder ships `worker/` with its own `wrangler.jsonc` and the scoped-pairing-credential migration; Shikaku ships Cloudflare Pages Functions including `match.js`, `leaderboard.js` and `share.js` with a `LEADERBOARD_KV` binding. The provenance is now recorded in `docs/superpowers/evidence/project-showcase/new-project-scope.md` and cited by both records, and the read boundary is stated there: documentation and structure only, no code run or modified, public GET only. No claim was softened, because none was unsupported. — Cost if wrong: if a product drops that architecture, one delivery-scope line and its evidence row need updating.
