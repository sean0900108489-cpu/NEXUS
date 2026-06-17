# Frontend / Workbench 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---


你現在要當第一代理
第一個：Frontend / Workbench 子代理。

它的任務不是「看 UI 漂不漂亮」，而是審查 NEXUS 工作台這個 client orchestration layer 有沒有變成不可維護的神物件。已知 NexusOps 是 client component，匯入了 workspace kernel、style engine、workspace recovery、tool executors、stream retry、Supabase state sync、attachments、composer、model catalog、workflow-pro、workflow-engine、Zustand store，以及多個 panel/window/frame component，這表示它已經同時承擔 UI shell、資料 hydration、workflow orchestration、sync/recovery、model selection 和 artifact/macros 管理。

它第一步要建立「工作台功能地圖」。把 NexusOps 內的功能拆成：auth/session boot、workspace recovery、model catalog loading、agent window layout、graph/workflow view、theme/style preview、artifact hydration、macro/workflow template、composer/attachment、export/import、keyboard shortcut、right dock panels、notice/toast、read-only workspace gating。每個區塊都要標出：狀態來源在哪裡、effect 在哪裡、API 呼叫在哪裡、UI component 在哪裡、是否能被單元測試隔離。

第二步要做 effect 審查。重點查所有 useEffect / useMemo / useCallback 是否在做非 UI 職責。已經看到它有 auth state listener、workspace size ResizeObserver 加 window resize 加 interval remeasure、sync queue status polling、model catalog retry、workspace recovery、artifact auto hydration 等。這些不是錯，但它們如果集中在一個 component，會造成 lifecycle 難推理、重複觸發、race condition 和測試困難。

第三步要做 component boundary 審查。它要問：哪些東西應該搬到 hook？哪些應該搬到 service/controller？哪些只是 presentational component？例如 workspace theme preview 目前直接查 DOM target、計算 preview plan、寫 inline style；export/import 直接處理 Blob、local queue metadata、snapshot parsing；model catalog fallback 會直接更新 agent model。這些都要判斷是否仍應該留在 NexusOps，還是拆成 useWorkspaceBoot, useWorkspaceRecovery, useModelCatalog, useWorkspaceThemePreview, useArtifactHydration, useWorkspaceExportImport 之類的 hook。

第四步要做 UX reliability 審查。不是審美，而是工作台能否在小螢幕、resize、restore、import corrupted workspace、network offline、read-only workspace、auth expired、model catalog unavailable 時保持可預測。最近 commit 已經在修 agent window responsive bounds，表示 layout/responsive 是真實痛點；這個子代理要延伸檢查：window clamp 是否只影響 render、不污染 persisted layout；resize interval 是否必要；min/max/restore 是否和 workspace bounds 一致；graph view 和 panel view 是否共享相同狀態語義。

第五步要做 docs drift 審查。README 說 stream 狀態可以顯示 MOCK/LIVE/MIXED，但目前 resolveAgentsStreamMode() 直接回傳 "live"，這可能是產品語義和實作不一致。這類不一定是 bug，但要列成「產品承諾債」，因為它會誤導後續開發與測試。

這個子代理的輸出要包含四份東西：一份 workbench responsibility map；一份 oversized component extraction plan；一份 effect/race/polling risk list；一份 UI reliability test matrix。它不能直接建議「把 NexusOps 拆小」就結束，必須指出第一刀該拆哪個 seam、拆完驗收標準是什麼、現有 tests 要加在哪裡

我現在以「Frontend / Workbench 第一代理」身份給出實查結果。

結論先講：`NexusOps` 已經不是單純 workbench shell，而是「UI shell + session boot + workspace recovery + model catalog controller + sync queue monitor + artifact hydrator + workflow controller + stream dispatcher + import/export controller + theme DOM transaction host」。它還不到完全失控，但已經進入 P1 架構債區間。下一步不應該再往 `NexusOps` 裡塞功能，應該先抽 controller seams。

---

## 1. Workbench responsibility map

### A. App mounting / shell composition

入口 `src/app/page.tsx` 很乾淨：它只包 `NexusStyleRuntimeProvider`、`NexusProductionPageShellBoundary`、`NexusProductionPreviewController`，再掛 `NexusOps`。這代表真正 orchestration 幾乎全部集中在 `NexusOps`，不是 page layer。

