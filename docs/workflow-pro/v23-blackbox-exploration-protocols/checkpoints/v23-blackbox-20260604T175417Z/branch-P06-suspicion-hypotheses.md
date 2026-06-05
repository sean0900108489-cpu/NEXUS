# Branch P06 Suspicion Hypotheses

Run ID: `v23-blackbox-20260604T175417Z`

Evidence base: `E-P06-001`, `E-P06-002`, `C-P02-001`, `C-P02-002`, `I-P06-001`.

## Environment Parity

| Suspicion ID | Environment | Account class | Evidence needed | Probe | Severity if true |
|---|---|---|---|---|---|
| `S-P06-ENV-001` | localhost vs preview | unauthenticated | Current preview status for public/protected routes | Run auth-boundary probe against preview with protection classification | High |
| `S-P06-ENV-002` | preview | unauthenticated | Whether Vercel protection blocks before app auth | Use protected preview access and compare platform failure vs app 401 | High |
| `S-P06-ENV-003` | production | owner | Whether production image-gen enforces auth/workspace before provider spend | Run one authenticated image workflow and one unauthenticated denial probe | Critical |
| `S-P06-ENV-004` | localhost vs preview | owner | Whether service-role availability changes workspace session authority | Compare session/state/artifacts matrix on localhost and preview | Critical |
| `S-P06-ENV-005` | preview vs production | owner | Whether storage bucket/RLS policies match | Generate and download one durable image artifact on both targets | Critical |

## Account And Workspace Parity

| Suspicion ID | Environment | Account class | Evidence needed | Probe | Severity if true |
|---|---|---|---|---|---|
| `S-P06-ACCT-001` | localhost | new account | UI sign-up/login reaches a workspace | Computer Use create/login without exposing credentials | Critical |
| `S-P06-ACCT-002` | localhost | new account | Session-created workspace can read state/artifacts | Rerun route matrix after P0 repair | Critical |
| `S-P06-ACCT-003` | preview | new account | RPC/session path matches downstream permission | Account matrix runner against preview | Critical |
| `S-P06-ACCT-004` | preview/production | viewer | Viewer cannot create artifacts/run mutations but sees clear denial | Role matrix plus UI recovery text | High |
| `S-P06-ACCT-005` | preview/production | editor | Editor can perform intended artifact/workflow actions only | Role matrix route and UI probes | High |

## Recovery Diagnostics

| Suspicion ID | Environment | Account class | Evidence needed | Probe | Severity if true |
|---|---|---|---|---|---|
| `S-P06-REC-001` | localhost | new account | 403 from authority split is distinguishable from auth expiry | Capture sanitized UI/API error shape after reproduction | High |
| `S-P06-REC-002` | preview | unauthenticated | Platform protection failure is not mislabeled as app permission denial | Protected preview probe with sanitized classification | High |
| `S-P06-REC-003` | localhost/preview | owner | Provider failures expose requestId/traceId and recovery action without secrets | Force safe provider validation failure using non-secret invalid input | Medium |
| `S-P06-REC-004` | localhost/preview | owner | Storage failure after provider success does not leave unrecoverable hidden bytes | Simulated storage/artifact failure after generated asset | High |
| `S-P06-REC-005` | localhost/preview | owner | Reload recovery can reconnect runtime trace, artifact, and generated history | Computer Use run, reload, inspect history/download | High |

## Current Verdict

All 15 hypotheses are open. None can be closed by localhost source/API evidence alone when the claim concerns deployed parity or visible UI usability.
