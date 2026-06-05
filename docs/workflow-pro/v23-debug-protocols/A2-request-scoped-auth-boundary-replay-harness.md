# A2 Request-Scoped Auth Boundary Replay Harness

## Purpose

Create a replayable harness that verifies request-scoped identity, Supabase
session handling, header hygiene, and production/local auth consistency.

Score target: 91 / 100.

## Core Question

Can every protected route prove the actor from a verified session and reject
spoofed or mismatched identity inputs?

## Execution Phases

1. Read project instructions and package scripts.
2. Inventory route handlers and auth helpers.
3. Find all reads of `Authorization`, cookies, `X-User-Id`, `X-Workspace-Id`,
   and runtime credential headers.
4. Build a route replay table:
   - no credentials
   - spoofed user header
   - bearer only
   - mismatched bearer/header
   - valid session, insufficient role
   - valid session, sufficient role
5. Run static auth-boundary scans.
6. Run local HTTP probes only when non-destructive.
7. Run live probes only if the target is safe and explicitly scoped.
8. Produce replay commands and expected signals.

## Required Scans

```bash
rg -n "Authorization|X-User-Id|X-Workspace-Id|cookies\\(|getUser|getSession|createServerClient|requestScoped|runtimeAuthorization" src scripts
npm run check:auth-boundary
```

## Replay Table

| Route | Method | No Auth | Spoof Header | Valid Auth | Mismatch | Expected |
|---|---|---|---|---|---|---|

## Tool Guidance

- Browser/Chrome: verify real session boundaries only when safe.
- Supabase: verify memberships and policies with counts and booleans.
- Vercel: inspect preview/protection state if live route behavior differs.
- GitHub: attach failing/passing auth tests to PR readiness if needed.

## API Key Policy

Provider keys may be used only as configured runtime credentials. Auth replay
reports must never include secret values.

## Evidence Weighting

Auth findings need:

- W1 line references for the identity source.
- W2 route tests or harness tests.
- W3/W4 live or browser replay when available.

## Contradiction Pass

Before finalizing:

- Do any routes pass static auth but fail replay?
- Do any replay failures depend on local fallback behavior?
- Are production-only conditions explicitly identified?
- Are provider credential headers separated from Supabase auth headers?

## Output Format

```md
# Request-Scoped Auth Boundary Replay Report
## Scope
## Auth Source Inventory
## Replay Matrix
## Static Scan Results
## Local Probe Results
## Live Probe Results
## Contradictions
## Risk Register
## Repair Plan
## Test Gates
```

## Completion Gate

Complete only when every high-risk route has at least one replay row and every
identity source has a line-level reference.

## Execution Prompt

```txt
Read docs/workflow-pro/v23-debug-protocols/A2-request-scoped-auth-boundary-replay-harness.md first.
Run the request-scoped auth replay harness. Use safe static scans, local HTTP
probes, Supabase checks, and browser checks when available. Do not rely on prior
context. Do not print secrets.
```

