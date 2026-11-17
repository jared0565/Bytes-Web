# Our Work checkpoint — 5 November 2026

Implemented on `ux/our-work-navigation`, based on released `origin/main` 2008892.
The owner approved implementation and a preview before deployment. No merge,
push, PR or deployment has been performed for this change.

Delivered: Our Work navigation across marketing and legal pages; compact homepage
and chatbot previews; Built by BytesFX attribution and delivery scope for all six
projects; a featured BytesFX Chat & Sales case study; accurate project labels,
sample-data disclosures, relevant enquiry/trial actions and sitemap entry.

Validation:
- `npm run build` in `bytes-website`: passed, including consent, five navigation
  tests, nine catalogue tests, chatbot output checks and eight showcase pages.
- `node scripts/check-showcase-pages.mjs --self-test`: passed; five negative
  output mutations detected.
- `scripts/review-our-work.mjs` through the existing Playwright CLI: 437/437 checks,
  zero runtime errors, zero production writes forwarded. Thirteen routes at
  widths 1440, 1024, 800, 769, 768, 390 and 320; 200% text and real local project
  navigation. Layout fixes include the legal-page tablet header and text wrapping.
- `aramid check --staged --strict --json`: exit 0, no findings or degraded tools.
  This root gate runs secret checks; JS validation above is run in the website.
- `git diff --cached --check`: passed. Graphite reports a fresh shared graph.

Local preview: http://127.0.0.1:4173/projects/ (Vite preview session 75749).
Homepage: http://127.0.0.1:4173/ . Start again if the preview process has ended:
`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` in `bytes-website`.

Screenshots and result summary: `output/playwright/our-work/` (local review files,
not staged). Includes desktop/mobile catalogue, homepage and BytesFX case study,
chatbot preview and open mobile menu. Existing owner untracked files preserved.
No packages installed and no worker/backend production source changed.

Next: owner reviews the preview. Release requires the owner to request deployment;
a push to main deploys production components. Preserve this checkpoint and do not
reopen completed implementation work without new feedback.

## Review follow-up: public repository links

Owner requested removing GitHub links because the projects are offered as a
service. Removed the Technical work/repository section from all six public case
studies. Delivery scope, live projects and demos remain. Repository references
remain internal build-time evidence, never rendered in public pages. The output
checker now rejects GitHub links across the showcase routes. Website build and
output self-test pass after this change; no additional layout or interaction
changes and no deployment.

## Review follow-up: Pivot Parlor platform scope

Owner clarified that the generated shop substantially understated the project:
Pivot Parlor creates individual shops with unique frontends. Updated card,
homepage/chatbot previews, project classification, delivery scope, walkthrough,
metadata and main destination to represent the platform. Captured its public
homepage as the main image. The existing generated-shop screenshot and demo
remain in a distinct example section. Public GitHub links remain absent.

Website build, nine catalogue tests and output self-test pass. Focused browser
review passed 45/45 checks for homepage, chatbot, catalogue and Pivot case at
1440, 390 and 320px, including both images, destinations and 200% text. No
production writes forwarded. Screenshots: `output/playwright/our-work/pivot-case-*`.
Evidence and claim boundaries: `docs/superpowers/evidence/project-showcase/pivot-platform.md`.

Awaiting the owner's clarification of the additional surfaces meant by
“multi-platform”; no native apps or unpublished management portals are claimed.
No deployment performed.

## System-level case-study revision

The owner requested a full documentation audit and stronger briefs/diagrams for
all projects, and explicitly allowed documentation-only reads of the six related
repositories. Audit reports and pinned inventory are in
`docs/superpowers/evidence/project-showcase/*-doc-audit.md` and
`documentation-inventory.md`. No external source/config/runtime was read, and
no other repository was modified. Five PDF documents were subsequently decoded
and extracted; old proposal forecasts are not used as customer results.

All six existing case-study pages now have full-system briefs, operational scope,
integrations and static workflow diagrams. Active Paw is presented together with
PawScout. Human-action markers preserve the documented review/funding boundaries.
Planned/dormant capabilities and unverified business outcomes are excluded.

Validation: website build passed (consent, five navigation tests, eleven catalogue
tests, chatbot output and eight-page showcase checks); five negative output
mutations detected. Final browser review: **278/278**, no runtime errors, zero
production writes forwarded. All six cases at 1440, 1024, 768, 390 and 320px,
including 200% text, arrow direction, image loading, workflow completeness and
project navigation. Diagram text/arrow measurements were separated in the verifier;
inherited nested-section spacing and long-word wrapping were corrected.

