# Backend / API 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---

你現在要當第三代理
第三個：Backend / API 子代理。

它的任務是審查 API 邊界是否已經足夠一致、可測、可擴充，尤其是 auth、permission、idempotency、runtime persistence、usage/quota、legacy compatibility。這不是 Supabase RLS 那個 lane；這個子代理專注 Next.js backend 和 API contract。

第一步要建立 API inventory。至少要把 /api/agent-stream、/api/v1/sync/operations、artifact、prompt、notebook、workspace recovery、models、runtime/task 相關 route 全列出。每個 route 要標註：是否用 apiHandler、是否需要 auth、workspaceId 從哪裡來、permission action 是什麼、是否開 idempotency、是否有 validator、response envelope 是否一致、是否記錄 trace/event。已知 /api/v1/sync/operations 有 validator、permission、idempotency、workspaceId resolver；這是標準路線。

第二步要審查 apiHandler 作為統一邊界是否足夠。它現在處理 method check、JSON parse、workspaceId resolution、declared user id、auth resolution、permission check、mutation idempotency、success/failure envelope、API event emission。這是好方向，但子代理要查所有 route 是否都遵守；若有 route 繞過，就要判斷是合理例外還是技術債。尤其要看 legacy route、streaming route、model catalog route、webhook/edge-like route 是否有一致的 auth/error/trace 行為。

第三步要審查 auth boundary。resolveApiActor 會驗證 Supabase bearer session，且如果 X-User-Id 和 session user 不一致會拒絕，這是好的。auth-session.ts 也支援 Authorization bearer 或 Supabase cookie token，並用 Supabase anon client auth.getUser(token) 驗證。子代理要查的是：所有 mutation route 是否真的 required auth；有沒有只靠 header userId；cookie parsing 是否覆蓋目前 Supabase cookie 格式；server-side service role 是否被不當混用；測試是否涵蓋 spoofed workspace/user。

第四步要審查 streaming API 的 legacy/v1 分叉。/api/agent-stream 現在仍呼叫 createAgentStreamResponse，但 eventShape 是 "legacy"，agentId 固定 "legacy-agent"，而且 legacy branch 走 server env API key 或 mock stream。v1 branch 則要求 auth、product gate、quota、user NEW API token、runtime task、message persistence、usage ledger。這裡要非常小心，因為它可能是目前最大 backend API 債：legacy endpoint 是否仍被前端使用？是否繞過 product gate？production blocker blockLegacyToolRouteInProduction 到底擋什麼？legacy mode 是否應該被 deprecate、redirect、或只允許 dev/mock？

第五步要審查 runtime task persistence。v1 streaming 會 prepare stream task、mark first token、fallback used、complete/fail/cancel task、persist output message、record usage ledger。這是非常關鍵的 runtime contract。子代理要驗證：如果 provider stream 中途 abort，task 狀態是否正確；如果 output persistence 失敗，usage ledger 是否仍記錄；如果 quota/product gate 失敗，是否有清楚錯誤事件；如果 workflow runtime lite 設 forceInMemoryRepository 並 skip permission check，是否真的只限內部 runtime，不會被外部濫用。

第六步要審查 idempotency 與 sync operation。apiHandler 對 mutation 預設要求 X-Idempotency-Key，/api/v1/sync/operations 也啟用 idempotency。local queue 用 clientMutationId 當 idempotency key，並送 payloadHash、workspaceId、entityType、operationType。子代理要查：payloadHash 是否在 server 再驗證；同 key 不同 body 是否正確 conflict；pending request replay 是否會造成 queue stuck；failed envelope 是否會被永久 replay；workspace permission check 發生在 idempotency 前或後是否符合安全預期。

這個子代理的輸出要包含：API route inventory；auth/permission/idempotency coverage table；legacy stream deprecation plan；runtime task state-machine audit；error envelope and trace consistency report；以及一份最小修復 PR plan。

