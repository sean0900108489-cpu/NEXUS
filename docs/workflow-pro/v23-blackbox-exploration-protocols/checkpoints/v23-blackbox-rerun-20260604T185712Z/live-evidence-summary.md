# Live Evidence Summary

Run: v23-blackbox-rerun-20260604T185712Z

| Evidence ID | Method | Status | What It Proves |
|---|---|---|---|
| LE-CHROME-VAULT-001 | computer_use_live | pass | Chrome localhost Global API Vault accepted the authorized key in a masked field and reached LOCKED state. |
| LE-CHROME-WORKFLOW-001 | computer_use_live | pass | Workflow Pro UI showed STREAM: LIVE, runtime success, successful LLM/image/output nodes, and generated images. |
| LE-CHROME-FRESH-RUNTIME-STARTALL-001 | computer_use_live | fail / contradiction | START ALL was visible/clickable after Vault LOCKED, but Lite Runner returned FAILED because multiple starting input.text nodes are unsupported. |
| LE-CHROME-FRESH-RUNTIME-SINGLE-INTERIM-001 | computer_use_live | interim pass | Single input workflow reached RUNNING; input and LLM nodes showed SUCCESS with live token output while img2 was still waiting. |
| LE-CHROME-FRESH-RUNTIME-SINGLE-SUCCESS-001 | computer_use_live | pass | Single input LLM+img2 workflow reached SUCCESS; visible generated image appeared; output node succeeded; GENERATED count increased from 3 to 4. |
| LE-CHROME-DOWNLOAD-001 | computer_use_live | pass | Generated history showed 3 assets and a generated PNG download completed in Chrome. |
| LE-CHROME-RELOAD-GATE-001 | computer_use_live | pass | Refresh gate was executed: vault checked before reload, re-filled after reload, Save & Lock restored LOCKED state. |
| LE-CHROME-NEXT-VAULT-GATE-001 | computer_use_live | pass | Next-round localhost open/gate showed current-session Vault not yet locked, then masked key paste and Save & Lock restored LOCKED state. |
| LE-CHROME-ACCOUNT-PANEL-001 | computer_use_live | partial pass | Account panel opened and showed STREAM: LIVE, Account Profile, and Logout for the current signed-in session; UI account A/B/C LLM paths are recorded separately. |
| LE-CHROME-UIA-ACCOUNT-A-SIGNUP-001 | computer_use_live | pass | Disposable UI account A was created through Chrome localhost Sign Up and loaded into the main NEXUS canvas. |
| LE-CHROME-UIA-ACCOUNT-A-VAULT-GATE-001 | computer_use_live | pass | Before account A provider action, the Global API Vault gate was repeated with a masked key paste, Save & Lock, LOCKED state, and clipboard clear. |
| LE-CHROME-UIA-ACCOUNT-A-LLM-001 | computer_use_live | pass | Account A sent a workspace message through the UI and received the requested LLM marker UI_ACCOUNT_A_LLM_OK while Providers stayed STREAM LIVE and Vault LOCKED. |
| LE-CHROME-UIB-ACCOUNT-B-SIGNUP-001 | computer_use_live | pass | Disposable UI account B was created through Chrome localhost Sign Up and loaded into the main NEXUS canvas. |
| LE-CHROME-UIB-ACCOUNT-B-VAULT-GATE-001 | computer_use_live | pass | Before account B provider action, the Global API Vault gate was explicitly unlocked, re-filled with masked key paste, Save & Lock, LOCKED state, and clipboard clear. |
| LE-CHROME-UIB-ACCOUNT-B-LLM-001 | computer_use_live | pass | Account B sent a workspace message through the UI and received the requested LLM marker UI_ACCOUNT_B_LLM_OK while Providers stayed STREAM LIVE and Vault LOCKED. |
| LE-CHROME-UIC-ACCOUNT-C-SIGNUP-001 | computer_use_live | pass | Disposable UI account C was created through Chrome localhost Sign Up and loaded into the main NEXUS canvas. |
| LE-CHROME-UIC-ACCOUNT-C-VAULT-GATE-001 | computer_use_live | pass | Before account C provider action, the Global API Vault gate was explicitly unlocked, re-filled with masked key paste, Save & Lock, LOCKED state, and clipboard clear. |
| LE-CHROME-UIC-ACCOUNT-C-LLM-001 | computer_use_live | pass | Account C sent a workspace message through the UI and received the requested LLM marker UI_ACCOUNT_C_LLM_OK while Providers stayed STREAM LIVE and Vault LOCKED. |
| LE-CHROME-R5-REFRESH-VAULT-GATE-001 | computer_use_live | pass | Round 5 reloaded localhost, reopened Providers, re-filled the masked Global API Vault from local env, clicked Save & Lock, observed LOCKED, and cleared clipboard. |
| LE-CHROME-R5-SINGLE-RUN-INTERIM-001 | computer_use_live | interim pass | Round 5 single input START changed Workflow Runtime Lite to RUNNING; LLM produced live output and reached SUCCESS while img2 was still waiting. |
| LE-CHROME-R5-SINGLE-RUN-SUCCESS-001 | computer_use_live | pass | Round 5 single input LLM+img2 workflow reached terminal SUCCESS with visible generated image, Output Text SUCCESS, toolbar SUCCESS, GENERATED 1, and Vault LOCKED. |
| LE-CHROME-R5-GENERATED-HISTORY-DOWNLOAD-001 | computer_use_live | pass | Round 5 opened GENERATED 1 history, saw HISTORY 1 ASSETS and generated-image v1, clicked DOWNLOAD, accepted the save dialog, and Chrome showed the PNG completed. |
| LE-LINE-001..023 | computer_use_live | pass | Sanitized phase and round reports were pasted and sent to LINE Keep through Round 7 final closeout. |

Computer Use is the only evidence class used for UI-available conclusions in this run. API, static, and unit evidence are supporting layers, not replacements for screen evidence.
