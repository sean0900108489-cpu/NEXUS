# Store / Runtime 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---

你現在要當第二代理
第二個：Store / Runtime 子代理。

它的核心問題是：Zustand store 現在到底是 active UI cache、domain runtime、offline persistence、還是 backend synchronization coordinator？目前看起來四者都有。nexus-store.ts 是 client-only store，包含 workspace、agents、authVault、artifactVault、historicalMessages、prompts、notebooks、deleted notebooks、notebook drafts、transaction history、branching status、workflow runtime lite、tools、undo/redo、local persistence、cloud recovery 等。這代表它已經是 NEXUS 的 client-side operating system。

第一步要做 state taxonomy。把 store 裡所有 state 分成五類：ephemeral UI state、active workspace document state、durable user content、runtime execution state、remote cache / historical data。然後標註每一類應該存在於哪裡：Zustand、IndexedDB、Supabase、server API、或 runtime-only memory。這一步很重要，因為現在 authVault 被 normalize 成不持久化 key，這是好的；但 artifact cache、historical messages、workflow runs、workspace snapshots、notebook drafts 這些資料的生命週期需要重新定義。

第二步要做 persistence boundary 審查。store 使用 IndexedDB 作為 primary persistence，localStorage 作 fallback，還有 legacy key migration。這設計不差，但要檢查幾個高風險點：initial storage read finished 之前是否可能漏寫；IndexedDB fallback 到 localStorage 是否會碰 payload quota；snapshot 內是否可能保存過多 runtime data；legacy migration 清理是否安全；undo/redo temporal state 是否包含不該進歷史的資料。

第三步要做 undo/redo 審查。temporalSignature 用 JSON.stringify 比較 workspace signature，且 temporal state 包含 workspaces、viewMode、selectedAgentId、nextZIndex 等。這個子代理要查：哪些 mutation 應該進 undo，哪些不該進？例如 agent layout、mission、graph edge 應該進；stream token append、runtime run status、artifact hydration、sync queue metadata、auth/user session 不應該進。現在需要驗證 prepareWorkspacesForTemporalState 和相關 omission 是否真的守住這個界線。

第四步要做 workflow runtime lite 審查。store 裡面不只管理 UI agent，也直接 import workflow runtime lite runner、LLM client、image client、trace sync、group record publish、topology inference。這代表 runtime execution 可能和 UI store 高耦合。子代理要追 runWorkflowRuntimeLiteFlow、abort controller、trace sync retry、generated artifact collection、runtime node patching，判斷是否需要抽成 runtime service/store slice，避免 UI mutation 和 execution side effect 互相污染。

第五步要做 local sync queue compatibility 審查。store 會把 prompts、notebooks、workspace snapshots、messages 等送進 local sync queue；local queue 自己有 compactKey、payload hash、secret detection、read-only suppression、online flush、retry、conflict/failed 狀態。這個子代理要查 store 對 queue 的呼叫是否正確表達 intent：哪些操作可 compact，哪些不可 compact；delete 是否保留足夠 tombstone；workspace snapshot 太大或含 secret 時 UI 如何回復；read-only workspace 被 suppress 後使用者是否知道。

這個子代理的輸出要包含：一份 state ownership matrix；一份 store slice/refactor proposal；一份 undo/redo inclusion-exclusion list；一份 runtime/store decoupling plan；一份 persistence and local queue failure-mode matrix。它的最高價值不是改幾行 Zustand，而是把「什麼資料活在哪一層」定清楚。

第二代理接手結論：`src/store/nexus-store.ts` 現在不是單純 Zustand store，而是「client-side operating system」。它同時做 active document state、UI state、runtime execution coordinator、local persistence normalizer、cloud sync trigger、historical cache、tool runner、workflow runner、transaction logger。這不是立即錯，但已經到了需要明確切邊界的階段。

我這次先做靜態審查，沒有改 code，也沒有跑測試。下面是第一輪 Store / Runtime 技術債報告。

---

## 0. 核心診斷

