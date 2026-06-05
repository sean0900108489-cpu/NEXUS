# Route / Auth / Storage / Runtime / Artifact Matrix

Run: v23-blackbox-rerun-20260604T185712Z

| Area | Route / Surface | Evidence | Result | Notes |
|---|---|---|---|---|
| Provider status | GET /api/v1/providers/status | E-P05-CODE-001, E-P05-TEST-001 | pass | Sanitized server provider readiness exposed without raw credential values. |
| Provider verify | POST /api/v1/providers/verify | E-P05-PROVIDER-VERIFY-001, E-P05-PROVIDER-VERIFY-002 | pass after registry-correct request | Explicit providerId=openai mismatched registry for gpt-4o-mini; omitting providerId verified true through real provider call. |
| Auth sign-up | Supabase auth.signUp x3 and Chrome UI A/B/C | E-P02-ACCOUNT-MATRIX-001..003, LE-CHROME-UIA-ACCOUNT-A-SIGNUP-001, LE-CHROME-UIB-ACCOUNT-B-SIGNUP-001, LE-CHROME-UIC-ACCOUNT-C-SIGNUP-001 | pass for localhost API and UI LLM paths | Three API sessions returned and three Chrome UI accounts were created for LLM verification. Preview/production auth parity remains NYV-PROD-PARITY-001. |
| Workspace session | POST /api/v1/workspaces/session | E-P02-ACCOUNT-MATRIX-001..003 | pass with idempotency | Missing X-Idempotency-Key caused 400; with header, route returned owner workspace. |
| Runtime stream | POST /api/v1/agents/[agentId]/stream | E-P02-ACCOUNT-MATRIX-003 | pass | Real LLM stream returned HTTP 200, token events, done events, task id headers, and expected markers for all three accounts. |
| Image provider | POST /api/image-gen | E-P05-IMAGE-001, E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | pass | Real provider calls returned image/png local asset route and durable generatedAsset metadata. |
| Generated asset | GET /api/image-gen/assets/[assetId] | E-P02-ARTIFACT-IMAGE-001, E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | pass | Returned image/png with matching byte length. |
| Artifact create/list/download | /api/v1/artifacts routes | E-P02-ARTIFACT-IMAGE-001, E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | pass after corrected provenance shape | Create, list, and asset download returned HTTP 200. Initial Round 5 ad hoc probes failed when sourceTaskId/sourceToolRunId did not reference real durable task/tool_run rows. |
| Workflow UI runtime | Chrome localhost canvas | LE-CHROME-WORKFLOW-001 | screen pass | Observed STREAM: LIVE, SUCCESS WORKFLOW RUNTIME LITE, successful LLM/image/output nodes, and generated image outputs. |
| Fresh single-start runtime | Chrome localhost canvas single input START | LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001, LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 | screen pass | After current-session Vault LOCKED, single input workflow produced LLM live output, img2 success, output success, visible generated image, and GENERATED count 3 -> 4. |
| Round 5 single-start runtime | Chrome localhost canvas single input START | LE-CHROME-R5-SINGLE-RUN-INTERIM-001, LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 | screen pass | After reload and Vault re-fill/LOCKED, single input workflow produced LLM SUCCESS, img2 SUCCESS, output SUCCESS, visible generated image, SUCCESS WORKFLOW RUNTIME LITE, and GENERATED 1. |
| START ALL runtime | Chrome localhost canvas START ALL | LE-CHROME-FRESH-RUNTIME-STARTALL-001 | screen fail | START ALL is visible/clickable but Lite Runner fails when multiple starting input.text nodes are present. |
| Generated history/download UI | Chrome GENERATED panel + downloads | LE-CHROME-DOWNLOAD-001, LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 | screen pass | Observed generated-image assets, clicked download, accepted save dialog where applicable, and saw completed PNG download. |
| Reload vault gate | Chrome reload + Providers panel | LE-CHROME-RELOAD-GATE-001 | screen pass | Verified locked before reload; after reload re-filled masked Global API Vault and Save & Lock restored LOCKED state. |
| Next-round vault gate | Chrome localhost Providers panel | LE-CHROME-NEXT-VAULT-GATE-001 | screen pass | Re-opened localhost, observed current-session Vault not yet locked, pasted authorized key into masked field without recording it, clicked Save & Lock, and observed LOCKED. |
| Account panel | Chrome localhost Account panel | LE-CHROME-ACCOUNT-PANEL-001 | partial screen pass | Current signed-in account panel showed STREAM: LIVE, Account Profile, and Logout. |
| UI account A/B/C LLM | Chrome localhost sign-up + chat | LE-CHROME-UIA-ACCOUNT-A-LLM-001, LE-CHROME-UIB-ACCOUNT-B-LLM-001, LE-CHROME-UIC-ACCOUNT-C-LLM-001 | screen pass for UI LLM path | Each UI account was created through Chrome, each repeated the Global API Vault gate, and each received a provider-backed LLM marker. |
