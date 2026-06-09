# Next Codex Context Pack

## Situation

NEXUS is on branch `v24`. The v24 formal repair loop followed the v23 black-box scan and repaired the main local/VPS P0/P1 findings. Full regression passed. The app is currently accessible through a local tunnel:

```text
http://127.0.0.1:3000
```

The tunnel forwards to VPS `127.0.0.1:3001`.

## Must Verify First

Before acting, run:

```bash
cd /Users/sean/Documents/FreeChat
git branch --show-current
git status --short
curl -I --max-time 30 http://127.0.0.1:3000
```

Do not assume the background tunnel or VPS process is still alive.

## Read First Files

```text
docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729/report.md
docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729/maps/v24-repair-system-map.md
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/final-report.md
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/repair-plan.md
```

## Safe Next Moves

- Authenticated UI smoke on branch `v24`.
- Branch preview parity only after local auth smoke passes.
- Lint warning cleanup as a separate small cleanup.
- Upload this NBLM memory pack only if the user explicitly asks and names the NotebookLM destination.

## Do Not Do Without Explicit User Direction

- Do not run `vercel --prod`.
- Do not promote a Vercel deployment.
- Do not change custom domains or production aliases.
- Do not edit Supabase schema/data.
- Do not print or store raw API keys, cookies, bearer tokens, or `.env` contents.
- Do not delete untracked `.agents/skills` or `docs/agent-runs` folders.

## Current Repair Claims To Preserve

- Auth boundary fixed for image route.
- START ALL multi-start topology fixed and test-covered.
- Artifact provenance UUID validation/normalization fixed and test-covered.
- Unauthenticated browser sync noise fixed and test-covered.
- Full regression passed locally on VPS.

## Suggested Prompt For The Next Round

```text
Continue from the NEXUS v24 repair memory pack.
First verify repo branch/status and localhost tunnel.
Run an authenticated UI smoke on v24.
Do not touch production, do not expose secrets, and do not modify Supabase schema/data.
Report what passed, what remains unknown, and whether preview parity is now worth doing.
```

