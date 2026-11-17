# Whole-branch review of the showcase expansion

Reviewed 6 November 2026 on `ux/our-work-navigation`, range `a93054f..99e20b2`, by a fresh reviewer
that did not write the work. Ledger rulings for the run:
`.superpowers/sdd/2026-11-06-project-showcase-expansion/progress.md`.

## Critical — the branch rests on a baseline that has moved

`origin/main` is at `fae34e7` (PR #105, merged and deployed on 5 November), a squash of this
branch's own six commits. Verified independently of the review: `git diff a93054f fae34e7` is
empty, `https://web.bytesfx.com/projects/bytesfx/` answers HTTP 200 with its own canonical, and
the live sitemap at `https://web.bytesfx.com/sitemap.xml` lists
`https://web.bytesfx.com/projects/bytesfx/`. The plan's Fixed Decision 1 — that the case page
"was never deployed — `main` ships five case studies — so retiring it removes nothing from the
live site" — was true when the plan was written and is false now.

Consequence if this branch is merged as it stands: the retired route is live, its shell has no
catalogue record to resolve against, so the built page carries the literal marker
`<!--@project-page-->`, and the sitemap still advertises it — while the build reports success.

**Not done here, deliberately.** The branch was not rebased or merged. Rebasing means resolving
eleven conflicts, and the resolution that matters is the owner's: retire the live `/projects/bytesfx/`
page — which today has no redirect mechanism in this project, so it becomes a hard 404 — or keep
it and reverse Fixed Decision 1. What was done instead is to make the gate loud: the built-output
audit now fails when the built case set differs from the catalogue's seven slugs, or when the
sitemap lists the retired route. Both are covered by new self-test mutants, so the check proves
itself.

## Findings and what was done about them

| Finding | Severity | Outcome |
|---|---|---|
| The merge premise is stale; the retired route is live | Critical | Gate made loud (audit assertions + self-test mutants); the rebase and the route's fate are left to the owner, and the reason is recorded in the ledger |
| The editorial guard did not cover the static shells or the index renderer | Important | Fixed. The guard now reads the eight shells and the index render, with a red proof on a shell title |
| A featured rank of 4 was accepted and then silently dropped by the slice | Important | Fixed. The catalogue rejects a rank above three |
| `scripts/verify-showcase-ui.mjs` still visited the retired route and skipped two cases | Important | Fixed. Its route list names the seven published cases |
| "Worker API" and "edge functions" claims not substantiated from this checkout | Important | Substantiated from the products' own repositories; provenance recorded in `new-project-scope.md` and cited by both records |
| The spec's "trial return" is gone from the case-study sequence | Important | Left as it stands, deliberately: the enquiry return matches the other six cases and every audited route keeps its trial link, which the build asserts. The decision was made against a `main` that has since moved, so it is recorded in the ledger for the owner to revisit with the rebase |
| The two Pivot frames carried the site's cookie-consent banner | Minor | Fixed. The dismissal pattern now matches the real label, the platform image is captured again, and both frames were re-taken and reviewed |
| The two new images read differently from the darker five | Minor | Deferred. The metadata contract holds (1440 × 1000, real readable interfaces); the aesthetic difference is the products' own, and the owner sees them in the preview |

## Re-verification after the fixes

- `npm --prefix bytes-website run build`: exit 0 — 19 catalogue tests, 7 editorial tests, Vite
  build, chatbot output check, and the showcase audit: *9 built pages, navigation, ownership,
  published routes, image metadata, trial paths and draft boundary verified*.
- `node bytes-website/scripts/check-showcase-pages.mjs --self-test`: exit 0; **seven** negative
  mutations detected (was five).
- `scripts/review-system-cases.mjs`: 344/344 checks; `scripts/review-our-work.mjs`: 308/308 checks.
  Zero runtime errors, zero production writes.
- Editorial red proof: `seamless` injected into the Shikaku shell title made the guard fail; the
  injection was reverted and the suite returned to green.
