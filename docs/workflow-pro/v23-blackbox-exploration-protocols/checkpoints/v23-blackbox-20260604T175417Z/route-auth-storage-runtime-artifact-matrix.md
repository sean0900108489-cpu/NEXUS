# Route/Auth/Storage/Runtime/Artifact Matrix

Run ID: `v23-blackbox-20260604T175417Z`

| Surface | Auth/account state | Evidence | Observed result | Verdict |
|---|---|---|---|---|
| `/` localhost UI | unauthenticated | `LE-P01-001`, `LE-P02-001` | Auth gate visible. Computer Use opened `localhost:3000` and observed email, password, Login, and Need Account controls. | UI entry exists; Workflow Pro UI not yet verified. |
| `/api/v1/health` | unauthenticated | `E-P02-001` | 200 | Public route reachable on localhost. |
| `/api/v1/public-config` | unauthenticated | `E-P02-001` | 200 | Public config route reachable on localhost. |
| `/api/v1/workspaces/session` | unauthenticated | `E-P02-001` | 401 `AUTH_REQUIRED` | Protected as expected. |
| `/api/v1/workspaces/session` | live Supabase token through localhost route | `E-P02-003` | 200 owner workspace created. | Account API can create a local session, but downstream authority split exists. |
| `/api/v1/workspaces/{id}/state` | same localhost route-created workspace | `E-P02-003` | 403 `PERMISSION_DENIED` | Contradiction `C-P02-001`. |
| `/api/v1/artifacts` | same localhost route-created workspace | `E-P02-003` | 403 `PERMISSION_DENIED` | Contradiction `C-P02-001`. |
| Direct Supabase `nexus_ensure_workspace_session` RPC | live Supabase token | `E-P02-007` | owner workspace created in Supabase membership store. | Supporting evidence for repair direction. |
| `/api/v1/workspaces/{id}/state` | direct RPC-created workspace | `E-P02-007` | 404 `WORKSPACE_STATE_NOT_FOUND`, not 403 | Permission passes; state row absent. |
| `/api/v1/artifacts` | direct RPC-created workspace | `E-P02-007` | 200 | Permission passes. |
| `/api/image-gen` | empty prompt | `E-P02-001` | 400 before provider | Validation works before provider spend. |
| `/api/image-gen` | no workspace, real provider | `E-P05-002` | 200, image/png asset, memory provider, durable=false | Real provider works; not durable without workspace. |
| `/api/image-gen` | live RPC workspace, real provider | `E-P05-003` | 200, image/png asset, supabase-storage provider, durable=true | Real provider plus storage works at API level. |
| `/api/v1/artifacts` create/list/download | live RPC workspace after real image | `E-P05-004` | create 200, list 200, download 200 image/png with matching byte count | Durable generated-image artifact chain works at API level. |
| `/api/v1/workflows/groups` | unauthenticated GET/POST | `E-P02-002` | GET 405, POST 401 | POST-only protected route. |
| `/api/v1/workflows/groups` | live RPC workspace | `E-P03-004` | 200 `workflow.group_record.upserted` | Runtime group record persists at API level. |
| `/api/v1/workflows/runtime-trace` | unauthenticated GET/POST | `E-P02-002` | GET 405, POST 401 | POST-only protected route. |
| `/api/v1/workflows/runtime-trace` | live RPC workspace | `E-P03-004` | 200 `workflow.runtime_lite.run.succeeded` | Runtime trace persists at API level. |
| `/api/v1/providers/verify` | real OpenAI key in memory | `E-P05-005` | 200 verified=true | Real LLM provider verification works. |
| preview/production deployment | current run | `E-P06-001`, `E-P06-002`, `I-P06-001` | Not live-probed in this run. | Not yet verified. |
