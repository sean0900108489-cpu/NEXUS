# Branch C-P02-001: Workspace Session Authority Split

## Status

- Branch ID: C-P02-001
- Protocol: P02
- Classification: product-risk
- Current confidence: high
- Secret handling: checked; no raw key, password, token, cookie, or bearer value is stored here.

## Evidence

| ID | Method | Result |
|---|---|---|
| E-P02-003 | local_api_probe | A throwaway Supabase account had a live session. Authenticated `POST /api/v1/workspaces/session` returned 200 with role `owner`, workspaceId `workspace_df5a977812ea4d508b`, and `created=true`. Authenticated state/artifact reads for that workspace returned 403 `PERMISSION_DENIED`. |
| E-P02-004 | static_read | In local runtime without service-role config, the session route uses `createWorkspaceSessionService()`, which creates an in-memory workspace/membership. Downstream state/artifact permission checks with a bearer token use a request-scoped Supabase client. |
| E-P02-005 | static_read + unit_test | The migration `nexus_ensure_workspace_session` writes both `workspaces` and `workspace_memberships`, and existing tests cover preview RPC fallback and local repository fallback as separate cases. The focused test run passed: 2 files, 11 tests. |
| E-P02-006 | local_api_probe | A second throwaway account called the Supabase RPC directly with the user session. RPC returned role `owner`, `created=true`, workspaceId `workspace_b4c67653181d4999ae54e41a95682d55`. Localhost state for that workspace returned 404 `WORKSPACE_STATE_NOT_FOUND` instead of 403, and artifacts returned 200. |

## Inference

| ID | Claim | Confidence |
|---|---|---:|
| I-P02-002 | The likely failure mode is not the RPC/migration itself. The local `/api/v1/workspaces/session` route selects a local in-memory session repository when `isLocalRuntime()` is true, even when the request has a real Supabase bearer token. State/artifact permission checks then read Supabase memberships, where the local membership does not exist. | 0.92 |

## Contradiction

`C-P02-001` remains active:

- Evidence A: local workspace session route returns a newly created owner workspace for a live account.
- Evidence B: downstream state/artifact reads for the same returned workspace deny access.
- Falsifying evidence: direct authenticated Supabase RPC creates a membership visible to downstream permission checks, changing state read from 403 to 404 and artifacts from 403 to 200.

## Repair Direction

P0 repair candidate:

- When a real Supabase bearer token is present and public Supabase config exists, local `/api/v1/workspaces/session` should prefer the authenticated RPC path unless service-role config is available.
- Keep pure local fallback only for unauthenticated/local fake users or environments without Supabase public config.

Validation target:

- Add a route-level regression test for `NODE_ENV=development`, no service role, real Authorization header, public Supabase config present. Expected behavior: session route calls `nexus_ensure_workspace_session` RPC and returns its workspace.
- Re-run live localhost probe: `POST /api/v1/workspaces/session` should return a workspace whose artifacts GET is 200 and state GET is 404 or 200, not 403.
