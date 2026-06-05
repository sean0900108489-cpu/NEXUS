# Checkpoint: P01 / rerun-root / 2026-06-04T18:57:12Z

## Scope

- Repository: /Users/sean/Documents/FreeChat
- Branch: unknown at creation; will scan in P01-core.
- Environment: local workstation, localhost target required, real provider/API tests authorized when configured credentials exist.
- Tools used: local shell, protocol files, Chrome, Computer Use, LINE, real provider/API, Supabase auth/session routes, and local validator.
- Current command round: fresh rerun from first principles.
- Current scan mode: second-stage black-box scan. Minimal scan-enabling repairs have occurred only to remove blocker conditions and must not be reported as formal repair completion until the scan closes.
- Active checkpoint path: docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/00-active-checkpoint.md
- Branch checkpoint path: none yet.
- Last checkpoint read at: 2026-06-04T21:53:59Z
- Next checkpoint update trigger: after Round 7 final closeout and final validator output are written.

## Router Decision

```json
{
  "schema": "nexus.workflowPro.blackbox.router.v1",
  "taskSummary": "Full Workflow Pro / NEXUS rerun from first principles, including localhost Global API Vault UI operation, account/workspace/artifact authority, runtime durability, provider-backed behavior, and local/deployment parity planning.",
  "primaryProtocol": "01",
  "secondaryProtocols": ["02", "03", "05", "06"],
  "mandatoryLiveEvidence": true,
  "mandatoryComputerUseEvidence": true,
  "mandatoryRealProviderEvidence": true,
  "reason": "The task demands a full black-box rerun, visible localhost UI proof, real provider/API verification when credentials are configured, account/workspace/artifact checks, runtime checks, and parity planning.",
  "blockedProtocols": [],
  "checkpointRunId": "v23-blackbox-rerun-20260604T185712Z"
}
```

## Initial Operating Assumptions

- Assumption: The project may have working and non-working Workflow Pro surfaces; no prior conclusions are accepted as evidence in this rerun.
- Why it is unproven at run creation: source, routes, runtime, UI, provider paths, and live localhost behavior had not yet been scanned by this rerun.
- First falsification probe: Run P01-core terrain scan, then operate localhost through Computer Use and real provider/API probes only after inventory identifies the relevant entry points.

## Evidence Collected

