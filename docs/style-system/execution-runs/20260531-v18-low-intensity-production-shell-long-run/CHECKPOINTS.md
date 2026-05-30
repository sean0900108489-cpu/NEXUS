# V18 Low-Intensity Production Shell Long Run Checkpoints

Date: 2026-05-31

## Checkpoint Index

| Phase | Checkpoint | Commit | Status |
| --- | --- | --- | --- |
| Initial docs | `TECHNICAL_RUNBOOK.md`, `PHASE_STATUS.md`, `CHECKPOINTS.md`, `RECOVERY.md` | `2d1405a` | Complete |
| Phase 0 | `PHASE_0_RECOVERY_PREFLIGHT.md` | `897b8a5` | Complete |
| Phase 1 | `PHASE_1_STATIC_FRAME_BATCH.md` | `1b46efd` | Complete |
| Phase 2 | `PHASE_2_EXTRACTION_MAP_RECONCILIATION.md` | `ce5a2a6` | Complete |
| Phase 3 | `PHASE_3_SECOND_LEVEL_ASSESSMENT.md` | `82ea350` | Complete |
| Phase 4 | `PHASE_4_SECOND_STATIC_FRAME_EXTRACTION.md` | `373c1f9` | Complete |
| Phase 5 | `PHASE_5_LONG_RUN_INTEGRATION_REVIEW.md` | Pending | Complete, awaiting commit |

## Recovery Notes

- Resume by reading `TECHNICAL_RUNBOOK.md`, then this file, then
  `PHASE_STATUS.md`.
- Use `git log --oneline -n 12` and `git status --short` before continuing.
- Do not continue a phase from a dirty tree unless the dirty files are exactly
  the intended files for that phase and the prior checkpoint says so.