Local preview remains http://127.0.0.1:4173/projects/ . Start with
http://127.0.0.1:4173/projects/active-paw/ for the most substantial correction.
Final diagram screenshots and the Active Paw full-page previews are under
`output/playwright/system-cases/`. Raw audit snapshots, PDFs and extraction files
are local-only under `output/project-doc-audit/`; never stage or publish them.

No package installed, backend changed, PR opened, merge or deployment performed.
Next: owner reviews the expanded pages before any requested release.

## Expansion checkpoint — 6 November 2026 (seven projects, owner-approved scope)

Implemented on `ux/our-work-navigation`, on top of the six commits above. Planning only was
authorised before implementation; no merge, push, PR or deployment has been performed for this
work, and none is authorised by this checkpoint.

Delivered: the owner-approved expansion from
`docs/superpowers/specs/2026-11-05-project-showcase-expansion-design.md`. The catalogue now
publishes seven projects — Pivot Parlor, Active Paw + PawScout, BytesAI Learning, BytesFX Cafe &
Bookings, File Converter, Medication Reminder and Shikaku — in that order, each with a card and
a static case study. The index leads with a BytesFX product-proof feature that points into the
chatbot page instead of repeating it. The BytesFX catalogue record and its undeployed
`/projects/bytesfx/` case page are retired; the draft BytesCRM record is untouched.

Plan: `docs/superpowers/plans/2026-11-06-project-showcase-expansion.md` (nine tasks, each with
its own test cycle and commit). Commits `d42f815` catalogue, `1f283fc` index lead, `046402d`
card copy, `598b2c0` routes and shells, `4258e70` images, `2a44d9b` editorial test, `fa8fd31`
browser review, `b5b7590` polish. Plan and spec committed at `080b33f`.

Validation:
- `npm --prefix bytes-website run build`: exit 0 — consent checks, navigation tests, 18
  catalogue tests, 5 editorial tests, Vite build, chatbot output check, and the showcase audit
  reporting 9 built pages with routes, ownership, image metadata, trial paths and the draft
  boundary verified.
- `node bytes-website/scripts/check-showcase-pages.mjs --self-test`: exit 0; five negative output
  mutations detected. The self-test also caught one of its own mutants going stale after the
  Pivot Parlor card image changed, which was fixed.
- `scripts/review-system-cases.mjs`: 344/344 checks, zero runtime errors, zero production writes.
  `scripts/review-our-work.mjs`: 308/308 checks, same. Both run again after the polish batch.
- Capture: the seven project images recaptured at 1440 × 1000 from the public live sites in one
  pass, 22 write attempts blocked, zero production writes. Medication Reminder shows a synthetic
  sample schedule seeded in the browser's own storage; Shikaku shows the guest puzzle board. No
  account, no booking, no score, no real medication record. The four BytesFX workflow images are
  unchanged.
- `aramid check --staged` and `git diff --cached --check`: clean before every commit.

Evidence: `docs/superpowers/evidence/project-showcase/expansion-verification.md`, and the
recaptured asset manifest in `docs/superpowers/evidence/project-showcase/assets.md`. Review
screenshots are local-only under `output/playwright/`; never stage them.

Next: the owner reviews the preview at http://127.0.0.1:4173/projects/. Release still requires
the owner to request it explicitly — a push to `main` deploys the chatbot API, the CRM API and
the website together.

## Branch review, 6 November 2026 — a stale baseline, and one decision for the owner

