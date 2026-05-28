# V14 Codex Execution Map Prompt

Purpose: paste this prompt into a new implementation chat to make Codex generate the V14 "Codex Execution Map / 施作索引層" for NEXUS // AI OPS.

The output of that new chat should be a project document, ideally:

```text
NEXUS_CODEX_EXECUTION_MAP.md
```

This V14 task is a documentation-and-navigation upgrade. It should not implement application features unless the user explicitly expands the task.

---

## Prompt To Paste Into The New Implementation Chat

你正在接手 NEXUS // AI OPS 專案，任務是實作：

```text
V14: Codex Execution Map / 施作索引層
```

你要生成一份能讓未來 Codex 施作端更好讀懂、判斷、落地與驗證改動的總索引文件。這不是一般 roadmap，也不是重寫既有架構文件；它是一份「需求類型 -> 應讀檔案 -> 應改定義 -> 應接 API/service -> 應碰前端狀態 -> 應補測試 -> 禁止污染」的施作導航圖。

## 起點敘述：目前專案狀況

目前專案已經經過一次總架構掃描，主要結果如下：

- NEXUS 是 Next `16.2.6` / React `19.2.6` / App Router 專案。
- `AGENTS.md` 明確要求：這不是舊版 Next.js，寫任何 Next.js code 前要讀 `node_modules/next/dist/docs/` 的相關文件。
- 專案已經是 schema-first、registry-first、local-first、z-axis disciplined。
- 既有總掃描檔是 `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`。
- 既有架構規則檔包含 `ARCHITECTURE.md`、`NEXUS_POST_V10_ARCHITECTURE_SCAN.md`、`NEXUS_ARCHITECTURE_BLUEPRINT.md`。
- 核心 shared contract 在 `src/lib/nexus-types.ts`。
- 核心 registry socket 在 `src/lib/nexus-registry.ts`。
- Supabase/database mirror 在 `src/lib/supabase/database.types.ts`。
- 前端 active state 主要在 `src/store/nexus-store.ts`。
- 主 UI shell 在 `src/components/nexus/nexus-ops.tsx`。
- Graph / Workflow Runtime Lite UI 在 `src/components/nexus/nexus-graph.tsx`。
- 後端 V0-V10 bounded domains 已存在：
  - primitives/contracts
  - security
  - api
  - workspace
  - sync
  - deployment
  - runtime
  - tools
  - artifacts
  - observability
  - history
- `/api/v1` 多數 JSON route 已使用 `apiHandler`、typed envelope、idempotency、permission、observability hooks。
- Legacy routes 和 streaming routes 有意不完全套用一般 JSON envelope。
- Zustand + IndexedDB 仍是 active workspace 的主要互動狀態來源。
- Historical messages/artifacts 應走 `IAsyncDataFetcher` / `IStateSyncManager`，不可直接讓 unbounded history 污染 Zustand root state。
- 目前仍有 `Needs verification` 項目，例如 active messages/memory local cap、SyncOperationApplier 只 inline apply workspace snapshot、historical artifact fetcher stub 等。

你的任務不是解決 V15/V16 的狀態膨脹或 sync applier 問題，而是把這些路線整理成未來施作端可以正確跟隨的 execution map。

## 確定 Goal 描述

生成 `NEXUS_CODEX_EXECUTION_MAP.md`，使未來任何 Codex/工程師在收到需求時，都可以在 1-3 分鐘內回答：

1. 這個需求屬於哪一類改動？
2. 必須先讀哪些檔案？
3. 哪個 type / registry / service / route / store 是 source of truth？
4. 應該新增什麼，應該延伸什麼，絕對不能重複什麼？
5. 前端、後端、功能端、擴充層、資料層要怎麼對接？
6. 哪些資料不可進入 Zustand / IndexedDB / snapshot / logs / artifact / observability？
7. 應該用什麼測試或驗證方式判斷落地乾淨？
8. 如果看不出完整鏈路，應該標記哪個 `Needs verification`，而不是猜。

最終目標是提高：

- 零摩擦性
- 穩定性
- 架構邏輯性
- 後續 Codex 可讀性
- 未來功能落地速度
- 防重複、防污染、防越權能力

## 權重比例

請用以下權重設計 `NEXUS_CODEX_EXECUTION_MAP.md` 的內容分布與深度：