| Evidence ID | Source | Method | Confidence | Notes |
|---|---|---|---:|---|
| E0001 | AGENTS.md | static_read | 0.90 | Next.js local docs must be read before code changes. |
| E0002 | docs/workflow-pro/v23-blackbox-exploration-protocols/README.md | static_read | 0.95 | Checkpoint-first rerun required; live evidence gate applies. |
| E0003 | docs/workflow-pro/v23-blackbox-exploration-protocols/protocol-router.md | static_read | 0.95 | Router selects P01 primary, P02/P03/P05/P06 secondary for this task. |
| E0004 | docs/workflow-pro/v23-blackbox-exploration-protocols/live-evidence-gate.md | static_read | 0.95 | Computer Use evidence is required for final user-visible Workflow Pro claims. |
| E0005 | docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoint-template.md | static_read | 0.95 | First event must be checkpoint.created; every phase must read checkpoint first. |
| E0006 | docs/workflow-pro/v23-blackbox-exploration-protocols/events.schema.json | static_read | 0.95 | Events require schema, runId, eventId, protocolId, eventType, summary, and redaction status. |
| E-P01-CORE-001 | pwd; git status --short | script_scan | 0.90 | Repo root is /Users/sean/Documents/FreeChat; worktree has extensive unrelated modified/untracked files. |
| E-P01-CORE-002 | package.json | script_scan | 0.90 | Scripts cover dev/build/lint/typecheck/test and preflight/schema/auth/durability checks; dependencies include Next, React, Supabase, Zustand, XYFlow, Vitest. |
| E-P01-CORE-003 | src/app/api route inventory | script_scan | 0.92 | API surface includes image-gen, artifacts, providers, workflows, runtime trace, workspaces, agents, sync, observability, tools, deployment checks. |
| E-P01-CORE-004 | src file inventory | script_scan | 0.86 | Nexus UI is large; workflow-pro and workflow-runtime-lite libraries exist for runtime, evidence, group history, trace, image/LLM clients. |
| LE-LINE-001 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | P01-core sanitized progress report was pasted, sent, and observed in LINE Keep; this proves reporting loop operation only, not Workflow Pro product behavior. |
| E-P01-DETAIL-001 | runtime/workflow rg scan | script_scan | 0.84 | Workflow runtime can publish durable trace/group records; tests cover trace sync retry/failure and generated image history/transient artifact cases. |
| E-P01-DETAIL-002 | auth/authority rg scan and key routes | script_scan | 0.86 | Supabase auth and provider runtime auth are separated; artifact routes use workspace gates; image-gen can use runtime header or server env key. |
| E-P01-DETAIL-003 | wc/rg state scan | script_scan | 0.88 | Main pressure points: nexus-ops.tsx 9542 lines, nexus-store.ts 4814 lines, workflow-pro-surface.tsx 1721 lines. |
| E-P01-DETAIL-004 | nexus-store auth vault persistence | static_read | 0.90 | Raw Global API Vault/provider keys are intentionally scrubbed from local persistence; runtime memory can hold current-session key. |
| LE-LINE-002 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | P01 detail sanitized progress report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-P05-DOCS-001 | Next local docs | static_read | 0.92 | Route handlers, environment variables, auth, and data-security docs read before code edits; server env must stay server-side, client receives only sanitized DTO/API data. |
| E-P05-CODE-001 | src/app/api/v1/providers/status/route.ts | code_edit | 0.88 | Added sanitized server provider status route that reports configured booleans/model metadata without exposing raw provider secrets. |
| E-P05-CODE-002 | src/components/nexus/nexus-ops.tsx | code_edit | 0.86 | Global API Vault and runtime credential resolution now treat server-configured OpenAI credentials as live-capable while still allowing current-session UI vault key entry. |
| E-P05-TEST-001 | npm test provider/workspace focused suite | unit_test | 0.93 | 3 test files passed, 14 tests passed, including provider status redaction and workspace session/permission focused coverage. |
| E-P05-TYPE-001 | npm run typecheck | typecheck | 0.90 | Initial typecheck failed on sidebar provider-status scope; after scoped prop/derive repair, typecheck passed. |
| LE-LINE-003 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | P05 provider/vault repair sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-VAULT-001 | Computer Use: Google Chrome localhost:3000 Providers > Global API Vault | computer_use_live | 0.96 | Loaded authorized OpenAI key from local environment into clipboard without printing it, pasted into masked Global API Vault field, clicked Save & Lock, and observed LOCKED state with Unlock/Delete controls. |
| LE-LINE-004 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Chrome Global API Vault sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-P05-PROVIDER-VERIFY-001 | localhost /api/v1/providers/verify | real_provider_api | 0.76 | First verify attempt reached route but failed 400 because providerId=openai did not match registry provider for gpt-4o-mini. |
| E-P05-PROVIDER-VERIFY-002 | localhost /api/v1/providers/verify | real_provider_api | 0.96 | Real provider verify passed: HTTP 200, verified=true, provider=openai-compatible, model=gpt-4o-mini, checkedAt recorded. |
| LE-LINE-005 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Provider verify sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-P02-ROUTE-CONTRACT-001 | auth/workspace/agent-stream/image/artifact route scan | static_read | 0.88 | Sign-up/login UI exists; mutation routes require idempotency; v1 stream requires Supabase actor and can use runtime/server provider key; image/artifact routes require workspace contracts. |
| E-P02-ACCOUNT-MATRIX-001 | Supabase auth + localhost workspace/stream probe | api_live | 0.84 | New accounts A/B/C returned sessions, but workspace/session requests failed 400 IDEMPOTENCY_KEY_MISSING and downstream v1 streams returned 403 with no token events. |
| E-P02-ACCOUNT-MATRIX-002 | Supabase auth + localhost workspace/stream probe | api_live | 0.88 | New accounts A/B/C returned sessions and workspace/session succeeded 200 owner after idempotency headers; v1 streams still returned 403 permission denied when using preferred workspace IDs. |
| E-P02-ACCOUNT-MATRIX-003 | Supabase auth + localhost workspace/v1 agent stream | real_provider_api | 0.96 | New accounts A/B/C returned sessions, workspace/session succeeded 200 owner, and v1 agent stream succeeded 200 with token events, done events, task id headers, and expected markers when using server-returned workspace IDs. |
| LE-LINE-006 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Three-account LLM matrix sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-P05-IMAGE-001 | localhost /api/image-gen | real_provider_api | 0.96 | Real image provider call returned HTTP 200 with local asset route, durable supabase-storage generatedAsset, image/png, and 1452076 bytes. |
| E-P02-ARTIFACT-IMAGE-001 | image asset + artifact routes | api_live | 0.95 | Generated asset GET, artifact create, artifact list, and artifact asset download all returned HTTP 200 with matching image/png byte length. |
| LE-LINE-007 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Real image/artifact sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-WORKFLOW-001 | Computer Use: Chrome localhost Workflow canvas + Providers panel | computer_use_live | 0.96 | Observed localhost, STREAM: LIVE, Global API Vault LOCKED with server provider configured for GPT-IMAGE-2, SUCCESS WORKFLOW RUNTIME LITE, multiple successful LLM/image/output nodes, and visible generated images. |
| LE-CHROME-DOWNLOAD-001 | Computer Use: Chrome generated history + downloads popover | computer_use_live | 0.95 | Observed generated history with 3 generated-image assets and Download buttons, clicked a download, then observed Chrome downloads popover showing a generated PNG completed. |
| LE-CHROME-RELOAD-GATE-001 | Computer Use: Chrome localhost reload + Providers Global API Vault | computer_use_live | 0.96 | Verified vault locked before reload, reloaded localhost, reopened Providers, observed server-configured masked vault field, re-pasted authorized key from local environment into masked field, clicked Save & Lock, observed LOCKED with Unlock/Delete, and cleared clipboard. |
| LE-LINE-008 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Reload gate sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-VALIDATOR-001 | scripts/validate-blackbox-checkpoint.mjs | validator | 0.99 | Validator passed with ok=true, zero failures, and zero warnings after final report artifacts were created. |
| E-VALIDATOR-002 | scripts/validate-blackbox-checkpoint.mjs | validator | 0.99 | Validator passed after next-round report updates and phase completion: ok=true, zero failures, zero warnings, events=70 before recording this validator evidence. |
| E-P02-AUTHSCREEN-UI-CONTRACT-001 | src/components/nexus/auth-screen.tsx | static_read | 0.88 | AuthScreen exposes Email/Password, Login/Sign Up submit states, and Need Account / Have Account toggle; supporting evidence only. |
| LE-LINE-009 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Final rerun sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-NEXT-VAULT-GATE-001 | Computer Use: Chrome localhost Providers > Global API Vault | computer_use_live | 0.96 | Next-round localhost gate: Chrome was switched to localhost, Providers was opened first, current-session Vault was not locked yet, authorized key was copied from `.env.local` without printing, pasted into masked secure field, Save & Lock clicked, LOCKED observed, clipboard cleared. |
| LE-LINE-010 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Next-round Vault gate sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-FRESH-RUNTIME-STARTALL-001 | Computer Use: Chrome Workflow canvas START ALL | computer_use_live | 0.96 | With Vault LOCKED, clicked START ALL and observed FAILED WORKFLOW RUNTIME LITE with message that Lite Runner does not yet support multiple starting input.text nodes. |
| LE-LINE-011 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | START ALL runtime failure sanitized report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001 | Computer Use: Chrome Workflow canvas single input START | computer_use_live | 0.93 | After Vault LOCKED, a single input workflow changed runtime to RUNNING; input and LLM nodes showed SUCCESS with visible live token output; downstream img2 image node was still RUNNING / Waiting for image. |
| LE-LINE-012 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Single-start interim runtime report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 | Computer Use: Chrome Workflow canvas single input workflow | computer_use_live | 0.97 | Single input LLM+img2 workflow reached SUCCESS WORKFLOW RUNTIME LITE; LLM had live token output; img2 and output nodes showed SUCCESS; generated image was visible; GENERATED count increased from 3 to 4. |
| LE-LINE-013 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Single-start terminal success report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| LE-CHROME-ACCOUNT-PANEL-001 | Computer Use: Chrome Account panel | computer_use_live | 0.94 | Account panel opened on localhost and showed STREAM: LIVE, Account Profile with a visible signed-in email, and LOGOUT control; email intentionally not recorded; this is not three-account UI signup evidence. |
| LE-LINE-014 | Computer Use: LINE Keep筆記 | computer_use_live | 0.94 | Account panel probe report was pasted, sent, and observed in LINE Keep; reporting-loop evidence only. |
| E-BOUNDARY-SCAN-ENABLING-REPAIR-001 | git diff and report review | script_scan | 0.91 | Provider status, UI provider readiness, workspace session, and focused tests are reclassified as scan-enabling repair-prep, not formal repair completion. |
| LE-CHROME-R5-REFRESH-VAULT-GATE-001 | Computer Use: Chrome localhost reload + Providers > Global API Vault | computer_use_live | 0.97 | Round 5 refreshed localhost, reopened Providers, observed Vault SERVER before manual entry, pasted the configured key from `.env.local` into the masked field, clicked Save & Lock, observed LOCKED, and cleared clipboard. |
| LE-CHROME-R5-SINGLE-RUN-INTERIM-001 | Computer Use: Chrome localhost Graph single input START | computer_use_live | 0.95 | Round 5 clicked the flying-car input START; toolbar changed to RUNNING, target LLM produced live output and reached SUCCESS, target img2 node was RUNNING / Waiting for image, and Providers stayed STREAM LIVE / Vault LOCKED. Terminal success not yet claimed. |
| LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 | Computer Use: Chrome localhost Graph single input LLM+img2 workflow | computer_use_live | 0.98 | Round 5 single-input run reached terminal SUCCESS: LLM SUCCESS, img2 Image Model SUCCESS, Output Text SUCCESS with Image generated text, visible generated image, toolbar SUCCESS WORKFLOW RUNTIME LITE, GENERATED count 1, and Providers stayed STREAM LIVE / Vault LOCKED. |
| LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 | Computer Use: Chrome localhost generated history/download | computer_use_live | 0.97 | Round 5 opened GENERATED 1 history, observed HISTORY 1 ASSETS and generated-image v1, clicked DOWNLOAD, accepted the macOS save dialog to Downloads, and observed Chrome downloads popover showing the generated PNG completed. Supporting filesystem check found the saved PNG in Downloads. |
| E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001 | localhost API probe | real_provider_api | 0.88 | Initial Round 5 API image/artifact probe created a temporary Supabase user and workspace, then passed imageGen 200, generatedAssetGet 200, and artifactList 200, but artifactCreate returned 500 before download. A minimal note artifact probe also returned artifactCreate 500. |
| E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001 | direct Supabase insert + migration scan | api_live_static_read | 0.91 | Direct Supabase insert with the same temporary-user/session pattern returned Postgres 22P02 for a prefixed source_task_id; migrations show artifacts.source_task_id and source_tool_run_id are uuid columns with foreign keys to task/tool_run rows. |
| E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | localhost API probe | real_provider_api | 0.97 | Corrected Round 5 API probe omitted unproven sourceTaskId/sourceToolRunId provenance fields and passed end to end: workspaceSession 200, imageGen 200, generatedAssetGet 200, artifactCreate 200, artifactList 200, artifactAssetDownload 200, provider=supabase-storage, durable=true, mime=image/png, bytes=1115234. |
| E-R6-DOC-CONVERGENCE-001 | checkpoint/report rg scan + file updates | document_convergence | 0.94 | Round 6 scanned report artifacts for stale Round 4/Round 5/pending/not-yet statements, then aligned active checkpoint, live evidence summary, and route matrix with evidence through E0129. Remaining not-yet-verified references are intentional NYV-PROD-PARITY-001 and NYV-FORMAL-REPAIR-001. |
| E-R7-FINAL-REPORT-CLOSEOUT-001 | final-report.md + report-paths.md | document_convergence | 0.95 | Round 7 added final closeout snapshot, explicit still-not-passed list, report paths, and a dedicated report-paths.md file with full absolute paths. |

