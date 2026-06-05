# Repair Plan

Run: v23-blackbox-rerun-20260604T185712Z

## Boundary

This file is a proposed formal repair plan for after black-box scan closure. The provider/workspace edits already present in the worktree are classified as scan-enabling repair-prep: they were used to remove scan blockers and must be reviewed separately before being counted as final repair completion.

Boundary evidence: E-BOUNDARY-SCAN-ENABLING-REPAIR-001, I-BOUNDARY-SECOND-STAGE-SCAN-001, R0008.

## P0

| ID | Repair | Evidence Basis |
|---|---|---|
| RP-P0-001 | Ensure all account-scoped runtime calls use the workspaceId returned by /api/v1/workspaces/session. | E-P02-ACCOUNT-MATRIX-002, E-P02-ACCOUNT-MATRIX-003, I-P02-WORKSPACE-ID-001 |
| RP-P0-002 | Ensure UI/workspace mutations consistently send X-Idempotency-Key. | E-P02-ROUTE-CONTRACT-001, E-P02-ACCOUNT-MATRIX-001 |
| RP-P0-003 | Preserve the Global API Vault reload gate in UI testing and operator flow: check before reload/open and re-fill/Save & Lock after reload when needed. | LE-CHROME-VAULT-001, LE-CHROME-RELOAD-GATE-001 |
| RP-P0-004 | Align START ALL with runtime capability: either implement multi-start Lite Runner support or disable/explain START ALL when multiple starting input.text nodes are present. | LE-CHROME-FRESH-RUNTIME-STARTALL-001, C-P03-STARTALL-LITE-MULTISTART-001 |

## P1

| ID | Repair | Evidence Basis |
|---|---|---|
| RP-P1-001 | Keep sanitized server provider status visible in Providers panel so operators can distinguish server configured from local locked. | E-P05-CODE-001, E-P05-CODE-002, LE-CHROME-WORKFLOW-001 |
| RP-P1-002 | Preserve the now-proven three-account visible sign-up/login/LLM matrix as a repeatable UI smoke. | LE-CHROME-UIA-ACCOUNT-A-LLM-001, LE-CHROME-UIB-ACCOUNT-B-LLM-001, LE-CHROME-UIC-ACCOUNT-C-LLM-001 |
| RP-P1-003 | Add repeatable single-start and multi-start workflow smokes that record node status, generated history, and downloadable artifact. | LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001, LE-CHROME-FRESH-RUNTIME-STARTALL-001, LE-CHROME-DOWNLOAD-001 |
| RP-P1-004 | Add artifact route validation or client normalization for sourceTaskId/sourceToolRunId so ad hoc callers cannot send non-UUID or non-existent provenance IDs that collapse into generic 500 responses. | E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001, E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001, I-P05-R5-ARTIFACT-PROVENANCE-001 |

## P2

| ID | Repair | Evidence Basis |
|---|---|---|
| RP-P2-001 | Add preview/production parity run on Vercel after local evidence passes. | NYV-PROD-PARITY-001 |
| RP-P2-002 | Add automated report extraction that mirrors events.ndjson evidence into final-report.md without raw secrets. | Validator requirements and reporting-loop overhead |
