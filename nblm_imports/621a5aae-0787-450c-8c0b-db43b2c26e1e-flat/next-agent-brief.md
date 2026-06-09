# Next Agent Brief

## Start Here

You are working in:

```text
/Users/sean/Documents/FreeChat
```

Expected branch from the last known user direction: `v24`. Verify before doing anything.

## Required First Checks

```bash
cd /Users/sean/Documents/FreeChat
git branch --show-current
git status --short
curl -I --max-time 30 http://127.0.0.1:3000
```

## Memory Boundary

NotebookLM remembers. Agent verifies. Repo proves. User directs.

This Notebook import is source-level memory, but the Notebook itself is stale relative to the v24 repair pack. Do not treat Notebook risks as still-open until checked against repo state and tests.

## Read First

```text
nblm_imports/621a5aae-0787-450c-8c0b-db43b2c26e1e/notebook-overview.md
nblm_imports/621a5aae-0787-450c-8c0b-db43b2c26e1e/key-claims.md
nblm_imports/621a5aae-0787-450c-8c0b-db43b2c26e1e/risks-data-gaps.md
docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729/report.md
docs/agent-runs/nblm-memory-pack-v24-repair-20260606-021729/context-packs/next-codex-context-pack.md
```

## Most Likely Next Useful Task

Run authenticated UI smoke on branch `v24` through the local tunnel, then decide whether branch-preview parity is worth doing.

## Do Not Do Without Explicit User Direction

- Do not run `vercel --prod`.
- Do not promote deployments or change production aliases/domains.
- Do not edit Supabase schema/data.
- Do not print or store raw secrets.
- Do not delete untracked report/skill folders.