`nexus-store.ts` 是 client-only，使用 Zustand、idb-keyval、persist、zundo，並直接 import API client、history fetcher、Supabase sync manager、workspace kernel、memory compressor、workflow LLM client、image client、workflow runner、trace sync、group record publisher、topology inference。這代表 store 已經不只是 state container，而是把資料模型、persistence、runtime orchestration、sync side effect 都混在同一個檔案。

Store state 本身也證明了這點：它同時包含 `workspaces`、`selectedAgentId`、`streamMode`、`viewMode`、`isVaultManagerOpen`、`authVault`、`artifactVault`、`historicalMessages`、`promptsCache`、`notebooksCache`、`deletedNotebooksCache`、`notebookDrafts`、`transactionHistory`、`branchingStatus`，再加上一大串 workspace、agent、auth、artifact、history、prompt、notebook、workflow runtime、tool runner actions。

最重要的一句其實已經寫在 `state-sync.ts` 註解裡：這個 module 未來應該作為 active Zustand UI cache 和 L4 backend 的橋，Zustand 應該聚焦 active UI interaction state，historical Messages 和 Artifacts 應該走 backend slots。也就是說，專案自己已經知道正確方向；現在的債務是實作還沒有完全符合這個邊界。

---

## 1. State ownership matrix

我會把現有 state 分成五類，並給出目標 ownership。

### A. Ephemeral UI state

這類應該留在 Zustand，但不該進 Supabase，也多數不該進 undo/redo。

包含：`selectedAgentId`、`viewMode`、`isVaultManagerOpen`、`openNotebookIds`、`notebookWindowLayers`、部分 `streamMode`、panel focus/minimize/maximize 狀態、workspace local UI selection。

目前問題是：其中一部分被包進 `workspaces` 裡，例如 agent minimized/maximized/layout/panels/selectedAgentId。這可以接受，因為 layout 是 workspace document 的一部分；但 `isVaultManagerOpen`、historical loading flags、branchingStatus、trace syncing state、tool status 就不應該和 document mutation 混在一起。

目標：保留在 `useWorkbenchUiStore` 或 `uiSlice`。只持久化必要 layout preference，不要把 loading/error/runtime status 當 workspace document 永久資料。

### B. Active workspace document state

這類是 NEXUS workspace 的核心文件狀態，應該存在 Zustand active cache、IndexedDB local persistence、Supabase workspace snapshot。

包含：workspace id/name、agents、agent identity/mission/profile/model/modelSettings/tools blueprint、agent layout、graph nodes/edges、themeConfig、workspace settings、macro-relevant blueprint data、checkpoint snapshot。

這是目前 store 做得比較合理的部分。`partializeTemporalState` 明確把 `activeWorkspaceId`、`nextZIndex`、`selectedAgentId`、`viewMode`、`workspaces` 放進 temporal state；`temporalWorkspaceSignature` 也聚焦 agent profile/layout/model/graph/settings/theme 等 document-level fields。

目標：保留在 `workspaceDocumentSlice`。但是要把 runtime run output、loading flags、trace sync state 從 document state 中切出去，否則 snapshot 會越來越胖。

### C. Durable user content

這類不應該長期以 Zustand 為 source of truth。Zustand 可以做 optimistic cache，但 durable truth 應該是 Supabase/API/local sync queue。

包含：prompts、notebooks、deleted notebook tombstones、notebook drafts、messages、artifacts、memory blocks、workflow templates。

目前 store 把 prompts/notebooks/drafts/deleted tombstones 全放進 persisted state，並且用 local merge 規則和 Supabase refresh 混合；例如 remote notebooks 和 local notebooks merge 時，註解明確說「沒有 tombstones 時，remote reads 不足以刪除 newer/local-only Datapads」。

目標：拆成 `contentCacheSlice`，並明確區分：  
prompts/notebooks 是 optimistic cache；  
notebook drafts 是 local durable draft；  
deletedNotebooksCache 是 tombstone cache；  
messages/artifacts 是 backend durable records + active window projection；  
memory blocks 需要專門 write route，不能永久靠 workspace snapshot。

這點在現有 local persistence metadata 裡其實已經承認：message durability 標成 `needs_sync_operation_applier_message_projection`，memory durability 標成 `needs_memory_write_route`。

### D. Runtime execution state

這類應該從 workspace document 中抽出，至少不能完整進 undo/redo，也不該完整進 snapshot。

