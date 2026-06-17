# Sync / Durability / Offline 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---

第五個：Sync / Durability / Offline 子代理。

這個子代理專門審查「使用者做了動作之後，資料到底有沒有可靠保存」。它跨越 frontend store、IndexedDB local queue、Next API、Supabase sync_operations、workspace snapshots、cloud recovery。它不是 Store 子代理的重複；Store 子代理管 state ownership，這個子代理管 durability protocol。

第一步要畫完整同步資料流。至少要覆蓋：workspace snapshot save、message insert、artifact save/fetch、prompt upsert/delete、notebook upsert/delete、macro save/fetch、workspace recovery、runtime output persistence。每條資料流都要標出是走 direct Supabase、Next API、local sync queue、REST RPC，還是 browser IndexedDB。現在已知 SupabaseStateSyncManager 同時混用多種路徑：macro 直接 Supabase insert，artifact 走 /api/v1/artifacts，prompt/notebook 寫入走 local queue，recovery 走 API，prompt revisions 又直接 Supabase select。這就是此子代理要拆清楚的核心債務。

第二步要審查 local sync queue protocol。local queue 有 IndexedDB store、payload hash、secret detection、compactKey、read-only suppression、online flush、retry、failed 狀態、idempotency key。這設計是強的，但也代表有很多 failure mode。子代理要檢查：同一 entity 多次 update 是否會被安全 compact；delete 是否永遠不該被 update compact 掉；payloadHash 是否能防止同 key 不同 body；secret detection false positive 時 UI 怎麼恢復；local queue corruption repair 是否會不小心丟資料。

第三步要審查 server-side sync operation contract。/api/v1/sync/operations 是目前標準路線：它走 apiHandler、開 idempotency、有 permission action workspace.update、有 workspaceId resolver、有 validator。子代理要檢查 validator 是否只做 shape validation，還是有 domain validation；payload.entityType / operationType 是否有白名單；baseVersion / remoteVersion / conflict_summary 是否真的被使用；server 是否能處理 duplicate、replay、lease timeout、cancelled、compacted、failed retry。

第四步要做 recovery correctness 審查。workspace recovery 不能只看「能不能載入」，而要看「載入哪一份、如何判斷新舊、如何避免覆蓋本地未同步變更」。子代理要模擬：使用者離線改 workspace，登入後 cloud 有較舊 snapshot；使用者在兩台裝置同時改；local queue 有 failed operations；read-only workspace 被 suppress；import workspace 後立刻 sync；auth session expired 後再恢復。NexusOps 目前有 login recovery、cloud session linking、recovery list/state fetch、apply recovery，這是正確但高風險的流程，必須測 race。

第五步要審查 artifact/message durability。NEXUS 是多 agent IDE，訊息與 artifact 是主要產物。子代理要確認：streaming output message 何時 persist；artifact 何時成為 durable record；generated image/video/mock preview 如何標記 status；artifact root/parent/version 是否能支援 branch；message content_hash 是否足以去重；source_task_id/source_tool_run_id 是否能追 runtime provenance。Streaming v1 已經有 task output persistence 與 usage ledger，但 workflow-lite 有 in-memory / skip persistence 的特殊路徑，這一定要明確列出產品語義。

第六步要建立 durability test matrix。不能只靠單元測試，至少要有 protocol tests：offline enqueue → reload → flush；same idempotency key replay；payload too large；secret payload blocked；read-only workspace mutation suppressed；server 500 retry；permission denied permanent fail；network abort during stream；workspace recovery conflict；IndexedDB unavailable fallback localStorage。這些測試要對應 check:output-durability 和黑箱 protocol checks，而不是散在 UI test 裡。package scripts 已經有 check:blackbox-protocols、check:output-durability、check:schema-live，所以這個子代理要把現有 checks 和缺口對齊。

這個子代理最後要輸出：sync flow map、operation semantic table、local queue failure-mode matrix、recovery conflict policy、durability test plan。它的最終目標是定義一句話：NEXUS 對每一種使用者產物的保存承諾是什麼。沒有這句話，後面所有 sync 修補都會變成局部補洞

