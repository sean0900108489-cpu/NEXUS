# NEXUS Current State

> 最後更新：2026-06-18 AEST
> 版本：V32 (Phase 2B complete + Riverflow, commit `59eb863`)

---

## Production

| 項目 | 值 |
|---|---|
| URL | `https://nexus-swart-ten.vercel.app` |
| GitHub | `sean0900108489-cpu/NEXUS` |
| Branch | `main` (production) |
| Deploy | Vercel (auto from main) |
| Latest deploy commit | `59eb863` |
| Deploy status | ✅ READY (Phase 2B + Riverflow image model) |

## Backend

| 服務 | 狀態 |
|---|---|
| `/api/chat` | ✅ Live |
| `/api/v1/agents/[agentId]/stream` SSE | ✅ Live |
| `/api/workflow-pro/brain-draft` Graph Brain | ✅ Live |
| `/api/image-gen` | ✅ Live (DALL-E + chat-completions paths) |
| `/api/model-gateway/provision` | ✅ Live |
| `model_usage_ledger` | ✅ Recording |
| `agent_tasks` | ✅ Completed tasks visible |
| `messages` | ✅ Assistant output correct |
| Idempotency lock | ✅ Fixed (takeover expired pending) |
| Stream abort | ✅ Fixed (signal passthrough + reader cancel) |
| Sync counter | ✅ Fixed (stale syncing recovery) |
| Graph delete confirm | ✅ Fixed (window.confirm) |
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

## New API VPS

| 項目 | 值 |
|---|---|
| IP | `170.64.201.54` |
| SSH | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| Channels | DeepSeek (ch1), OpenAI-General (ch2), OpenRouter (ch3 — riverflow) |
| ModelRatio | All 0 (MVP intentional) |
| Ops guide | `docs/NEW_API_OPS_GUIDE.md` |

## Living Docs

- `docs/living/NEXUS_CURRENT_STATE.md` ← this file
- `docs/living/NEXUS_TECH_DEBT_LEDGER.md`
- `docs/living/NEXUS_SMOKE_TESTS.md`
- `docs/living/NEXUS_MODEL_GATEWAY.md`
- `docs/living/NEXUS_AGENT_HANDOFF.md`
- `docs/NEW_API_OPS_GUIDE.md`
