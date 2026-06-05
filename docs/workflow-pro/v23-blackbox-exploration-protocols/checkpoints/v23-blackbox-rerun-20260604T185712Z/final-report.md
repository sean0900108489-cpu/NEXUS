# Final Report

Run: v23-blackbox-rerun-20260604T185712Z

## Route

Router selected primary protocol P01, with secondary P02/P03/P05/P06. Mandatory live evidence, Computer Use evidence, and real provider evidence were all required.

## Scan Mode Boundary

This run is now classified as a second-stage black-box scan. Minimal scan-enabling repair-prep was performed only to remove blockers that prevented the scan from seeing provider/account/workspace behavior clearly. These edits are not the formal repair phase and must not be reported as completed product repair until the scan report closes.

Evidence: E-BOUNDARY-SCAN-ENABLING-REPAIR-001, I-BOUNDARY-SECOND-STAGE-SCAN-001, R0008.

## Completed

| Item | Result | Evidence |
|---|---|---|
| Global API Vault Chrome operation | pass | LE-CHROME-VAULT-001 |
| Server provider status scan-enabling repair-prep | pass for scan unblock; not formal repair completion | E-P05-CODE-001, E-P05-CODE-002, E-P05-TEST-001, E-P05-TYPE-001, E-BOUNDARY-SCAN-ENABLING-REPAIR-001 |
| Real provider verify | pass | E-P05-PROVIDER-VERIFY-002 |
| Three new account LLM matrix | pass at API/provider layer | E-P02-ACCOUNT-MATRIX-003 |
| Real image provider | pass | E-P05-IMAGE-001 |
| Generated asset/artifact/download API chain | pass | E-P02-ARTIFACT-IMAGE-001 |
| Workflow Pro runtime UI screen | pass | LE-CHROME-WORKFLOW-001 |
| Fresh single-start LLM+img2 runtime UI screen | pass | LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001, LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 |
| START ALL multi-start runtime UI screen | fail / contradiction | LE-CHROME-FRESH-RUNTIME-STARTALL-001, C-P03-STARTALL-LITE-MULTISTART-001 |
| Generated history/download UI screen | pass | LE-CHROME-DOWNLOAD-001 |
| Localhost reload vault gate | pass | LE-CHROME-RELOAD-GATE-001 |
| Next-round localhost vault gate | pass | LE-CHROME-NEXT-VAULT-GATE-001 |
| Current account panel UI screen | partial pass | LE-CHROME-ACCOUNT-PANEL-001 |
| UI account A provider-backed chat screen | pass | LE-CHROME-UIA-ACCOUNT-A-SIGNUP-001, LE-CHROME-UIA-ACCOUNT-A-VAULT-GATE-001, LE-CHROME-UIA-ACCOUNT-A-LLM-001 |
| UI account B provider-backed chat screen | pass | LE-CHROME-UIB-ACCOUNT-B-SIGNUP-001, LE-CHROME-UIB-ACCOUNT-B-VAULT-GATE-001, LE-CHROME-UIB-ACCOUNT-B-LLM-001 |
| UI account C provider-backed chat screen | pass | LE-CHROME-UIC-ACCOUNT-C-SIGNUP-001, LE-CHROME-UIC-ACCOUNT-C-VAULT-GATE-001, LE-CHROME-UIC-ACCOUNT-C-LLM-001 |
| Round 5 refresh/Vault gate | pass | LE-CHROME-R5-REFRESH-VAULT-GATE-001 |
| Round 5 single-start LLM+img2 runtime UI screen | pass | LE-CHROME-R5-SINGLE-RUN-INTERIM-001, LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 |
| Round 5 generated history/download UI screen | pass | LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 |
| Round 5 corrected real provider/image/artifact/download API chain | pass | E-P05-R5-IMAGE-ARTIFACT-FINAL-001 |
| Round 5 artifact provenance mismatch probe | investigated / converted to repair-plan candidate | E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001, E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001, I-P05-R5-ARTIFACT-PROVENANCE-001 |
| LINE reporting loop | pass through Round 7 final closeout | LE-LINE-001..023 |

## Main Findings