我現在以第五子代理身份給你第一輪實查結果。結論先講：NEXUS 已經有一個相當完整的 durability protocol 雛形，但目前最大的技術債不是「沒有同步系統」，而是「同一類使用者產物走多條保存路徑，保存承諾不一致」。local queue、Next API、direct Supabase、server-side streaming persistence、workspace recovery 都存在，但還沒有被收斂成一套清楚的 product-level durability contract。

我會把這輪審查結果分成五份：sync flow map、operation semantic table、local queue failure matrix、recovery conflict policy、durability test plan。

## 0. 總判斷

目前同步層的好消息是：程式已經明確承認 Zustand 不應該承擔歷史資料與 backend durability。`state-sync.ts` 註解寫得很清楚：這個 module 是 active Zustand UI cache 與 L4 backend 的橋，Zustand 應該專注 active UI interaction state，historical Messages / Artifacts 要走後端 slots。這個方向是對的。

但實作上現在是五條路並存：

一條是 local sync queue → `/api/v1/sync/operations` → server applier → Supabase。

一條是 direct Next API，例如 artifact create/list 走 `/api/v1/artifacts`。

一條是 direct Supabase，例如 macro 寫入 `workflow_templates`，prompt revisions 直接查 `prompt_revisions`。

一條是 workspace snapshot 的 debounce enqueue，再由 local queue 送 server。

一條是 streaming runtime 在 server 端直接 persist output message，workflow runtime lite 又故意跳過 durable output message persist。

這些都各自合理，但合起來造成一個問題：使用者很難知道「我剛做的動作到底是 durable、queued、best effort、server-only、local-only，還是根本沒有保存」。

我會把這個列為 P1 架構債。某些點已經接近 P0/P1 資料遺失風險，下面會標。

---

## 1. Sync flow map

| 使用者產物 / 操作 | 現在路徑 | Durable 狀態 | 主要風險 |

| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------: | ---------------------------------------------------------------------------------------------- |

| Workspace snapshot save | `syncActiveUiState()` → debounce → local queue → `/api/v1/sync/operations` → `WorkspaceStateService.saveState()` | 中高 | 有 checksum conflict 保護，但 client 會在「只成功 enqueue」後更新 cloud checksum cache，可能導致後續 baseChecksum 錯誤 |

| Workspace upsert | local queue → sync operation | 中 | 只是 queue operation，是否真的落 DB 要看 flush 狀態 |

| Message insert / historical message | local queue → sync operation → `MessageHistoryService.upsertMessage()` | 中高 | 有 content hash/id conflict，但 active UI message 與 server stream output message 可能有雙路徑語義 |

| Artifact save/fetch | `/api/v1/artifacts` direct API | 中 | 有 idempotency 與 artifact service，但沒有 local offline queue；離線建立 artifact 會失敗而不是 pending |

| Historical artifact sync | `syncHistoricalArtifact()` 直接 `return synced()` | 低 | 這是明確 durability hole：呼叫者會以為已保存，實際沒有保存 |

| Prompt fetch | `/api/v1/prompts` | 中 | read path API 化 |

| Prompt upsert/delete | local queue → sync operation → prompt applier | 中高 | 有 payload identity validation；delete 不 compact upsert，順序語義要明定 |

| Prompt revisions fetch | direct Supabase `prompt_revisions` select | 中低 | read path 繞過 API contract，依賴 RLS 正確性 |

| Notebook fetch | `/api/v1/notebooks` | 中 | read path API 化 |

| Notebook upsert/delete | local queue → sync operation → notebook applier | 中高 | delete tombstone payload 有 created_at/deleted_at，但順序與 retry policy 要補測 |

| Macro save/fetch | direct Supabase `workflow_templates` insert/select | 低中 | 沒有 local queue、沒有 idempotency、payload 未帶 workspace_id/created_by；離線或失敗沒有 replay |

