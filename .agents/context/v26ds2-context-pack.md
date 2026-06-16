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
