# Checkpoint Workspace

This directory is reserved for live protocol runs.

At the beginning of each black-box exploration run, create a run directory:

```txt
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/
```

The first file must be:

```txt
00-active-checkpoint.md
```

Rules:

- Create `00-active-checkpoint.md` before the first scan.
- Read it before every phase or branch.
- Append evidence while exploring, not only at the end.
- Keep inference separate from evidence.
- Keep contradiction and suspicion ids stable across phases.
- Never write raw secrets into checkpoints.
- Write `final-report.md` only after checkpoint history exists.