| Workspace recovery | `/api/v1/workspaces/recovery*` → latest/list/explicit workspace recovery | 中高 | 有 hydration plan，但沒有納入 local queue pending/failed 狀態 |

| Runtime output persistence | v1 agent stream server-side `persistTaskOutputMessage()` before `completeTask()` | 高 | 一般 stream 正確；workflow runtime lite 特意 skip persist，要產品語義明確 |

| Usage ledger | server stream success/failure insert | 中高 | 有 success/failure ledger，但 persistence failure 與 charging ordering 要持續測 |

具體證據如下。

Workspace、message、prompt、notebook 都會 enqueue local sync queue；macro 則直接 `.from("workflow_templates").insert(...)`；artifact 走 `/api/v1/artifacts`；prompt revisions 直接 `.from("prompt_revisions").select(...)`。這就是目前 mixed persistence path 的核心。

Workspace snapshot 會先取 remote checksum、serialize snapshot、計算 payload size、計算 checksum，然後 debounce 後 enqueue 一個 `workspace:snapshot` operation。

Artifact service 比較成熟：create 時會 materialize content、寫 contentHash/contentSize/sourceMessage/sourceTask/sourceToolRun/root/parent/version/status，並支援 version/reference/archive。這一層的 provenance 設計是好的。

Message service 也比一般 demo 紮實：upsert 時會算 content hash；如果同 id 已存在但 workspace、agent、role、content hash 不同，會發出 conflict 並丟 `SYNC_CONFLICT`。

但 `syncHistoricalArtifact()` 目前是空實作，直接回 `synced()`。這是第一個我會標 P1 的 durability 假成功。

---

## 2. Operation semantic table

目前 `/api/v1/sync/operations` 是標準同步入口。它用 `apiHandler`，開 idempotency，permission action 是 `workspace.update`，workspaceId 從 body resolver 取，並有 validator。這是正確方向。

但 validator 只做基本 shape validation：確認 `clientMutationId`、`workspaceId`、`entityType`、`entityId`、`operationType` 是非空字串，payload 是 object，`baseVersion`/`payloadHash` 型別正確。真正 domain whitelist 和 payload identity validation 放在 service/applier。

| entityType | operationType | Server applier 行為 | 現狀判斷 |

| ------------------------- | --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |

| workspace | snapshot | validate snapshot payload → `workspaceStateService.saveState()` | 可接受，但 checksum cache 有 client-side bug 風險 |

| workspace | upsert | constants 允許，但 applier 沒看到 workspace upsert branch | P1：client 會 enqueue，server 可能 unsupported/queued/fail，語義不清 |

| message | create/update/upsert | validate message payload identity + role → `upsertMessage()` | 可接受 |

| message | delete | constants 允許，但 applier 不支援 message delete | P2/P1：要明確禁止或補實作 |

| prompt | create/update/upsert/delete | validate identity → prompt service | 可接受 |

| notebook | create/update/upsert/delete | validate identity → notebook service | 可接受 |

| agent | any | 回 `{ status: "queued" }` | P1：會永遠 queued 嗎？需要 worker/consumer 或禁止 |

| artifact_reference | any | service 明確拒絕，要求走 artifact governed route | 可接受 |

| artifact | 不在 sync constants | artifact 另走 API | 可接受，但離線語義缺失 |

| workflow_template / macro | 不在 sync constants | direct Supabase | P1：不在 durability protocol 內 |

Sync constants 允許 `workspace`, `agent`, `message`, `prompt`, `notebook`, `artifact_reference`，operation type 允許 create/update/delete/upsert/patch/reorder/snapshot；但 applier 實際只完整處理 workspace snapshot、notebook、message create/update/upsert、prompt、agent queued、artifact_reference rejected。

這裡我會開一個 P1 debt：**Sync operation constants 與 applier 實際支援範圍不一致**。現在 client 可以送出看似合法、但沒有 durable apply path 的 operation，例如 `workspace upsert`、`agent update`、`message delete`。修法是把 `entityType + operationType` 改成 server-side support matrix，不是兩個獨立 enum。