包含：workflow runtime node status、inputSnapshot/outputSnapshot、runs、lastRunId、lastError、traceSync、abort controller、tool running/error status、branchingStatus、streaming message token accumulation。

目前 runtime 狀態高度混入 store。`workflowRuntimeAbortControllers` 是 module-level Map；`runWorkflowRuntimeLiteFlow` 在 store action 裡建立 runId、reset nodes、建立 AbortController、呼叫 LLM/image runtime、patch node、update run、merge generated artifacts、publish trace、queue workspace sync。

目標：抽成 `workflowRuntimeController` + `runtimeSlice`。Zustand 只接收 projected runtime state；真正執行、abort、trace publish、artifact extraction 不應該在 store action 裡。

### E. Remote cache / historical data

這類應該是 query cache 或 backend fetch cache，不應該進 workspace document，不應該進 undo/redo，也不應該持久化太久。

包含：`artifactVault`、`historicalMessages`、`promptsCache` remote refresh result、`notebooksCache` remote refresh result、workspace recovery list/state。

目前 migration 會把 `historicalMessages` 重設為 `{}`，這是對的；但是 `artifactVault` 會被持久化，而且 prompts/notebooks/drafts/deleted notebooks 也被持久化。

目標：`artifactVault` 只持久化 metadata index 或 recently viewed cache，不持久化完整 artifact payload。`historicalMessages` 保持 volatile。prompts/notebooks 用 optimistic cache，但必須有明確 dirty/pending/conflict state。

---

## 2. Persistence boundary 審查

目前 persistence 是：IndexedDB primary、localStorage fallback、legacy key migration。`indexedDbStateStorage.getItem` 會從 IndexedDB 讀，沒有則搬 legacy localStorage 到 IndexedDB 並清掉 legacy keys；`setItem` 在 `initialStorageReadFinished` 之前直接 return，避免 rehydrate 前 overwrite；寫 IndexedDB 失敗則 fallback localStorage。

這個設計方向是合理的，但有四個高風險點。

第一，`initialStorageReadFinished` 是 module-level boolean。它避免 rehydrate 前寫入覆蓋舊資料，但也代表 rehydrate 早期的合法 mutation 可能被 drop。這個風險通常發生在 app boot 期間：auth listener、workspace boot、default materialization、model catalog fallback、recovery apply 如果太早觸發，UI 會看起來成功，但 local persistence 不一定記住。

第二，localStorage fallback 仍可能碰 quota。local persistence partialize 目前保存 `artifactVault`、`deletedNotebooksCache`、`notebookDrafts`、`notebooksCache`、`openNotebookIds`、`workspaces`、`transactionHistory` 等；workspace 又保存 agents/messages/memory/runtimeLite。雖然 inline image data URL 有被替換，workflow input/output snapshots 也會遞迴清除 inline image data URL，但文字型 large output、tool result、long notebook、large memory 仍可能讓 localStorage fallback 壓力很大。

第三，runtime data 仍被 local-persisted。`prepareWorkflowRuntimeLiteForLocalPersistence` 會保留 runtime nodes、runs、nodeExecutions，只是清掉 context packet 裡的 inline image data URL。這代表過去 run 的 input/output snapshots、traceSync、error 等仍會進 IndexedDB。短期能支援 recovery，但長期會膨脹 snapshot，讓 workspace state 變成 execution log。

第四，authVault 的 secret persistence 做得對，但 API 形狀有產品債。`normalizeAuthVault` 會保留 user，但把 `globalApiKey`、`globalBaseUrl`、`providerCredentials` 清空，`isLocked` 設 true；這是安全正確的。不過 `setGlobalApiKey`、`setProviderApiKey` 等 action 現在實際上不保存 key，會把 key 參數忽略並清空 credentials，這意味著 UI 層若仍宣稱可保存 provider key，產品語義會漂移。

我的建議：persistence partialize 要拆成三層。

第一層 `workspaceDocumentPersistedState`：workspace blueprint、layout、graph、theme、settings、checkpoint summary。

第二層 `localDraftPersistedState`：notebook drafts、pending unsynced local content、local-only tombstones。

