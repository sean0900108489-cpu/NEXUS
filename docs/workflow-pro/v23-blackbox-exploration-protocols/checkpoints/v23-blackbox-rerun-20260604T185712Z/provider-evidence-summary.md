# Provider Evidence Summary

Run: v23-blackbox-rerun-20260604T185712Z

| Evidence ID | Kind | Provider Layer | Result |
|---|---|---|---|
| E-P05-PROVIDER-VERIFY-001 | real_provider_api | localhost provider verify | HTTP 400 with sanitized registry mismatch when providerId=openai was forced for gpt-4o-mini. |
| E-P05-PROVIDER-VERIFY-002 | real_provider_api | localhost provider verify | HTTP 200, verified=true, provider=openai-compatible, model=gpt-4o-mini. |
| E-P02-ACCOUNT-MATRIX-003 | real_provider_api | v1 agent stream | Three distinct new accounts streamed real LLM responses with token events and done events. |
| E-P05-IMAGE-001 | real_provider_api | image generation | Real image call returned image/png, local asset route, durable generated asset metadata, request id, and trace id. |
| E-P02-ARTIFACT-IMAGE-001 | api_live | storage/artifact chain | Generated asset fetch, artifact create/list, and artifact download returned HTTP 200. |
| E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001 | real_provider_api | Round 5 image/artifact probe | Real image generation and generated asset GET returned HTTP 200, but artifact create returned HTTP 500 when the ad hoc probe supplied invalid/unproven provenance fields. Failure evidence only. |
| E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001 | api_live_static_read | artifact schema/provenance | Direct Supabase insert and migration scan showed source_task_id/source_tool_run_id are uuid/FK-backed provenance fields; this explains the failed ad hoc request shape. |
| E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | real_provider_api | corrected image/artifact/download chain | Corrected probe passed: workspaceSession 200, imageGen 200, generatedAssetGet 200, artifactCreate 200, artifactList 200, artifactAssetDownload 200, provider=supabase-storage, durable=true, image/png bytes matched. |
| LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 | computer_use_live provider-backed UI | Workflow Pro LLM+img2 canvas | Fresh single-start workflow showed live LLM token output, img2 success, visible generated image, output success, and generated count increment. This is UI evidence, supported by prior real provider/API probes. |
| LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 | computer_use_live provider-backed UI | Round 5 Workflow Pro LLM+img2 canvas | Post-refresh, post-Vault-gate single-start workflow showed live LLM output, img2 success, output success, visible generated image, and GENERATED 1. |
| LE-CHROME-UIA-ACCOUNT-A-LLM-001 | computer_use_live provider-backed UI | Account A workspace chat | After UI account A sign-up and the Vault gate, the Chrome UI streamed and displayed the requested marker UI_ACCOUNT_A_LLM_OK. This is UI evidence, supported by prior real provider/API probes. |
| LE-CHROME-UIB-ACCOUNT-B-LLM-001 | computer_use_live provider-backed UI | Account B workspace chat | After UI account B sign-up and the repeated Vault gate, the Chrome UI displayed the requested marker UI_ACCOUNT_B_LLM_OK. This is UI evidence, supported by prior real provider/API probes. |
| LE-CHROME-UIC-ACCOUNT-C-LLM-001 | computer_use_live provider-backed UI | Account C workspace chat | After UI account C sign-up and the repeated Vault gate, the Chrome UI displayed the requested marker UI_ACCOUNT_C_LLM_OK. This is UI evidence, supported by prior real provider/API probes. |
| LE-CHROME-FRESH-RUNTIME-STARTALL-001 | computer_use_live runtime failure | Workflow Pro START ALL | Did not reach provider success; Lite Runner rejected multi-start input.text workflow shape. |
| E-P05-CODE-001, E-P05-CODE-002 | code_edit | support only | Added sanitized provider status and UI/server provider readiness. Not counted as provider success by itself. |
| E-P05-TEST-001, E-P05-TYPE-001 | unit/typecheck | support only | Redaction tests, workspace tests, and typecheck passed. Not counted as provider success by itself. |

No mock or dry-run result was used as a passing provider conclusion.
