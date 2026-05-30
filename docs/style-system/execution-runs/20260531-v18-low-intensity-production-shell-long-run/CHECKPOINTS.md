# V18 Low-Intensity Production Shell Long Run Checkpoints

Date: 2026-05-31

## Checkpoint Index

| Phase | Checkpoint | Commit | Status |
| --- | --- | --- | --- |
| Initial docs | `TECHNICAL_RUNBOOK.md`, `PHASE_STATUS.md`, `CHECKPOINTS.md`, `RECOVERY.md` | `2d1405a` | Complete |
| Phase 0 | `PHASE_0_RECOVERY_PREFLIGHT.md` | `897b8a5` | Complete |
| Phase 1 | `PHASE_1_STATIC_FRAME_BATCH.md` | `1b46efd` | Complete |
| Phase 2 | `PHASE_2_EXTRACTION_MAP_RECONCILIATION.md` | `ce5a2a6` | Complete |
| Phase 3 | `PHASE_3_SECOND_LEVEL_ASSESSMENT.md` | Pending | Complete, awaiting commit |
| Phase 4 | Pending | Pending | Pending |
| Phase 5 | Pending | Pending | Pending |

## Recovery Notes

- Resume by reading `TECHNICAL_RUNBOOK.md`, then this file, then
  `PHASE_STATUS.md`.
- Use `git log --oneline -n 12` and `git status --short` before continuing.
- Do not continue a phase from a dirty tree unless the dirty files are exactly
  the intended files for that phase and the prior checkpoint says so.
