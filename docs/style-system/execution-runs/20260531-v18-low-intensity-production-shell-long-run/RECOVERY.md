# V18 Low-Intensity Production Shell Long Run Recovery

Date: 2026-05-31

## Resume Procedure

1. Confirm repository:
   - `pwd`
   - `git branch --show-current`
   - `git status --short`
   - `git log --oneline -n 12`
2. Read:
   - `docs/style-system/execution-runs/20260531-v18-low-intensity-production-shell-long-run/TECHNICAL_RUNBOOK.md`
   - `docs/style-system/execution-runs/20260531-v18-low-intensity-production-shell-long-run/PHASE_STATUS.md`
   - `docs/style-system/execution-runs/20260531-v18-low-intensity-production-shell-long-run/CHECKPOINTS.md`
   - latest phase checkpoint in this folder
3. Continue only from a clean tree.
4. Re-run the smallest relevant focused verification before starting a new
   source edit.

## Safety Reminder

Do not push, deploy, read secrets, touch Supabase/database/migrations, edit
package/config/deploy files, or modify store/sync/backend/API files.

Do not move behavior out of `NexusOps` during this run. Visual shell frames must
remain inert children-only wrappers unless a phase explicitly narrows a safe
exception.

## If Interrupted Mid-Phase

- If only docs changed, finish the phase checkpoint and commit docs.
- If source changed, run the phase focused tests first.
- If a candidate becomes unsafe, revert only that candidate's local changes if
  they are uncommitted and within the current phase, then record the skip reason.
- Never broaden scope to repair an unsafe candidate.
