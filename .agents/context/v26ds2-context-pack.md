# v26ds2 分支完整變更摘要

> 由 Codex 在 2026-06-11 ~ 2026-06-16 期間完成
> 分支基礎：v26ds → v26ds2，共 14 commits

---

## 一、程式碼重構（6 輪，nexus-ops.tsx 從 9,301 → 5,039 行）

將單一巨型元件 `nexus-ops.tsx` 拆解為 7 個獨立檔案，總計拆出 4,874 行：

| 檔案 | 行數 | 內容 |
|---|---|---|
| `nexus-utils.tsx` | 323 | 純工具函數(cx, formatTime, formatFileSize...) + 原子 UI(IconButton, SyncBadge, TopMenuAction, GraphNode, ToolbarIconButton) |
| `nexus-chrome.tsx` | 446 | SidebarToggleButton, CollapsedSidebarRail, AgentActionToolbar, MinimizedRail, CommandPalette |
| `nexus-agent-window.tsx` | 555 | AgentWindow, SandboxCanvas, MediaCanvas, MessageBubble, MediaArtifactPreview |
| `nexus-panels.tsx` | 915 | TopBar(workspace menu), RightIntel(agent 資訊面板), RightFloatingDock, MacroComposerModal |
| `nexus-settings-panels.tsx` | 735 | LeftDock, ModelTuningSelect, AgentModelTuningPanel, AgentTemplateProfilePanel |
| `nexus-agent-settings-sidebar.tsx` | 1900 | AgentSettingsSidebar(最大區塊), ModelInfoPanel |
| `nexus-ops.tsx` | 5039 | 主元件 NexusOps — 僅保留 state + callbacks + layout assembly |

**重構原則**：只搬 JSX 元件，不改邏輯。每個子元件零 store 依賴，純 props 驅動。

---

## 二、Brain Draft 全面重接 New API

### 問題背景
Graph Brain 是 workflow 的「AI 大腦」功能 — 用戶描述需求，LLM 產生 workflow JSON 合約。
原本全部繞過 New API，用 server 自己的 key，只支援 OpenAI。

### 七個修復

#### 1. Auth：per-user key
- `brain-draft/route.ts`: `resolveApiActor(request)` → `getUserNewApiToken({ userId })` → 用戶自己的 key
- `nexus-graph.tsx`: 前端請求前先 `getNexusSupabaseClient().auth.getSession()` → `Authorization: Bearer <token>`

#### 2. Endpoint：OpenAI responses → 通用 chat/completions
- ❌ 舊：`https://api.openai.com/v1/responses`
- ✅ 新：`normalizeNewApiBaseUrl(NEW_API_BASE_URL) + "/chat/completions"` — 走 New API

#### 3. Request body 格式轉換
- ❌ 舊：`input: [{role,content}]` + `reasoning: {effort}` + `text: {format}`
- ✅ 新：`messages: [{role,content}]` + `response_format: {type:"json_object"}`
- Brain 的 system prompt 和 JSON contract 完全不動

#### 4. Response 解析兼容
- 新增 `choices[0].message.content`（chat/completions）
- 保留 `output_text` / `body.output[0].content[0].text`（舊格式兼容）

#### 5. Model selector 動態化
- ❌ 舊：寫死 3 個 model
- ✅ 新：從 `/api/models` 的 `modelCatalog` 動態讀取
- 放在 Brain panel header 右上角（X 關閉按鈕旁邊）

#### 6. 預設模型
- `graph-brain-planner.ts`: → `deepseek-v4-pro`
- `brain-draft-templates.ts`: → `deepseek-v4-pro` / provider `deepseek`
- `nexus-defaults.ts`: 4 個 agent template → `deepseek-v4-pro` / provider `deepseek`
- `nexus-store.ts`: 不再 hardcode `gpt-5.5`

#### 7. 明確不變的
- 所有 `gpt-4o-mini`（New API fallback）
- `api.openai.com/v1` 作為 `DEFAULT_BASE_URL`（NEW_API_BASE_URL 未設時才用）
- Brain 的 system prompt 規則和 workflow JSON contract

