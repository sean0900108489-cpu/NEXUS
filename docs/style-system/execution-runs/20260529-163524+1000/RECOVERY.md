# NEXUS Style Engine Recovery

Run id: `20260529-163524+1000`

## Resume Protocol

If interrupted, resume in this order:

1. Read this file.
2. Read `PROGRESS.md`.
3. Read `PHASE_STATUS.md`.
4. Run `git branch --show-current`.
5. Run `git status --porcelain=v1 -b`.
6. Run `git rev-parse HEAD`.
7. Compare current dirty files with `CHECKPOINTS.md`.
8. Continue only from the latest checkpoint that has a clear allowed file range.

## Expected Branch

`codex/v17-large-iteration`

## Expected Base

`c4ab6cbc97ebdc0e11a08581d6732bc509029a8c`

## Dirty File Ownership

Files under `docs/style-system/execution-runs/20260529-163524+1000/**` belong to this run.

Future Phase 1 audit docs under `docs/style-system/*.md` may belong to this run only after they are listed in `CHECKPOINTS.md`.

Any dirty file outside the documented allowed range must be treated as user/other work until proven otherwise.

## Recovery Rule

Do not restart from the beginning. Continue from the latest completed checkpoint and verify the current git status before any edit.

## Latest Recorded Clean Checkpoint

- Checkpoint: `CP-336 - Pure Intent Normalizer Dynamic Function Guard Coverage V1`
- Commit: `6dd95d6ed8fc5627c165b7d3655cc0271bd7a0d3`
- Branch: `codex/v17-large-iteration`
- Status before CP-337: clean.
- Resume action: if `git log -1 --oneline` shows `docs: reconcile dynamic function intent docs`, treat CP-337 as the latest local checkpoint; otherwise finish or verify `CP-337 - Interpreter Dynamic Function Input Doc Reconciliation V1`, then select the next lowest-risk isolated phase gate or coverage unit.
