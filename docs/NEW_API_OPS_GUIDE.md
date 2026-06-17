# New API 運維指南

> 給接手這個專案的 agent  
> 最後更新：2026-06-18

---

## 一、New API 是什麼

New API 是 NEXUS 的 **LLM 統一閘道**。所有模型請求（chat、image、stream）都透過它路由到上游 provider（DeepSeek、OpenAI 等）。

有 **兩個** New API instance：

| 環境 | 位置 | 用途 |
|---|---|---|
| **Production** | VPS `170.64.201.54` | NEXUS production 使用 |
| **Local** | Mac `localhost:8788` | 本機開發測試 |

---

## 二、Production New API (VPS)

### 連線資訊

| 項目 | 值 |
|---|---|
| VPS IP | `170.64.201.54` |
| SSH | `ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54` |
| Web 後台 | `http://170.64.201.54` |
| API endpoint | `http://170.64.201.54/v1` |
| 內部 port | `127.0.0.1:3000`（Docker container，不直接對外） |

### Docker

| 項目 | 值 |
|---|---|
| Compose 檔案 | `/opt/new-api/docker-compose.yml` |
| Container 名稱 | `new-api` |
| Image | `calciumion/new-api:latest` (v1.0.0-rc.11) |
| 資料庫 | SQLite `/opt/new-api/data/one-api.db` (596KB) |
| Logs | `/opt/new-api/logs/` |

### 常用指令

```bash
# 查看狀態
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'cd /opt/new-api && docker compose ps'

# 重啟
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'cd /opt/new-api && docker compose restart'

# 查看 logs
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'docker logs new-api --tail=50'

# 查 DB
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 "sqlite3 /opt/new-api/data/one-api.db 'SELECT * FROM users;'"
```

### 管理員帳號

| 用途 | 帳號 | 密碼 |
|---|---|---|
| Root 管理員 | `root` | `Nexus2026Secure!` |

登入方式：瀏覽器打開 `http://170.64.201.54` → 用 root 帳密登入。

### API Token

Admin API token 存在兩個地方（不印出明文）：
- VPS: `/opt/new-api/.admin_key` (chmod 600)
- Vercel env: `NEW_API_ADMIN_TOKEN`

查詢方式：
```bash
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'cat /opt/new-api/.admin_key'
```

### Channel 設定

| ID | 類型 | 模型 |
|---|---|---|
| 1 | DeepSeek (type=43) | deepseek-chat, deepseek-reasoner, deepseek-v4-flash, deepseek-v4-pro (+ variants) |

如需新增 OpenAI channel，在 Web 後台操作：
1. `http://170.64.201.54` → 登入 root
2. 左側選單 → 管道管理 → 添加管道
3. 類型選 OpenAI → 填入 API key → 勾選模型

### 模型價格 (ModelRatio)

⚠️ **目前全部設為 0**（MVP 測試用。正式上線前須設定實際價格）

```bash
# 查看目前價格
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 \
  "sqlite3 /opt/new-api/data/one-api.db \"SELECT value FROM options WHERE key='ModelRatio';\" | python3 -m json.tool"

# 設定價格（範例：deepseek-chat 設為 1）
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 python3 << 'PYEOF'
import sqlite3, json
conn = sqlite3.connect("/opt/new-api/data/one-api.db")
row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
if row:
    models = json.loads(row[0])
    models["deepseek-chat"] = 1.0
    conn.execute("UPDATE options SET value=? WHERE key='ModelRatio'", (json.dumps(models),))
    conn.commit()
conn.close()
PYEOF
```

### Token Provisioning 微服務

| 項目 | 值 |
|---|---|
| Python 程式 | `/opt/new-api/token-provision-server.py` |
| Systemd | `new-api-token-provision.service` |
| Port | `0.0.0.0:3002`（admin Bearer auth） |
| Rate limit | iptables: 每 60 秒最多 10 新連線 |

```bash
# 查看狀態
ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'systemctl status new-api-token-provision'

# 手動測試（需 admin key）
ADMIN_KEY=$(ssh -i ~/.ssh/id_ed25519_codex_vps root@170.64.201.54 'cat /opt/new-api/.admin_key')
curl -X POST "http://170.64.201.54:3002/provision" \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username":"test-user"}'
```

---

## 三、Local New API (Mac 開發機)

### 連線資訊

| 項目 | 值 |
|---|---|
| 資料夾 | `/Users/sean/Documents/skill庫/new-api` |
| Web 後台 | `http://localhost:8788` |
| API endpoint | `http://localhost:8788/v1` |
| 執行檔 | `/Users/sean/Documents/skill庫/new-api/new-api` |
| 資料庫 | `/Users/sean/Documents/skill庫/new-api/one-api.db` |

### 管理員帳號

| 用途 | 帳號 | 密碼 |
|---|---|---|
| 管理員 | `admin` | `Admin123!@#` |

### Local Channels

| ID | 類型 | 模型 |
|---|---|---|
| 1 | OpenAI | gpt-4o, gpt-4o-mini, gpt-5, gpt-5.4 等 |
| 2 | DeepSeek | deepseek-chat, deepseek-reasoner |
| 3 | Anthropic Claude | claude-sonnet-4-20250514 |
| 4 | Google Gemini | gemini-2.5 等 |

### 啟動/停止

```bash
# 查看是否在跑
lsof -i :8788

# 如果沒跑，到該目錄啟動
cd /Users/sean/Documents/skill庫/new-api && ./new-api &

# 停止
kill $(lsof -t -i :8788)
```

---

## 四、兩邊的差異

| 項目 | Production (VPS) | Local (Mac) |
|---|---|---|
| Port | 80 (Caddy → 3000) | 8788 |
| 用戶 | root | admin, SEAN |
| Channels | DeepSeek only | OpenAI + DeepSeek + Claude + Gemini |
| 使用場景 | NEXUS production | 本機開發/測試 |

---

## 五、NEXUS 如何連接 New API

NEXUS 透過 Vercel env `NEW_API_BASE_URL` 決定連哪個 New API：

| 環境 | NEW_API_BASE_URL |
|---|---|
| Production (Vercel) | `http://170.64.201.54/v1` |
| Local (.env.local) | `http://localhost:8788/v1` |

NEXUS 後端透過以下路徑呼叫：
1. `resolveApiActor` → 驗證 Supabase session
2. `getUserNewApiToken` → 從 Supabase `user_new_api_tokens` 查出加密 token
3. `decryptNewApiToken` → 用 `NEW_API_TOKEN_ENCRYPTION_SECRET` 解密
4. `callNewApiChatCompletion` → `POST {NEW_API_BASE_URL}/chat/completions`
