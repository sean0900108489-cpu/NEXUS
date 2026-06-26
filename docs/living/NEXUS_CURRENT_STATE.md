# NEXUS Current State

> 最後更新：2026-06-26 AEST
> 版本：V33 (Commercial Home Shell + Thin Pages + Phase 1 Truth Scan, branch `codex/v40`)

---

## Current Architecture

NEXUS 已從 workspace-first 轉為 platform-first：

- **`/` (Home)** — NexusHomeShell：account-level global chat，sidebar 顯示 recent chats、workspaces、wallet badge
- **`/workspace/[id]`** — NexusOps (preserved legacy workspace)
- **Global Chat** — 獨立於 workspace chat，有自己的 conversations/messages tables
- **Wallet/Billing** — Credit system with wallet_balances + wallet_transactions + model_usage_ledger
- **NOVA** — Frozen, security quarantine only

## Home Data Flow (v33 verified)

Home page (`/`) reads 4 API endpoints on mount:
- `GET /api/wallet/balance`
- `GET /api/models`
- `GET /api/global-chats`
- `GET /api/workspaces`

Auth gate: all 4 return 401 → unauthenticated (empty shell).

## Thin Pages (v40)

7 placeholder routes created to resolve 404 links from sidebar:
- `/search` — Search Chats (future)
- `/artifacts` — Artifact Library (future)
- `/workflows` — Workflow Builder (future)
- `/wallet` — Wallet Dashboard (future)
- `/workspaces` — Workspace Listing (future)
- `/chat/[id]` — Chat Detail (future)
- `/sign-in` — Auth Page (future)

All thin pages provide navigation back to Home.

## Production

