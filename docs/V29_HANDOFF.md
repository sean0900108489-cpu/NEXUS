# V29 迭代交接文件

> 給接手這個專案的 agent / 新上下文  
> 最後更新：2026-06-17

---

## 一、專案基本資訊

| 項目 | 值 |
|---|---|
| Repo | `https://github.com/sean0900108489-cpu/NEXUS` (branch: `main`) |
| Production URL | `https://nexus-swart-ten.vercel.app` |
| 技術棧 | Next.js 16.2.6, React 19, Supabase, React Flow, Zustand |
| 部署平台 | Vercel (Pro) |
| 資料庫 | Supabase: `xjuglddxwnikvcwxfbzg` (ap-southeast-2) |
| New API 網關 | VPS `170.64.201.54`, Docker, port 3000 (internal), 80 (Caddy) |

---

## 二、V29 完成的關鍵交付物

### 1. VPS New API 部署

- Docker Compose: `/opt/new-api/docker-compose.yml`
- Container: `new-api` (calciumion/new-api:latest, v1.0.0-rc.11)
- SQLite: `/opt/new-api/data/one-api.db`
- Caddy reverse proxy: port 80 → 127.0.0.1:3000
- SSH: `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54`
- DeepSeek channel: deepseek-chat, deepseek-v4-pro, deepseek-v4-flash
- ModelRatio: 全部設為 0（⚠️ 正式上線須改）
- STREAMING_TIMEOUT=600s, RELAY_TIMEOUT=600s

### 2. Token Provisioning

- Python microservice: `/opt/new-api/token-provision-server.py` (port 3002, admin Bearer auth, iptables rate limit)
- Systemd: `new-api-token-provision.service`
- NEXUS route: `POST /api/model-gateway/provision`
- Admin key: VPS `/opt/new-api/.admin_key` (600) + Vercel encrypted env `NEW_API_ADMIN_TOKEN`

### 3. Model Catalog & Plan Config

- 新增 deepseek-v4-pro (Pro plan, max 8192 tokens)
- 新增 deepseek-v4-flash (Basic plan, max 4096 tokens)
- 修復 dual-gate bug: `plan-config.ts` 的 `allowedModelIds` 白名單缺漏
- Vercel env `NEW_API_BASE_URL=http://170.64.201.54/v1`

### 4. Graph Brain Production Ready

- 從 legacy 404 block 中解放（whitelist）
- 加入 product gate: auth + plan + catalog 
- 加入 usage ledger: `brain_draft` sourceType
- Schema repair: 自動補上缺失的 `schema`, `outputs[].id`, `nodes[].id`, `edges[].id`

### 5. Crash 修復（v4-pro xhigh OOM）

| 修復 | 檔案 |
|---|---|
| Message cap at 80 | `src/store/nexus-store.ts` |
| reasoningContent cap at 8192 chars | `src/store/nexus-store.ts` |
| Content token 30ms batching | `src/components/nexus/nexus-ops.tsx` |
| Reasoning token 50ms batching | `src/components/nexus/nexus-ops.tsx` |
| reasoningContent 渲染欄位修正 | `src/components/nexus/nexus-agent-window.tsx` |

### 6. Legacy Route Whitelist

`src/lib/backend/security/legacy-tool-route-boundary.ts`:
- Whitelisted: `brain-draft`, `agent-stream`
- Still blocked: `memory-compress`, `fs-scanner`, `web-surfer`, `predictive-intel`, `providers/verify`

---

## 三、重要文件位置

| 文件 | 路徑 |
|---|---|
| 技術債交叉對照 | `docs/V29_TECH_DEBT_CROSS_REFERENCE.md` |
| 6 份子代理報告 | `docs/tech-debt-reports/01-06*.md` |
| Obsidian 活文件 | `Obsidian/Codex/FreeChat/NEXUS New API VPS 部署狀況.md` |
| Obsidian 技術債 | `Obsidian/Nexus技術債子代理報告/01-06*.md` |

---

## 四、關鍵環境變數 (Vercel)

| 變數 | 說明 |
|---|---|
| `NEW_API_BASE_URL` | `http://170.64.201.54/v1` |
| `NEW_API_TOKEN_ENCRYPTION_SECRET` | 64 hex, 與本機 `.env.local` 一致 |
| `NEW_API_ADMIN_TOKEN` | VPS admin key (不印出) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xjuglddxwnikvcwxfbzg.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 與本機一致 |

