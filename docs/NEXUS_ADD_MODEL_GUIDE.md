# NEXUS 新增模型完整教學

> 最後更新：2026-06-18 AEST
> NEXUS 是計費平台，所有 LLM 請求必須經過 New API（VPS）統一閘道，不可繞過直接用上游 API key。

---

## 一、架構總覽

```
NEXUS Composer (frontend)
  ↓ 用戶選 model id（如 "riverflow-v2.5-fast"）
NEXUS API Route (/api/chat | /api/image-gen)
  ↓ plan gate → quota gate → getCatalogModel()
  ↓ 查 SERVER_MODEL_CATALOG → 取得 new_api_model
  ↓ getUserNewApiToken() → 從 Supabase 查出用戶的 New API token
New API (VPS 170.64.201.54)
  ↓ channel routing → 匹配對應的 provider channel
OpenRouter / DeepSeek / OpenAI / etc.
  ↓ 實際 LLM 呼叫
model_usage_ledger ← 記錄用量
```

**關鍵原則：**
- NEXUS 永遠使用自己的 model id（如 `img2`、`riverflow-v2.5-fast`）
- `new_api_model` 是對應 New API 的 model id（如 `gpt-image-2`、`sourceful/riverflow-v2.5-fast`）
- 用戶看不到也碰不到上游 API key
- 不要在前端暴露上游 model id

---

## 二、聊天模型（LLM）新增步驟

以新增 `deepseek-v4-pro` 為例。

### Step 1：VPS New API 設定 Channel

登入 `http://170.64.201.54`（root / Nexus2026Secure!）

1. 管道管理 → 添加管道（或編輯現有 channel）
2. 選擇類型（DeepSeek=43, OpenAI=1, OpenRouter=20）
3. 填入 API key
4. 勾選要開放的模型
5. 設定 ModelRatio = 0（MVP 階段）

CLI 驗證：
```bash
ssh root@170.64.201.54
sqlite3 /opt/new-api/data/one-api.db "SELECT id, type, models FROM channels;"
```

如需手動設定價格：
```bash
python3 << PYEOF
import sqlite3, json
conn = sqlite3.connect("/opt/new-api/data/one-api.db")
row = conn.execute("SELECT value FROM options WHERE key='ModelRatio'").fetchone()
models = json.loads(row[0])
models["新模型的new_api_model"] = 0.0
conn.execute("UPDATE options SET value=? WHERE key='ModelRatio'", (json.dumps(models),))
conn.commit()
PYEOF
```

### Step 2：Server Model Catalog

編輯 `src/lib/backend/models/model-catalog.ts`：

```typescript
export const SERVER_MODEL_CATALOG: ProductModelCatalogEntry[] = [
  // ...existing entries...
  {
    best_for: ["reasoning", "coding", "analysis", "heavy operator work"],
    default_max_tokens: 4096,
    description: "DeepSeek V4 Pro flagship reasoning model.",
    enabled: true,
    id: "deepseek-v4-pro",              // ← NEXUS model id（前端用的）
    label: "DeepSeek V4 Pro",
    max_output_tokens: 8192,
    min_plan: "Pro",                     // ← 最低計畫等級
    modality: "chat",                    // ← chat | image
    new_api_model: "deepseek-v4-pro",    // ← New API 用的 model id
    provider_family: "DeepSeek",
    supports_reasoning: true,
    supports_tools: true,
    supports_vision: false,
  },
];
```

### Step 3：Plan Config

編輯 `src/lib/backend/models/plan-config.ts`：

```typescript
// 加入允許的 model id
Pro: {
  allowedModelIds: [
    // ...existing...
    "deepseek-v4-pro",   // ← 加入 Pro 和 Team
  ],
},

// 加入點數 multiplier
const MODEL_POINT_MULTIPLIERS: Record<string, number> = {
  // ...existing...
  "deepseek-v4-pro": 3,  // ← 設定成本權重
};
```

