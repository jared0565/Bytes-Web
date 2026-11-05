# Project showcase: current checkpoint

Read this first, then the [task list](2026-11-05-project-showcase.md) and [design](../specs/2026-11-05-project-showcase-design.md).

## Current state

| Field | Value |
|---|---|
| Checkpoint | PS01: capability evidence and passing baseline |
| Phase | Implementation in progress |
| Authorized scope | Owner authorized implementation on 5 November 2026. Merge/deployment remain pending review. |
| Repository | Bytes-Web; work only in the selected checkout of this repository |
| Planning branch | `ux/project-showcase` |
| Unchanged application baseline | `52ad87af2f1745b2b7f2003813c6cabafde775d8` |
| Completed task | PS00, planning record and review |
| First unfinished task | PS02, capture actual interfaces with synthetic data |
| Current blocker | None. Screenshot capture is next. |
| Next action when implementation is requested | Read PS01; record the instruction, select the isolated checkout, then inspect Graphite context for `bytes-website/public/dashboard/main.js` and `bytes-website/public/plans.json` before mapping actual workflow screens. |
| Visual passes used | 0 of 2 for the upcoming showcase implementation |
| Running owned processes | None |
| Application PR / deployment | None for this feature |

Resolve the real planning checkpoint commit from Git rather than putting a self-referential hash in this document:

```powershell
git log -1 --format='%H %s' -- docs/superpowers/plans/2026-11-05-project-showcase.md docs/superpowers/plans/project-showcase-status.md
```

## Non-negotiable product correction

Bytes-Web already connects chat, leads and sales pipelines. Its own workflow is the primary proof: **chat -> captured/verified lead -> sales pipeline -> reviewed proposal/follow-up -> Won/Lost outcome**. This is supported by the owner's clarification and `docs/knowledge-base.md` plus the current dashboard source. The separate BytesCRM product is optional supporting work, not a missing capability or a blocker for BytesFX proof.

## Decisions and dependencies

- Keep existing visual identity, actual product interface, trial/signup behavior and plan entitlements.
- Initial external examples: Pivot Parlor, Active Paw/PawScout as one project, BytesAI Learning.
- Broader work: Cafe and File Converter. BytesCRM remains draft while its published results/testimonials and public preview are unverified.
- Known domains: `https://pivotparlor.com/ferdyms-barber-shop-014`, `https://activepaw.co.uk/`, `https://learn.bytesai.uk/`, `https://cafe.bytesfx.com/`, `https://file-converter.bmorris0565.workers.dev/`, `https://bytescrm.app/`.
- Homepage availability checks previously returned HTTP 200; this is not a full functional audit. Do not copy CRM metrics/testimonials as verified results.
- Product screen/plan mapping and the approved screenshot manifest are not completed. These are PS01/PS02 deliverables; do not treat the prior conceptual design as captured evidence.
- No production chat, lead, email, booking, payment, supplier import or settings write is authorized for verification. Local previews otherwise call live APIs, so mocks/abort rules must be installed before interaction.

## Owned files in the planning checkpoint

- `README.md`: link to task list/status.
- `docs/superpowers/specs/2026-11-05-project-showcase-design.md`: proposed design including the owner's primary-product correction.
- `docs/superpowers/plans/2026-11-05-project-showcase.md`: executable task definitions and completion checkboxes.
- `docs/superpowers/plans/project-showcase-status.md`: this checkpoint and restart position.

All preexisting owner untracked files remain outside this checkpoint, including local agent configuration, prior screenshots and browser artifacts under `output/`. Never use `git add .`/`git add -A` for this work. No application source file was changed by planning.

## Verification record

Planning review checked the current Vite entry points, actual dashboard location, entitlement source, website build command, root Aramid policy and main-branch deployment behavior.

Verified on 2026-11-05:

- Four planning documents checked; all 19 internal Markdown links resolved.
- Eleven unique task IDs, PS00 through PS10, found in the task list.
- `git diff --cached --check` passed.
- `aramid check --staged --strict --json` returned exit 0, no findings and no degraded tools. It ran gitleaks, gitleaks-inline and shadow; `aramid ledger filter --status open` found no open matches.
- Aramid correctly notes that root JavaScript/npm gates are not selected in this repository's subdirectory layout. This documentation checkpoint does not claim those gates ran; application verification remains explicit in PS01/PS07 and the existing root-configured worker test gate.

No new application test result is claimed for these documentation-only changes. PS01 will establish the current UI build baseline; PS07/PS08 will verify implementation output and behavior.

## Update at every implementation checkpoint

Replace Current state with the actual task, resolved branch/checkout, start commit, owned files, completed substeps, last tested source, exact commands/exit codes, next action and remaining blockers. Retain the fixed decisions and prior evidence links. Update the plan checkbox only when the task's completion evidence exists. Commit source and matching progress together at verified boundaries.

Before a pause, run from the repository root:

```powershell
aramid handover write --file docs/superpowers/plans/project-showcase-status.md --author Codex --replace
```

On restart, inspect Git before trusting any recorded completion. If source or remote state differs, follow the recovery table in the task list. Preserve authorization already granted, but do not infer implementation/release approval from an old completed task's unrelated merge permission.

## Implementation PS01

Owner authorization: yes to begin implementation, 5 November 2026. Worktree: C:/Users/fbmac/atlas/Codex/.codex_state/user_home/worktrees/626f/Bytes-Web. Branch ux/project-showcase. Baseline build exit 0. Capability source/plan mapping: ../evidence/project-showcase/capabilities.md. PS01 completed; PS02 next. Visual passes 0/2. No production writes or release.

## PS02 complete

Nine inspected PNG assets and synthetic fixtures captured. Stable drawer captures replaced the rejected transition images. Capture script blocks all writes; 19 attempts aborted, zero forwarded. Public preview hydration errors disclosed in assets.md. Next PS03: catalogue/renderer. Seven contract tests confirmed red before implementation. Visual passes remain 0/2.

## PS03 complete

Five published records plus draft BytesCRM. Seven meaningful contract failures confirmed before renderer implementation; all seven pass after validation/escaping. Exact-host HTTPS validation, safe local paths, duplicate detection and draft exclusion in place. Next PS04: embed own product proof.

## PS04 complete

Actual pipeline screenshot, sample-data captions, lead/proposal disclosures, three source-backed workflow steps and plan-derived AI follow-up note now render as static HTML. Existing FAQ checker now scopes questions to .cb-faq, allowing supplementary native disclosure without adding it to FAQ schema. CSS import moved to file start after first build exposed an import-order warning. Final build must pass warning-free before checkpoint. Next PS05 selected projects. Visual passes 0/2.

## PS05 complete

Three examples rendered between product proof and setup: Pivot Parlor, Active Paw, BytesAI Learning. Correct labels/actions and repeated trial action; current styling inherited. Full destination build verification follows immediately in PS06/PS07. Next PS06 project pages. Visual passes 0/2.

## PS06 complete

Static projects index and five case entries added using shared renderer, incumbent navigation/footer and project script with no app fetching. Explicit Vite inputs and published-only sitemap routes. Unique metadata and trial return paths on each. Next PS07 complete built-output validation. Visual passes 0/2.

## PS07 complete

Build now runs seven catalogue/security tests before Vite, preserves existing consent/navigation/chatbot checks, and audits seven built pages afterward. Built-output audit verifies routes, assets/dimensions, metadata, trial actions, exact featured order, sitemap and draft exclusion. Five negative output mutations detected. npm build, checker --self-test and git diff --check exit 0. Next PS08 batched browser verification. Preview session 85205 on 127.0.0.1:4173; browser showcase-capture. Visual passes 0/2.