| 權重 | 項目 | 目的 |
| ---: | --- | --- |
| 18% | Source-of-truth routing | 每種需求先定位 type / registry / store / service / route。 |
| 16% | No-duplicate / no-pollution rules | 防止平行 registry、第二 queue、shadow store、secret 污染。 |
| 14% | Frontend/backend/function coupling map | 明確 UI action 到 backend domain 到 projection 的鏈路。 |
| 13% | Demand-type playbooks | 對常見需求給施作路線，例如新增 tool、API、agent capability、UI panel、DB 欄位。 |
| 11% | Verification and test routing | 每種改動該跑哪些測試、該補哪個 domain test。 |
| 10% | Current Needs Verification integration | 把現有不確定點變成未來施作前檢查點。 |
| 8% | Performance and state hygiene | 網頁速度、render budget、local persistence、history pagination 的施作提醒。 |
| 6% | Visual/theme customization boundaries | 外觀客製化只能走 token/schema，不可污染 UI component。 |
| 4% | Maintainer/Codex readability | 文件要能被新聊天室快速掃描，句型直接、表格清楚、可複製搜尋詞。 |

總和必須為 100%。

## 引入步驟

請按順序執行：

1. 讀 `AGENTS.md`。
2. 讀 Next local docs 中和本次工作相關的部分，至少確認 App Router project structure 與 Route Handler 規則：
   - `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
   - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
3. 讀 `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`。
4. 讀 `ARCHITECTURE.md`。
5. 讀 `NEXUS_POST_V10_ARCHITECTURE_SCAN.md`，尤其 V11/V13 customization upgrade 和 Needs verification。
6. 掃描：
   - `src/lib/nexus-types.ts`
   - `src/lib/nexus-registry.ts`
   - `src/lib/supabase/database.types.ts`
   - `src/store/nexus-store.ts`
   - `src/lib/state-sync.ts`
   - `src/lib/api/nexus-api-client.ts`
   - `src/lib/backend/api/api-handler.ts`
   - `src/components/nexus/nexus-ops.tsx`
   - `src/components/nexus/nexus-graph.tsx`
7. 用 `rg` 交叉搜尋以下詞群：

```bash
rg -n "SCAN FIRST|@rule|@boundary|Do not|不得|禁止|Needs verification" AGENTS.md README.md ARCHITECTURE.md NEXUS_*.md src supabase
```

```bash
rg -n "CAPABILITY_REGISTRY|TOOL_SLOT_REGISTRY|TOOL_EXECUTOR_REGISTRY|NEXUS_MODEL_CATALOG|HANDOFF_RULE_REGISTRY|WorkflowRuntimeLite|modelSettings|agentTemplateProfiles|executionPrompt|profileLocked" src
```

```bash
rg -n "apiHandler|nexusApiClient|IStateSyncManager|IAsyncDataFetcher|localSyncQueueAdapter|PermissionService|SecretBoundaryService|AgentRuntimeService|ToolExecutionService|ArtifactService|MessageHistoryService|ObservabilityService" src
```

8. 生成 `NEXUS_CODEX_EXECUTION_MAP.md`。
9. 檢查文件是否能回答至少 10 種需求類型的施作路線。
10. 不要修改 TypeScript/TSX/API/migration，除非使用者明確要求 V14 同時落地工具或代碼。

## 過程描述

你要把現有架構翻譯成「施作路線圖」。

文件至少包含以下章節：

1. `Purpose`
   - 說明這份文件是給 Codex/工程師在新需求開始時使用。

2. `Starting State`
   - 描述目前架構狀態、Next 版本警告、local-first/schema-first/registry-first 原則。

3. `Universal First-Read Checklist`
   - 所有需求都要先讀哪些檔案。

4. `Demand Classifier`
   - 把需求分成：
     - 新增 agent capability
     - 新增 model/provider
     - 新增 tool/executor
     - 新增 API
     - 新增 DB 欄位/table
     - 新增 UI panel
     - 新增 graph/runtime node
     - 修改 streaming/runtime
     - 修改 artifact flow
     - 修改 history/memory
     - 修改 sync
     - 修改 observability/deployment
     - 修改 theme/customization
     - performance/render improvement
     - Codex/documentation-only upgrade

5. `Execution Playbooks`
   - 每個 demand class 都要有：
     - 判斷訊號
     - 先讀檔案
     - source of truth
     - 正確接入步驟
     - 禁止事項
     - 驗證方式

6. `Frontend Route Map`
   - `NexusOps`, `AgentWindow`, `NexusGraph`, `LeftDock`, `RightIntel`, `AgentSettingsSidebar`, `DatapadWindow`, overlays 的角色。

7. `Backend Route Map`
   - `/api/v1` route group 到 service/repository 的對照。

8. `Data Boundary Map`
   - 哪些資料可以在 Zustand。
   - 哪些資料要 paging。
   - 哪些資料只能進 backend domain。
   - 哪些資料不能進任何 persistence/log。

9. `Registry Map`
   - `NEXUS_MODEL_CATALOG`
   - `PROVIDER_REGISTRY`
   - `CAPABILITY_REGISTRY`
   - `GRAPH_NODE_REGISTRY`
   - `TOOL_SLOT_REGISTRY`
   - `TOOL_EXECUTOR_REGISTRY`
   - `MEMORY_COMPRESSION_PROFILE_REGISTRY`
   - `HANDOFF_RULE_REGISTRY`

10. `Verification Matrix`
    - lint/typecheck/test/build
    - domain tests
    - manual smoke
    - browser verification when UI changes
    - migration/schema check when DB changes

11. `Needs Verification Carry-Forward`
    - 把目前已知待驗證點收進文件。

12. `Final Codex Operating Rule`
    - 如果無法畫出：

```text
UI action
  -> Zustand action
  -> shared type / registry slot
  -> nexusApiClient or state-sync port
  -> /api/v1 route
  -> apiHandler
  -> domain service
  -> repository / Supabase
  -> observability / sync / projection back to UI