| 項目 | 值 |
|---|---|
| URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` (production) |
| Branch (v40) | `codex/v40` (Phase 1 Truth Scan + Thin Pages) |
| Deploy | Vercel (auto from main) |
| Latest deploy commit | `59eb863` |
| Deploy status | ✅ READY (Phase 2B + Riverflow image model) |

## Backend

| 服務 | 狀態 |
|---|---|
| `/api/chat` | ✅ Live |
| `/api/global-chat` POST | ✅ Live (create/continue global conversation) |
| `/api/global-chats` GET, DELETE | ✅ Live |
| `/api/global-chats/[id]` GET | ✅ Live |
| `/api/wallet/balance` GET | ✅ Live |
| `/api/models` GET | ✅ Live (plan-filtered) |
| `/api/workspaces` GET | ✅ Live |
| `/api/imports` POST | ✅ Live (S-8 adapter) |
| `/api/v1/agents/[agentId]/stream` SSE | ✅ Live |
| `/api/workflow-pro/brain-draft` Graph Brain | ✅ Live |
| `/api/image-gen` | ✅ Live (DALL-E + chat-completions paths) |
| `/api/model-gateway/provision` | ✅ Live |
| `model_usage_ledger` | ✅ Recording (91/100 recent success via agent_stream) |
| `agent_tasks` | ✅ Completed tasks visible |
| `global_conversations` | ✅ 3 empty conversations (global-chat not yet used with AI) |
| `global_messages` | ⚠️ 0 rows (requires user New API token for AI calls) |
| Idempotency lock | ✅ Fixed |
| Stream abort | ✅ Fixed |
| Sync counter | ✅ Fixed |
| Graph delete confirm | ✅ Fixed |
| Zundo snapshot limit | ✅ 50→20 (Phase 2A) |
| IndexedDB persist | ✅ Stripped artifactVault, notebooksCache, deletedNotebooksCache (Phase 2A) |

## Phase 2A — Completed (commit `fbfbd48`)

| # | 修復 | Commit |
|---|---|---|
| P0-5 | Idempotency lock takeover | `fa0a294` |
| P0-6 | Stream abort orphan tasks | `fa0a294` |
| P0-1 | Sync stuck "1 syncing" | `044400a` |
| P0-3 | Graph delete confirm | `044400a` |
| P1-1 | ResizeObserver N+1 | `67c4d17` |
| P1-2 | Artifact offline queue | `67c4d17` |
| P1-2 | syncHistoricalArtifact no-op | `67c4d17` |
| P1-4 | Image gen catalog converge | `e7d41c1` |

## Phase 2B — Completed (commit `d2f35e2`)

| # | 變更 | Commit |
|---|---|---|
| PR 0 | Docs normalization: img2 plan gate Free+→Basic+ | `d4febfa` |
| PR 1 | Connector hooks: useTopBarProps, useRightDockProps, useAgentSettingsSidebarProps | `2605f98` |
| PR 2 | Workflow Pro read-model extraction: useWorkflowProReadModel | `d2f35e2` |
| — | nexus-ops.tsx: 3,764 → 3,676 lines (-2.3% in Phase 2B) |

## Phase 1 Truth Scan (v40, 2026-06-26)

Notion: SupaseaNexus｜NEXUS 中型蛻變總控 2026-06-26
- ✅ Source Authority Map (Supabase > GitHub > Notion)
- ✅ 7 attention nodes (AN-001 through AN-007)
- ✅ Current Truth Skeleton
- ✅ 4 scanner reports (Home Data, Schema, Frontend Entry, Docs Drift)

## Image Gen

| 項目 | 值 |
|---|---|
| img2 | GPT Image 2 (DALL-E path: /v1/images/generations) |
| riverflow-v2.5-fast | Riverflow v2.5 Fast (chat-completions path: /v1/chat/completions) |
| img2 catalog mapping | `img2` → `new_api_model: "gpt-image-2"` |
| riverflow catalog mapping | `riverflow-v2.5-fast` → `new_api_model: "sourceful/riverflow-v2.5-fast"` |
| img2 plan gate | Basic+ |
| riverflow plan gate | Free+ (all plans) |
| Default | img2 |
| Adapter routing | google/* → modalities; sourceful/* → no modalities; else → /v1/images/generations |

## Database

| 項目 | 值 |
|---|---|
| Supabase | `xjuglddxwnikvcwxfbzg` (ap-southeast-2) |
| plan_config | Free → deepseek-chat, gpt-4o-mini, riverflow-v2.5-fast; Basic → +v4-flash, gpt-4o, gemini-2.5-flash, img2; Pro → +v4-pro, gemini-2.5-pro, claude-sonnet-4; Team → same as Pro |
| wallet_balances | 3 rows |
| wallet_transactions | 6 rows |
| global_conversations | 3 rows |
| global_messages | 0 rows |
| model_usage_ledger | 201 rows |
| workspaces | 102 rows |
| workspace_memberships | 82 rows |
| artifacts | 48 rows (all generated-image) |
| artifact_references | 0 rows |
| user_attachments | 0 rows |
| system_events | 10,791 rows |
| permission_audit_logs | 2,098 rows |
| api_idempotency_keys | 721 rows |

## New API VPS

| 項目 | 值 |
|---|---|
| IP | `170.64.201.54` |
| SSH | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| Channels | DeepSeek (ch1), OpenAI-General (ch2), OpenRouter (ch3 — riverflow) |
| ModelRatio | All 0 (MVP intentional) |
| Ops guide | `docs/NEW_API_OPS_GUIDE.md` |

## Living Docs

- `docs/living/NEXUS_CURRENT_STATE.md` ← this file (v33)
- `docs/living/NEXUS_TECH_DEBT_LEDGER.md`
- `docs/living/NEXUS_SMOKE_TESTS.md`
- `docs/living/NEXUS_MODEL_GATEWAY.md`
- `docs/living/NEXUS_AGENT_HANDOFF.md`
- `docs/NEW_API_OPS_GUIDE.md`
- Notion: `SupaseaNexus｜NEXUS 中型蛻變總控 2026-06-26`