## Inferences

| Inference ID | Based On | Claim | Confidence | Can Be Falsified By |
|---|---|---|---:|---|
| I0001 | E0002,E0003,E0004 | The rerun cannot be considered complete without Computer Use screen evidence and real provider evidence or explicit blocked/not-yet-verified status. | 0.90 | Validator failure or missing mandatory evidence in final report. |
| I-P01-CORE-001 | E-P01-CORE-002,E-P01-CORE-003,E-P01-CORE-004 | A credible rerun must combine static scan, unit/API probes, real provider tests, and Computer Use UI evidence; a single layer is insufficient. | 0.82 | A later branch proving all user-visible behavior is absent, blocked, or covered by a narrower route. |
| I-P01-DETAIL-001 | E-P01-DETAIL-002,E-P01-DETAIL-004 | Missing Global API Vault value may be caused by session/runtime state scrub, not absent configured provider credentials. Computer Use must load the vault in the current localhost session for UI-live proof. | 0.82 | UI reload shows key persisted, or tests show raw key is written to persistence. |
| I-P05-VAULT-001 | E-P05-DOCS-001,E-P05-CODE-001,E-P05-CODE-002,E-P05-TEST-001,E-P05-TYPE-001 | It is safer to expose server provider readiness as sanitized status and keep raw key entry/current-session handling in the UI, instead of persisting or reporting raw secrets. | 0.86 | Computer Use showing the UI cannot detect server status, provider verify failing due missing credential despite configured env, or validator rejecting evidence structure. |
| I-P05-PROVIDER-001 | E-P05-PROVIDER-VERIFY-001,E-P05-PROVIDER-VERIFY-002 | Provider verification must omit an explicit providerId or use the registry provider id for the selected model; the credential itself is usable for a real OpenAI-compatible call. | 0.92 | A later registry scan showing provider mappings changed, or another route requiring providerId=openai for the same model. |
| I-P02-WORKSPACE-ID-001 | E-P02-ACCOUNT-MATRIX-002,E-P02-ACCOUNT-MATRIX-003 | Account-scoped runtime calls must use the workspaceId returned by session bootstrap, not the initially preferred workspaceId, to satisfy permissions. | 0.94 | A later UI/code probe proving the preferred workspaceId is always returned unchanged or automatically remapped before stream calls. |
| I-P03-STARTALL-001 | LE-CHROME-FRESH-RUNTIME-STARTALL-001 | The visible START ALL control cannot be treated as a successful multi-start runtime capability in the current Lite Runner; a single-input START probe is required to isolate runtime/provider health. | 0.90 | A later runtime implementation update supports multiple starting input.text nodes or a separate full runner path handles START ALL successfully. |
| I-P03-SINGLE-START-001 | LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001,LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 | The current localhost Workflow Pro runtime can complete a fresh single-start LLM+img2 workflow when the Global API Vault has been locked in the current session. This does not resolve START ALL multi-start support. | 0.93 | A later rerun after refresh shows the same single-start path failing despite Vault LOCKED, or trace/API logs show the displayed image was not generated by the requested provider path. |
| I-BOUNDARY-SECOND-STAGE-SCAN-001 | E-BOUNDARY-SCAN-ENABLING-REPAIR-001,E-P05-TEST-001,E-P05-TYPE-001,E-P02-ACCOUNT-MATRIX-003 | This run is now in second-stage scan mode: minimal edits already made may be used to see the system clearly, but formal repair is not complete until the black-box scan closes. | 0.91 | A report claims formal repair completion before scan closure or broadens code edits without a blocker event. |
| I-P05-R5-ARTIFACT-PROVENANCE-001 | E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001,E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001,E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | Ad hoc artifact API callers should omit sourceTaskId/sourceToolRunId unless they can reference existing durable task/tool_run UUID rows; otherwise the artifact route currently collapses DB schema errors into 500. This is a repair-plan candidate for input validation/error clarity, not a provider failure. | 0.90 | A later route-level validation change accepts/explains external provenance ids, or a valid durable task/tool_run id makes the same fields pass. |

