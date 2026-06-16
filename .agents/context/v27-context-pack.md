# v27 分支完整變更摘要

> 從 v26ds2 開出，2026-06-11 ~ 2026-06-16
> 分支：codex/v27
> 總 commit 數：~20

---

## 一、程式碼重構（6 輪，nexus-ops.tsx 從 9,301 → 5,039 行）

將單一巨型元件拆解為 7 個獨立檔案，總計拆出 4,874 行：

| 檔案 | 行數 | 內容 |
|---|---|---|
| `nexus-utils.tsx` | 323 | 純工具函數 + 原子 UI |
| `nexus-chrome.tsx` | 446 | SidebarToggleButton, CollapsedSidebarRail, AgentActionToolbar, MinimizedRail, CommandPalette |
| `nexus-agent-window.tsx` | 555 | AgentWindow, SandboxCanvas, MediaCanvas, MessageBubble, MediaArtifactPreview |
| `nexus-panels.tsx` | 915 | TopBar, RightIntel, RightFloatingDock, MacroComposerModal |
| `nexus-settings-panels.tsx` | 735 | LeftDock, ModelTuningSelect, AgentModelTuningPanel, AgentTemplateProfilePanel |
| `nexus-agent-settings-sidebar.tsx` | 1900 | AgentSettingsSidebar, ModelInfoPanel |
| `nexus-ops.tsx` | 5039 | 主元件 — state + callbacks + layout |

---

## 二、Brain Draft 全面重接 New API（7 項修復）

### 問題背景
Graph Brain 是 workflow 的「AI 大腦」— 用戶描述需求，LLM 產生 workflow JSON。
原本繞過 New API，用 server 自己的 OPENAI_API_KEY，只支援 OpenAI responses API。

### 修復清單

| # | 修復 | 檔案 |
|---|---|---|
| 1 | Auth: 改用 per-user New API token（resolveApiActor → getUserNewApiToken） | brain-draft/route.ts |
| 2 | 前端請求帶 Supabase access token（Authorization: Bearer） | nexus-graph.tsx |
| 3 | Endpoint: api.openai.com/v1/responses → normalizeNewApiBaseUrl + /chat/completions | brain-draft/route.ts |
| 4 | Request body: input[{role,content}] → messages[{role,content}], response_format 替代 text.format | brain-draft/route.ts |
| 5 | new_api_model 映射: raw model ID → getCatalogModel → model.new_api_model（deepseek-v4-pro → deepseek-chat） | brain-draft/route.ts |
| 6 | Response 解析: chat/completions 格式 (choices[0].message.content) 在第一層檢查（之前是 dead code） | brain-draft/route.ts |
| 7 | System prompt 重寫: 從抽象 role description → 5-step 操作指令，明確要求 analysis + questionsForSean | brain-draft/route.ts |

---

## 三、Graph Brain UI 改進

| 改動 | 說明 |
|---|---|
| Model selector 動態化 | 從 /api/models 的 modelCatalog 動態讀取，不再寫死 |
| None / LLM Freeform 模板 | 空白合約殼（nodes:[], edges:[]），LLM 從零設計 |
| 全寬 2-column 版面 | 左欄：設定 + Brain Thread，右欄：JSON + Status |
| Model selector 在 header 右上角 | X 按鈕旁邊，thinking 時 disabled |

---

## 四、預設模型變更（全部 → deepseek-v4-pro）

| 檔案 | 舊 | 新 |
|---|---|---|
| graph-brain-planner.ts | gpt-5.5 | deepseek-v4-pro |
| brain-draft-templates.ts | gpt-5.5 / openai | deepseek-v4-pro / deepseek |
| nexus-defaults.ts (4 templates) | gpt-5.5 / openai | deepseek-v4-pro / deepseek |
| nexus-store.ts | gpt-5.5 | DEFAULT_CHAT_SUPPORTED_MODELS[0] |

---

## 五、Bug 修復（v27 新增）