第三層 `runtimeRecoveryPersistedState`：只保留最近 N 個 run 的 summary，不保留完整 input/output packet；完整 run output 走 backend trace/event/artifact。

---

## 3. Undo / redo 審查

目前 undo/redo 用 zundo，limit 50，partialize 只保留 `activeWorkspaceId`、`nextZIndex`、`selectedAgentId`、`viewMode`、`workspaces`；equality 用 `temporalSignature(JSON.stringify(...))` 比對。

好消息是：`prepareWorkflowRuntimeLiteForTemporalState` 已經把 runtime `lastError`、`lastRunId` 清空，node `inputSnapshot` / `outputSnapshot` 清空，status 大多 reset 成 idle，runs 清空。這表示作者已經意識到 runtime execution 不應該進 undo stack。

但還有幾個問題。

第一，`temporalWorkspaceSignature` 仍包含完整 `workspace.graph`。雖然 temporal partialize 先清理了 `runtimeLite`，但 signature 直接拿 `workspace.graph`，這讓未來任何 runtimeLite 新欄位如果沒被清理，就會自動污染 undo 判斷。建議不要在 signature 裡放完整 graph object；改成顯式列出 `graph.nodes`、`graph.edges`、`runtimeLite.nodes.data/position/edges` 的 design-time subset。

第二，agent messages 目前沒有進 temporal signature，這是對的；但 `workspaces` partialize 本身仍包含完整 workspace，包含 messages。雖然 equality 不會把 message append 視為變化，但 past state snapshot 仍可能持有完整 messages，造成 undo stack memory 壓力。要確認 zundo 儲存的是 partialized object 本身，而不是只用 equality；若它保留完整 `workspaces`，那 messages 仍在 undo history 裡。這是 P1/P2 交界，因為長 stream 會放大記憶體。

第三，`nextZIndex`、`selectedAgentId`、`viewMode` 被納入 undo 是可疑的。layout/focus 操作可 undo 是合理的；但單純 select/focus/view mode 是否應進 undo，要產品定義。現在 `selectAgent`、`focusAgent`、`setViewMode` 都會改 temporal state，因此可能污染 undo stack。

Undo inclusion-exclusion list 我會這樣定：

應該進 undo：spawn/remove/duplicate agent、agent identity/mission/profile/model changes、layout changes、graph connect/remove、workflow runtime design-time node add/remove/connect/data/position、theme config、workspace rename、macro instantiate、checkpoint restore。

不應該進 undo：message append/finish、reasoning append、agent runtime status、tool running/result/error、workflow run status/input/output/traceSync、artifactVault hydration、historicalMessages loading/error/cache、prompts/notebooks remote refresh、sync queue status、authVault、branchingStatus、transactionHistory、model catalog fallback、read-only queue compaction。

需要產品決策：selectedAgentId、focus z-index、minimize/maximize、viewMode。我的建議是：layout/focus 可以進 undo，但 pure selection 和 view switch 不進 undo。

---

## 4. Workflow runtime lite 審查

這是 Store / Runtime 代理最重要的債。

`runWorkflowRuntimeLiteFlow` 現在做了太多事：取得 workspace、normalize runtime、infer edges、select start node subgraph、resolve workflow group、resolve execution agent、建立 runId、處理 no-agent failure run、reset selected nodes、寫回 workspace、建立 AbortController、呼叫 `runWorkflowRuntimeLite`、把 `callImage` 和 `callLlm` 注入、在 callback 裡 patch node/update run、收集 generated artifacts、更新 artifactVault、publish trace、更新 traceSync、queue workspace cloud sync。

這表示 runtime execution 的 transaction boundary 不存在。UI store action 同時是 runner、repository、trace publisher、artifact projector、cloud sync trigger。這會帶來幾個風險：

一，abort 語義綁在 workspace id 和 module-level Map 上。若 workspace 切換、recovery apply、import workspace、或 workspace id rebound 發生，舊 controller 的生命週期很難推理。

二，runtime node patch 直接寫 active workspace。若使用者在 run 中途切 workspace，`withActiveWorkspace` 會 patch 當前 active workspace，而不是 run 開始時的 workspace。部分後續 trace update 使用 `withWorkspaceById`，但 node patch 和 run update 用的是 active workspace helper，這是潛在 race。