---

## 3. Local sync queue failure-mode matrix

local queue 的設計比普通 offline queue 強很多。它有 IndexedDB storage、payload hash、secret detection、payload size cap、compactKey、read-only workspace suppression、online flush、retry、failed/conflicted 狀態，以及 idempotency key。

server 端也會重算 payload hash；如果同一 clientMutationId 已存在但 payload hash 不同，會回 conflict；如果 client payloadHash 與 server canonical hash 不一致，也會回 `SYNC_OPERATION_CONFLICT`。這點正確。

但 failure mode 有幾個明顯缺口：

| Failure mode | 現在行為 | 風險 | 嚴重度 | 修法 |

| -------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------: | ----: | --------------------------------------------------- |

| 同 entity 多次 update | same compactKey + same op type 會 compact 未 synced/compacted 的舊 operation | 大致正確 | P2 | 補測 update/update、snapshot/snapshot |

| delete 被 update compact | 不會，因為 compact 條件要求 operationType 相同 | 正確 | P3 | 補測 delete 不被 upsert compact |

| workspace snapshot failed/conflicted 被新 snapshot compact | snapshot 有 `compactTerminal`，會 compact failed/conflicted | 危險但可能是刻意設計 | P1 | 只有在 recovery plan 接受後才能 compact conflicted snapshot |

| read-only workspace mutation | operation 被標 compacted + error code | 使用者可能不知道資料沒保存 | P1 | UI 必須顯示 read-only suppressed count |

| no access token | flush 直接 return，不標 failed | 合理但 queue 可長期沉默 | P2 | UI 顯示 “auth required to flush” |

| server 500 | local operation 標 failed | 正確 | P2 | 但 retry 目前是人工或 future flush，不尊重 nextRetryAt |

| server retrying | local map 到 retrying | 可能不會按 nextRetryAt 自動排程 | P1 | local queue 要根據 `nextRetryAt` schedule flush |

| IndexedDB missing object store | repair 會刪 sync queue DB，回空 queue | 可能丟 pending operations | P1/P0 | repair 前嘗試讀舊 key/備份；失敗要暴露 “queue lost” |

| IndexedDB 不可用 | fallback memoryStorage | reload 後 pending queue 消失 | P1 | fallback 應改 localStorage 或明確標 volatile |

| secret false positive | enqueue throw `SYNC_SECRET_DETECTED` | 使用者產物不會保存 | P1 | UI 提供 blocked field/path 與 export/retry path |

| payload too large | enqueue throw `SYNC_PAYLOAD_TOO_LARGE` | snapshot/notebook 可能無 durable copy | P1 | 提供 manual export/recovery artifact |

| same idempotency key different body | server 409 | 正確 | P3 | 補 contract test |

其中我最在意三個問題。

第一，workspace snapshot enqueue 成功後，client 就把 `lastCloudSnapshotChecksums` 設成 pending checksum，但這時只是 local queue 收下，不代表 server 已經保存。 如果後續 flush 失敗或 conflict，client 端 baseChecksum cache 已經提前前進。下一次 snapshot 會拿一個「雲端其實沒有」的 checksum 當 base，導致 false conflict 或錯誤 compact。這是 P1，嚴重時會變成 P0 資料保存語義錯誤。

修法：`lastCloudSnapshotChecksums.set(workspaceId, checksum)` 只能在 server 回 `synced` 且 remoteVersion/checksum 確認後做。local enqueue 成功只能更新 `lastQueuedSnapshotChecksum`，不能更新 cloud base。

第二，local queue repair 看到 missing object store 會 delete local sync queue DB 並把 memory queue 設空。程式註解說 workspace data untouched，但 sync queue 裡本來就可能有 prompt/notebook/message/snapshot pending operation，所以這不是無害 repair。

