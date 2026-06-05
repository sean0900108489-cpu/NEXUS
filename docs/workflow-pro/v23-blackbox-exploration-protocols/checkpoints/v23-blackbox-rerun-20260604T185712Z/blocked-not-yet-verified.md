# Blocked / Not-Yet-Verified

Run: v23-blackbox-rerun-20260604T185712Z

| ID | Status | Scope | Reason | Next Probe |
|---|---|---|---|---|
| NYV-PROD-PARITY-001 | not-yet-verified | Preview/production/Vercel parity | Localhost was the required primary channel. Production deployment was not pushed or tested in this run. | See 待連往後加強-部署實測.md |
| NYV-FORMAL-REPAIR-001 | not-yet-verified | Formal repair completion | Existing code edits are classified as scan-enabling repair-prep only. Formal repair completion is intentionally deferred until black-box scan closure. | Close scan report, then review/accept/modify P0/P1/P2 repairs as a separate phase. |

No blocked item is being reported as passed.

## Resolved / Converted This Round

| ID | New Status | Evidence | Notes |
|---|---|---|---|
| NYV-FRESH-RUNTIME-001 | resolved for single-start; converted to contradiction for START ALL | LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001, LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001, LE-CHROME-FRESH-RUNTIME-STARTALL-001 | A fresh single-start LLM+img2 workflow passed through Computer Use. START ALL remains failing because Lite Runner does not support multiple starting input.text nodes. |
| NYV-UI-ACCOUNT-001 | resolved for UI LLM path | LE-CHROME-UIA-ACCOUNT-A-LLM-001, LE-CHROME-UIB-ACCOUNT-B-LLM-001, LE-CHROME-UIC-ACCOUNT-C-LLM-001 | Accounts A/B/C were each created through Chrome UI, each had a visible Vault gate, and each received a provider-backed LLM marker. Image/artifact/runtime have their own separate evidence scopes. |
| NYV-R5-API-ARTIFACT-001 | resolved for corrected API probe; converted to repair-plan candidate for invalid provenance validation | E-P05-R5-IMAGE-ARTIFACT-ATTEMPT-001, E-P05-R5-ARTIFACT-PROVENANCE-SCHEMA-001, E-P05-R5-IMAGE-ARTIFACT-FINAL-001 | Initial ad hoc API artifact probes failed because the probe supplied invalid/unproven sourceTaskId/sourceToolRunId provenance. The corrected provider/image/artifact/download chain passed after omitting those fields. |
