# NEXUS Smoke Tests

> 最後更新：2026-06-18 AEST
> 版本：V32 (Phase 2B complete, commit `59eb863`)

---

## Post-Deploy Verification (Production)

| # | Endpoint | Status | Details |
|---|---|---|---|
| 1 | `POST /api/chat` | ✅ PASS | deepseek-chat → "POST_DEPLOY_OK" |
| 2 | `POST /api/v1/agents/[agentId]/stream` SSE | ✅ PASS | meta→token→done, no errors |
| 3 | `POST /api/workflow-pro/brain-draft` Graph Brain | ✅ PASS | 3 nodes, 2 edges, 1 output, all ids present |
| 4 | `model_usage_ledger` latest | ✅ PASS | operator_chat, agent_stream, brain_draft all succeeded |
| 5 | `agent_tasks` latest | ✅ PASS | latest task completed |
| 6 | `messages` latest assistant | ✅ PASS | content = "STREAM_POST_DEPLOY_OK" |

---

## Backend Model Gateway

| # | Endpoint | Status |
|---|---|---|
| 1 | `/api/chat` | ✅ PASS |
| 2 | Agent stream SSE | ✅ PASS |
| 3 | Graph Brain | ✅ PASS |
| 4 | Usage ledger | ✅ PASS |
| 5 | deepseek-v4-flash/pro routing | ✅ OK |
| 6 | Idempotency lock takeover | ✅ FIXED |
| 7 | Stream abort → orphan tasks | ✅ FIXED |

---

## Image Generation

| # | Model | Status | Details |
|---|---|---|---|
| 1 | img2 (GPT Image 2) | ✅ Live | /v1/images/generations, DALL-E path |
| 2 | riverflow-v2.5-fast (Riverflow v2.5 Fast) | ✅ Live | /v1/chat/completions, sourceful/* adapter, no modalities |
| 3 | Composer options | ✅ | GPT Image 2 / img2 + Riverflow v2.5 Fast / riverflow-v2.5-fast |
| 4 | gpt-image-2 not exposed | ✅ | Only used as new_api_model, never as composer value |
| 5 | VPS OpenRouter channel | ✅ | ch3: sourceful/riverflow-v2.5-fast, base_url + key configured |
| 6 | VPS ModelRatio | ✅ | sourceful/riverflow-v2.5-fast = 0.0 |

---

## UI Reliability

| # | Issue | Status | Details |
|---|---|---|---|
| 8 | Sync stuck at "1 syncing" | ✅ FIXED | forceCleanStaleSyncing() recovers after 2min |
| 9 | Maximize triggers Branch UI | ✅ Verified | Explicit callbacks, no code path overlap |
| 10 | Graph Delete no confirm | ✅ FIXED | window.confirm() guard |
| 17 | ResizeObserver N+1 | ✅ FIXED | Single root observer |
| 29-30 | Artifact sync durability | ✅ FIXED | Offline queue + historical queue |
| 13 | Image gen catalog | ✅ FIXED | img2 only → now img2 + riverflow-v2.5-fast |

---

## Phase 2A / 2B Regression

| # | Check | Status |
|---|---|---|
| 1 | Zundo limit = 20 | ✅ |
| 2 | artifactVault not in IndexedDB persist | ✅ |
| 3 | notebooksCache not in IndexedDB persist | ✅ |
| 4 | connector hooks (TopBar, RightDock, AgentSettingsSidebar) | ✅ |
| 5 | Workflow Pro read-model extraction | ✅ |
| 6 | handleSend not moved | ✅ |
| 7 | SSE contract unchanged | ✅ |
| 8 | P0 routes untouched | ✅ |

---

## V33 Release Hardening Regression (2026-06-18)

| # | Check | Status | Round |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | ✅ PASS | R9 |
| 2 | P0 boundaries zero diff (chat, agent-stream, brain-draft, image-gen, model-catalog, plan-config, image-adapter) | ✅ PASS | R9 |
| 3 | Core file sizes: nexus-ops 3,684 (+8), nexus-store 4,679 (0), image-adapter 401 (0) | ✅ PASS | R9 |
| 4 | Artifact `uploadBase64ContentUrl` accessToken chain complete (service → route → context) | ✅ PASS | R9 |
| 5 | `toVaultRecord` base64 contentUrl guard | ✅ PASS | R9 |
| 6 | `compactAllConflictedOperations` exported + wired in `retryFailedSyncOperation` | ✅ PASS | R9 |
| 7 | `nexus:sync-auth-required` CustomEvent pair (dispatch + listener) | ✅ PASS | R9 |
| 8 | TopBar no longer receives `streamMode` / `workspaceRole` props | ✅ PASS | R9 |
| 9 | Composer quality select conditional on `supportsQuality` | ✅ PASS | R9 |

---

## Test Methodology

- Backend: direct Node.js fetch against production `https://nexus-swart-ten.vercel.app`
- DB: Supabase REST API with service role key
- Auth: Supabase session token from user `sean00000@gmail.com`
- UI: Atlas / Hermes browser-based smoke test
- VPS: direct curl against New API on `170.64.201.54`