## Suspicions

| Suspicion ID | Based On | Claim | Next Probe |
|---|---|---|---|
| S-P02-IDEMPOTENCY-001 | E-P02-ROUTE-CONTRACT-001,E-P02-ACCOUNT-MATRIX-001,E-P02-ACCOUNT-MATRIX-002 | Confirmed and resolved: missing workspace mutation idempotency caused the first workspace/session failure; adding X-Idempotency-Key allowed workspace/session to proceed. | completed by NP-T04-RERUN-IDEMPOTENCY |
| S-P02-WORKSPACE-ID-001 | E-P02-ACCOUNT-MATRIX-002,E-P02-ACCOUNT-MATRIX-003 | Confirmed and resolved: server-returned workspaceId is authoritative for account-scoped stream calls. | completed by NP-T04-RERUN-RETURNED-WORKSPACE |

## Test Matrix

| Test ID | Status | Requirement | Evidence / Next Evidence |
|---|---|---|---|
| T01 | done | Global API Vault must be populated through Chrome + Computer Use and Save & Lock must be visible before UI conclusions. | LE-CHROME-VAULT-001 |
| T02 | done | Server provider status must be exposed as sanitized metadata only, with no raw key in route responses. | E-P05-CODE-001,E-P05-TEST-001 |
| T03 | done | Real LLM provider smoke test must pass through localhost route without mock/dry-run. | E-P05-PROVIDER-VERIFY-002 |
| T04 | done for account A UI LLM | New account A must be created/logged in, then after page open/refresh the Global API Vault gate must be verified or re-filled before LLM communication. | LE-CHROME-UIA-ACCOUNT-A-SIGNUP-001,LE-CHROME-UIA-ACCOUNT-A-VAULT-GATE-001,LE-CHROME-UIA-ACCOUNT-A-LLM-001,I-T04-UI-A-PROVIDER-LLM-001 |
| T05 | done for account B UI LLM | New account B must be created/logged in, then after page open/refresh the Global API Vault gate must be verified or re-filled before LLM communication. | LE-CHROME-UIB-ACCOUNT-B-SIGNUP-001,LE-CHROME-UIB-ACCOUNT-B-VAULT-GATE-001,LE-CHROME-UIB-ACCOUNT-B-LLM-001,I-T05-UI-B-PROVIDER-LLM-001 |
| T06 | done for account C UI LLM; three UI accounts complete | New account C must be created/logged in, then after page open/refresh the Global API Vault gate must be verified or re-filled before LLM communication. | LE-CHROME-UIC-ACCOUNT-C-SIGNUP-001,LE-CHROME-UIC-ACCOUNT-C-VAULT-GATE-001,LE-CHROME-UIC-ACCOUNT-C-LLM-001,I-T06-UI-ABC-PROVIDER-LLM-001 |
| T07 | api/provider done; workflow UI image evidence refreshed in Round 5 | A real image provider request must run using configured image model, with status/artifact metadata recorded. | E-P05-IMAGE-001,LE-CHROME-WORKFLOW-001,LE-CHROME-R5-SINGLE-RUN-SUCCESS-001,E-P05-R5-IMAGE-ARTIFACT-FINAL-001 |
| T08 | api/storage/artifact done; UI history/download refreshed in Round 5 | Generated artifact/history/storage/download availability must be checked through API and Computer Use screen evidence where UI-visible. | E-P02-ARTIFACT-IMAGE-001,LE-CHROME-DOWNLOAD-001,LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001,E-P05-R5-IMAGE-ARTIFACT-FINAL-001 |
| T09 | done for single-start including Round 5; START ALL still failing | Workflow Pro runtime must be started or resumed visibly in Chrome through Computer Use and observed as running/success/error. | LE-CHROME-WORKFLOW-001,LE-CHROME-FRESH-RUNTIME-STARTALL-001,LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001,LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001,LE-CHROME-R5-SINGLE-RUN-INTERIM-001,LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 |
| T10 | done, refreshed through Round 5 | Every localhost open/reload before UI testing must include a Computer Use Global API Vault locked-state check and re-fill if unlocked. | LE-CHROME-RELOAD-GATE-001,LE-CHROME-NEXT-VAULT-GATE-001,LE-CHROME-UIA-ACCOUNT-A-VAULT-GATE-001,LE-CHROME-UIB-ACCOUNT-B-VAULT-GATE-001,LE-CHROME-UIC-ACCOUNT-C-VAULT-GATE-001,LE-CHROME-R5-REFRESH-VAULT-GATE-001 |