修法：repair 前先嘗試備份 raw DB/key；repair 後建立一個 local diagnostic event；至少 UI 要提示「有 pending sync queue lost risk」。更理想是 queue 存兩層：IndexedDB primary + localStorage compacted manifest。

第三，server 有 `retrying` 和 `nextRetryAt`，但 local drain 只抓 queued/retrying active operation 並逐個 flush；local 端沒有根據 `nextRetryAt` 排程下一次 flush。 server 端有 retry delay calculation。

修法：local queue `getStatus()` 要暴露 nextRetryAt；`patchOperation(retrying)` 後要 schedule flush 到 nextRetryAt；flush 時若 retrying 且 nextRetryAt 未到，不應送。

---

## 4. Server-side sync contract

server-side contract 的基礎是好的。`SyncQueueService.createOperation()` 會 normalize entity/operation、拒絕 artifact_reference、檢查 payload safe、重算 payload hash、查 idempotent existing operation、偵測 hash conflict、insert operation，然後 inline apply。

server 還會做 secret scan 和 payload size cap；workspace snapshot 用更大的 640KB cap，一般 payload 是 128KB。

但這層有兩個 contract gap。

第一，`SyncConflictResolver.detectConflict()` 支援 `remoteVersion` / `remotePayloadHash`，但 `createOperation()` 呼叫時只傳了 `baseVersion` 和 `payloadHash`，沒有傳 remoteVersion，也沒有按 entity 查 remote current version。 所以 createOperation 階段的 generic conflict resolver 實際上幾乎不會偵測 conflict。真正 workspace conflict 是在 `WorkspaceStateService.saveState()` 用 `baseChecksum` vs latest remote checksum 擋。 Prompt/notebook/message 則各自靠 service identity/content conflict，不是靠 sync conflict resolver。

這不一定錯，但 product contract 要改名：現在不是 generic sync conflict resolver，而是 “workspace snapshot conflict + message id conflict + service-specific validation”。

第二，repository 的 `markSyncingWithLease()` 會設 locked_at / lease_expires_at，但目前是 read current attempt count 然後 update，沒有看到以 `lease_expires_at < now` 或 current status 作為 DB atomic guard。 在 inline apply 模式下風險較小，但如果之後真的有 background worker，就會有雙 worker lease race。

修法：如果未來要 background worker，`markSyncingWithLease` 必須是 single SQL update with condition：`where id = ? and status in ('queued','retrying') and (lease_expires_at is null or lease_expires_at < now()) returning *`。

---

## 5. Recovery correctness policy

目前 recovery 設計方向是對的：server 會找 user latest snapshot，建立 hydration plan；如果 local checksum 等於 cloud checksum 就 skip；如果 localUpdatedAt 比 cloudUpdatedAt 新，就 conflict；如果 local missing/recover/explicit_restore/workspace_switch，就 hydrate。

但 recovery policy 還缺一個關鍵輸入：local queue 狀態。

現在 recovery API 接收 localChecksum、localUpdatedAt、localWorkspaceId。 這可以判斷本地 snapshot 新不新，但不能判斷「本地有沒有 pending/failed/conflicted operations」。如果本地 queue 裡有 prompt update、notebook delete、message insert、workspace snapshot conflict，recovery hydrate 可能覆蓋 active UI，讓使用者以為雲端版本是權威，但其實本地還有未保存產物。

我建議 recovery policy 改成五態：

1. `safe_skip`：checksum match。

2. `safe_hydrate`：local missing/corrupt，且 local queue 沒有 pending/failed/conflicted。

3. `manual_conflict`：local newer than cloud。

4. `queue_blocked_hydration`：cloud newer，但 local queue 有 pending/failed/conflicted。這時不能自動 hydrate，必須先讓使用者選：flush queue、export local、discard local queue、restore cloud。

5. `explicit_restore`：使用者明確選定 cloud snapshot，才允許 compact workspace snapshot conflict。

目前 `recoverIssue()` 對 workspace snapshot failed/conflicted 會 compact 一批 issue，這要跟 explicit restore 綁在一起，不能只是一般 manual recovery click 就吃掉。

