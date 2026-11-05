# Project Showcase Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task, inline. Do not delegate unless the owner explicitly requests it. Track the checkboxes here; keep the live checkpoint in [project-showcase-status.md](project-showcase-status.md).

**Goal:** Demonstrate BytesFX's own chat-to-sales workflow and selected external projects, without changing product entitlements or writing production data during verification.

**Architecture:** Extend the existing static HTML/Vite site with a build-time project catalogue, HTML renderer, locally hosted images and static case studies. Bytes-Web is the primary product proof; external projects demonstrate breadth. No new backend, database, UI framework or package is needed.

**Tech Stack:** Existing Vite, semantic HTML, CSS, plain JavaScript, Node's built-in test runner and isolated Playwright browser checks.

**Design:** [Project showcase design](../specs/2026-11-05-project-showcase-design.md).

## Start or resume here

1. Read the [live status](project-showcase-status.md), this plan and the design. Read `AGENTS.md`, `GRAPHITE.md`, `ARAMID.md` and `docs/how-to/deploy.md`.
2. Run `aramid handover show` from the repository root. Resume only a verified handover; one marked NOT VERIFIED requires the owner. The task record remains usable when no handover exists.
3. Run the following from the selected checkout root. Inspect every result before editing.

```powershell
Get-Location
git branch --show-current
git rev-parse HEAD
git status --short
git diff --stat
git diff --cached --stat
git log -5 --oneline
python -m graphite check .
```

4. Match the branch, source baseline, current task and recorded changed-file ownership to the actual tree. Preserve unrelated/untracked owner files. Do not reset, clean, overwrite or recreate a worktree to make a mismatch disappear.
5. Check the last task's artifact and validation evidence. A checkbox, attempted command or old passing result alone does not establish completion. If the source changed after verification, rerun the affected check. If a command was interrupted without a final exit code, record it as unverified.
6. Continue the first unfinished task whose dependencies are complete and whose action is authorized. Use the exact next action in the status file. A user correction supersedes older planning text and must be recorded before work continues.

The plan's task checkboxes are the single completion list. The status file records the current position and evidence, not a second competing task list. Chat history, raw `output/` artifacts and the local Aramid ledger are supplementary, not the only recovery record.

## Fixed product decisions

- BytesFX's own proof is **chat -> captured/verified lead -> sales pipeline -> reviewed proposal/follow-up -> Won/Lost outcome**. Use actual product screens, stage names and plan boundaries.
- The initial external examples are Pivot Parlor, Active Paw/PawScout as one project, and BytesAI Learning. Cafe and File Converter are supporting portfolio entries.
- BytesCRM is optional supporting work. It must not replace Bytes-Web as the primary product proof or block this implementation. Its existing public claims remain unverified until the owner supplies evidence or corrects them.
- Preserve current styling, the embedded live chat, navigation, signup links, paid-plan enquiry paths, prices and entitlements. Do not submit real leads, chats, bookings, emails or payments during checks.
- Owner authorized implementation on 5 November 2026. Implementation checkpoints and feature-branch backup are in scope. Application merge/deployment need later release authorization. Preserve authorization already granted.

## Planned file map

