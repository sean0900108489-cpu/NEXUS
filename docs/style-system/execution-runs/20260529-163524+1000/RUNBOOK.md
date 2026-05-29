# NEXUS Style Engine Runbook

Run id: `20260529-163524+1000`
Branch: `codex/v17-large-iteration`
Base commit: `c4ab6cbc97ebdc0e11a08581d6732bc509029a8c`
Mode: autonomous long-run, small gated units

## Authority Order

1. `docs/style-system/NEXUS_STYLE_ENGINE_CORRECTED_CODEX_PROMPT.md`
2. `docs/style-system/NEXUS_STYLE_ENGINE_TOTAL_UPGRADE_MASTER_PLAN.md`
3. `NEXUS_STYLE_ENGINE_V1_LOW_FRICTION_UPGRADE.md`
4. `/Users/sean/Downloads/nexusstyle總升級.md` as long-term product ambition only

## Safety Boundaries

- Do not modify `exports/`.
- Do not read, print, or copy secrets.
- Do not deploy.
- Do not push remote.
- Do not mutate production databases.
- Do not run destructive git commands.
- Do not reset or overwrite changes not created in this run.
- Treat Supabase, Vercel, and GitHub as query/review/local-verification boundaries unless explicitly authorized.

## Default Phase Rhythm

1. Read the relevant phase docs.
2. Check branch, HEAD, and git status.
3. Declare allowed and forbidden file ranges.
4. Make one small unit of change.
5. Run the lightest useful verification.
6. Check for sync/backend pollution when UI/runtime paths are touched.
7. Update `PROGRESS.md`, `CHECKPOINTS.md`, and `PHASE_STATUS.md`.
8. Continue if gates pass.

## Current Allowed Range

Phase 0 / Phase 1 documentation and audit only:

- `docs/style-system/execution-runs/20260529-163524+1000/**`
- Future Phase 1 audit docs under `docs/style-system/*.md`

## Current Forbidden Range

- `exports/**`
- `src/**`
- `supabase/**`
- `package.json`
- `package-lock.json`
- `next.config.*`
- `.env*`
- deployment, database, remote, branch merge, push, or production mutation operations

## Verification Ladder

- Documentation-only unit: `git status --porcelain=v1 -b`, targeted Markdown review.
- Source audit unit: read-only `rg`, `sed`, and inventory commands.
- UI/runtime unit later: lint/typecheck plus Browser smoke.
- Phase gate later: escalate to `npm run lint`, `npm run typecheck`, focused tests, and browser verification as needed.