```

    則不要落地實作，先標記 `Needs verification`。

## 過程規則

必須遵守：

- 只新增 `NEXUS_CODEX_EXECUTION_MAP.md`，除非使用者要求同步更新其他文件。
- 不要改 app behavior。
- 不要改 DB migration。
- 不要改 generated-style `database.types.ts`。
- 不要改 Zustand store。
- 不要改 API route。
- 不要新增工具、agent、model、provider、feature flag、table。
- 文件必須承接 `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`，不要與它矛盾。
- 文件必須保留 `Needs verification` 狀態，不要假裝已解決。
- 文件必須用可搜尋的實際檔名和 symbol 名稱。
- 文件必須讓下一個 Codex 能直接照章節做。
- 不要寫抽象鼓勵語；要寫可執行的路線。
- 新增任何 future playbook 時，都要指出 source of truth 和禁止重複點。

## 評分規則

生成後，請自評 `NEXUS_CODEX_EXECUTION_MAP.md`，用 0-10 分列出：

| 評分項 | 權重 |
| --- | ---: |
| 未來施作零摩擦性 | 20% |
| 防重複、防污染能力 | 20% |
| 前後端資料對接清晰度 | 15% |
| 功能層/擴充層可定位性 | 15% |
| Codex 新聊天室可讀性 | 15% |
| 驗證與測試導向完整度 | 10% |
| 外觀/性能/狀態 hygiene 覆蓋度 | 5% |

若總分低於 9.2，請自行修改文件直到達到 9.2 以上。

## 驗收標準

完成後必須回報：

- 新增檔案路徑。
- 文件涵蓋的 demand classes 數量。
- 是否包含權重比例。
- 是否包含起點敘述、Goal、過程描述、過程規則。
- 是否有保留 Needs verification。
- 是否沒有改動任何程式碼或 migration。

最低驗收：

- `NEXUS_CODEX_EXECUTION_MAP.md` 存在。
- 文件包含至少 10 種 demand class playbook。
- 每個 playbook 都有「先讀檔案 / source of truth / 接入步驟 / 禁止事項 / 驗證」。
- 文件明確禁止第二 sync queue、平行 registry、shadow store、secret persistence。
- 文件明確列出 `/api/v1` 正常 route 應使用 `apiHandler`，stream/special probe 是例外。
- 文件明確列出 historical data 不應直接進 Zustand root persistence。

## 建議完成格式

最後請用簡短中文回報，不要貼完整長文，只說：

```text
已完成 V14 Codex Execution Map。
新增：NEXUS_CODEX_EXECUTION_MAP.md
涵蓋：X 種 demand class playbook
自評：Y/10
未改動：TypeScript/TSX/API/migration
```

---

## Notes For The Current Thread

This prompt intentionally asks the new implementation chat to create `NEXUS_CODEX_EXECUTION_MAP.md`. It is scoped as a documentation/navigation upgrade, because V14's highest value is making future Codex execution safer and clearer before V15 state partitioning or V16 sync applier expansion.