---

## 6. Artifact / message durability

這一段我分開講，因為 NEXUS 的主要產物就是 message 和 artifact。

一般 v1 streaming 的 durability 做得不錯：stream 開始前會 prepare task；第一 token 會記 runtime event；stream 結束後，非 workflow runtime lite 會先 `persistTaskOutputMessage()`，再 `completeTask()`，然後記 usage ledger。

`persistTaskOutputMessage()` 會把 output message id 設成 task.outputMessageId 或 `message_${task.id}`，role 是 assistant，metadata 含 model/provider/source，taskId 寫入 message。

而且 repo 已經有 static scan 保護這件事：`generated-output-durability-scan.mjs` 檢查 persist 必須在 completeTask 前、persistence failure 要讓 task fail、upsert shape 要包含 assistant role、taskId、workspaceId 等。

但 workflow runtime lite 是例外。agent stream service 裡 `if (!isWorkflowRuntimeLite) await persistTaskOutputMessage(...)`，workflow runtime lite 會送 `X-Nexus-Workflow-Runtime: lite` 和 `outputMessageId = runId:nodeId:output`，但 server 不 persist durable output message。

這不一定是 bug，因為 workflow runtime lite 可能把 output 作為 runtime packet，而不是歷史 message。但必須在 product contract 寫清楚：

一般 agent chat stream：完成後 assistant output message 是 durable server record。

Workflow runtime lite LLM node：output 是 workflow runtime result，不保證自動成為 durable message，除非 workflow run/artifact layer 另行保存。

現在檢查腳本有意識地保護 workflow runtime output id/header，但這比較像 static shape check，不是完整 protocol test。

---

## 7. Durability test plan

package scripts 已經有 `check:blackbox-protocols`、`check:output-durability`、`check:schema-live`，而 `npm run check` 會串 preflight、schema-live、auth-boundary、output-durability、lint、typecheck、test、build。這是好的 baseline。

但第五子代理建議新增或強化這些 tests：

| Test | 類型 | 目前風險 |

| ----------------------------------------------------- | -------------------------- | --------------------------------------------------------- |

| offline enqueue → reload → flush | local queue integration | 確認 IndexedDB persistence 不丟 queue |

| IndexedDB unavailable → reload | local queue browser test | 現在 memory fallback 可能 reload 丟資料 |

| missing object store repair with pending operations | local queue migration test | repair 會清空 queue |

| same idempotency key / same body replay | API contract | 應 deduplicated |

| same idempotency key / different body replay | API contract | 應 409 conflict |

| payloadHash mismatch | API contract | 應 409 |

| secret payload blocked | local + server | local blocked、server blocked 都要測 |

| payload too large standard vs workspace snapshot | local + server | 128KB/640KB cap 要一致 |

| read-only workspace mutation suppressed | UI/protocol | UI 必須顯示未保存 |

| workspace snapshot enqueue success but server failure | protocol | 不可更新 cloud checksum cache |

| retrying with nextRetryAt | local queue | 不應立即重試，也不能永遠不重試 |

| prompt delete followed by upsert | semantic | 要明確是 resurrect 還是 tombstone wins |

| notebook upsert then delete compact/order | semantic | delete 不應被 update 吃掉 |

| workspace recovery with pending queue | recovery | 不可 silent hydrate |

| workspace recovery with local newer | recovery | 必須 conflict |

| stream provider abort before first token | runtime | task failed/cancelled 語義 |

| stream network abort after partial token | runtime | 是否 persist partial？現在 abort cancel，不 persist；要寫入 contract |

| output persistence failure | runtime | task 必須 fail，static scan 已守，還要 runtime test |

| workflow runtime lite stream success | runtime | output 不 persist message，要測它是 intentional |

| artifact create offline | product | 目前沒有 queue，要顯示 failed/not saved |

| macro save offline | product | 目前 direct Supabase，沒有 retry |

