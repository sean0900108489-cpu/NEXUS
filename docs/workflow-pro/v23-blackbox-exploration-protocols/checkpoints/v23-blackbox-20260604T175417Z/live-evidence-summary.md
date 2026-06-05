# Live Evidence Summary

Run ID: `v23-blackbox-20260604T175417Z`

## Computer Use Live

| Evidence | Method | Target | Result | Claim allowed |
|---|---|---|---|---|
| `LE-P02-001` | `computer_use_live` | Chrome, `http://localhost:3000/` | Opened a new tab, typed localhost, and observed the NEXUS auth gate with email/password/Login/Need Account controls. | Auth gate is visible on localhost. |
| `LE-LINE-001` | `computer_use_live` | LINE `Keep筆記` | Posted the sanitized progress report and confirmed it appeared as a sent Keep note. | User-requested reporting loop status only. |

No Computer Use evidence reached a logged-in Workflow Pro screen. Therefore import/export, graph edit, apply preview, run, generated history, download, account action, or workspace UI usability must remain `not-yet-verified`.

## Browser Live

| Evidence | Method | Target | Result | Claim allowed |
|---|---|---|---|---|
| `LE-P01-001` | `browser_live` | `http://127.0.0.1:3000/` | Auth gate visible after checkpoint creation. | Supporting evidence for localhost first state. |

Browser evidence supports the route state but does not replace Computer Use for visible UI claims.

## API Live

| Evidence | Event type | Method | Result | Claim allowed |
|---|---|---|---|---|
| `E-P05-002` | `live_evidence.added` | `local_api_probe` | Real OpenAI image provider returned image bytes without workspace durability. | API-level provider success only. |
| `E-P05-003` | `live_evidence.added` | `local_api_probe` | Real OpenAI image provider plus Supabase storage returned durable asset. | API-level provider/storage success only. |
| `E-P05-004` | `live_evidence.added` | `local_api_probe` | Real image, artifact create, artifact list, and artifact download succeeded. | API-level durable generated-image chain only. |
| `E-P05-005` | `live_evidence.added` | `local_api_probe` | Real LLM provider verification returned verified. | API-level LLM provider verification only. |
| `E-P03-004` | `live_evidence.added` | `local_api_probe` | Runtime group record and runtime trace persisted through localhost API. | API-level runtime ledger success only. |

These are live backend/API observations. They do not replace `computer_use_live` for UI, Workflow Pro, account, graph, import/export, generated history, or download claims.