狀態來源：無，page 只接 search param。

Effect：無。

API 呼叫：無。

UI component：`NexusOps` 是核心。

可否單測隔離：page 本身可，但沒有太大價值；真正要測的是 `NexusOps` 抽出的 controller。

判斷：這層不是問題，問題是下面的 `NexusOps` 吃掉太多責任。

---

### B. Static shell/frame

`NexusOps` 已經有一些 frame component，例如 `NexusOpsOuterShellFrame`、`NexusOpsBodyFrame`、`NexusOpsTopBarFrame`、`NexusOpsRightFloatingDockFrame`。但目前這些 frame 很薄，像 `NexusOpsBodyFrame` 只是一個帶背景 style 的 section，`NexusOpsTopBarFrame` 也只是 header wrapper。

狀態來源：無。

Effect：無。

API 呼叫：無。

UI component：frame-only。

可否單測隔離：可以，但價值低。

判斷：目前已拆的是視覺容器，不是 orchestration seam。這會造成「看起來拆了 component，但核心神物件仍在」。

---

### C. Store state selectors / mutation gateway

`NexusOps` 從 Zustand store 拉大量 state/action，包括 workspace、agents、selectedAgentId、viewMode、vault、artifactVault、notebooks、materializeDefaultWorkspace、save/export/import、spawn/duplicate/remove/focus/select/update layout/update profile/update model/update memory、workflow runtime lite、tool run、historical messages 等。這一段已經顯示 `NexusOps` 是 store mutation gateway，而不是純 UI。

狀態來源：`useNexusStore`。

Effect：間接觸發大量 mutation side effects。

API 呼叫：透過 store actions 與 `nexusApiClient` 混用。

UI component：幾乎全部 workbench children 都透過這裡拿 props。

可否單測隔離：目前困難，因為 selectors、callbacks、effects、render props 混在同一個 component。

判斷：P1。這是神物件核心。它讓任何 UI 子元件都被迫透過 `NexusOps` 拿行為，而不是透過 domain controller。

---

### D. Auth/session boot

`NexusOps` 自己建立 Supabase auth listener，先 `ensureNexusSupabaseClientConfigured()`，再 `supabase.auth.onAuthStateChange()`，再 `getSession()`，最後 `setAuthChecked(true)`。session user 還會進一步觸發 `handleSessionUser` 和 workspace recovery。

狀態來源：`authVault.user`、local `authChecked`、`recoveredLoginUserRef`。

Effect：Supabase auth subscription、initial session read。

API 呼叫：Supabase auth client。

UI component：auth 未檢查或未登入時直接 return `<AuthScreen />`。

可否單測隔離：目前不易，因為 auth listener、store mutation、workspace recovery、render gating 綁在同一 component。

判斷：P1。這應該是第一批抽出的 controller，否則登入/登出/恢復流程會越來越難測。

---

### E. Workspace recovery / cloud session binding

登入後 `recoverWorkspaceAfterLogin` 會讀 local workspace recovery context、呼叫 `ensureWorkspaceSession`、可能 bind local workspace 到 cloud session、fetch latest recovery state、fetch recovery list、apply recovery。切換 workspace 時又有另一個 effect 會 ensure workspace session，並可能再次 bind cloud session。

狀態來源：`workspaceSessionByWorkspaceId`、`workspaceRecoveryItems`、`workspaceRecoveryLoading`、store active workspace。

Effect：login recovery effect、workspace session ensure effect。

API 呼叫：`supabaseStateSyncManager.ensureWorkspaceSession`、`fetchLatestWorkspaceRecoveryState`、`fetchWorkspaceRecoveryList`、`fetchWorkspaceRecoveryState`。

UI component：TopBar recovery list/loading props。

可否單測隔離：目前偏難；需要 mock store、mock Supabase sync manager、mock local recovery context。

判斷：P1/P0 邊界。這塊碰 workspace identity、read-only、cloud binding，必須從 UI component 中抽出。

---

### F. Model catalog loading and fallback mutation

`NexusOps` effect 會用 access token fetch `/api/models`，失敗後每 3 秒 retry；另一個 effect 會在 model catalog 回來後，把不在 allowlist 的 chat agent model 直接改成 fallback model。

狀態來源：local `modelCatalog`、`modelCatalogPlan`、store agents。

Effect：model loading retry、fallback mutation。