### Step 4：Composer 前端（如需要）

如果模型需要出現在前端選項中，編輯 `src/lib/composer/` 相關檔案。

對於聊天模型，通常透過 `/api/models` 動態取得，不需要手動新增 composer option。

### Step 5：驗證

```bash
# TypeScript
npx tsc --noEmit

# 直接測 VPS
ssh root@170.64.201.54 "curl -s http://127.0.0.1:3000/v1/chat/completions \
  -H 'Authorization: Bearer \$(sqlite3 /opt/new-api/data/one-api.db \"SELECT key FROM tokens WHERE user_id=2 LIMIT 1;\")' \
  -H 'Content-Type: application/json' \
  -d '{\"model\":\"deepseek-v4-pro\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":10}'"
```

---

## 三、圖片生成模型（VLLM / MLLM）新增步驟

以新增 `riverflow-v2.5-fast` 為例。圖片模型比聊天模型多一步：需要決定 adapter 路徑。

### 兩條 Adapter 路徑

| 路徑 | 端點 | 適用模型 | NEXUS adapter method |
|---|---|---|---|
| DALL-E | `/v1/images/generations` | gpt-image-* | `DalleImageAdapter.execute()` |
| Chat-Completions | `/v1/chat/completions` | sourceful/*, google/* | `DalleImageAdapter.executeViaChatCompletions()` |

### Step 1：VPS New API 設定

同上。確保模型在對應的 channel 中，ModelRatio 設為 0。部分模型需要 `base_url`（如 OpenRouter 需 `https://openrouter.ai/api/v1`）。

驗證模型實際行為：
```bash
# 測試 images/generations 路徑
curl -s http://127.0.0.1:3000/v1/images/generations -H '...' -d '{"model":"...","prompt":"test","n":1,"size":"1024x1024"}'

# 測試 chat/completions 路徑
curl -s http://127.0.0.1:3000/v1/chat/completions -H '...' -d '{"model":"...","messages":[{"role":"user","content":"red circle"}],"max_tokens":500}'
```

**重要：先測不加 `modalities` 參數，再測加 `modalities: ["image","text"]`。** 不同模型對此參數反應不同（sourceful 會 404，google 需要）。

### Step 2：Server Model Catalog

```typescript
{
  best_for: ["image generation", "fast visual concepts"],
  default_max_tokens: 0,
  description: "Fast image generation model.",
  enabled: true,
  id: "riverflow-v2.5-fast",
  label: "Riverflow v2.5 Fast",
  max_output_tokens: 0,
  min_plan: "Free",
  modality: "image",                    // ← 必須是 "image"
  new_api_model: "sourceful/riverflow-v2.5-fast",
  provider_family: "Gemini",
  supports_reasoning: false,
  supports_tools: false,
  supports_vision: true,
},
```

### Step 3：Plan Config

```typescript
Free: {
  allowedModelIds: [..., "riverflow-v2.5-fast"],  // 加入所有需要的 plan
},
// MODEL_POINT_MULTIPLIERS
"riverflow-v2.5-fast": 1,
```

### Step 4：Adapter Map

編輯 `src/lib/media/image-generation-adapter-map.ts`：

```typescript
const OPENAI_COMPATIBLE_MODEL_BY_PRODUCT_ID: Record<string, string> = {
  "riverflow-v2.5-fast": "sourceful/riverflow-v2.5-fast",  // NEXUS id → New API id
  img2: "gpt-image-2",
};
```

### Step 5：Adapter Routing（如需 chat-completions 路徑）

編輯 `src/lib/adapters/image-adapter.ts`：

```typescript
// 哪些 model 前綴走 chat-completions（而非 images/generations）
const CHAT_COMPLETIONS_IMAGE_MODEL_PREFIXES = ["sourceful/"];

// 哪些 model 前綴需要 explicit modalities: ["image", "text"]
const MODELS_WITH_MODALITIES = ["google/"];
```

**規則：**
- 如果 model 走 `/v1/images/generations`（如 gpt-image-*）：不需要加任何 prefix
- 如果 model 走 `/v1/chat/completions` 且**不需要** modalities：加到 `CHAT_COMPLETIONS_IMAGE_MODEL_PREFIXES`
- 如果 model 走 `/v1/chat/completions` 且**需要** modalities：加到 `MODELS_WITH_MODALITIES`

### Step 6：Composer 前端選項

編輯 `src/lib/composer/image-generation-settings.ts`：

```typescript
export const WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS = [
  { label: "GPT Image 2", value: "img2" },
  { label: "Riverflow v2.5 Fast", value: "riverflow-v2.5-fast" },
];
```

### Step 7：Image-Gen Route 確認

`src/app/api/image-gen/route.ts` 已自動處理 — 透過 `productGate.model.new_api_model` 傳遞正確的 model id 給 adapter。

### Step 8：驗證

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. 直接測 VPS（chat-completions 路徑）
ssh root@170.64.201.54 "curl -s --max-time 90 http://127.0.0.1:3000/v1/chat/completions \
  -H 'Authorization: Bearer \$(sqlite3 /opt/new-api/data/one-api.db \"SELECT key FROM tokens WHERE user_id=2 LIMIT 1;\")' \
  -H 'Content-Type: application/json' \
  -d '{\"model\":\"sourceful/riverflow-v2.5-fast\",\"messages\":[{\"role\":\"user\",\"content\":\"red circle\"}],\"max_tokens\":500}'"

# 3. NEXUS production
curl -s https://nexus-swart-ten.vercel.app/api/models  # 確認 catalog 出現
# 打開 NEXUS → composer image tab → 確認選項出現 → 生圖測試
```

---

## 四、快速檢查清單

無論新增哪種類型的模型，都確認以下：

| # | 檢查項 | 檔案 |
|---|---|---|
| 1 | VPS channel 有模型 | `sqlite3 /opt/new-api/data/one-api.db "SELECT models FROM channels"` |
| 2 | VPS ModelRatio 已設（0 或正式價格） | `sqlite3 /opt/new-api/data/one-api.db "SELECT value FROM options WHERE key='ModelRatio'"` |
| 3 | Server catalog 有 entry | `src/lib/backend/models/model-catalog.ts` |
| 4 | Plan config 有 allowedModelIds | `src/lib/backend/models/plan-config.ts` |
| 5 | MODEL_POINT_MULTIPLIERS 有值 | `src/lib/backend/models/plan-config.ts` |
| 6 | Composer 前端有選項（如需要） | `src/lib/composer/image-generation-settings.ts` |
| 7 | Adapter map 有 NEXUS→NewAPI 對照（圖片模型） | `src/lib/media/image-generation-adapter-map.ts` |
| 8 | Adapter prefix routing 正確（圖片模型） | `src/lib/adapters/image-adapter.ts` |
| 9 | `npx tsc --noEmit` 通過 | — |
| 10 | VPS 直接 curl 測試通過 | — |
| 11 | model usage ledger 正確記錄 | Supabase REST query |
| 12 | `new_api_model` 從不暴露給前端 | 前端只用 NEXUS model id |

---

## 五、常見錯誤

| 錯誤 | 原因 | 解法 |
|---|---|---|
| `model_not_in_catalog` | `assertModelAllowedForPlan` 失敗 | 確認 catalog id 和 plan config 一致 |
| `model_price_error` | VPS ModelRatio 未設定 | 在 VPS 上設定該 model 的 ModelRatio = 0 |
| `bad response status code 404` | Adapter 發到錯誤的端點 | 確認 prefix routing（images/generations vs chat/completions） |
| `No endpoints found...modalities` | 不該加 modalities 的 model 被加了 | 移除 `MODELS_WITH_MODALITIES` 中的 prefix |
| `No available channel` | VPS channel 沒有該模型 | 在 New API 後台勾選模型 |