三，run 完後 `queueWorkspaceCloudSync(getActiveWorkspace(get()))` 會同步「當下 active workspace」，而不是明確同步原 run workspace。若 run 完成時 active workspace 已變，可能 sync 錯 workspace。

四，generated artifacts 用 `artifact.workspaceId === workspace.id` 過濾，這是好的；但 artifact cache merge 發生在同一個 store action，沒有 durable backend write contract。如果 transient generated artifact 是 recovery 需要的資料，它的 source of truth 不清楚。

我建議第一刀不要大改 runner，而是抽一個 controller：

`WorkflowRuntimeController.run({ workspaceSnapshot, runtimeLite, authContext, startNodeId })`

它回傳事件流或 callback：  
`runtime.nodePatched`  
`runtime.runUpdated`  
`runtime.artifactsProjected`  
`runtime.traceSyncUpdated`  
`runtime.completed`  
`runtime.failed`

Zustand 只做 reducer：

`runtimeSlice.applyRuntimeEvent(workspaceId, event)`

這樣可以把 `workspaceId` 固定在 run start，避免 active workspace race，也能讓測試直接驗證 state transition，而不是 mock 整個 Zustand store。

---

## 5. Local sync queue compatibility 審查

Local sync queue 本身設計是成熟的：enqueue 時會做 payload safety check、計算 payloadHash、建立 clientMutationId、支援 compactKey、read-only workspace suppression、queued/syncing/failed/conflicted/synced 狀態、online flush、retry、manual recovery。

Flush 時，它會拿 access token，沒有 token 就停住；然後 POST `/api/v1/sync/operations`，用 `clientMutationId` 當 idempotency key，把 payloadHash、workspaceId、entityType、operationType 送給 server。

安全面也有基本防線：payload 超過大小會丟 `SYNC_PAYLOAD_TOO_LARGE`，payload 內疑似 secret 會丟 `SYNC_SECRET_DETECTED`；workspace snapshot 有更大的專用 size cap。

但 Store / Runtime 這邊有 compatibility 債。

第一，store 直接呼叫 `supabaseStateSyncManager`，而 sync manager 有些操作走 local queue，有些直接走 Supabase，有些走 Next API。workspace upsert/message/prompt/notebook 走 queue；macro save 直接 `.from("workflow_templates").insert`；artifact save 走 `/api/v1/artifacts`；fetch prompt/notebook 走 API；workspace session 先 API 後 Supabase RPC fallback。這會讓 store 的「sync intent」不一致。

第二，read-only suppression 發生在 local queue adapter，但 store 本身沒有一個 first-class read-only mutation result。queue 會把 read-only workspace operation 標成 compacted，錯誤碼 `WORKSPACE_READ_ONLY`；但 store action 多數是 fire-and-forget `.catch(() => undefined)` 或 console error。使用者可能以為已保存，但其實 operation 被 suppressed。

第三，compactKey policy 不在 store 層可見。prompt upsert、notebook upsert、workspace snapshot 可以 compact；message create 沒 compactKey，這是對的；prompt delete/notebook delete 也沒 compactKey，基本合理。但 store 需要明確表達 operation policy，否則未來有人新增 action 時會亂選 compactKey。

第四，workspace snapshot sync 是 debounce + single pending slot。`SupabaseStateSyncManager` 只有一個 `pendingWorkspaceSnapshotSync`，不是 per-workspace map。若短時間內多 workspace 觸發 snapshot sync，後者可能覆蓋前者。這是 P1，因為 NEXUS 支援多 workspace。

第五，local queue 在 IndexedDB store missing 時會 repair；若 retry 仍失敗，fallback 到 memory queue。這是安全 fallback，但意味著本 session 內 queued mutations 可能不再 durable。Store/UI 應該收到 degraded durability signal，而不是靜默。

---

## 6. Store slice / refactor proposal

我建議不要一次把 `nexus-store.ts` 拆爆。第一輪切五個 seam。

### Slice 1：`workspaceDocumentSlice`