API 呼叫：`fetch("/api/models")`。

UI component：TopBar、LeftDock、NexusGraph、AgentSettingsSidebar 都吃 modelCatalog。

可否單測隔離：可，但目前不好測，因為 fetch/retry 和 agent mutation 在 component 內。

判斷：P1。最危險的是「catalog loading」和「agent model mutation」放在同一 orchestration component。這可能造成 catalog 暫時不可用時 fallback 行為不透明。

---

### G. Agent window layout / workspace bounds

`NexusOps` 自己用 `ResizeObserver`、window resize、800ms interval 量 workspace size，再把 `workspaceBounds` 傳給每個 `AgentWindow`。

但 `AgentWindow` 內部又自己找 `.nexus-workspace`，再做一次 `ResizeObserver`、window resize、800ms interval，並用 `clampAgentWindowLayoutToBounds` 算 effective layout。

狀態來源：`workspaceSize` local state、`measuredWorkspaceBounds` local state、agent persisted layout。

Effect：NexusOps measurement effect + 每個 AgentWindow measurement effect。

API 呼叫：無。

UI component：`AgentWindow` / `Rnd`。

可否單測隔離：`clampAgentWindowLayoutToBounds` 可以純函式測；measurement hook 目前不能。

判斷：P1。這是明確 duplicated measurement loop。若畫面有 N 個 agent，就會有 1 + N 組 resize observer + interval。近期 responsive bounds 修復方向是對的，但現在的實作有 polling 放大風險。

---

### H. Graph / workflow view

`NexusOps` 同時負責 graph view render、workflow runtime lite start/pause、Workflow Pro contract export/import/apply、Graph Brain append、handoff evaluation 和 dispatch queue。`WorkflowProSurface` 是 UI，但它吃的 contract、brainContext、applyPlan、proposalDiff 都在 `NexusOps` 內用 `useMemo` 產生。

狀態來源：workspace graph/runtimeLite、workflow import review、local refs。

Effect：handoff snapshot tracking、handoff dispatch queue。

API 呼叫：間接透過 `handleSend`、`handleMediaGenerate`、runtime store actions。

UI component：`NexusGraph`、`WorkflowProSurface`。

可否單測隔離：目前低，因為 graph render、runtime commands、dispatch side effects 共用 `NexusOps` closure。

判斷：P1。Graph/Workflow 已經足以成為自己的 controller + surface，不應繼續留在 root workbench component。

---

### I. Theme/style preview

`NexusOps` 檔案內同時包含 theme config DOM apply、workspace style payload import/export、production preview target query、inline style snapshot、apply/revert transaction、WorkspaceStyleControlsPanel。這不只是 UI panel，而是直接查 DOM target、寫 inline CSS variable、做 residue check。

狀態來源：local style review、workspace theme config、panel internal state。

Effect：boot apply、target detection、style review subscription、panel control reset。

API 呼叫：無 backend，但直接寫 DOM。

UI component：`WorkspaceStyleControlsPanel` 仍在 `nexus-ops.tsx` 同檔案內。

可否單測隔離：部分已經有 pure transaction planner tests，而且測得不錯；但 DOM adapter 還沒抽出。

判斷：P1/P2。底層 planner 有測試，但 component 內 DOM adapter 還是重。這塊應抽成 `useWorkspaceThemePreviewController` + DOM adapter。

---

### J. Artifact hydration / artifact actions

`NexusOps` 負責 artifact refresh、auto hydration、copy、download、authenticated asset route fallback，以及 composer image generation後 artifact create。

狀態來源：artifactVault store cache、local loading/error/refresh token、auth user id。

Effect：panel open refresh、auto hydration。

API 呼叫：`fetchArtifactsFromCloud`、`nexusApiClient.get /api/v1/artifacts`、`nexusApiClient.post /api/v1/artifacts`、authenticated asset download route。

UI component：AgentSettingsSidebar artifact/generations panels、composer shell。

可否單測隔離：目前低。download uses DOM APIs and fetch in closure。

判斷：P1。Artifact actions 是 durable data + UI affordance + DOM download 混合，應該獨立成 controller。

---

### K. Composer / attachment / message send

`NexusOps` 負責 workspace composer shell props、text send、stream task creation、SSE read、retry/backoff、abort controllers、status mutation、message append、telemetry、image generation、artifact creation。`readStreamEvents` 也在同檔案中。