三個子代理的整合方式也要設計好。Frontend 子代理不能只說「拆 component」，它要把拆分建議對齊 Store 子代理的 state ownership。Store 子代理不能只說「拆 slice」，它要對齊 Backend 子代理的 API contract。Backend 子代理不能只說「加 auth」，它要確認前端和 local queue 如何取得 token、如何處理 read-only、如何回報錯誤。

收到。我現在以「第三代理：Backend / API 子代理」身份輸出第一輪審查結果。這一輪是靜態讀 repo，不改碼、不跑 migration、不做 Supabase RLS 審查。我的重點是 Next.js API contract、auth/permission/idempotency/runtime/legacy 邊界。

總結先講：NEXUS 後端已經有一條很好的標準路線，就是 `apiHandler` + validator + workspace permission + idempotency + envelope + backend event；但目前仍有三類偏離：第一，SSE/AI routes 大量手寫；第二，legacy tool/provider routes 靠 production blocker，而不是正式 API contract；第三，runtime stream 有幾個狀態機和信任邊界風險，應該先修。

## 1. API route inventory：第一版清單

我把 route 先分成四組：標準 v1 資料 API、runtime/tool API、AI/provider API、legacy/admin/manual API。

|Route|Handler 邊界|Auth / Permission|Idempotency / Validator|初判|
|---|---|---|---|---|
|`POST /api/v1/sync/operations`|使用 `apiHandler`|`workspace.update`，request-scoped workspace permission|idempotency enabled；有 body validator；workspaceId 從 body 取|標準路線，可作為其他 mutation 參考。|
|`GET /api/v1/sync/status`|使用 `apiHandler`|`workspace.read`，request-scoped permission|GET 無 idempotency；workspaceId 從 query 取|基本正確，但 status 查詢是否應允許 `__global__` 要再定義。|
|`GET/POST /api/v1/artifacts`|使用 `apiHandler`|GET 是 `workspace.read`，POST 是 `workspace.update`，request-scoped permission|POST idempotency enabled；POST 有 validator|很接近理想模式。|
|`/api/v1/artifacts/[artifactId]/*`|多數用 route wrapper 再呼叫 `apiHandler`|read/update permission，含 `resourceId` artifactId|archive/version/reference POST 都有 idempotency + validator|邊界良好；建議抽通用 dynamic-route wrapper 減少重複。|
|`GET/PUT /api/v1/workspaces/[workspaceId]/state`|使用 `apiHandler`|GET read、PUT update，request-scoped permission|PUT idempotency enabled；PUT validator 檢查 schemaVersion/snapshot/baseChecksum/clientMutationId/snapshotType|這是 workspace snapshot 的標準路線。|
|`GET /api/v1/prompts`|使用 `apiHandler`|`auth.required: true`；route 層沒有 workspace permission，service/repo 內查 visible prompts|GET 無 idempotency|可接受，但和 artifacts/workspace 的 permission model 不一致，應明確標為 service-level membership check。|
|`GET /api/v1/notebooks`|使用 `apiHandler`|`auth.required: true`；route 層沒有 permission|GET 無 idempotency|同 prompts，應統一 route-level 或 service-level policy。|
|`GET /api/models`|手寫 route，不用 `apiHandler`|`resolveApiActor(required: true)`|無 envelope、無 api event|P2 contract drift。它是 read route，但 response/error 形狀不跟 v1 API 一致。|
|`POST /api/v1/agents/[agentId]/stream`|手寫 SSE route，不用 `apiHandler`|auth/product/permission 主要在 `createAgentStreamResponse` 內處理|無 mutation idempotency；手動 emit stream open event|SSE 可以不用一般 JSON envelope，但應有專用 `streamApiHandler`。|
|`POST /api/agent-stream`|legacy 手寫 route|production blocker；non-prod legacy stream 不走正式 auth/quota|無 validator/idempotency；legacy event shape|P1 legacy 債。production 404 是好事，但非 prod/preview 語義仍要收斂。|
|`POST /api/v1/agents/[agentId]/tasks`|使用 `apiHandler`|`workspace.update`，但目前用 module-scoped `createWorkspaceStatePermissionService()`|idempotency enabled；validator|P2/P1：runtime route 應加入 request-scoped permission scan。|
|`GET /api/v1/agents/[agentId]/tasks/[taskId]`|使用 `apiHandler`|`workspace.read`，module-scoped permission service|GET 無 idempotency|同上。|
|`POST /api/v1/agents/[agentId]/tasks/[taskId]/cancel`|使用 `apiHandler`|`workspace.update`，module-scoped permission service|idempotency enabled；validator|同上。|
|`POST /api/v1/agents/memory-compress`|使用 `apiHandler`|`auth.required: true`；product gate/quota/user token|idempotency enabled；validator|v1 化程度高，但 memory task 目前是 queued-only，不完成 runtime task，這要被文件化。|
|`POST /api/image-gen`|手寫 route|production 才強制 Supabase auth + workspace.update；非 production 可走 server key/mock|無 apiHandler envelope/idempotency|P2/P1：它是正式 production image route，但 contract 手寫。|
|`POST /api/predictive-intel`|手寫 route|production blocker；內部用 `resolveApiActor(required: true)` 和 product gate|無 apiHandler envelope；provider failure 可回 mock|P2 contract drift；應移到 v1 或明確 legacy。|
|`POST /api/v1/providers/verify`|手寫 route|production blocker；Authorization header 是 provider API key，不是 Supabase session|無 apiHandler envelope|P1 語義混淆：`Authorization` 同時被不同 route 當 session token / provider key。|
|`POST /api/workflow-pro/brain-draft`|手寫 route|`useModel=false` 可 deterministic 無 auth；`useModel!==false` 才 production block + model auth|無 apiHandler envelope|可接受為 special route，但要明確 split deterministic/local planner 與 model planner。|
|`/api/v1/tools/[toolId]/run`, `/api/v1/tool-runs/*`|使用 `apiHandler`|auth required；service 內 ToolPermissionGate 做 read/execute|mutation idempotency enabled；validator|方向好，permission 在 service 層，但 API inventory 應標明不是 route-level permission。|
|`/api/tools/fs-scanner`, `/api/tools/web-surfer`|legacy 手寫 route|production blocker；non-prod 無正式 auth|fs-scanner 有 sandbox；web-surfer 有 timeout/size limit|dev/local tool route，不能當 production API。|
|`/api/admin/new-api-token-*`|手寫 route|`resolvePlatformAdminActor`|無 apiHandler envelope/idempotency|admin exception 可接受，但應統一 error envelope/trace。|