保留：workspace CRUD、rename/import/export/recovery apply、agent spawn/duplicate/remove/profile/model/layout、graph connect/remove、theme/settings、checkpoint/macro instantiate。

輸出純 reducer，所有 cloud sync side effect 先不要直接寫在 reducer 裡，而是回傳 mutation event 或由 effect coordinator 訂閱。

### Slice 2：`workbenchUiSlice`

保留：selectedAgentId、viewMode、vault manager open、notebook windows、panel focus/minimize/maximize、transient import error、queue status projection。

這個 slice 可以 local persist 少量 UI preference，但不進 Supabase snapshot。

### Slice 3：`contentCacheSlice`

保留：promptsCache、notebooksCache、deletedNotebooksCache、notebookDrafts、artifactVault metadata、historicalMessages volatile cache。

這個 slice 要明確標記 `source: remote | optimistic | localDraft | tombstone | conflicted`。現在 merge remote/local 的邏輯散在 store helper，下一步應該變成可測的 cache reducer。

### Slice 4：`runtimeSlice`

保留：workflow runtime design-time graph 的 projected state、run summaries、node statuses、traceSync summaries、branchingStatus、tool statuses。

但真正執行移到 controller。runtimeSlice 只吃 event，不直接 call LLM/image/API。

### Slice 5：`syncCoordinator`

接管所有 `queueWorkspaceCloudSync`、`queueMessageCloudSync`、`queuePromptsCacheRefresh`、`queueNotebooksCacheRefresh`、workspace snapshot debounce、read-only suppression surface、transaction logger。

現在 store 檔案底部把 Supabase manager transaction logger 接回 store，這是反向依賴；未來應該由 coordinator 訂閱 sync manager，再 dispatch 到 transaction slice。

---

## 7. Persistence and local queue failure-mode matrix

第一種：initial rehydrate 前發生 mutation。  
現況：`setItem` 在 `initialStorageReadFinished` 前 return。  
風險：boot-time mutation UI 成功但未持久化。  
修法：加入 hydration gate；所有 boot mutation 等 rehydrate promise 完成後再執行。  
驗收：測試 rehydrate pending 時 create workspace/update agent，確認最後 IndexedDB 有寫入。

第二種：IndexedDB unavailable 或 repair failed。  
現況：queue fallback 到 memory queue，workspace persistence fallback 到 localStorage。  
風險：sync queue 不 durable；workspace state 可能碰 localStorage quota。  
修法：store 加 `localDurabilityStatus: durable | degraded | memoryOnly | quotaFailed`。  
驗收：mock idbSet failure，UI 顯示 degraded durability，且不宣稱 synced。

第三種：workspace snapshot 太大或含 secret。  
現況：local queue 會 throw `SYNC_PAYLOAD_TOO_LARGE` / `SYNC_SECRET_DETECTED`；workspace snapshot size cap 會 return failed transaction。  
風險：store 多數 catch 後吞掉或只記 transaction，使用者不知道 workspace 沒進 cloud recovery。  
修法：把 workspace snapshot failure 映射到 visible `syncIssues`.  
驗收：塞入 oversized notebook/runtime output，確認 UI 顯示 recovery fallback required。

第四種：read-only workspace mutation。  
現況：queue operation compacted，錯誤碼 `WORKSPACE_READ_ONLY`。  
風險：UI optimistic state 已改，但 durable sync 被 suppress。  
修法：read-only gating 要在 store action 前就阻擋 document mutation；或 mutation 變成本地 fork。  
驗收：read-only workspace 下 update prompt/notebook/workspace，確認 state 不被錯誤 optimistic mutate，或明確產生 local fork。

第五種：multi-workspace snapshot debounce overwrite。  
現況：`pendingWorkspaceSnapshotSync` 是 single slot。  
風險：A workspace pending snapshot 被 B workspace 覆蓋。  
修法：改成 `Map<workspaceId, PendingWorkspaceSnapshotSync>`，timer 也 per workspace。  
驗收：連續更新 A/B workspace，確認 queue 內兩個 workspace snapshot 都存在。