狀態來源：store active workspace/agent、modelCatalog、workspaceSessionByWorkspaceId、abortControllersRef。

Effect：無固定 effect，但 callback 自己執行大量 async orchestration。

API 呼叫：`/api/v1/agents/:id/tasks`、`/api/v1/agents/:id/stream`、`/api/v1/agents/:id/tasks/:taskId/cancel`、`/api/v1/artifacts`。

UI component：WorkspaceChatComposerShell、AgentWindow stop button。

可否單測隔離：目前困難，但這是最需要測的 runtime behavior。

判斷：P1。這應該不是 workbench root 的責任。至少要抽 `useAgentStreamController` 和 `useComposerImageGenerationController`。

---

### L. Export/import

`handleExport` 會讀 local sync queue operations、注入 notebook recovery metadata、建立 Blob、下載 JSON、處理 style payload export notice。`handleImport` 會讀 file、parse snapshot、再次 JSON.parse、extract style payload、import workspace、寫 style review。

狀態來源：workspaceStylePayloadReview、store export/import、local sync queue。

Effect：無，但 callback 裡有 file/blob/queue 操作。

API 呼叫：無 backend。

UI component：TopBar、CommandPalette、hidden file input。

可否單測隔離：目前 callback 難測；parse/import/export pure pieces 可抽出。

判斷：P2。不是最高風險，但它是很好抽的 seam。

---

### M. Keyboard shortcut / command palette

`NexusOps` 自己註冊 global keydown，處理 Cmd/Ctrl-K、Cmd/Ctrl-Z、Escape；commands array 直接包含 spawn/arrange/restore/minimize/save/export/import/reset mutation。

狀態來源：paletteOpen、workspaceSize、store temporal undo/redo。

Effect：global keydown listener。

API 呼叫：無。

UI component：CommandPalette。

可否單測隔離：目前不佳，因為 event listener 直接呼叫 store temporal。

判斷：P2。可抽 `useWorkbenchShortcuts` 和 `useCommandPaletteCommands`。

---

### N. Right dock panels

Right dock panel metadata 在 `nexus-ops.tsx` 同檔案內，panel render 由 `AgentSettingsSidebar` 承擔，`NexusOps` 傳入大量 props 和 handlers。

狀態來源：activeRightPanel、modelCatalog、artifact state、macros state、notebooks state、workflow state、authVault。

Effect：panel open triggers macro/artifact refresh。

API 呼叫：macro/artifact refresh。

UI component：RightFloatingDock、AgentSettingsSidebar。

可否單測隔離：目前 medium；Sidebar 可測，但 controller props 太多。

判斷：P2。不是最大風險，但 props surface 已過大。

---

### O. Read-only workspace gating

`blockReadOnlyWorkspaceMutation` 是 centralized guard，很多 UI handlers 有呼叫，但不是所有 mutation path 天然受它保護。Graph、TopBar、CommandPalette、Workflow Runtime、trace resync 等都有顯式 guard。

狀態來源：workspace session role。

Effect：`rememberWorkspaceSession` 還會同步 read-only 狀態到 local sync queue。

API 呼叫：無直接，但 guard 影響 API-triggering handlers。

UI component：TopBar receives readOnly props；NexusGraph receives readOnly props。

可否單測隔離：目前不佳，因為 guard 是 closure，不是 capability policy object。

判斷：P1。read-only 是權限語義，不應只靠 UI callback 記得呼叫。

---

## 2. Oversized component extraction plan

### 第一刀：抽 `useWorkbenchSessionController`

這是我建議第一個 PR，不是先拆視覺 component。

原因：session boot、workspace recovery、cloud session binding、read-only sync queue flag 目前都在 `NexusOps` 裡，而且它們會影響所有後續 mutation 是否安全。這一刀能同時降低 race condition、權限語義散落、測試困難。它比先拆 TopBar 或 AgentWindow 更有架構價值。

抽出內容：

`authChecked`  
`workspaceSessionByWorkspaceId`  
`workspaceRecoveryItems`  
`workspaceRecoveryLoading`  
`activeWorkspaceRole`  
`activeWorkspaceReadOnly`  
`activeWorkspaceReadOnlyMessage`  
`rememberWorkspaceSession`  
`recoverWorkspaceAfterLogin`  
`recoverSelectedWorkspace`  
`handleSessionUser`  
Supabase auth subscription effect  
workspace session ensure effect