---

## 三、Bug 修復

| 問題 | 修復 |
|---|---|
| rightDockPanels icon 全部變成 null | 恢復原始 10 個 lucide icons |
| model catalog fetch 失敗不重試 | 加 3 秒 retry |

---

## 四、New API 整合完整狀態

| Route | 狀態 |
|---|---|
| `/api/chat` | ✅ |
| `/api/workflow-pro/brain-draft` | ✅ 已修 |
| `/api/image-gen` | ✅ |
| `/api/memory-compress` | ✅ |
| `/api/predictive-intel` | ✅ |
| `/api/v1/agents/...` (agent-stream) | ✅ |

---

## 五、2026-06-16 v27 後續記憶更新

來源：

- `.agents/context/v27-context-pack.md`
- 本輪本機掃描：`codex/v27`，HEAD `8f55ae6`，且 `v26ds2` 目前也指向同一個 commit。

### v27 目前新增重點

v27 是從 v26ds2 後續推進的整理版，核心不是再擴大 billing，而是把 Brain Draft / Graph Brain 的 New API 接線與 UI 體驗補齊。

已記錄的新狀態：

- `nexus-ops.tsx` 已拆成多個檔案，主檔從約 9301 行降到約 5039 行。
- Brain Draft 已改走 per-user New API token：
  - route 透過 `resolveApiActor` 取得 actor。
  - 再透過 `getUserNewApiToken` 取得該 user 對應 token。
  - frontend 送 Supabase Authorization token，不接觸 New API token。
  - backend 轉發到 New API `/chat/completions`。
- Brain Draft request 已從 OpenAI Responses 形狀改成 chat/completions 形狀：
  - 使用 `messages`。
  - 使用 `response_format`。
  - raw UI model id 會先經 server catalog 轉成 `new_api_model`。
  - 例如 `deepseek-v4-pro` 會映射成 `deepseek-chat`。
- `extractResponseText` 已修正：
  - 會先讀 `choices[0].message.content`。
  - 避免 chat/completions 回應落入舊的 fallback 死路。
- Graph Brain UI 已補回：
  - header 右側動態模型選擇器。
  - 模型來源為 `/api/models`。
  - thinking 中會 disabled，避免請求途中改模型。
  - Brain Draft 右側改成比較完整的 2-column / full-width 工作區。
- 新增或調整 Graph Brain template：
  - `none` / LLM Freeform template 允許空 contract shell。
  - 這代表它本來就可能是 `nodes: []`，需要由 LLM 生成完整 workflow。
- validator 已放寬：
  - `packetContract` 從必填錯誤改為 warning。
  - 原因：LLM 不需要每次先產出完整 packetContract。
- prompt 已要求 LLM 回傳更可追蹤的內容：
  - `analysis`
  - `questionsForSean`
  - workflow contract

### 本輪掃描結果

已跑：

- `npm run typecheck`：通過。
- `node scripts/auth-boundary-scan.mjs`：通過，`blockingFindings: []`。
- targeted workflow tests：
  - 指令：`npm test -- src/app/api/workflow-pro/brain-draft/route.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/workflow-contract.test.ts src/lib/workflow-pro/brain-draft-templates.test.ts`
  - 結果：4 個 test files 中 3 個通過、1 個失敗；16 tests 中 15 通過、1 失敗。
  - 失敗點：`src/lib/workflow-pro/brain-draft-templates.test.ts`
  - 原因：舊測試要求每個 template 都要有 `nodes.length > 0`，但新的 `none` / LLM Freeform template 是刻意保留空 nodes 給 LLM 生成。
- `npm run lint`：未通過。
  - 目前至少有 `@typescript-eslint/no-explicit-any` error：
    - `src/app/api/workflow-pro/brain-draft/route.ts`
    - `src/components/nexus/nexus-agent-settings-sidebar.tsx`
  - 另有大量 refactor 後的 unused import / unused variable warnings。