另外，repo 已經有 `auth-boundary-scan.mjs` 會掃 `src/app/api/**/*.route.ts`，並特別列出 legacy production-blocked routes、formal image route、platform admin routes、request-scoped workspace permission routes。這是好防線，但 runtime task routes、models route、predictive-intel、workflow brain 等不完全被同一組規則覆蓋。

## 2. `apiHandler` 審查：方向正確，但 idempotency 有兩個高風險點

`apiHandler` 目前做了很多正確的事：method check、JSON parse、validator、workspaceId resolution、`X-User-Id` declaration、auth resolution、permission check、mutation idempotency、success/failure envelope、finally emit `api.v1.request`。這條邊界應該變成所有非 SSE v1 route 的預設標準。

第一個問題：idempotency key 目前不是 actor-scoped。repository 查詢是用 `workspace_id + idempotency_key`，`actor_user_id` 有存入 record，但 replay 判斷只比 `request_hash`，沒有比 actor。結果是同 workspace 兩個不同 user 如果重用相同 key 和相同 body，第二人可能拿到第一人的 response replay。這不是典型越權寫入，因為 permission check 發生在 idempotency 前；但它是 response replay / audit attribution 風險。

第二個問題：pending lock 沒有真正過期 takeover。程式定義 `PENDING_LOCK_MS = 2 * 60 * 1000`，但 `resolveExistingRecord` 在 pending 且 lock 超時後仍然回 `{ type: "pending" }`，沒有允許新 request 接管、重設 lock、或標記 stale failed。這會讓某些 mutation 在 24 小時 TTL 內持續 409 pending。