| File or directory | Responsibility |
|---|---|
| `bytes-website/src/showcase-content.js` | Trusted project records, product-proof copy, publication state and asset metadata |
| `bytes-website/src/showcase-html.js` | Escaped, build-time HTML for workflow proof, selected projects, index and case studies |
| `bytes-website/src/projects-page.js` | Shared CSS imports and existing navigation/footer initialization for static project pages |
| `bytes-website/src/showcase.css` | Project page styles; reuse existing design tokens |
| `bytes-website/src/chatbot.css` | Chatbot-specific proof/selected-project layout |
| `bytes-website/ai-chatbot/index.html` | Actual product-proof content and selected-project insertion points |
| `bytes-website/vite.config.js` | Build-time injection and explicit project page entry points |
| `bytes-website/projects/index.html` | Broader work index |
| `bytes-website/projects/{pivot-parlor,active-paw,bytesai-learning,cafe-bookings,file-converter}/index.html` | Initial static case-study entries |
| `bytes-website/public/projects/` | Approved public screenshots only |
| `bytes-website/scripts/test-showcase-content.mjs` | Renderer/catalogue contract tests |
| `bytes-website/scripts/check-showcase-pages.mjs` | Built HTML, local link, asset and publication checks |
| `bytes-website/scripts/fixtures/showcase-leads.json` | Synthetic dashboard data matching verified existing contracts |
| `bytes-website/scripts/capture-showcase-assets.mjs` | Isolated capture of actual interfaces with mocked APIs; no production writes |
| `bytes-website/scripts/verify-showcase-ui.mjs` | Local browser checks with external APIs mocked |
| `bytes-website/package.json` | Wire focused checks into the existing build without dropping existing checks |
| `bytes-website/public/sitemap.xml` | Only published, built project routes |
| `docs/superpowers/evidence/project-showcase/` | Small, sanitized capability, asset and verification records |

The new implementation paths above are planned, not claims that those files already exist. Keep CRM APIs and worker sources outside this feature's change set. If a required capability is absent, record the gap instead of inventing it or widening backend scope silently.

## Tasks

### PS00: Establish the durable planning checkpoint

- [x] Save the design and this implementation task list.
- [x] Create the status file with authorization, source baseline, blockers and exact next action.
- [x] Link the recovery entry point from the root README.
- [x] Review cross-links, task dependencies, recovery instructions and consistency with the owner's Bytes-Web correction.

**Completion evidence:** these documents exist, local links resolve, and the planning-only diff passes `git diff --check`. The planning checkpoint is versioned on `docs/project-showcase-plan`; find its actual commit with the Git command in the status file. Do not represent planned implementation files or checks as completed.

### PS01: Verify BytesFX product truth and the execution baseline

**Depends on:** PS00 and an instruction to begin implementation.

**Read:** `docs/knowledge-base.md`, `bytes-website/public/dashboard/{index.html,main.js}`, `bytes-website/public/plans.json`, `bytes-website/src/chatbot-content.js`, the design, and Graphite context/impact for the files being changed.

- [x] Record the latest authorization and select an isolated implementation checkout using the `using-git-worktrees` skill. Record its resolved path and branch `ux/project-showcase`; retain the planning checkpoint in its history. Do not overwrite an existing branch/worktree with that name.
- [x] Run the start/resume commands and refresh a stale graph before relying on context/impact results.
- [x] Map each displayed workflow step to the actual screen, source symbol and plan availability. Record real pipeline stage labels, email confirmation behavior, proposal review, Won/Lost handling and follow-up limits.
- [x] Write `docs/superpowers/evidence/project-showcase/capabilities.md` with one row per claim: display copy, source path/symbol, plan restriction, demonstration asset and verification method.
- [x] Run `npm --prefix bytes-website run build` and record its exit code as the UI baseline. Separate an existing failure from a feature regression.

**Done when:** every proposed BytesFX claim has a source and a truthful plan restriction; the checkout is recorded and baseline build status is known. Commit the capability record and progress update through normal hooks.

### PS02: Prepare sample data and actual screenshots

**Depends on:** PS01.

- [x] Create `scripts/fixtures/showcase-leads.json` under `bytes-website/`, using the response shape verified in PS01. Use invented names, `example.com` email addresses and sample amounts clearly labelled as examples. Include the actual pipeline/proposal/outcome states needed for the walkthrough.
- [x] Create `scripts/capture-showcase-assets.mjs` using the existing browser tooling. Serve the actual dashboard locally, mock the verified auth/config/lead read contracts, and abort all production requests and all write methods. Do not weaken production auth or add a demo bypass to the shipped dashboard.
- [x] Capture the chat, lead, pipeline and proposal/outcome evidence required by the design, plus the five initial external case-study previews. Combine screens only when their captions still make the workflow clear.
- [x] Save approved screenshots beneath `bytes-website/public/projects/`. Record actual filenames, source screen, synthetic-data status, alt text, pixel dimensions and byte size in `docs/superpowers/evidence/project-showcase/assets.md`.
- [x] Inspect every image for credentials, real contact details, confusing example values and unreadable text. Reject unsuitable assets; do not publish blank image frames or fabricated application screenshots.