0. Earlier provider/workspace code edits are now explicitly classified as scan-enabling repair-prep. They can be used to complete black-box evidence collection, but final P0/P1/P2 repair work has not started as a separate phase.
1. Provider credentials are usable through localhost real provider routes. The first verify failed only because providerId=openai did not match the local registry mapping for gpt-4o-mini; the registry-correct request verified true.
2. Workspace mutation calls require X-Idempotency-Key before account/runtime conclusions are meaningful.
3. Workspace/session can return a workspaceId different from a preferred client id. The returned workspaceId must be used for account-scoped stream calls.
4. Real image generation, durable generated asset fetch, artifact create/list, and artifact asset download passed through localhost.
5. Computer Use screen evidence showed Global API Vault locked, STREAM: LIVE, Workflow Runtime Lite success, generated images, generated history, and completed PNG download.
6. A localhost refresh can return the vault to server-configured state; the UI gate must re-fill the masked field and Save & Lock before further UI assertions.
7. START ALL is visible and clickable, but the current Lite Runner rejects multiple starting input.text nodes. This remains a live contradiction, not a passing runtime capability.
8. A single visible input workflow did complete fresh after the next-round Vault gate: LLM live output succeeded, img2 generated a visible image, output node succeeded, and GENERATED count increased from 3 to 4.
9. UI accounts A, B, and C were individually driven through Chrome sign-up, Global API Vault Save & Lock, and provider-backed workspace chat. The screen displayed UI_ACCOUNT_A_LLM_OK, UI_ACCOUNT_B_LLM_OK, and UI_ACCOUNT_C_LLM_OK respectively.
10. Round 5 repeated the required refresh-before-test Vault gate: localhost was reloaded, Providers reopened, the masked Global API Vault was re-filled from `.env.local` without printing the key, Save & Lock reached LOCKED, and clipboard was cleared.
11. Round 5 repeated a post-refresh single-start LLM+img2 workflow: Chrome showed LLM SUCCESS, img2 Image Model SUCCESS, Output Text SUCCESS, visible generated image, SUCCESS WORKFLOW RUNTIME LITE, and GENERATED 1.
12. Round 5 generated history/download was operated on screen: GENERATED 1 opened, HISTORY 1 ASSETS appeared, generated-image v1 was downloaded, and Chrome showed the PNG completed.
13. Round 5 API provider/image/artifact chain passed after the ad hoc probe omitted sourceTaskId/sourceToolRunId fields it could not prove. The final corrected probe returned 200 for workspace/session, image generation, generated asset GET, artifact create, artifact list, and artifact asset download with matching bytes.
14. Artifact create failures during the first Round 5 API probes were not provider failures. Direct Supabase evidence and migrations show ad hoc provenance fields can violate uuid/FK expectations; route-level validation/error clarity should be handled in formal repair.

## Not-Yet-Verified

| ID | Scope |
|---|---|
| NYV-PROD-PARITY-001 | Preview/production deployment parity was not tested. |
| NYV-FORMAL-REPAIR-001 | Formal repair completion is deferred; this run produced scan evidence and scan-enabling repair-prep, not a completed product repair phase. |

## Final Closeout Snapshot

Overall status: localhost black-box scan reached report-ready state with validator passing through Round 6. Final Round 7 validation is required before declaring the run closed.

Verified with Computer Use screen evidence:

- Global API Vault current-session Save & Lock flow.
- A/B/C disposable UI account sign-up and provider-backed LLM marker replies.
- Workflow Pro single-start LLM+img2 runtime success.
- Generated history and PNG download.
- LINE Keep reporting loop through Round 6.

Verified with real provider/API evidence:

- Provider verify through localhost.
- Three-account API LLM stream matrix.
- Real image generation with durable generated asset.
- Corrected provider/image/artifact/create/list/download chain.

Still not passed:

- START ALL multi-start runtime remains a contradiction because Lite Runner rejects multiple starting input.text nodes.
- Preview/production parity remains not-yet-verified and is intentionally deferred to the deployment-strengthening file.
- Formal repair completion remains not-yet-verified; repair plan is proposed for a later formal repair phase.

## Repair Plan

This is a proposed formal repair plan after scan closure. Items already touched during this run are still classified as scan-enabling repair-prep until the scan closes and formal repair review begins.

P0: use server-returned workspaceId everywhere downstream; send X-Idempotency-Key for mutations; keep reload vault gate in UI test flow; align START ALL UI with Lite Runner capability or implement multi-start runtime support.

P1: preserve sanitized server provider status in Providers panel; add repeatable single-start and multi-start runtime smokes; validate or omit artifact sourceTaskId/sourceToolRunId unless real durable task/tool_run rows exist.

P2: add Vercel preview/production parity and automated sanitized report extraction.

## Report Paths

```txt
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/00-active-checkpoint.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/events.ndjson
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/final-report.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/route-auth-storage-runtime-artifact-matrix.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/live-evidence-summary.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/provider-evidence-summary.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/blocked-not-yet-verified.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/repair-plan.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/branch-p02-p05-account-provider-artifact.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/待連往後加強-部署實測.md
/Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/report-paths.md
```

## Validator Output

Command:

```txt
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z
```

Latest validator result before final LINE closeout:

```json
{
  "ok": true,
  "checkedAt": "2026-06-04T21:56:19.705Z",
  "runCount": 1,
  "failures": [],
  "warnings": [],
  "counts": {
    "events": 139,
    "liveEvidence": 48,
    "computerUseEvidence": 48,
    "verdicts": 0,
    "phases": 13
  }
}
```