第三個問題較低階：failed response 會被 replay。`resolveExistingRecord` 對 `completed` 和 `failed` 都回 hit；這對 deterministic validation failure 合理，但對 provider timeout / transient infra failure 可能把已修好的請求困住 24 小時。建議在 idempotency record 裡區分 deterministic failure 與 retryable failure，或讓 retryable failure 不進 replay cache。

## 3. Auth boundary 審查：核心是好的，但 route 分層不一致

`resolveApiActor` 做對了兩件事：required route 會真的驗 Supabase session，而且如果 `X-User-Id` 和 session user 不一致會 401。這是防 spoof 的核心。

`auth-session.ts` 也比一般實作完整：它支援 `Authorization: Bearer`，也支援從 Supabase cookie 讀 access token；cookie parser 會處理 URL decode、`base64-` cookie、JSON object 的 `access_token`、以及 array 形式 token。最後用 Supabase anon client `auth.getUser(token)` 驗證。

現有測試也覆蓋了一批 spoof probes，包括 artifacts、feature flags、notebooks、observability events、prompts、sync operations、tool runs；它測無 auth + 偽造 `X-User-Id`、session user 與 `X-User-Id` 不一致、以及 verified session spoof workspace。這是很好的 regression suite。

但我會開三個技術債：

第一，runtime task routes 使用 module-scoped `createWorkspaceStatePermissionService()`，不像 artifacts/workspace/sync route 使用 `permissionServiceFactory: ({ request }) => createWorkspaceStatePermissionService({ request })`。在有 service-role config 時，兩者都可能走 admin membership check；但作為 API contract，workspace/session-sensitive route 應該一律 request-scoped，並加入 `auth-boundary-scan` allowlist。

第二，`/api/v1/providers/verify` 用 `Authorization` 承載 provider API key，而其他 v1/backend auth route 用 `Authorization` 承載 Supabase session。雖然它被 production blocker 擋住，但它仍在 `/api/v1` namespace，語義上容易讓前端或測試混淆。

第三，`/api/image-gen` 的 auth/permission 只在 production runtime 強制。非 production 可直接進 server key/mock path；這不一定錯，但它是 formal production route，不是 legacy route，所以應該用「明確 dev bypass」而不是散落在手寫 route 裡。

## 4. Streaming API：最大債務在 legacy/v1 分叉與 runtime-lite 信任

`/api/agent-stream` 是 legacy：固定 `agentId: "legacy-agent"`，`eventShape: "legacy"`，workspaceId 只從 header 來，而且只先跑 `blockLegacyToolRouteInProduction()`。production blocker 本身很簡單：production 或 Vercel production 就回 404。

v1 stream 是 `/api/v1/agents/[agentId]/stream`，它不走 `apiHandler`，但它有手動 requestId/traceId、呼叫 `createAgentStreamResponse(eventShape: "v1")`，並 emit `api.v1.stream.open`。SSE route 不走 JSON envelope 合理，但應該有專用 `streamApiHandler`，否則 auth、trace、error shape、close/fail event 都會繼續分叉。

v1 stream service 做了很多正確工作：它要求 `resolveApiActor(required: true)`，用 user plan/model catalog/quota gate，取 user NEW API token，建立 runtime task，provider stream 建立失敗時會 fail task 並記錄 failed usage。

但這裡有三個高優先級問題。

第一，`X-Nexus-Workflow-Runtime: lite` 是信任 header。service 只要看到這個 header 就設定 `isWorkflowRuntimeLite`，接著 `forceInMemoryRepository: true`，而且 `prepareStreamTask` 傳 `skipPermissionCheck: true`。也就是說，這個 header 目前看起來是 client-controllable 的 workspace permission bypass 開關。即使它只走 in-memory repository、不 persist output，也不應該讓外部 request 自行決定跳過 workspace permission。

