# NEXUS Style Engine Stop Conditions

Run id: `20260529-163524+1000`

## User-Defined Stop Conditions

Stop only if:

1. The user manually stops the run.
2. Computer, system, process, or power interruption prevents progress.
3. An unrecoverable error is confirmed after review.

## Unrecoverable Error Definition

Stop if continuing would:

- Violate an explicit safety boundary.
- Require destructive git, database, deployment, branch merge, or remote push operations.
- Require unapproved paid usage, login, production mutation, or external human action.
- Fail the same phase gate repeatedly after multiple focused repairs.
- Leave repo ownership unclear enough that continuing may overwrite existing work.

## Current Non-Negotiable Boundaries

- No production database mutation.
- No deploy.
- No remote push.
- No destructive git command.
- No reset or overwrite of changes not produced by this run.
- No `exports/**` changes.
- No secrets read or printed.

## Hold Criteria

Mark a phase `HOLD` in `PHASE_STATUS.md` if:

- A required source file cannot be read.
- A local verification command is unavailable.
- A change would need to cross into `src/**`, `supabase/**`, or package files before the phase allows it.
- A sync/backend pollution risk is discovered and not yet bounded.
