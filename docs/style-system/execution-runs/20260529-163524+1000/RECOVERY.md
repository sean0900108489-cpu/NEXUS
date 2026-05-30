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

- Checkpoint: `CP-347 - Post Validator Executable String Guard Phase Gate`
- Commit: `9e6781fd8c5d2b7b6e5bdc6da800dcaf1f84d241`
- Branch: `codex/v17-large-iteration`
- Status before CP-348: clean.
- Resume action: if `git log -1 --oneline` shows `test: cover behavior class validator guard`, treat CP-348 as the latest local checkpoint; otherwise finish or verify `CP-348 - Pure Validator Behavior Class String Guard Coverage V1`, then select the next lowest-risk isolated doc reconciliation, implementation, or coverage unit.