第二，abort path 有 task 卡住風險。stream loop 中如果 `request.signal.aborted`，程式直接 `return`；這會進 finally close controller，但不會走 catch 裡的 `runtimeService.cancelTask(...)`。只有 thrown `AbortError` 才會 cancel task。結果是某些 client disconnect 可能留下 `streaming` task。

第三，成功輸出後的 usage ledger failure 可能污染 SSE 成功語義。現在流程是 persist output message、complete task、record usage、emit done；`recordAgentStreamUsage` 沒有 `.catch()`。如果 ledger insert 在 task completed 後失敗，catch 會嘗試 fail task；但 `failTask` 對 terminal task 會直接 return，然後 SSE 仍可能 emit error/done。這會讓「輸出已保存、task 已 completed」的請求在 client 看起來像 error。

## 5. Runtime task state-machine audit

目前 task state-machine 大致是：

`createTask` 驗 task type、require user、check workspace editor permission、create/reuse session、create task；`prepareStreamTask` 再把 task patch 成 `streaming`，append `stream_started`；stream 中可 append `first_token` 和 `fallback_used`；完成時 patch `completed`、append `stream_completed`、record usage metric；失敗時 patch `failed`、append `stream_failed`；cancel 時 patch `cancelled`。

這個模型的正面是：它已經有 session/task/event 三層，而且 metadata 會過 secret redaction/assertion，避免 runtime event 保存 secret。

但 runtime-lite 的 skip permission 必須先修。比較安全的 contract 應該是：「workflow runtime lite 可以選擇 in-memory repo、可以不 persist output，但不能跳過 workspace permission，除非 request 由 server-side signed internal token 證明」。如果 workflow runtime lite 是瀏覽器呼叫，就更不能信任 header。

Memory compression route 目前刻意只建立 queued task，metadata 明確寫 `queuedOnly: true`、`runtimeCompletion: "not_completed_by_task"`、`workerAvailable: false`。這很好，但要把它列入 runtime task state-machine 文件，避免未來有人誤以為 memory_compress task 應該 synchronous complete。

## 6. Idempotency 與 sync operation 審查

Sync operation 這條線做得不錯。server 會重新計算 payload hash；如果 client 送的 `payloadHash` 不等於 server canonical hash，直接 `SYNC_OPERATION_CONFLICT`；如果同 `clientMutationId` 已存在但 payload hash 不同，也 conflict；如果 entityType 是 `artifact_reference`，會要求走 governed artifact reference route，而不是 generic sync route。

Sync service 也會做 payload size check 和 secret scan；超過大小回 `SYNC_PAYLOAD_TOO_LARGE`，掃到 secret 回 `SYNC_SECRET_DETECTED`。這是很好的 backend-side safety boundary，不只靠前端 local queue。

但這裡還有一個 contract gap：API idempotency 用 header `X-Idempotency-Key`，sync domain idempotency 用 body `clientMutationId`。`/api/v1/sync/operations` 現在沒有強制兩者相等。前端 local queue 如果一直有紀律地用同一個值，問題不大；但作為 API contract，最好強制 `X-Idempotency-Key === body.clientMutationId`，或 server 在 mismatch 時 400，避免 API replay layer 和 sync operation layer 出現不同 dedupe key。

另一個問題是 idempotency pending stuck 會直接影響 local queue replay。`apiHandler` 遇到 pending 會 409 `IDEMPOTENCY_PENDING`；但 repository 不會在 lock 過期後 takeover，所以 client 可能一直 backoff 但無法恢復。

## 7. Error envelope / trace consistency report

標準 `apiHandler` route 會回 `createApiSuccess` / `createApiFailure` envelope，並在 finally emit `api.v1.request`。這很好。

不一致的地方主要在 manual route：

`/api/models` 回 `{ models, plan }` 或 `{ error, models: [] }`，沒有 `requestId/traceId/ok/schemaVersion`。

