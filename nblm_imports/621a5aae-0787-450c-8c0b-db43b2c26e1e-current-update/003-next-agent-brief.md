# NEXUS v24 Next Agent Brief

## First Checks

```bash
cd /Users/sean/Documents/FreeChat
git branch --show-current
git status --short
curl -I --max-time 30 http://127.0.0.1:3000
```

## Current Memory Boundary

NotebookLM remembers.
Agent verifies.
Repo proves.
User directs.

This Notebook has been moved from stale current-system memory toward v24 current repair memory. Treat older NEXUS current-system claims as historical unless current repo verification proves they still apply.

## Most Useful Next Work

- Run authenticated UI smoke on branch `v24`.
- Verify queued sync flush after login.
- Only after local auth smoke passes, consider Vercel preview parity.
- Keep production untouched unless the user explicitly authorizes production action.

## Do Not Do Without Explicit User Direction

- Do not run `vercel --prod`.
- Do not promote deployments.
- Do not change custom domains or production aliases.
- Do not edit Supabase schema/data.
- Do not expose raw API keys, bearer tokens, cookies, or `.env` contents.
- Do not delete untracked report/skill folders.