A fresh reviewer that did not write the work reviewed `a93054f..99e20b2` and raised one Critical
finding, which was then verified independently: **`origin/main` has moved.** It is now at
`fae34e7` (PR #105, "Make Our Work prominent and expand system case studies"), a squash of this
branch's own six commits, merged and deployed on 5 November. `git diff a93054f fae34e7` is empty,
`https://web.bytesfx.com/projects/bytesfx/` answers HTTP 200 with its own canonical, and the live
sitemap lists it.

So the plan's Fixed Decision 1 — the BytesFX case page "was never deployed, `main` ships five
case studies, so retiring it removes nothing from the live site" — was true when written and is
false now. **The `/projects/bytesfx/` page is live and publicly linked today.**

The branch was deliberately not rebased and not merged. Rebasing means resolving eleven
conflicts, and the resolution that matters is the owner's:

- **Retire the page** (what the plan does): `/projects/bytesfx/` becomes a hard 404. This project
  has no redirect mechanism today — no `_redirects` file and no Worker route — so the URL that
  search engines already know would go straight to a 404.
- **Keep the page**: the BytesFX catalogue record comes back and Fixed Decision 1 is reversed. The
  index's product-proof feature and the chatbot page's `#product-workflow` section stay as they
  are, and the page becomes a seventh case study alongside the seven published projects.

Either answer is workable. The gate now makes the mistake impossible to make silently: the
built-output audit fails when the built case set differs from the catalogue's seven slugs, or
when the sitemap lists the retired route, and both are covered by new self-test mutants (seven
now, up from five).

Findings that were fixed in this pass: the editorial guard now reads the eight static
case-study shells and the work index renderer, not only the catalogue (red proof: a banned term
in a shell title now fails it); the catalogue rejects a featured rank above three instead of
letting the featured slice hide the record; `scripts/verify-showcase-ui.mjs` no longer visits the
retired route and names all seven cases; the two Pivot frames no longer carry the site's
cookie banner; and the two new projects' architectural claims are traced to their own
repositories in `docs/superpowers/evidence/project-showcase/new-project-scope.md`.

Re-verified after those fixes: the build exits 0 (19 catalogue tests, 7 editorial tests, nine
built pages), the output self-test detects seven negative mutations, and the two browser reviews
pass 344/344 and 308/308 with zero runtime errors and zero production writes.

Review record: `docs/superpowers/evidence/project-showcase/branch-review.md`. The reviewer's
separate audit of the live Pivot Parlor demonstration is in
`docs/superpowers/evidence/project-showcase/2026-11-06-pivot-demo-output-audit.md` — it finds the
public demo shop thinner than the case study implies, and it is a finding about the owning
project rather than about this branch.

Still true: no merge, push, pull request or deployment. A push to `main` deploys the chatbot
API, the CRM API and the website together, and needs separate explicit owner authorization.

## Release, 17 November 2026: the 6 November work, with the BytesFX case study kept

The owner decided on 17 November to release the 6 November expansion and to keep the live
`/projects/bytesfx/` case study. Branch `feat/our-work-expansion`, from `origin/main` `decb8b9`
(PR #106). Plan: `docs/superpowers/plans/2026-11-17-our-work-expansion-release.md`.

- The 6 November commits `a93054f..97d2299` were replayed as one change. The 5 November half had
  already shipped as PR #105, so it was not replayed.
- PR #106 wins every Pivot Parlor overlap: catalogue record, case shell, images
  (`pivot-platform.png` stays removed), the image audit of example and screen images, and the
  case-page order (example, screens, workflow).
- Fixed Decision 1 of the 6 November plan is reversed: the BytesFX record, its screens and trial
  box, its Vite input and its sitemap entry are restored verbatim from `origin/main`. The index's
  product-proof lead opens the case study ("View project"); "Explore the chatbot" still opens the
  chatbot page. BytesFX is not repeated as a card, so the grid shows the seven projects.
- The built-output audit expects eight case studies and checks the lead's link; its self-test
  removes the BytesFX sitemap entry and built directory rather than adding them.

Verification on 17 November, local only:
- `npm --prefix bytes-website run build`: exit 0 (25 catalogue tests, 7 editorial tests, 10 built
  pages); `check-showcase-pages.mjs --self-test`: 8 negative mutations detected.
- The built BytesFX and Pivot Parlor case pages are identical to the build of `decb8b9` apart
  from hashed asset names. The stylesheet change only adds the product-proof selectors and
  removes the old flagship rules.
- Browser reviews against a local preview, at 1440, 768, 390 and 320 and with 200% text:
  `review-our-work.mjs` 310/310, `review-system-cases.mjs` 388/388 (now including the BytesFX
  case), `verify-showcase-ui.mjs` 151/151. No runtime errors, and no production requests: every
  non-local request was answered locally.
- No new em or en dash in the showcase copy or the built pages.
- Images loaded up front on `/projects/`: 3,329 KB at 1440 (3,359 KB before) and 2,227 KB at
  390 (2,239 KB before).

Not yet done: the merge and deployment (owner's yes), and a read-only check of the new pages on
the live site afterwards (owner's yes).