`/api/image-gen` 混合 `{ error: string }`、`{ error: { code, message, retryable } }`、以及 raw materialized image result。

`/api/predictive-intel` provider failure 會回 `{ mode: "mock", suggestions }`，而不是 error；這可能是產品設計，但 API contract 要明確標成 graceful fallback，不然前端無法區分「真的 mock 成功」和「provider failure」。

legacy stream 失敗時會把錯誤包成 token，例如 `[stream fault] ...`，不是 error event。這對舊 UI 可能相容，但不能再擴散到 v1。

## 8. Debt register：我會先開這些技術債

P1：`X-Nexus-Workflow-Runtime: lite` 目前作為跳過 workspace permission 的信任 header。修法是：不要讓該 header 單獨控制 `skipPermissionCheck`；至少仍做 workspace.update permission；如果真的要內部跳過，改成 server-signed internal runtime token。

P1：idempotency replay 不比 actor。修法是：`resolveExistingRecord` 必須檢查 `actor_user_id`，或把 actor 納入 unique key/fingerprint。

P1：pending idempotency 無 takeover。修法是：pending lock 超過 `PENDING_LOCK_MS` 時 allow takeover，更新 `locked_at/request_hash/request_fingerprint/status`，或標記 stale failed 後讓新請求重新 begin。

P1：stream abort 可能不 cancel task。修法是：把 `if (request.signal.aborted) return` 改成 throw/branch 到 shared cancel path，或在 finally 判斷未 terminal 且 signal aborted 就 cancel。

P1/P2：usage ledger failure 可污染 successful stream。修法是：完成 task 和 durable output 後，usage ledger insert 應 best-effort，或失敗只 emit observability warning，不應對 SSE client emit provider error。

P2：runtime task routes 使用 module-scoped permission service，且不在 auth-boundary scan 的 request-scoped route list。修法是：改成 `permissionServiceFactory: ({ request }) => createWorkspaceStatePermissionService({ request })`，並把 runtime routes 加入 scan。

P2：manual route envelope drift。修法是：為 non-SSE manual routes 建 `manualApiResponse` / `apiRouteError` helper，或遷移到 `apiHandler`；SSE route 建 `streamApiHandler`。受影響 route 包含 models、image-gen、predictive-intel、providers/verify、workflow brain、admin routes。

P2：legacy routes 還存在多條 non-prod callable provider/tool egress。production 404 是防線，但 deprecation plan 要明確，不然前端或測試會繼續依賴 legacy behavior。

## 9. Legacy stream deprecation plan

第一階段：加 telemetry。確認前端還有沒有呼叫 `/api/agent-stream`、`/api/memory-compress`、`/api/predictive-intel`、`/api/workflow-pro/brain-draft` 的 model path、`/api/v1/providers/verify`。現有 blocker list 已經列出這些 legacy/provider egress routes。

第二階段：frontend 全部改走 v1：chat 只走 `/api/v1/agents/[agentId]/stream`，memory compression 只走 `/api/v1/agents/memory-compress`，tool execution 只走 `/api/v1/tools/[toolId]/run` / `tool-runs/*`。

第三階段：legacy route 在 non-production 也需要顯式 env flag，例如 `NEXUS_ENABLE_LEGACY_DEV_ROUTES=true`，否則回 410 + migration route。現在 production blocker 是 404，適合防探測；dev/staging 則應讓錯誤可診斷。

第四階段：移除 legacy server env API key fallback。legacy stream 和 memory-compress 會讀 `NEW_API_KEY` / `OPENAI_API_KEY`，這和 v1 的 user NEW API token 模型衝突。

## 10. 最小修復 PR plan

我會拆成三個 PR，不混在一起。

PR 1：`apiHandler` / idempotency hardening。

內容：idempotency record 比對 actor；pending lock timeout 後 allow takeover；retryable failure 不做 24h replay 或標明 replay policy；`/api/v1/sync/operations` 強制 `X-Idempotency-Key === body.clientMutationId`。測試加：same workspace different actor same key same body 不可 replay；pending lock expired 可 takeover；sync header/body mismatch 400；retryable failed record 不永久堵 queue。