## Branch State

- Core exploration status: P01-core evidence collected; detail branch scans completed enough to support route/provider/account/runtime/artifact conclusions.
- Detail branch status: P01-branch-runtime-authority-state completed.
- Collision branch status: tracked in R0004/R0008; no unrelated user changes were reverted.
- Suspicion branch status: S-P02-IDEMPOTENCY-001 and S-P02-WORKSPACE-ID-001 resolved; START ALL contradiction remains open.
- Active live matrix phase: P02-live-account-provider-artifact-matrix started at 2026-06-04T19:24:55Z.
- Second-stage scan boundary phase: P02-custom-second-stage-scan-boundary started at E0084; scan-enabling repair-prep was classified at E0085.
- Remaining unknowns: deployment parity and formal repair completion. UI three-account LLM path is resolved for localhost.
- Remaining account finding: UI accounts A, B, and C passed visible sign-up, Vault gate, and provider-backed LLM markers. API/provider evidence for three accounts also passed.
- Remaining image/artifact finding: API/provider/storage evidence passed; Chrome UI generated history/download evidence passed.
- Current UI screen: Chrome is on localhost:3000/ with account C signed in, Providers panel open, STREAM LIVE, Global API Vault LOCKED, and the latest thread showing UI_ACCOUNT_C_LLM_OK.
- Active Round 7 phase: P06/P02/P03/P05-custom-final-closeout started at E0137. Planned probes: NP-R7-FINAL-REPORT-CLOSEOUT, NP-R7-FINAL-VALIDATOR, NP-R7-FINAL-LINE, NP-R7-LAST-VALIDATOR.
- Last completed command: Round 7 final LINE report was posted to LINE Keep and observed as a new green message bubble.
- Last live Round 5 evidence: LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 proves the Round 5 generated-history/download UI path after the post-refresh Vault gate and successful LLM+img2 run.
- Last API Round 5 evidence: E-P05-R5-IMAGE-ARTIFACT-FINAL-001 proves the corrected provider/storage/artifact/download API path with temporary Supabase user and durable generated image asset.
- Next command: run the last validator and update final-report validator output.