| Bug | 發現 | 修復 |
|---|---|---|
| extractResponseText: chat/completions check 是 dead code | 被包在 `if body.output_text` 裡面，永遠不會執行 | 移到第一層 |
| new_api_model 映射缺失 | brain-draft 送 raw model ID 到 New API，New API 不認得 deepseek-v4-pro（channel 名是 deepseek-chat） | 加 getCatalogModel() 映射 |
| packetContract validator 太刁 | LLM 不會產生 packetContract 欄位，導致 workflow 導入失敗 | validator 放寬為 optional，只留 warning |
| rightDockPanels icon 全變 null | 第 4 輪重構時 stub 殘留 | 恢復原始 10 個 lucide icons |
| system prompt 多一個額外的 `}` | prompt 改寫殘留 | 刪除 |
| system prompt 沒要求 analysis/questionsForSean | validator 強制要求但 LLM 不知道 | prompt 明確列出 |

---

## 六、Validator 閘門 — 目前只檢查

### WorkflowProBrainReviewProposal（外層）
- `schema` = "nexus.workflowPro.brainReviewProposal.v1"
- `analysis` = 非空字串
- `questionsForSean` = 字串陣列
- `missingCapabilities` = 字串陣列

### WorkflowProContractDraft（內層 optimizedWorkflow）
- `schema` = "nexus.workflow.v1"
- `id` = 非空
- `nodes[].id` = 非空
- `nodes[].type` = 合法的 node type
- `edges[].id` = 非空
- `edges[].source` / `edges[].target` = 必須是存在的 node id
- `edges[].packetContract` = **optional**（已放寬）
- `outputs[].id` = 非空

---

## 七、不改的原則

| 項目 | 原因 |
|---|---|
| 所有 gpt-4o-mini 硬編碼 | New API fallback |
| api.openai.com/v1 作為 DEFAULT_BASE_URL | NEW_API_BASE_URL 未設時才用 |
| Brain 的模板系統 | 保留作為 Local fallback |

---

## 八、New API 整合狀態

| Route | 狀態 |
|---|---|
| `/api/chat` | ✅ |
| `/api/workflow-pro/brain-draft` | ✅ |
| `/api/image-gen` | ✅ |
| `/api/memory-compress` | ✅ |
| `/api/predictive-intel` | ✅ |
| `/api/v1/agents/...` | ✅ |

## 九、v27 對 v26ds2 的差異

- Brain Draft 可實際跑通（new_api_model 映射 + extractResponseText 修復）
- packetContract validator 放寬，LLM 產出的 workflow 更容易通過閘門
- System prompt 簡化為 5-step 操作指令
- None template 讓 LLM 自由設計
- 2-column 全寬版面改善可用性

---

## 十、2026-06-16 小型品質收斂交接

本輪只做 release-readiness 收斂，不新增功能。

### 已修正

- `none` / LLM Freeform template 測試 expectation 已更新：
  - `none` 合法允許 `nodes: []`。
  - 其他預填 template 仍要求至少一個 node。
- Brain Draft route 的 `extractResponseText` 已移除 explicit `any`：
  - 以 `isRecord` / `Array.isArray` 安全讀取 `choices[0].message.content`。
- Nexus sidebar / settings / agent window 的 explicit `any` 已移除：
  - `rightDockPanels.icon` 改成 `ReactNode`。
  - `capabilityOptions.type` 改成 `AgentCreationCapabilityType`。
  - message bubble 使用局部 `AgentMessageRuntimeMeta`。
  - `getCapabilityType` 使用 `NexusAgent -> AgentCapabilityType`。
- 右側 dock panel icons 在 sidebar 拆檔版本也補回，避免 `icon: null` stub 殘留。

### 最新驗證

- `npm test -- src/app/api/workflow-pro/brain-draft/route.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/workflow-contract.test.ts src/lib/workflow-pro/brain-draft-templates.test.ts`
  - 通過：4 test files / 16 tests。
- `npm run typecheck`
  - 通過。
- `npm run lint -- --format stylish`
  - exit code 0。
  - 0 errors。
  - 424 warnings remaining。
- `node scripts/auth-boundary-scan.mjs`
  - 通過。
  - `blockingFindings: []`。

### 新上下文注意事項

目前已清掉先前阻擋發版的紅點：

- targeted workflow test failure 已修。
- lint 10 errors 已修成 0 errors。

但還不是 warning-clean：

- lint 仍有 424 warnings。
- warnings 主要來自拆檔後的 unused imports / variables，尤其 `nexus-agent-settings-sidebar.tsx`。
- 下一輪若要做，建議只做 warning cleanup，不要混入功能。

本輪沒有 commit / push。
