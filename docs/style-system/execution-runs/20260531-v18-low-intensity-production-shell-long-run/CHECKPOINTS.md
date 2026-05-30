# V18 Low-Intensity Production Shell Long Run Checkpoints

Date: 2026-05-31

## Checkpoint Index

| Phase | Checkpoint | Commit | Status |
| --- | --- | --- | --- |
| Initial docs | `TECHNICAL_RUNBOOK.md`, `PHASE_STATUS.md`, `CHECKPOINTS.md`, `RECOVERY.md` | `2d1405a` | Complete |
| Phase 0 | `PHASE_0_RECOVERY_PREFLIGHT.md` | Pending | Complete, awaiting commit |
| Phase 1 | Pending | Pending | Pending |
| Phase 2 | Pending | Pending | Pending |
| Phase 3 | Pending | Pending | Pending |
| Phase 4 | Pending | Pending | Pending |
| Phase 5 | Pending | Pending | Pending |

## Recovery Notes

- Resume by reading `TECHNICAL_RUNBOOK.md`, then this file, then
  `PHASE_STATUS.md`.
- Use `git log --oneline -n 12` and `git status --short` before continuing.
- Do not continue a phase from a dirty tree unless the dirty files are exactly
  the intended files for that phase and the prior checkpoint says so.