---

## 五、已知未處理的 P0/P1 項目

1. **Nova RAG 安全洞**: `nova_documents/chunks/ingest_runs` 表 anon/authenticated 全開 (Report 04)
2. **Audit log 安全洞**: `record_permission_audit_log` SECURITY DEFINER 可被 anon call (Report 04)
3. **Idempotency lock**: 24h no takeover，Vercel kill 後鎖死 (Report 03)
4. **Orphan streaming tasks**: abort 不 cancel task (Report 03)
5. **Per-agent ResizeObserver 重複**: N+1 polling 放大 (Report 01)
6. **ModelRatio 為 0**: 正式上線前必須設定實際價格 (VPS)
7. **無 domain/HTTPS**: 暫時 `http://170.64.201.54/v1`

---

## 六、本 iteration 不需要再做的事情

- ❌ 不要再處理 page.tsx 加 Panel B（已被 revert）
- ❌ 不要更改 domain/HTTPS
- ❌ 不要做 security hardening（MVP 階段先記錄為 debt）
- ❌ 不要叫使用者手動貼 token（已有 provisioning）

---

## 七、下次迭代建議優先級

1. P0 安全: Nova RAG + audit log anon access
2. P1 可靠性: idempotency lock + orphan tasks
3. P1 效能: ResizeObserver 去重 + undo stack 減肥
4. P1 耐久性: artifact sync no-op
5. P2 架構: NexusOps 拆分

---

## 八、New API 報告與 Obsidian 文件路徑

### GitHub (docs/)
| 文件 | 路徑 |
|---|---|
| 交接文件 | `docs/V29_HANDOFF.md` |
| 技術債交叉對照 | `docs/V29_TECH_DEBT_CROSS_REFERENCE.md` |
| Frontend Workbench 報告 | `docs/tech-debt-reports/01 - Frontend Workbench 子代理報告.md` |
| Store Runtime 報告 | `docs/tech-debt-reports/02 - Store Runtime 子代理報告.md` |
| Backend API 報告 | `docs/tech-debt-reports/03 - Backend API 子代理報告.md` |
| Database RLS Security 報告 | `docs/tech-debt-reports/04 - Database RLS Security 子代理報告.md` |
| Sync Durability 報告 | `docs/tech-debt-reports/05 - Sync Durability Offline 子代理報告.md` |
| CI Tests Quality Gate 報告 | `docs/tech-debt-reports/06 - CI Tests Quality Gate Docs Drift 子代理報告.md` |

### Obsidian Vault
| 文件 | 路徑 |
|---|---|
| NEXUS New API VPS 部署狀況 | `Codex/FreeChat/NEXUS New API VPS 部署狀況.md` |
| 技術債子代理報告 (01-06) | `Nexus技術債子代理報告/` |
| FreeChat 專案資料夾 | `Codex/FreeChat/` |

### VPS New API 相關
| 資源 | 位置 |
|---|---|
| Docker Compose | `/opt/new-api/docker-compose.yml` |
| SQLite DB | `/opt/new-api/data/one-api.db` |
| Admin key file | `/opt/new-api/.admin_key` (chmod 600) |
| Provision Python server | `/opt/new-api/token-provision-server.py` |
| Systemd service | `new-api-token-provision.service` |
| Caddy config | `/etc/caddy/Caddyfile` |
| Logs | `/opt/new-api/logs/` |

### MCP Servers 參考
| 文件 | 路徑 |
|---|---|
| MCP Servers 總覽 | `/Users/sean/Documents/skill庫/new-api/MCP_SERVERS.md` |
| New API Agent 指南 | `/Users/sean/Documents/skill庫/new-api/AGENTS.md` |
| NEXUS Handoff | `/Users/sean/Documents/skill庫/HANDOFF_NEXUS.md` |

### 關鍵帳號與認證（不印出明文）
| 用途 | 位置 |
|---|---|
| VPS admin key | `/opt/new-api/.admin_key` (VPS), Vercel env `NEW_API_ADMIN_TOKEN` |
| Supabase service role | Vercel env `SUPABASE_SERVICE_ROLE_KEY` |
| Token encryption secret | Vercel env `NEW_API_TOKEN_ENCRYPTION_SECRET` |
| DeepSeek API key | New API channel (VPS SQLite `channels` table) |