PR 2：stream/runtime state-machine hardening。

內容：`request.signal.aborted` 進 cancel path；success usage ledger 改 best-effort，不讓 completed task 變 client error；`X-Nexus-Workflow-Runtime: lite` 不再跳過 workspace permission，或改成 server-signed internal trust boundary；stream route 加 close/fail event。測試加：client abort 後 task status cancelled；ledger failure 後 SSE 仍 done 且 task completed；偽造 workflow-lite header 不能繞過 workspace.update permission。

PR 3：API inventory / contract normalization。

內容：新增 route inventory snapshot script，把每個 route 標出 `apiHandler/auth/permission/idempotency/validator/envelope/trace`；runtime task routes 改 request-scoped permission factory 並加入 auth-boundary-scan；`/api/models` 遷到 `apiHandler` 或使用 shared envelope helper；manual AI routes 加 `routeContract` 註解與統一 error helper；legacy routes 加 dev flag / 410 migration response。測試加：inventory snapshot；manual route error shape snapshot；legacy disabled by default in staging-like env。

## 11. 和 Frontend / Store 子代理的交界

Frontend 子代理需要停止依賴 legacy stream/token-fault 語義。v1 stream 的 client contract 應該是：先收 `meta`，再收 `token/reasoning`，最後收 `done`；若收 `error`，要看 taskId/requestId/traceId，而不是從 token 裡 parse `[stream fault]`。目前 v1 stream 已經會 emit meta/token/reasoning/error/done 類型。

Store / Runtime 子代理需要保證 local queue 對 mutation 一律送 `X-Idempotency-Key`，而且 sync operation 的 header key 應等於 `clientMutationId`。如果 server 回 `IDEMPOTENCY_PENDING`，store 不能無限熱重試；要根據 server retry policy backoff，超過 stale window 後給使用者可見的 recover action。

Backend 子代理不能只說「加 auth」。正確目標是：每條 API 都明確回答五件事：誰是 actor、workspaceId 從哪裡來、permission 在 route 層還是 service 層、mutation 是否 idempotent、失敗 shape 前端如何處理。NEXUS 已經有這條路線，現在要做的是把例外收斂成明確 contract，而不是讓例外繼續長大。


---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
| 問題 | 修復 | 檔案 |
|---|---|---|
| brain-draft production 被封鎖 (Section 1) | Whitelist `brain-draft` in production | `legacy-tool-route-boundary.ts` |
| brain-draft 缺 product gate | 加入 `resolveApiActor` + `getUserPlan` + `assertModelAllowedForPlan` + `isModelAllowedByPlan` | `brain-draft/route.ts` |
| brain-draft 缺 usage ledger | 成功/失敗皆寫 `brain_draft` sourceType | `brain-draft/route.ts` |
| brain-draft LLM output schema 不穩定 | `repairBrainReviewProposal()` — 自動補 schema/outputs.id/nodes.id | `brain-draft/route.ts` |
| agent-stream production 被封鎖 | Whitelist `agent-stream` | `legacy-tool-route-boundary.ts` |
| deepseek-v4-flash PERMISSION_DENIED | 加入 `allowedModelIds` 到 Basic/Pro/Team | `plan-config.ts` |
| 無 platform-managed provisioning | `POST /api/model-gateway/provision` | `model-gateway/provision/route.ts` |
| New API STREAMING_TIMEOUT 120s 太短 | 設為 600s + RELAY_TIMEOUT=600s | VPS `docker-compose.yml` |

### 仍待處理
- P1: Idempotency pending lock 24h no takeover (Section 2)
- P1: Stream abort 不 cancel task → orphan streaming tasks (Section 4)
- P1: `/api/models` 不走 apiHandler + envelope (Section 1)
- P2: `/api/agent-stream` legacy 路徑仍在 whitelist (Section 1)
