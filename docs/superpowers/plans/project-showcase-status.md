# Project showcase: current checkpoint

Read the [task list](2026-11-05-project-showcase.md), [design](../specs/2026-11-05-project-showcase-design.md) and [verification](../evidence/project-showcase/verification.md).

| Field | Current state |
|---|---|
| Phase | PS10 complete; merged, deployed and verified live |
| Authorization | Owner authorized implementation, then explicitly instructed merge and deployment on 5 November 2026. |
| Branch | ux/project-showcase |
| Isolated checkout | C:/Users/fbmac/atlas/Codex/.codex_state/user_home/worktrees/626f/Bytes-Web |
| Planning/application bases | 702ebf3 / 52ad87a |
| Completed tasks | PS00–PS10 |
| Next | Owner reviews the live showcase; no further engineering action pending. |
| Visual passes | 2/2 completed; detector run once |
| Verified | Website build, output mutation checks, 108/108 browser checks twice, root pre-push gate exit 0 |
| Owned processes | None; preview 85205 and browser showcase-capture closed |
| Release | PR #104 merged; Deploy Agency run 42041277281 succeeded |
| Blockers | None |

## Fixed decisions

BytesFX's own actual chat -> captured/verified lead -> pipeline -> reviewed proposal/follow-up -> Won/Lost workflow is the leading product evidence. BytesCRM is optional supporting work and remains draft; its public claims remain unverified.

Featured projects: Pivot Parlor, Active Paw/PawScout as one project, BytesAI Learning. Cafe and File Converter have supporting case studies. Labels distinguish owned products, a live store and demonstrations. No customer results or testimonials invented.

## Evidence and boundaries

- [Capability and plan mapping](../evidence/project-showcase/capabilities.md)
- [Inspected screenshot manifest](../evidence/project-showcase/assets.md)
- [Verification and screenshots](../evidence/project-showcase/verification.md)
- Sample contacts use example.com; APIs mocked and write attempts blocked.
- Original owner untracked files untouched. Worktree's copied local aramid.toml remains untracked, outside the feature; it supplies the existing worker-test policy.
- No package installation, entitlement change, production auth bypass or worker production change.
- Existing branding test has exact portfolio-token exceptions and four regression assertions.

## Recovery

Inspect Git on ux/project-showcase; resolve actual checkpoint with git log. Preserve completed tasks and all prior authorization. Do not stage local aramid.toml, raw output logs or unrelated owner files. Do not run a third UI polishing pass. PS10 needs explicit release authorization; a push to main deploys all three production components.

Before pausing write this file with aramid handover write --file docs/superpowers/plans/project-showcase-status.md --author Codex --replace.

## Final implementation checkpoint

Application/source checkpoint: 8ac90ef (resolve the full SHA with git rev-parse 8ac90ef). The verified source was pushed successfully to origin/ux/project-showcase on 5 November 2026. Final review found 40 named feature/evidence files against 702ebf3; only the existing branding test changes outside the planned website/docs paths, for the documented exact-name conflict. No worker production source changed. Staged strict gate and ledger are clear; git diff --cached --check passed. Final PS09 documentation commit follows the application checkpoint; resolve it with git log -1 --format="%H %s" -- docs/superpowers/plans/project-showcase-status.md.

Branch backup: https://github.com/jared0565/Bytes-Web/tree/ux/project-showcase

Review screenshots and verification are committed. PR creation/merge and production deployment were not performed. The two visual passes are exhausted; no further polishing without owner steering. The original checkout remains on docs/project-showcase-plan with owner files preserved. Resume this isolated feature checkout, not the original planning branch.

## Production release, 5 November 2026

Owner instruction: “i want to review it live. Please merge and deploy it.” Authorization covers this release; do not request it again for completed actions.

- PR: https://github.com/jared0565/Bytes-Web/pull/104
- Reviewed feature head: 79040ba83ca675cc34584ced066cacb827f58d32. Cloudflare Pages check succeeded; GitHub reported mergeable/clean. Main had no required status contexts. Merge used the expected head SHA.
- Production merge: 2008892124a24ac9f48bcf172797e9c14c74efa4. Fetched and compared to the feature checkpoint; application tree matches.
- Deploy Agency: https://github.com/jared0565/Bytes-Web/actions/runs/42041277281. Job 127292424364 completed successfully: chatbot API, CRM API, website build, website deploy all success.
- Live verification: seven pages and nine PNG assets HTTP 200; all PNG hashes match committed assets. Actual workflow, exact three featured examples, five plans, canonical/trial links, CSP, sitemap, dashboard robots exclusion and draft CRM omission checked. Zero production writes.
- Live review: https://web.bytesfx.com/ai-chatbot/#product-workflow and https://web.bytesfx.com/projects/
- Raw local results: output/playwright/showcase/live-release.json. No browser/server started for live checks; two-pass visual budget remains exhausted.

Release supersedes the earlier “not merged/deployed” checkpoint statements above. This documentation update is backed up on the feature branch without another production deployment. Original owner untracked files remain preserved.