新 hook 介面大概是：

```ts
const session = useWorkbenchSessionController({
  activeWorkspaceId,
  workspace,
  applyWorkspaceRecoveryState,
});
```

回傳：

```ts
{
  authChecked,
  workspaceSessionByWorkspaceId,
  activeWorkspaceSession,
  activeWorkspaceRole,
  activeWorkspaceReadOnly,
  activeWorkspaceReadOnlyMessage,
  workspaceRecoveryItems,
  workspaceRecoveryLoading,
  handleSessionUser,
  recoverSelectedWorkspace,
  blockReadOnlyWorkspaceMutation,
}
```

驗收標準：

`NexusOps` 不再 import `ensureNexusSupabaseClientConfigured`、`getNexusSupabaseClient`、`buildLocalWorkspaceRecoveryContext`、`supabaseStateSyncManager` 相關 session/recovery 方法。

`NexusOps` render 邏輯仍然只有：未 auth checked 或未 user 時顯示 `AuthScreen`，其他照常 render。

read-only gating 仍能阻擋 spawn/import/save/graph edit/workflow run。

login 後只會對同一 user/token recovery 一次，不會重複 apply cloud recovery。

切 workspace 後會 ensure session，但不會把 read-only workspace 錯誤標成 editable。

測試位置：

`src/components/nexus/hooks/use-workbench-session-controller.test.ts`

因目前 Vitest 是 node environment，第一版測試應該把 hook 內的純 decision logic 拆成 pure helper 測，不要急著上 React hook test。現有 `vitest.config.ts` 是 node environment，且 package 目前沒有 React Testing Library / jsdom 依賴，所以如果要測 hook rendering，要另開測試環境改造。

---

### 第二刀：抽 `useModelCatalogController`

抽出內容：

`modelCatalog`  
`modelCatalogPlan`  
`/api/models` load with token  
retry timer  
fallback model resolution  
agent model fallback mutation

但我會要求拆成兩層：fetch/retry 是 hook，fallback mutation 是 explicit controller method，不要在 catalog 一回來就隱式改所有 agent。

原因：目前 effect 在 model catalog 有資料後會直接 loop agents 並 `updateAgentModel`。這在 UI root 裡非常隱性，未來如果 model catalog 暫時降級、plan 改變、provider fallback 改變，agent 設定可能被悄悄改寫。

驗收標準：

catalog unavailable 時 UI 顯示 degraded catalog 狀態，而不是無限 silent retry。

fallback mutation 有 notice 或 audit-friendly result。

測試位置：

`src/lib/models/model-catalog-fallback.test.ts`

測試 cases：

empty catalog 不 mutate。

agent model not allowed 時回傳 fallback plan。

non-chat capability 不被 fallback。

`gpt-4o-mini` 存在時優先，否則第一個 catalog model，否則保留 default。

---

### 第三刀：抽 `useWorkspaceViewportBounds`，移除 duplicated interval

現在 `NexusOps` 和每個 `AgentWindow` 都量 workspace bounds，而且兩邊都有 ResizeObserver + window resize + 800ms interval。`NexusOps` 的 interval 是 `WORKSPACE_SIZE_REMEASURE_INTERVAL_MS = 800`，`AgentWindow` 也有 `AGENT_WINDOW_BOUNDS_REMEASURE_INTERVAL_MS = 800`。

抽出目標：

只有 workspace root 量一次 bounds。

`AgentWindow` 只接受 `workspaceBounds`，不再 `closest(".nexus-workspace")` 自己量。

`clampAgentWindowLayoutToBounds` 保持 pure function。

驗收標準：

N 個 visible agents 時仍只有 1 個 ResizeObserver 和 1 個 fallback interval。

clamp 只影響 render-time `effectiveLayout`，不污染 persisted layout；只有 drag/resize stop 才呼叫 `onUpdateLayout`。目前 `AgentWindow` 這點方向是對的，因為 `effectiveLayout` 被用於 Rnd position/size，而 persisted update 只在 drag/resize stop。

測試位置：

`src/components/nexus/window-layout.test.ts` 或移到 `src/lib/workbench/window-layout.test.ts`

測試 cases：

large layout 在 small bounds 會 scale/clamp。

invalid bounds 回傳原 layout。

