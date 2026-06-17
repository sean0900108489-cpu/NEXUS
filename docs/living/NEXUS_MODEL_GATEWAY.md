# NEXUS Model Gateway

> 最後更新：2026-06-17

---

## Architecture

```
Supabase Auth
   ↓
Plan Gate (Free/Basic/Pro/Team)
   ↓
Server Model Catalog (model-catalog.ts)
   ↓
Quota Gate (quota-gate.ts)
   ↓
user_new_api_tokens (encrypted per-user New API token)
   ↓
New API (VPS 170.64.201.54, Docker, port 80→3000)
   ↓
DeepSeek / OpenAI / Gemini / Claude channels
   ↓
model_usage_ledger
```

## Key Principle

NEXUS is NOT BYOK. Users never see or paste API tokens.
Platform manages downstream tokens via `/api/model-gateway/provision`.

## Current Models (MVP)

| Model ID | Provider | Min Plan | Status |
|---|---|---|---|
| deepseek-chat | DeepSeek | Free | ✅ Live |
| deepseek-v4-flash | DeepSeek | Basic | ✅ Live |
| deepseek-v4-pro | DeepSeek | Pro | ✅ Live |
| gpt-4o-mini | OpenAI | Free | ✅ Live |
| gpt-4o | OpenAI | Basic | ✅ Live |
| gemini-2.5-flash | Google | Basic | ✅ Live |
| gemini-2.5-pro | Google | Pro | ✅ Live |
| claude-sonnet-4-20250514 | Anthropic | Pro | ✅ Live |
| img2 | Image Gen | Basic | ✅ Live |

## New API VPS

| 項目 | 值 |
|---|---|
| IP | 170.64.201.54 |
| SSH | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| Container | new-api (calciumion/new-api:latest) |
| Database | SQLite `/opt/new-api/data/one-api.db` |
| Channels | DeepSeek (channel 1) |
| ModelRatio | All 0 (MVP intentional) |
| Token Provision | Python microservice port 3002 |

## Token Provisioning

- Endpoint: `POST /api/model-gateway/provision`
- Supabase auth required
- Auto-provisions New API token via VPS admin API
- Encrypts and upserts to `user_new_api_tokens`
- Never returns raw token to client
- Probe checks existing token validity before re-provision

## Usage Ledger

- Table: `model_usage_ledger`
- sourceTypes: `operator_chat`, `agent_stream`, `brain_draft`
- Records: status (succeeded/failed), modelId, tokens, chargedPoints, userId
- Quota gate checks estimatedPoints before allowing request