### 目前狀態判斷

不要把 v27 記成「完全全綠」。

比較準確的狀態是：

- 架構方向順利：
  - Brain Draft 已走 backend / per-user New API token。
  - model catalog mapping 已補上。
  - chat/completions response parser 已修正。
  - auth boundary scan 沒有 blocking finding。
- 發版前仍有品質閘門要補：
  - `none` template 的測試 expectation 需要更新，或把 `none` 排除於「必須預先有 nodes」的 template assertion。
  - lint error 需要清掉，尤其是 explicit `any`。
  - extracted sidebar / panel files 的 unused warnings 建議順手掃乾淨，避免後續真正錯誤被噪音淹沒。

### 下一步建議

小而穩的下一輪應該只做品質收斂，不新增功能：

1. 修正 `brain-draft-templates.test.ts`：
   - 接受 `none` template 的空 nodes。
   - 或將該測試改成只驗證「預填 workflow template」必須有 nodes。
2. 修正 `brain-draft/route.ts` 與 `nexus-agent-settings-sidebar.tsx` 的 explicit `any`。
3. 清理拆檔後留下的 unused imports / variables。
4. 重跑：
   - `npm test -- src/app/api/workflow-pro/brain-draft/route.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/workflow-contract.test.ts src/lib/workflow-pro/brain-draft-templates.test.ts`
   - `npm run typecheck`
   - `npm run lint`
   - `node scripts/auth-boundary-scan.mjs`

這輪記憶更新的重點：v27 的 New API / Graph Brain 接線方向是對的，但目前還不是 release-clean 狀態。

---

## 六、2026-06-16 小型品質收斂交接

本輪只做品質收斂，不新增功能、不改 Operator 模型選擇、不改 New API 架構。

### 已修正

- `src/lib/workflow-pro/brain-draft-templates.test.ts`
  - 更新 `none` / LLM Freeform template 的測試 expectation。
  - `none` 現在合法期待 `nodes.length === 0`。
  - 其他預填 workflow template 仍要求 `nodes.length > 0`。
- `src/app/api/workflow-pro/brain-draft/route.ts`
  - 移除 `extractResponseText` 裡的 explicit `any`。
  - 以 `isRecord` / `Array.isArray` 讀取 New API chat/completions 的 `choices[0].message.content`。
- `src/components/nexus/nexus-agent-settings-sidebar.tsx`
  - `rightDockPanels` 改成 `RightDockPanelId` + `ReactNode` 型別。
  - 恢復右側 dock panel icons，移除 `icon: any`。
  - `capabilityOptions.type` 改成 `AgentCreationCapabilityType`，移除 `setNewAgentType(option.type as any)`。
- `src/components/nexus/nexus-agent-window.tsx`
  - 新增局部 `AgentMessageRuntimeMeta` 型別，取代 message bubble 的 `(message as any)`。
- `src/components/nexus/nexus-settings-panels.tsx`
  - `getCapabilityType(agent)` 改用 `NexusAgent -> AgentCapabilityType`。

### 驗證結果

- targeted workflow tests：通過。
  - 4 test files passed。
  - 16 tests passed。
- `npm run typecheck`：通過。
- `npm run lint -- --format stylish`：exit code 0。
  - 目前 0 errors。
  - 仍有 424 warnings，多數是拆檔後的大量 unused imports / variables。
- `node scripts/auth-boundary-scan.mjs`：通過。
  - `blockingFindings: []`。

### 下一個上下文注意

目前已經不是先前的「test 有 1 failure、lint 有 10 errors」狀態。

新的剩餘技術債是：

- lint warning debt：424 warnings。
- 最大噪音來源仍是 `src/components/nexus/nexus-agent-settings-sidebar.tsx` 等拆檔後殘留 imports。
- 如果下一輪要清 warning，建議只做 import/dead-code cleanup，不要和功能改動混在一起。

本輪沒有 commit / push。
