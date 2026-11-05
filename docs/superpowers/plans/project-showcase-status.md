# Project showcase: current checkpoint

Read the [task list](2026-11-05-project-showcase.md), [design](../specs/2026-11-05-project-showcase-design.md) and [verification](../evidence/project-showcase/verification.md).

| Field | Current state |
|---|---|
| Phase | PS08 complete; PS09 final checkpoint review in progress |
| Authorization | Owner authorized implementation on 5 November 2026. Merge/deployment await owner review. |
| Branch | ux/project-showcase |
| Isolated checkout | C:/Users/fbmac/atlas/Codex/.codex_state/user_home/worktrees/626f/Bytes-Web |
| Planning/application bases | 702ebf3 / 52ad87a |
| Completed tasks | PS00–PS08 |
| Next | PS09 named-file diff/staged gate, commit and feature-branch backup |
| Visual passes | 2/2 completed; detector run once |
| Verified | Website build, output mutation checks, 108/108 browser checks twice, root pre-push gate exit 0 |
| Owned processes | None; preview 85205 and browser showcase-capture closed |
| Release | No application merge or production deployment |
| Blockers | None for implementation; release awaits owner review |

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