**Done when:** actual approved asset files exist and the capture demonstrates no production/write requests. If authenticated-screen capture is unavailable, record that specific blocker; complete other ready assets without pretending the missing screen is done.

### PS03: Implement the trusted catalogue and HTML contracts

**Depends on:** PS01 and the assets needed by each published project from PS02.

- [x] Define records in `src/showcase-content.js` with `id`, `title`, `kind`, `summary`, `capabilities`, `repositoryUrls`, `liveUrl`, `liveActionLabel`, `image` (`src`, `alt`, `width`, `height`), `caseStudyPath`, `featuredOrder`, `publishState` and evidence references. Use only `draft`/`published` publication states and `owned-product`/`live-store`/`demonstration` kinds.
- [x] Keep BytesFX's own proof separate from external project ranking. Put the separate BytesCRM record in `draft`; no public route/action is generated for it while readiness is unresolved.
- [x] Add focused `node:test` cases in `scripts/test-showcase-content.mjs` for draft exclusion, correct featured order, unsafe protocol rejection, escaping text/attribute characters, missing required asset metadata and accurate project-kind labels. Confirm a meaningful failing result before implementing the renderer.
- [x] Implement `src/showcase-html.js` so all published text is escaped, case paths are fixed local paths and external URLs use an approved HTTPS host. Pending/invalid records must not leak into HTML, sitemap entries or visible buttons.
- [x] Run `node --test bytes-website/scripts/test-showcase-content.mjs` from the checkout root. Record the final exit code and commit the catalogue, renderer, tests and progress update.

**Done when:** the contract tests pass and the three featured records match the agreed order and evidence. Do not add reviews, ratings, client logos or performance numbers without support.

### PS04: Show BytesFX's own chat-to-sales workflow

**Depends on:** PS02 and PS03.

- [x] Load the relevant Impeccable context/playbook and craft floor before UI edits, preserving the incumbent visual identity.
- [x] Update the existing feature/proof area in `ai-chatbot/index.html` and its build-rendered content to explain all verified workflow steps. Use actual screenshot evidence and clear sample-data captions; the pipeline is the focal screen.
- [x] Keep text accessible in server/build output, without requiring interaction or browser JavaScript to discover the lead, pipeline and follow-up capabilities.
- [x] Apply scoped responsive styles in `src/chatbot.css`. Preserve existing live-chat IDs, signup behavior, accessible navigation and reduced-motion behavior.
- [x] Render plan-dependent follow-up/proposal wording from verified plan facts. Preserve `plans.json` as the entitlement source and keep `/onboarding/` as the primary action.
- [x] Run the focused catalogue tests and `npm --prefix bytes-website run build`. Inspect the built proof HTML and commit this verified slice with its status update.

**Done when:** the offered product itself visibly proves chat, lead management and sales follow-up, with sample data and accurate restrictions; it does not send visitors to another CRM to explain BytesFX's capabilities.

### PS05: Add the selected external-project section

**Depends on:** PS03 and PS04.

- [x] Place the selected-project section after product proof and before the existing installation/pricing sections in `ai-chatbot/index.html`, using a build-time marker handled by `vite.config.js` and `showcase-html.js`.
- [x] Render no more than three published external examples: Pivot Parlor, Active Paw/PawScout and BytesAI Learning. Make real screenshots the visual evidence, not decorative icons or invented metrics.
- [x] Include accurate kind labels, business problem, implementation capabilities, internal case-study action and correctly named external action. Pivot's assistant must be called scripted; Active Paw must not be claimed as proof of the BytesFX widget.
- [x] Preserve a clear trial action after the examples. Stack examples on narrow screens; no carousel, external iframe or external application script is introduced.
- [x] Run focused tests and the site build, then commit the section and status update.