第六種：workflow run 中途切換 workspace。  
現況：node patch/update run 用 active workspace helper，trace sync 部分用 workspace id。  
風險：runtime patch 寫錯 workspace，或 queue sync 錯 active workspace。  
修法：runtime events 全部攜帶 `workspaceId`，store reducer 用 `withWorkspaceById`。  
驗收：run A workspace workflow，中途 switch B，確認 A 被 patch、B 不被污染。

---

## 8. Debt register：前三個最該處理

P1：Workflow runtime execution 寫在 Zustand action 裡，且部分更新依賴 active workspace。  
風險是 run 中途切 workspace/import/recovery 時 patch 錯對象，並且 runtime execution 很難單測。第一個修法是把 `runWorkflowRuntimeLiteFlow` 抽 controller，所有 state update 改成 workspaceId-scoped runtime events。

P1：Workspace snapshot sync 只有 single pending slot。  
多 workspace 情境下可能覆蓋 pending snapshot。修法是 per-workspace pending map + per-workspace debounce timer。

P1/P2：Persisted workspace 仍保留過多 runtime/history-like data。  
目前 local persistence 會保留 workflow runtime runs/nodeExecutions，只清 inline image data URL；message/memory 也仍 preserve full until durable projection/write route。短期可接受，長期會讓 IndexedDB 和 workspace snapshot 成為 execution log。修法是 runtime run summary 化、message active window 化、memory write route 完成後移出 workspace snapshot。

P2：Sync side effects 不一致。  
有些走 local queue，有些直接 Supabase，有些走 API，有些 fallback RPC。這不一定錯，但 store action 不應該知道這些路徑。修法是統一成 `syncCoordinator.enqueue(intent)`，讓 intent policy 決定 queue/API/direct read。

P2：Undo stack 邊界還不夠硬。  
現在 runtime data 有清理，但 `workspaces` 本身仍可能把 messages/runtime payload 帶進 temporal history，且 selection/view/focus 是否進 undo 未定義。修法是 temporal state 改成 explicit document-only projection。

---

## 9. 第一個 PR 應該怎麼切

我不建議第一個 PR 直接重構整個 store。第一個 PR 應該只做「不改產品行為的邊界硬化」。

PR 1：建立 `workspaceDocumentProjection.ts`。  
把 `prepareWorkspacesForTemporalState`、`temporalWorkspaceSignature`、`prepareWorkspacesForLocalPersistence` 周邊搬出來，新增 tests，明確驗證 message append、runtime run update、traceSync update 不會進 temporal signature。

PR 2：修 workspace snapshot pending single slot。  
把 `pendingWorkspaceSnapshotSync` 改成 Map，timer 也改成 Map。這個風險高但範圍小，驗收清楚。

PR 3：建立 `workflowRuntimeController` skeleton。  
先不改 runner，只把 `runWorkflowRuntimeLiteFlow` 裡的 workspaceId-scoped update 函數抽出，將所有 patch/updateRun/traceSync 改用 `withWorkspaceById`，避免 active workspace race。

PR 4：加入 `localDurabilityStatus` / `syncIssues` projection。  
不要讓 queue/read-only/oversize/secret/degraded IndexedDB 只存在 console 或 transaction log。先能看見，再談修復。

總結：Store / Runtime 最大債務不是「Zustand 太大」這麼簡單，而是 source of truth 邊界沒有定死。我的判斷是：`workspaces` 應該只代表 active document；`contentCache` 應該是 optimistic/remote cache；`runtime` 應該是 controller-driven projection；`sync` 應該是 intent coordinator；`persistence` 應該按 document/draft/recovery 分層。這五條線切出來後，後面任何子代理才有辦法安全改。


---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
| 問題 | 修復 | 檔案 |
|---|---|---|
| Message 無上限累積 → OOM (Section 1) | `addMessage` 自動 `.slice(-80)` | `nexus-store.ts` |
| reasoningContent 無上限 → OOM (Section 3) | `appendReasoningToMessage` cap 8192 chars | `nexus-store.ts` |

### 仍待處理
- P1: Zundo undo stack 存完整 workspace 含 messages (Section 3)
- P1: reasoningContent 仍寫入 IndexedDB/zundo persist (Section 3)
- P2: Ephemeral UI state 混在 document state (Section 1)
- P2: Workflow runtime 在 store action 內同步執行 (Section 4)