min width/min height 不超過 available bounds。

clamp 不改 input object。

---

### 第四刀：抽 `useWorkspaceIOController`

抽出 `handleExport`、`handleImport`、download helpers、style payload import/export notice。這刀可放在第二批，因為風險低於 session/model/layout，但可快速減少 `NexusOps` 行數。

驗收標準：

`NexusOps` 不直接碰 Blob、URL.createObjectURL、file.text、JSON.parse。

corrupted JSON、unsupported stylePack、style-only reject、sync metadata read failure 都有 deterministic result。

---

### 第五刀：抽 `useAgentRunController`

抽出 text stream、task create、SSE read、abort/cancel、media generate、composer image generate、artifact record create。這刀風險高，不應該第一個做，但必須做。`handleSend` 目前橫跨 task creation、stream fetch、SSE parsing、message mutation、status mutation、telemetry、abort map。

驗收標準：

`NexusOps` 只呼叫 `agentRun.send(agentId, content)`、`agentRun.stop(agentId)`、`agentRun.generateMedia(...)`。

stream parser 成為獨立 utility，malformed event handling 可測。

abort/cancel idempotency 可測。

---

## 3. Effect / race / polling risk list

### Risk 1 — Duplicate workspace measurement polling

嚴重度：P1

證據：`NexusOps` 對 workspace root 建立 ResizeObserver、window resize listener、800ms interval。`AgentWindow` 每個 instance 又找 `.nexus-workspace`，再建立 ResizeObserver、window resize listener、800ms interval。

風險：agent 數量越多，polling 越放大；小螢幕 resize、layout animation、graph/panel 切換時可能出現多源 bounds 判斷。

修法：單一 `useWorkspaceViewportBounds`，AgentWindow 不再自測。

驗收：10 個 visible agents 仍只有 1 個 bounds observer/interval。

---

### Risk 2 — Model catalog retry can silently mutate agent models

嚴重度：P1

證據：catalog fetch 失敗會每 3 秒 retry；catalog 成功後 effect 會檢查每個 chat agent 的 model，不在 allowlist 就直接 `updateAgentModel(agent.id, fallbackModelId)`。

風險：catalog 暫時變動或 plan 降級時，agent model 可能被 root effect 隱式改寫。使用者不一定知道 agent setting 被改。

修法：把 fallback 變成 explicit reconciliation result，例如 `needsModelReconciliation`，由 UI 顯示並讓使用者確認，或至少 setNotice。

驗收：測試 catalog 變動時不會 silent mutate；fallback mutation 有明確 notice/result。

---

### Risk 3 — Auth boot and recovery race

嚴重度：P1

證據：auth listener、initial getSession、handleSessionUser、recoverWorkspaceAfterLogin、ensureWorkspaceSession effect 都在同一 component lifecycle 中運作。`recoveredLoginUserRef` 用 user/token key 避免重複 recovery，但 workspace switch effect 也會 bind session。

風險：登入、登出、切 workspace、token 晚到時，可能重複 ensure session 或 recovery；cloud workspace id rebind 可能和 active workspace 切換交錯。

修法：抽 `useWorkbenchSessionController`，建立明確 state machine：unauthenticated、checking、session-ready、recovering、recovered、recovery-conflicted。

驗收：同一 user/token 只 recovery 一次；切 workspace 只 ensure 當前 workspace；登出會清空 session map 和 queue read-only state。

---

### Risk 4 — Sync queue status polling every 2 seconds

嚴重度：P2

證據：`NexusOps` 每 2 秒呼叫 `localSyncQueueAdapter.getStatus({ workspaceId })`，並在 active workspace 變更時重建 interval。

風險：狀態延遲、無事件驅動、測試依賴 fake timers；如果 queue operation 多，會多做不必要 reads。

修法：localSyncQueueAdapter 提供 subscribe/status change event；fallback polling 可以保留但延長或只在 queue active 時開。

驗收：enqueue/recover/flush 會推送 status；idle 狀態無常駐 2s polling。

---

### Risk 5 — Theme preview direct DOM transaction is inside UI file

嚴重度：P1/P2

證據：`getWorkspaceThemePreviewTargets()` 直接 query selector；apply preview 直接 `target.style.setProperty`；revert 直接 `removeProperty` / `setProperty`。