**Done when:** all three examples appear in built HTML, all destinations are concrete, and the page keeps its own product/trial as the primary conversion.

### PS06: Build the broader project index and case studies

**Depends on:** PS03 and PS05.

- [x] Add the index and the five initial case-study entry files listed in the file map. Use a shared renderer with per-project problem, implementation, walkthrough, capabilities and external destination.
- [x] Add `src/projects-page.js` to load existing site styles, `showcase.css` and existing navigation/footer helpers. Do not add application data fetching.
- [x] Extend Vite's explicit build inputs and HTML transform for the index and published cases. Supply one H1, unique title/description, canonical URL and working trial link per page.
- [x] Add only published output routes to `public/sitemap.xml`. Keep the dashboard's existing robots exclusion and the chatbot's existing canonical/schema behavior.
- [x] Check all internal project links against actual built files; do not publish a draft CRM route or call its signup page a live demo.
- [x] Run the site build and commit the project pages, renderer integration, styles, sitemap and progress update.

**Done when:** all five published case studies and their index load directly as static pages, explain their relevance truthfully, and link back to the chatbot trial.

### PS07: Wire release checks without weakening existing coverage

**Depends on:** PS04, PS05 and PS06.

- [x] Implement `scripts/check-showcase-pages.mjs` to inspect built HTML: local case/image files exist, draft records are absent, featured order/count is correct, kind labels/canonical metadata are present, trial links work, image dimensions/alt text are supplied, and no external application iframe is included.
- [x] Extend the catalogue tests with any security/data-contract failure uncovered during integration. Test behavior and publication boundaries, not CSS class strings or copies of implementation logic.
- [x] Wire the focused Node tests before Vite build and the built-output checker after it in `bytes-website/package.json`. Preserve consent, navigation and existing chatbot-page checks in their current order.
- [x] Run the commands below from the repository root and record actual exit codes. Never report an unexecuted check as passing.

```powershell
node --test bytes-website/scripts/test-showcase-content.mjs
npm --prefix bytes-website run build
node bytes-website/scripts/check-showcase-pages.mjs
git diff --check
```

**Done when:** the new checks detect the identified failure cases and the existing build still passes. No dependency installation is expected; if one becomes necessary, validate the exact package before installing and record why it is needed.

### PS08: Verify UI and conversion paths in two bounded passes

**Depends on:** PS07.

- [x] Run the built site locally with `npm --prefix bytes-website run preview -- --host 127.0.0.1 --port 4173`. Record the actual session/port; handle a port conflict without stopping an unrelated process.
- [x] Implement/run `scripts/verify-showcase-ui.mjs` against localhost using the available isolated browser. Mock external APIs and block production writes before loading the page; preserve the existing live chat's local test coverage without making real chats/leads.
- [x] Inspect 320, 390, 768 and 1440px layouts, keyboard navigation/focus, 200% text sizing, reduced motion, page overflow, image loading, direct case URLs and every relevant trial/project action together in the first pass.
- [x] Run Impeccable's mechanical detector once on the changed UI targets. Triage findings against the existing visual identity and fix substantive defects in one batch.
- [x] Confirm those fixes in at most one further visual pass. Persist the used-pass count across session restarts; a restart does not reset the verification budget.
- [x] Record sanitized results in `docs/superpowers/evidence/project-showcase/verification.md`: commands, date, tested source/checkpoint, browser/viewports, exit codes, failed/fixed checks, image paths and external/write-request counts. Close owned preview/browser sessions.

**Done when:** the agreed UI and conversion paths pass, no production writes occurred and all material limitations are disclosed. Any newly changed code needs its affected checks rerun before marking this complete.

### PS09: Review and create the implementation checkpoint

**Depends on:** PS08.

- [ ] Review the final named-file diff against the design, capability evidence, catalogue and asset manifest. Preserve unrelated owner changes and do not stage raw browser profiles/logs or local secrets.
- [ ] Run root gates and inspect the ledger. A degraded/timeout result is unresolved, not a pass.