我會把 `check:output-durability` 從 static scan 擴成兩層：static guard 保留，新增 protocol tests。Static scan 現在很有價值，但它是字串掃描，例如檢查 `persistTaskOutputMessage` 的相對位置與欄位存在；它不能替代「server 真的在 persistence failure 時 fail task」的行為測試。

---

## 8. 技術債清單，按優先級

P1：`syncHistoricalArtifact()` 假成功。它現在沒有保存任何 artifact，但回 `synced()`。這會污染使用者對 durability 的信任。修法：要嘛接 artifact API/local queue，要嘛改成 explicit unsupported。

P1：workspace snapshot cloud checksum cache 提前更新。enqueue local queue 不等於 cloud saved。修法：只有 server synced/remoteVersion 確認後才能更新 `lastCloudSnapshotChecksums`。

P1：sync constants 和 applier support matrix 不一致。修法：建立 `SUPPORTED_SYNC_OPERATIONS`，validator 直接拒絕 unsupported entity+operation，不讓它進 queue。

P1：macro 不在 durability protocol 裡。它 direct Supabase insert/select，沒有 workspace/user/idempotency/offline/retry。修法：新增 `/api/v1/workflow-templates` 或納入 sync operation。

P1：artifact create 沒有 offline queue。對多 agent IDE 來說 artifact 是主要產物，離線時不能只是失敗。修法：至少提供 local draft artifact queue，或明確顯示 “not saved”。

P1：local queue IndexedDB repair 可能丟 pending sync operations。修法：repair 前備份、repair 後警示，或雙寫 manifest。

P1：recovery plan 未納入 local queue pending/failed/conflicted。修法：recovery request/plan 要帶 local queue summary，cloud hydrate 前必須處理 queue。

P2：retrying/nextRetryAt 沒有 local schedule 語義。修法：local queue 根據 server nextRetryAt 排程，而不是只靠 online/enqueue。

P2：prompt revisions direct Supabase read path。修法：要嘛改 API，要嘛明確標成 read-only direct Supabase path 並由 RLS/security 子代理保證。

P2：workflow runtime lite output durability 語義需要文件化。修法：明確說 workflow-lite output 是 runtime output，不自動寫 durable message；或者補 workflow run/artifact persistence。

---

## 9. 我給 NEXUS 的保存承諾定義

現在我會把 NEXUS 的 durability contract 定義成這句話：

**NEXUS 應保證每個使用者產物在 UI 上只能處於四種明確狀態之一：`durable`、`queued_for_durable_sync`、`blocked_with_recoverable_reason`、`volatile_runtime_only`；任何沒有真正保存的路徑，都不能回報成 synced。**

套到目前產品：

Workspace snapshot：應是 `queued_for_durable_sync`，server synced 後才是 `durable`。

Message：local UI message 是 `queued_for_durable_sync`；server stream output message完成後是 `durable`。

Artifact：現在 direct API 成功才是 `durable`；失敗不可假裝 queued，除非補 local artifact queue。

Prompt/notebook：是 `queued_for_durable_sync`，server synced 後 durable。

Macro：目前只能算 best-effort direct write；需要改成 durable API 或 sync operation。

Workflow runtime lite LLM output：目前應標 `volatile_runtime_only` 或 `workflow_run_scoped_output`，不能和 durable message 混淆。

Memory compression output：根據現有 scan 的設計，目前應保持 `needs_memory_write_route`，也就是 lifecycle-only，不可宣稱完成 durable memory write。

這就是第五子代理的核心結論：NEXUS 不缺保存機制，缺的是一致的保存語義。下一步應該先修假成功與 checksum cache，再把所有產物統一標上 durability state，否則後面任何 offline/recovery 修補都會變成局部補洞。



---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
無直接修復 — V29 聚焦在 gateway connectivity 和 crash 修復，sync 層未變動。

### 仍待處理
- P1: Macro save 無 local queue/idempotency (Section 1)
- P1: Artifact 無離線 queue (Section 1)
- P1: `syncHistoricalArtifact()` 是 no-op (Section 1)