## Event Log Mirror

- events.ndjson path: docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/events.ndjson
- Last event id: E0141
- Last checkpoint.created event: E0001
- Last checkpoint.read event: E0136
- Last phase.started event: E0137
- Last evidence.added event: E0140
- Last live_evidence.added event: E0141
- Last verdict.added event: none
- Last final_report.created event: E0053
- Last phase.completed event: E0139
- Mandatory live evidence: true
- Mandatory Computer Use evidence: true

## Contradictions

| Contradiction | Evidence A | Evidence B | Current Interpretation | Next Probe |
|---|---|---|---|---|
| C0001 | User requests raw key in Global API Vault | Secret redaction rules prohibit raw secret persistence in reports/events/LINE/chat | The key may be used and pasted into local UI, but durable reports must use sanitized evidence only. | Operate UI with Computer Use and record only configured/passed/failure metadata. |
| C-P03-STARTALL-LITE-MULTISTART-001 | START ALL button is visible and clickable in Workflow canvas | Runtime status after click reports FAILED WORKFLOW RUNTIME LITE because multiple starting input.text nodes are not supported | START ALL is an available UI affordance, not a verified working multi-start runtime capability. | NP-T09-SINGLE-START |

## Risk Register

| Risk | Severity | Likelihood | Blast Radius | Evidence | Next Action |
|---|---:|---:|---|---|---|
| R0001: UI/provider mismatch | 5 | 1 | Workflow Pro may appear mock-only even when server credentials exist or local vault is populated. | Mitigated by LE-CHROME-VAULT-001, LE-CHROME-R5-REFRESH-VAULT-GATE-001, E-P05-PROVIDER-VERIFY-002, and provider-backed UI runs. | Preserve explicit Vault gate and sanitized server provider status in tests. |
| R0002: Authority mismatch | 5 | 2 | Accounts may bootstrap workspaces but fail artifact/runtime operations. | Mitigated for API LLM by E-P02-ACCOUNT-MATRIX-003 and for UI LLM by LE-CHROME-UIA/B/C evidence; artifact/runtime scopes have separate positive evidence. | Keep server-returned workspaceId and idempotency checks in repair plan. |
| R0003: Provider durability gap | 5 | 1 | Real provider may succeed while storage/artifact persistence fails. | Mitigated by E-P05-IMAGE-001, E-P02-ARTIFACT-IMAGE-001, E-P05-R5-IMAGE-ARTIFACT-FINAL-001, and LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001. | Add repeatable provider/storage/artifact smoke. |
| R0004: Dirty worktree collision | 4 | 5 | Existing user/generated edits may interact with rerun fixes and reports. | E-P01-CORE-001 | Keep edits scoped; do not revert unrelated changes. |
| R0005: Vault expectation mismatch | 4 | 5 | User expects Global API Vault to contain the provided key every time, while persistence scrubs raw keys after reload. | E-P01-DETAIL-004,I-P01-DETAIL-001 | Use Computer Use to load key into current session and make UI status clearer without raw persistence. |
| R0006: Server-status UI regression risk | 4 | 1 | Code/tests passed and Computer Use confirmed localhost Providers can display server provider status and current-session LOCKED state. | E-P05-CODE-001,E-P05-CODE-002,E-P05-TYPE-001,LE-CHROME-VAULT-001,LE-CHROME-R5-REFRESH-VAULT-GATE-001 | Keep provider status redaction tests and UI smoke. |
| R0007: Identity Gate autofill contamination | 3 | 4 | Browser autofill may place Vault-related values into the account Email/Password fields after logout, causing misleading sign-up failures if not overwritten. | LE-CHROME-UIA-AUTOFILL-CONTAMINATION-001 | Overwrite both fields with disposable account credentials before each Sign Up/Login attempt. |
| R0008: Scan-enabling repair boundary risk | 4 | 3 | Reports may overstate formal repair completion if blocker-removal edits are not labeled as second-stage scan support. | E-BOUNDARY-SCAN-ENABLING-REPAIR-001 | Keep formal repair plan separate until final scan report closes. |

## Answered And Remaining Questions

1. Answered: Global API Vault is exposed in the Providers panel; raw keys are not persisted, while current-session lock and sanitized server provider status can be shown.
2. Answered: provider verify, v1 stream, image-gen, generated asset, artifact create/list/asset, and Workflow Pro runtime surfaces have route/UI evidence.
3. Answered: localhost UI Vault gate, A/B/C account LLM, single-start LLM+img2 runtime, generated history, and download have Computer Use evidence.
4. Remaining: preview/production parity is not verified and formal repair completion is deferred until scan closure.

## Next Command

```txt
Continue Round 7: update final report closeout, run validator, post final LINE report, run last validator, and then return final answer.
```