```powershell
aramid check --staged
aramid ledger filter --status open
git diff --cached --check
```

- [ ] Commit the source, tests and matching task/status/evidence update together through normal hooks. Record how to resolve the checkpoint commit, and back it up to the approved feature branch through normal pre-push checks.
- [ ] Record the exact commit, remaining limitations and readiness in the status file. Application implementation is complete only after evidence-backed acceptance, not because the code was written.

**Done when:** there is a reviewable implementation checkpoint, its source and evidence agree, and no unowned files were included.

### PS10: Release only within the owner's authorization

**Depends on:** PS09 and explicit release authorization.

- [ ] Verify whether push/PR/merge was already authorized in the conversation/status; preserve prior authorization and do not ask again unnecessarily. A documentation checkpoint is not authorization to merge application changes.
- [ ] Open/update the feature PR with final behavior, validation and limitations. Match the reviewed head SHA and required checks before merging; never force/bypass a failing gate.
- [ ] Monitor the normal Deploy Agency workflow after merge. Record PR URL, merge SHA, workflow URL/ID and each chatbot/API/website step outcome; a partial rollout is not successful completion.
- [ ] Make read-only live checks of the chatbot page, project index and published case pages: correct copy, intended published records, real assets, safe links and preserved trial paths. No production chats/leads/booking/payment tests without separate authorization.
- [ ] If a deployment fails, read its failed step and use `docs/how-to/rollback.md` where needed. Reconcile the remote state before retrying anything after an interruption.
- [ ] Record the actual release state, close owned processes and write the signed Aramid handover. Mark release complete only after the monitored outcome is verified.

## Checkpoint discipline

Before each task, update the status file's task, branch/checkpoint, owned file paths and next action. After each coherent edit/test cycle, update its next action and evidence so a crash loses at most that unfinished edit cycle. An interrupted test remains unverified until its exit code is recovered or the test is rerun.

At a verified task boundary, stage only named task files plus this checklist, status and sanitized evidence, run the required gate, and commit them together. Use a commit subject such as `feat(showcase): render selected projects [PS05]`. Keep the working implementation on its feature branch; do not merge for checkpointing.

Before a restart or long pause:

```powershell
aramid handover write --file docs/superpowers/plans/project-showcase-status.md --author Codex --replace
```

Keep the same actionable state in the versioned status file and the signed local handover. Do not store secrets, session tokens, personal records or authenticated cookies in either one. Back up verified checkpoints to the approved remote feature branch; work that has not been saved/committed cannot be recovered reliably after disk loss.

## Recovery cases

| Interruption | Recovery action |
|---|---|
| Mid-edit, dirty tree | Compare current diff to owned paths/current task; retain the unfinished patch, update next action, rerun affected checks. |
| Mid-test with no exit code | Mark result unverified; inspect the owned process/output or rerun the bounded check. |
| Checked task but missing artifact | Reopen that task and dependent acceptance; the checkbox is not proof. |
| Commit exists, status appears behind | Inspect the commit's source, checklist and evidence; reconcile the status rather than repeat the implementation. |
| Branch/head differs from status | Inspect branch history and current work; do not reset or assume the recorded branch still exists. |
| Mid-push, PR or deployment | Query the remote branch/PR/run by SHA; record the actual outcome before retrying. |
| A readiness question blocks one project | Keep that record draft; continue independent work. Never publish an invented answer. |
| Handover unavailable | Resume from the versioned task list/status and Git evidence. A NOT VERIFIED handover is not executable authority. |

## Acceptance

The feature is complete only when BytesFX's actual chat-to-sales workflow is the leading proof, the agreed external examples and case studies are truthful and usable, current plans/trial/chat behavior remain intact, security/publication boundaries pass their checks, and the authorized release is verified. Every future worker must be able to identify the current task, verified checkpoint, remaining blocker and next command without reconstructing the conversation.