風險：DOM mutation lifecycle 和 React render lifecycle 混在一起；target missing/duplicate/html/body/root 時雖有 planner 保護，但 adapter 層還是難測。

修法：保留目前 planner tests，新增 DOM adapter abstraction：`workspaceThemePreviewDomAdapter.apply(plan.transaction)`、`revert(revertPlan)`。

驗收：planner pure tests 繼續通過；DOM adapter 可用 fake HTMLElement 測 apply/revert/residue。

---

### Risk 6 — Artifact hydration key can permanently suppress retries after partial success

嚴重度：P2

證據：artifact auto hydration 用 `artifactAutoHydrationKeyRef` 記住 `${userId}:${workspaceId}:${role}`；失敗才 reset，成功後同 key 不再 fetch。

風險：如果成功但資料不完整、後端新增 artifact、或 role 不變但 workspace content 有更新，自動 hydration 不會再觸發，只能靠 panel refresh token。

修法：hydration key 應包含 artifact cache version / last updated cursor，或只作短期 in-flight de-dupe，不作永久 suppress。

驗收：同一 workspace 在 artifact created 後能自動 refresh 或明確 invalidation。

---

### Risk 7 — Read-only guard is manual and callback-scattered

嚴重度：P1

證據：`blockReadOnlyWorkspaceMutation` 被很多 handlers 手動呼叫；Graph add/connect/delete、TopBar save/import/spawn、workflow run、trace resync 都各自 guard。

風險：新增 mutation handler 時容易漏 guard。read-only 是 permission policy，不應靠每個 callback 記得呼叫。

修法：抽 `useWorkspaceMutationGuard`，提供 wrapped actions：`guarded("Spawn agent", () => spawnAgent())`；或讓 store mutation 接受 workspace role/context 後拒絕。

驗收：測試所有 workbench mutation command 都經過 guard registry；新增 command 若未分類會 fail test。

---

### Risk 8 — Stream mode product promise drift

嚴重度：P2

證據：README 說 top bar 會顯示 `STREAM: MOCK/LIVE/MIXED`，且 agents with empty key use mock streaming；但 `resolveAgentsStreamMode()` 目前直接回傳 `"live"`。

風險：文件、UI、實作語義不一致；測試若按 README 寫會失敗，產品使用者也會被誤導。

修法：要嘛更新 README，宣告 v1 backend gateway 現在永遠 live；要嘛恢復按 active agents/provider key 計算 stream mode。

驗收：新增 `resolveAgentsStreamMode` test，覆蓋 no agents、all live、mixed、backend gateway live-only 模式。

---

## 4. UI reliability test matrix

|場景|目前風險|建議測試層級|測試位置|
|---|---|--:|---|
|未登入初始載入|Auth listener 和 getSession race|controller pure/state-machine test|`use-workbench-session-controller.test.ts`|
|登入後 local workspace bind cloud session|可能重複 recovery / bind|controller test with fake sync manager|`use-workbench-session-controller.test.ts`|
|登出|session map/read-only queue 未清乾淨|controller test|同上|
|切 workspace|ensureWorkspaceSession 和 active workspace rebind 交錯|controller test|同上|
|read-only viewer spawn/import/save|callback 漏 guard|guard registry test|`workspace-mutation-guard.test.ts`|
|read-only viewer graph edit/workflow run|graph callbacks 分散|guard registry + component smoke later|同上|
|`/api/models` unavailable|無限 retry + silent fallback|fake timer test|`model-catalog-controller.test.ts`|
|model catalog plan changes|agent model 被隱式改寫|pure reconciliation test|`model-catalog-fallback.test.ts`|
|小螢幕 workspace bounds|window 被 clamp，但 persisted layout 不應污染|pure layout test|`window-layout.test.ts`|
|10 個 agent windows resize|duplicate interval 放大|hook/controller instrumentation test|`workspace-viewport-bounds.test.ts`|
|maximize/minimize/restore|workspace bounds 與 Rnd size 不一致|pure layout + later e2e|`window-layout.test.ts`|
|import corrupted JSON|UI 不應壞，只出 notice|IO controller test|`workspace-io-controller.test.ts`|
|import unsupported stylePack|workspace kept + review state correct|IO controller test|同上|
|export with local queue failure|仍可 export workspace|IO controller test|同上|
|offline sync queue failed/conflicted|retry button 找第一個 issue 並 recover|queue controller test|`sync-queue-status-controller.test.ts`|
|artifact panel open|refresh artifacts once, loading/error deterministic|artifact controller test|`artifact-vault-controller.test.ts`|
|artifact auto hydration|不應永久 suppress valid refresh|artifact controller test|同上|
|theme preview missing target|fail closed|existing planner test + DOM adapter test|`workspace-theme-preview-dom-adapter.test.ts`|
|theme preview duplicate target/html/body/root|fail closed|existing planner already covers planner; add adapter coverage|同上|
|theme preview revert residue|inline style restored/removed|DOM adapter test|同上|
|Cmd/Ctrl-Z inside textarea|native undo preserved|shortcut pure helper test|`workbench-shortcuts.test.ts`|
|Cmd/Ctrl-K|palette toggles only once per event|shortcut controller test|同上|
|stream abort|agent not stuck streaming|agent run controller test|`agent-run-controller.test.ts`|
|malformed SSE event|notice/meta emitted, no crash|stream parser test|`stream-events.test.ts`|
|docs stream mode|README promise vs implementation|resolver test + docs decision|`stream-mode-resolver.test.ts`|

