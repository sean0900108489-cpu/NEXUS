# V20 Phase 1 Auth Boundary Repair Kickoff Prompt

Use this prompt to start or resume the phase-one repair from a clean project
state. It is written so the executor does not need prior chat context.

## Starting Point

Repository:

```txt
/Users/sean/Documents/FreeChat
```

Known current state from the 2026-06-01 auth-boundary audit:

- Main `apiHandler` actor flow is mostly sound.
- Protected wrapped routes reject spoof-only `X-User-Id` probes.
- Focused backend/security tests previously passed.
- Release remains blocked by phase-one auth-boundary issues:
  - public `/api/tools/fs-scanner`
  - public `/api/tools/web-surfer`
  - caller-controlled v1 stream workflow-lite permission skip
  - Supabase session `Authorization` fallback being accepted as runtime/provider
    key material
  - production local membership fallback if service-role membership config is
    absent

Do not rely on this summary as proof. Re-read the code, route docs, and protocol
before editing.

## Goal

Reach the V20 phase-one target:

```txt
P0 = 0 for phase-one scope.
Legacy filesystem/network tool routes are not public in production.
v1 stream cannot write before workspace permission.
Runtime/provider keys are separate from Supabase session bearer.
Production permission checks fail closed without required service-role config.
Focused regression tests prove the closure.
```

## Process

1. Read:
   - `AGENTS.md`
   - `docs/audit-protocols/v20/README.md`
   - `docs/audit-protocols/v20/01-protocols/V20_PHASE_1_AUTH_BOUNDARY_POST_FIX_SCAN.md`
   - relevant local Next.js route handler docs under `node_modules/next/dist/docs/`
2. Confirm repo branch, commit, and worktree state.
3. Make the smallest production-safe repairs:
   - production-block `/api/tools/fs-scanner`
   - production-block `/api/tools/web-surfer`
   - remove user-reachable v1 stream permission skip
   - stop reading runtime/provider key material from normal `Authorization`
   - fail closed for production local permission fallback
4. Add focused regression tests.
5. Run focused tests.
6. Run safe status-only local probes if a local server is needed.
7. Record results in `docs/audit-protocols/v20/04-results/` after the full
   post-fix scan.

## Activation Text

```txt
Start V20 phase-one auth-boundary repair in /Users/sean/Documents/FreeChat.
Do not rely on prior chat context. Read the V20 kickoff/protocol docs and local
Next.js route-handler docs first. Implement only the high-ROI phase-one fixes:
block public production access to fs-scanner and web-surfer, remove the v1
stream workflow-lite permission bypass, separate Supabase Authorization from
runtime/provider key extraction, and fail closed for production permission
fallback without service-role config. Add regression tests for each repaired
boundary, run focused verification, and report remaining risks using redacted
evidence only.
```
