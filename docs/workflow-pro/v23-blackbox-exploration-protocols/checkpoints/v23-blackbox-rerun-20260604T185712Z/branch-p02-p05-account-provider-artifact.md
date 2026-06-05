# Branch P02/P05 Account Provider Artifact

Run: v23-blackbox-rerun-20260604T185712Z

## Route

Primary work in this branch covered P02 account/workspace/artifact authority and P05 real provider/image behavior, with P03 runtime/history screen evidence attached where Workflow Pro UI was visible.

## Account Matrix

| Probe | Result | Evidence |
|---|---|---|
| First three-account probe | signUp/session returned, workspace failed 400 because idempotency header was missing, stream 403 | E-P02-ACCOUNT-MATRIX-001 |
| Second three-account probe | workspace returned owner sessions with idempotency, stream still 403 when preferred workspace IDs were used | E-P02-ACCOUNT-MATRIX-002 |
| Third three-account probe | all three accounts streamed real LLM responses using server-returned workspace IDs | E-P02-ACCOUNT-MATRIX-003 |
| UI account A probe | Chrome localhost Sign Up succeeded, Global API Vault was re-filled and locked, and workspace chat displayed the requested LLM marker | LE-CHROME-UIA-ACCOUNT-A-SIGNUP-001, LE-CHROME-UIA-ACCOUNT-A-VAULT-GATE-001, LE-CHROME-UIA-ACCOUNT-A-LLM-001 |
| UI account B probe | Chrome localhost Sign Up succeeded, Global API Vault was explicitly unlocked/re-filled/locked, and workspace chat displayed the requested LLM marker | LE-CHROME-UIB-ACCOUNT-B-SIGNUP-001, LE-CHROME-UIB-ACCOUNT-B-VAULT-GATE-001, LE-CHROME-UIB-ACCOUNT-B-LLM-001 |
| UI account C probe | Chrome localhost Sign Up succeeded, Global API Vault was explicitly unlocked/re-filled/locked, and workspace chat displayed the requested LLM marker | LE-CHROME-UIC-ACCOUNT-C-SIGNUP-001, LE-CHROME-UIC-ACCOUNT-C-VAULT-GATE-001, LE-CHROME-UIC-ACCOUNT-C-LLM-001 |

## Provider / Image / Artifact

| Probe | Result | Evidence |
|---|---|---|
| Provider verify | real provider verified after using registry-correct request | E-P05-PROVIDER-VERIFY-002 |
| Image generation | real image provider returned durable image/png asset metadata | E-P05-IMAGE-001 |
| Artifact chain | generated asset fetch, artifact create/list/download all returned HTTP 200 | E-P02-ARTIFACT-IMAGE-001 |
| Round 5 artifact attempt | real image generation and generated asset GET passed, but artifact create failed for an ad hoc request with invalid/unproven provenance fields | E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001 |
| Round 5 artifact provenance schema | direct Supabase insert and migration scan showed source_task_id/source_tool_run_id uuid/FK expectations | E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001 |
| Round 5 corrected artifact chain | corrected real provider/image/artifact/download chain returned HTTP 200 across workspace, image, generated asset, artifact create/list, and artifact download | E-P05-R5-IMAGE-ARTIFACT-FINAL-001 |
| UI workflow | Chrome showed live stream, runtime success, successful image nodes, generated images | LE-CHROME-WORKFLOW-001 |
| Fresh single-start UI workflow | Chrome showed single input LLM live output, img2 success, output success, visible generated image, and GENERATED 3 -> 4 | LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 |
| Round 5 single-start UI workflow | Chrome showed post-refresh single input LLM success, img2 success, output success, visible generated image, and GENERATED 1 | LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 |
| START ALL UI workflow | Chrome showed START ALL failure because Lite Runner does not support multiple starting input.text nodes | LE-CHROME-FRESH-RUNTIME-STARTALL-001 |
| UI history/download | Chrome showed generated assets and completed PNG download, including Round 5 generated-image v1 download | LE-CHROME-DOWNLOAD-001, LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 |
| Current Account panel | Chrome showed Account panel, STREAM: LIVE, Account Profile, and Logout for the current session | LE-CHROME-ACCOUNT-PANEL-001 |

## Inferences

| Inference | Based On |
|---|---|
| Mutation idempotency is required before workspace/session conclusions are meaningful. | E-P02-ROUTE-CONTRACT-001, E-P02-ACCOUNT-MATRIX-001 |
| Server-returned workspaceId is authoritative for account-scoped runtime calls. | E-P02-ACCOUNT-MATRIX-002, E-P02-ACCOUNT-MATRIX-003 |
| Provider credentials are usable through localhost routes; provider/model registry mapping matters. | E-P05-PROVIDER-VERIFY-001, E-P05-PROVIDER-VERIFY-002 |
| Single-start runtime health is not equivalent to START ALL multi-start support. | LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001, LE-CHROME-FRESH-RUNTIME-STARTALL-001 |
| UI account A can reach provider-backed chat after the Vault gate; this does not cover UI accounts B/C. | I-T04-UI-A-PROVIDER-LLM-001 |
| UI account B can reach provider-backed chat after the Vault gate; this does not cover UI account C. | I-T05-UI-B-PROVIDER-LLM-001 |
| UI accounts A/B/C can each reach provider-backed chat after their respective Vault gates; this covers UI LLM chat only, not every image/artifact/runtime scope. | I-T06-UI-ABC-PROVIDER-LLM-001 |
| Ad hoc artifact API probes should omit sourceTaskId/sourceToolRunId unless they reference existing durable task/tool_run UUID rows; otherwise route-level 500 can hide DB provenance mismatch. | I-P05-R5-ARTIFACT-PROVENANCE-001 |