目前測試基礎有一個重要限制：Vitest config 是 node environment，沒有 jsdom；package 也沒有 React Testing Library。 所以第一階段不要硬上 full component tests，應該先把 controller/pure helper 抽出來測。等 controller 穩定後，再決定要不要加 jsdom 或 Playwright 做真正 UI reliability/e2e。

---

## 第一代理最終裁決

我會把 Frontend / Workbench 的技術債 register 排序成這樣：

P1-001：`NexusOps` 過度承擔 session/recovery/model/sync/runtime orchestration。第一刀抽 `useWorkbenchSessionController`。

P1-002：workspace bounds measurement duplicated in root + every AgentWindow。第三刀抽 `useWorkspaceViewportBounds`，移除 per-window polling。

P1-003：model catalog load/retry 與 agent model fallback mutation 混在 root effect。抽 `useModelCatalogController`，把 fallback reconciliation 顯性化。

P1-004：stream/task/media generation callback 過重，root component 直接承擔 backend runtime dispatch。抽 `useAgentRunController`，但排在 session/model/layout 後做。

P1-005：read-only guard 是 manual callback convention，不是 policy boundary。抽 `useWorkspaceMutationGuard` 並建立 command/action coverage test。

P2-001：export/import、download、style payload review 混在 root component。抽 `useWorkspaceIOController`。

P2-002：theme preview DOM adapter 留在 `nexus-ops.tsx`，雖然 planner 有測試，但 DOM mutation 應抽離。

P2-003：README 的 MOCK/LIVE/MIXED stream mode 承諾和現在 `resolveAgentsStreamMode(): "live"` 不一致。要明確決策是修文件還是修 resolver。

我的建議是先開一個「不改 UI 行為」的重構 PR：只抽 `useWorkbenchSessionController`、保留所有 UI props 和文案不變、加 session/recovery/read-only guard 的 pure tests。這會是最穩的第一刀，因為它先把權限與恢復流程從神物件中拉出來，後面再拆 model/layout/agent-run 才不會踩到身份與 workspace binding 的地雷。


---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
| 問題 | 修復 | 檔案 |
|---|---|---|
| SSE token-by-token re-render (Section 1.K) | Content token 30ms batching | `nexus-ops.tsx` |
| Reasoning token flood → UI freeze | Reasoning token 50ms batching | `nexus-ops.tsx` |
| `reasoningContent` 渲染欄位名不匹配 | 修正讀取 `reasoningContent` | `nexus-agent-window.tsx` |
| UI 顯示手動 token 輸入 | `GatewayProvisionButton` — Initialize/Repair 按鈕，不顯示 token | `nexus-agent-settings-sidebar.tsx` |

### 仍待處理
- P1: Per-agent 重複 ResizeObserver + 800ms interval (Section 1.G)
- P1: SSE handler 仍在 NexusOps root component (Section 1.K — 已 batching 緩解，未根治)
- P2: NexusOps 神物件 (Sections A-K)
- P2: React Flow 在 panel view 也 recompute
- P2: Model catalog retry loop 每 3 秒 forever (Risk 2)
- P2: Auth/recovery race (Risk 3)
- P2: Sync queue status polling 每 2 秒 (Risk 4)
