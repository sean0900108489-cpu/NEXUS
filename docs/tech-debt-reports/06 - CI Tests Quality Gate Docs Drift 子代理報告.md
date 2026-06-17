# CI / Tests / Quality Gate / Docs Drift 子代理 — 完整報告與執行指令

> 來源：nexus技術債整理.md · 自動分割產生 · 2026-06-17

---

第六個：CI / Tests / Quality Gate / Docs Drift 子代理。

這個子代理的任務是看 NEXUS 的品質閘門是否真的能擋住回歸。它不是單純補測試覆蓋率，而是要判斷目前的 check pipeline 是否對應真正風險：auth boundary、schema drift、API contract、output durability、legacy compatibility、frontend orchestration、runtime state machine、docs/product promise drift。

第一步要建立 quality gate inventory。從 package.json 看，現在已有 lint、typecheck、test、build，還有 check:preflight、check:schema-live、check:auth-boundary、check:auth-boundary:live、check:blackbox-protocols、check:output-durability，而 check 會串起 preflight、schema-live、auth-boundary、output-durability、lint、typecheck、test、build。這代表專案已經有意識在建立 production gate，不是零散測試。子代理要先盤點每個 script 實際檢查什麼、依賴什麼 env、是否能在 CI 穩定跑。

第二步要審查 test taxonomy。測試應該分成：pure unit、hook/component、API contract、DB live schema、RLS/security、sync protocol、runtime stream state machine、browser/workbench integration、docs drift。每一類都要有 owner、執行頻率、是否需要 Supabase live project、是否可在 PR 跑、是否只在 nightly 跑。現在 NEXUS 的風險不適合只用「unit/integration/e2e」三分法，因為大量問題會發生在 local queue ↔ API ↔ DB 的協議邊界。

第三步要審查 TypeScript 嚴格度。tsconfig 有 strict: true，這是好事；但也有 allowJs: true 和 skipLibCheck: true。子代理不能直接要求全關，因為那可能拖慢開發；它要先列出 JS 檔案是否還存在、any/unknown escape hatch 集中在哪裡、generated types 是否納入 Supabase schema、API response envelope 是否有共同型別。目標是建立「逐步收緊計畫」，不是一次炸掉 build。

第四步要做 API/schema drift gate。Supabase schema 很大，Next API 也在快速演進。子代理要確認 check:schema-live 是否能偵測：DB table/column missing、RLS policy missing、RPC signature drift、migration 未套用、generated TypeScript types 與實際 schema 不一致。它還要把 Backend 子代理的 API inventory 轉成 contract tests：每個 mutation route 都要檢查 auth required、permission required、idempotency behavior、error envelope、trace/request id。

第五步要做 docs drift 審查。README 描述的是產品承諾，不是裝飾品。它說 NEXUS 是 multi-agent AI IDE、支援 local/mock stream、OpenAI-compatible streaming、graph planner、workspace snapshots、media generation mock fallback 等。 子代理要逐項對照目前實作：哪些是已完成、哪些是 mock-only、哪些是 planned、哪些已經改變但文件未更新。前面已經看到一個可能 drift：README 說 STREAM 可顯示 MOCK/LIVE/MIXED，但 code 裡 resolveAgentsStreamMode() 直接回傳 "live"，這需要被列入 docs/product gate，而不是等使用者踩到才修。

第六步要做 regression hotspot map。依照近期 commits，NEXUS 最近在修 workspace panel/window responsive、scroll stage、floating composer、comfort surfaces，且先前有大型 UI refactor，例如抽出 1440 行的 settings sidebar。這表示 UI/workbench 邊界仍在劇烈變動。子代理要把最近高 churn 檔案列成 regression hotspots，為它們補 characterization tests：不一定馬上重構，但每次改動都要有防回歸測試。

第七步要審查 CI 可執行性。很多 live checks 需要 Supabase project、anon key、JWT、service role 或 fixture workspace。子代理要定義三層 CI：PR 必跑、main 必跑、manual/nightly 跑。PR 必跑應該快且 deterministic；main 可以跑 live schema/auth boundary；nightly 可以跑較慢的 blackbox protocol、advisor、RLS policy scanner。它也要定義失敗時的訊息格式，否則 check 失敗只會變成沒人看的紅燈。

這個子代理最後要輸出：quality gate inventory、test taxonomy、CI tiering plan、schema/API drift gate、docs drift register、regression hotspot test plan。它的目標不是「增加很多測試」，而是讓每一個測試都對應一個真實 production 風險我現在以第六子代理身份給第一輪實查報告。結論先講：NEXUS 已經有「品質閘門意識」，而且不是隨便補幾個 test；但現在 gate 還是偏「靜態字串掃描 + 少數關鍵回歸測試」，沒有完全把 live Supabase advisor、API contract drift、docs drift、CI 分層納入必擋範圍。

最重要的判斷是：目前 `npm run check` 能擋住一部分重大回歸，但還不能保證 production safety。

`package.json` 的主 check 會跑 `check:preflight`、`check:schema-live`、`check:auth-boundary`、`check:output-durability`、`lint`、`typecheck`、`test`、`build`，這是一條很好的主幹；但 `check:blackbox-protocols` 和 `check:auth-boundary:live` 有定義卻沒有進入 `check`，所以它們目前更像手動/外部 gate，而不是主線 gate。

第一部分：Quality Gate Inventory。

`check:preflight` 是靜態 migration/type/registry gate。它會掃 `supabase/migrations`、`src/lib/supabase/database.types.ts`、deployment registry checker，確認一批核心表有 migration coverage，確認 generated database type name 存在，禁止 `artifact_versions` 這類 lifecycle table，並確認 registry checker 有幾個 alias/fallback。這個 gate 快、穩、適合 PR 必跑，但它不是 live schema gate，也不能判斷 RLS policy 是否安全。

`check:schema-live` 是 live Postgres parity gate。它會連 DB，檢查 required tables、部分 required columns、RLS enabled、少數 required policies、少數 triggers、少數 authenticated grants。問題是它在沒有 `SCHEMA_LIVE_PARITY_DATABASE_URL`、`SUPABASE_DB_URL` 或 `DATABASE_URL` 時，預設可以 skipped 並且通過，除非 `SCHEMA_LIVE_PARITY_REQUIRED` 被打開。也就是說，在普通 CI 環境如果忘記配置 DB URL，schema-live 會變成 warning，不會 fail。這是 P1 gate weakness。

`check:schema-live` 還有一個更大的 coverage gap：它要求很多表 RLS enabled，但只明確檢查 `agent_memory_records` 和 `feature_flags` 的 policy name，grants 也只對少數表建立 expected matrix。這代表它不會完整擋住「RLS enabled 但 no policy」、「permissive true policy」、「SECURITY DEFINER 可被 anon/authenticated execute」這些 advisor 級問題。

我剛用 Supabase advisor 和 SQL 交叉看 live DB，實際上 live project 還存在幾類 schema/security gate 沒擋住的問題：`api_idempotency_keys`、`deployment_checks`、`permission_audit_logs`、`user_new_api_tokens` 是 RLS enabled no policy；`nova_chunks`、`nova_documents`、`nova_ingest_runs` 有 always-true permissive policies；`model_usage_ledger`、Nova 表還有 anon/authenticated grant 過寬訊號；`record_permission_audit_log` 和 `nexus_ensure_workspace_session` 類 SECURITY DEFINER execute exposure 仍被 advisor 報出。這些不一定全部要由第六子代理修，但第六子代理要把它們轉成 fail gate，否則第四子代理修完後很容易退化。

`check:auth-boundary` 是目前比較成熟的 gate。它靜態掃 `src/app/api` route inventory，檢查 legacy production block、image generation guard、platform admin guard、workspace permission 是否 request-scoped、runtime auth 是否不能回退到 Supabase Authorization header、browser auth vault 是否 scrub、hardening migration 是否存在。這個方向正確，而且抓的是 production safety，而不是單純 coverage。

但 `auth-boundary-scan` 仍是 allowlist / string inclusion 型 gate。它會列 route inventory、統計有多少 route 用 `apiHandler`、有多少 auth/permission/protected route，但並沒有強制「所有 mutation route 必須走 apiHandler + validator + auth/permission/idempotency」。因此新 route 如果沒有被列入特定 route group，仍可能繞過高標準，只靠統計門檻不一定會 fail。

`check:auth-boundary:live` 是有價值的 live probe。它會對 route inventory 建立 probes，對 public route 預期 200，對 legacy production-block route 預期 404，對 protected route 用 spoof `X-User-Id` / `X-Workspace-Id` / idempotency headers 測試不得 2xx/3xx。它還支援 Vercel protection bypass secret 和 cookie header，但它沒有被 `npm run check` 串起來。這應該進 main 或 nightly CI，而不是只靠人記得跑。

`check:output-durability` 是針對 runtime output durability 的靜態 + 測試混合 gate。它檢查 stream service 必須先 persist output message 再 complete task，persist 失敗必須 fail task，workflow runtime lite 必須產生 `runId:nodeId:output` 形狀的 output id，runtime test 必須驗證 durable message lookup 和 join fields。這是非常好的風險導向 gate。

但 output durability scan 目前仍高度依賴 source string matching，例如直接找特定函式名、特定字串、特定 test assertion。這能擋住「不小心改掉關鍵字串」的回歸，但不能完全替代 API-level contract test 或 failure-mode integration test。它應保留，但要補一層 protocol tests。

`check:blackbox-protocols` 目前更像 workflow-pro 研究/探索 checkpoint artifact validator。它會檢查 `events.ndjson` 的 schema、event sequence、secret redaction、live evidence refs、final report event 等。這很有價值，但它不是一般產品黑箱測試，而且如果找不到 run directories，結果會是 ok，只輸出 note。它目前也沒有進主 `check`。

第二部分：Test Taxonomy。

我會把 NEXUS 的測試分類改成九類，而不是 unit/integration/e2e 三類。

Pure unit：例如 pure parser、normalizer、style payload validator、idempotency hash、workspace snapshot parser。PR 必跑，不需要 Supabase。

Hook/component：Nexus workbench、window bounds、composer mode、artifact panel、recovery modal。PR 必跑，但目前看起來這一層不足，因為 `NexusOps` 是高 churn 且巨大 orchestration component。

API contract：所有 `/api/v1/**` mutation route 必須驗證 auth required、workspace permission、idempotency missing/conflict/pending、error envelope、requestId/traceId。現在 `apiHandler` 已經提供統一 envelope、permission、idempotency、event emission，是很好的 contract anchor。

DB live schema：目前已有 `check:schema-live`，但 coverage 太窄。它應該升級成「live schema + RLS + grants + RPC exposure + generated types drift」一起檢查。

RLS/security：應吸收 Supabase advisor 結果，對 no-policy、always-true write policy、anon/authenticated SECURITY DEFINER execute、function search_path mutable 設 fail threshold。

Sync protocol：local queue、idempotency replay、payload hash conflict、read-only suppression、offline reload flush、server 500 retry、permission denied permanent fail。這應該由第五子代理定義，第六子代理轉成 PR/main/nightly gates。

Runtime stream state machine：目前 `agent-runtime.test.ts` 已經覆蓋 task/session reuse、cancel idempotency、permission revalidation、internal workflow skip permission、event sanitization、provider fallback boundary、output persistence before complete、persistence failure fail task 等，這是目前最健康的測試群之一。

Browser/workbench integration：目前應補 characterization tests，尤其針對 workspace resize、floating composer、dock/panel、graph/workbench toggle、artifact hydration、workspace recovery/import/export。

Docs drift：現在幾乎沒有正式 gate。README 是產品承諾，應被機器檢查至少一部分。

第三部分：TypeScript 嚴格度。

`tsconfig` 有 `strict: true`，這是好的；但也有 `allowJs: true` 和 `skipLibCheck: true`。另外 include 主要是 `**/*.ts`、`**/*.tsx`、`**/*.mts`，不包含一般 `**/*.js`，而目前大量 gate script 是 `.mjs`，所以 TypeScript strict 對這批 check scripts 沒有型別保護。

這裡不要一次把 `allowJs`、`skipLibCheck` 全關。正確做法是建立「收斂計畫」：先統計 `.mjs` scripts 的核心 contract，將高風險 gate script 改成 TypeScript 或至少加 JSON schema validation；接著禁止新增普通 `.js`/`.mjs` production logic；最後才評估 `skipLibCheck`。目前最該先 typed 的不是 UI，而是 `schema-live-parity-scan`、`auth-boundary-scan`、`generated-output-durability-scan` 這些會決定 CI 是否放行的 gate。

第四部分：API/schema drift gate。

現有 `apiHandler` 已經是非常好的 API contract 中心：它處理 method check、JSON parse、workspaceId resolution、auth actor resolution、permission check、mutation idempotency、success/failure envelope、requestId/traceId、best-effort API event emission。

第六子代理要做的是把這個 contract 變成可強制的 gate。具體說，所有 mutation route 必須符合：

POST/PUT/PATCH/DELETE 要走 `apiHandler`，除非 route 被明確列入 exception manifest。

有 workspaceId 的 mutation 必須有 permission action。

mutation 預設必須測 missing `X-Idempotency-Key` 回 400。

同 idempotency key + 不同 body 必須回 conflict。

錯誤必須是 `{ ok: false, error, requestId, traceId }` 類 envelope。

成功必須有 schemaVersion、requestId、traceId。

這部分現在只能從 `apiHandler` 推出能力，還沒有看到一個自動 route contract matrix 會逐 route fail。這是 P1。

Schema drift 方面，`check:schema-live` 應新增四個檢查：

第一，advisor fail gate：把 Supabase security advisor 的 no-policy、always-true write policy、SECURITY DEFINER execute、function search_path mutable 轉成 fail。

第二，policy coverage matrix：不是只檢查兩張表的 policy name，而是每個 bounded context 至少要宣告 expected access class，例如 server-only、workspace-member-readable、workspace-editor-writable、public-read-only。

第三，RPC exposure matrix：所有 public RPC 必須宣告 callable roles、security definer/invoker、search_path、是否可由 REST RPC 呼叫。

第四，generated types drift：目前 preflight 只看 type name 存在，應改成檢查 generated types 是否對應 live schema hash。

第五部分：Docs drift。

README 目前明確承諾 NEXUS 是 multi-agent AI IDE、workspace local snapshot、portable JSON snapshot、`/api/agent-stream` local mock stream default、OpenAI-compatible streaming、image/video mock fallback、graph planner manual blueprint layer。

我已確認至少有一個 docs/code drift 候選：README 說 top bar 會顯示 `STREAM: MOCK`、`STREAM: LIVE`、`STREAM: MIXED`，但 `resolveAgentsStreamMode()` 現在直接 `return "live"`。這不一定是 runtime bug，也可能是產品策略改了；但它必須進 docs drift register。要嘛 README 改成 current behavior，要嘛 code 恢復 MOCK/LIVE/MIXED 判斷，要嘛 UI 改成顯示 server-managed live mode。

第二個 drift 候選是 README 說 keys are persisted in this browser workspace and sent to `/api/agent-stream` as Authorization header；但目前安全方向看起來已經往 server-managed New API token、禁止 runtime provider auth fallback、auth vault scrub 移動。README 這段可能已經過時，且涉及 credentials storage/security perception，應列 P1 docs drift。

第三個 drift 候選是 README 仍以 `/api/agent-stream` 作 streaming 主路徑描述，但實作已有 `/api/v1/agents/[agentId]/stream`、task lifecycle、usage/output durability gate。這應改成「legacy endpoint vs v1 endpoint」明確說明，否則新開發者會沿用 legacy route。

Docs drift gate 的第一版不需要很複雜：建一個 `docs/product-promises.json`，每個 promise 對應一個 source file assertion 或 test assertion。例如 `streamModeIndicator: mock-live-mixed` 對應 `resolveAgentsStreamMode` 不得硬編 live；`credentialsModel` 對應 README 不得再說 raw provider key persisted if product has moved to New API token；`graphPlannerAutonomousHandoff` 對應 README 必須保持 deferred unless workflow engine test says otherwise。

第六部分：Regression Hotspot Map。

目前最大 hotspot 是 `src/components/nexus/nexus-ops.tsx`。它是 client component，匯入大量 runtime、style、sync、Supabase、workflow、attachment、model catalog、panel/window component，還直接持有大量 state/ref/effects。光我讀到的片段就包含 workspace theme DOM preview、file download、authenticated artifact download、stream parser、Supabase session token resolver、workflow dispatch refs、workspace recovery state、model catalog state、artifact hydration state。

這個 hotspot 不一定要立刻大拆，但必須加 characterization tests。優先補這些：

workspace resize / bounds clamp：resize 之後 agent windows 不越界、不污染 persisted layout。

stream mode display：mock/live/mixed 或 live-only product decision 必須固定。

workspace recovery：login recovery 不覆蓋本地 unsynced workspace。

artifact hydration：首次 hydration 失敗時不無限 retry，不清空本地 artifact cache。

import/export：invalid stylePack 不破壞 workspace snapshot，export 不含 transient runtime state。

read-only workspace：viewer role 的 mutation UI disabled，且 local queue suppression 有可見提示。

第二個 hotspot 是 API route boundary。`auth-boundary-scan` 已經列出 route inventory，但需要從「統計」升級為「route manifest」。每個 route 的 method、auth、permission、idempotency、validator、response envelope 都要有 expected entry。

第三個 hotspot 是 Supabase schema/RLS。advisor 現在報出的 security findings 必須變成 nightly 或 main-blocking gate，否則第四子代理修完也可能回歸。

第七部分：CI Tiering Plan。

PR 必跑：`lint`、`typecheck`、`test`、`build`、`check:preflight`、`check:auth-boundary`、`check:output-durability`。這些不應依賴 live Supabase，必須 deterministic。

Main 必跑：PR 必跑全部，加上 `check:schema-live`，並強制 `SCHEMA_LIVE_PARITY_REQUIRED=true`。如果沒有 DB URL，main 必須 fail，不可 skipped pass。再加上 API route contract matrix。

Nightly/manual 必跑：`check:auth-boundary:live`、Supabase security/performance advisor gate、RLS policy scanner、RPC exposure scanner、blackbox protocol validation、offline sync protocol tests、browser/workbench integration tests。

這裡還有一個我不能完全確認的點：我嘗試讀常見 `.github/workflows/ci.yml`、`check.yml`、`main.yml`、`node.js.yml` 都沒有讀到。這不等於 repo 一定沒有 workflow，因為我沒有目錄 listing；但第六子代理應把「CI workflow discovery」列成待確認。如果真的沒有 GitHub Actions workflow，那就是 P1：有 `npm run check` 但沒有自動執行，就不是品質閘門，只是本地命令。

Debt Register 第一版如下。

P0/P1：`check:schema-live` 預設可 skip。修法：main CI 設 `SCHEMA_LIVE_PARITY_REQUIRED=true`，缺 DB URL 直接 fail。驗收：移除 DB URL 時 main CI 紅燈。

P0/P1：Supabase advisor findings 沒進 fail gate。修法：新增 `scripts/supabase-advisor-gate.mjs` 或 SQL scanner，對 no-policy、always-true write policy、SECURITY DEFINER public execute、search_path mutable fail。驗收：目前 live advisor findings 會讓 nightly/main security gate fail。

P1：API route contract 仍依賴統計和 allowlist。修法：新增 `api-route-contract.manifest.json`，逐 route 聲明 auth/permission/idempotency/validator/envelope。驗收：新增一個 POST route 不聲明 contract 時 CI fail。

P1：docs drift 已存在於 stream mode / credentials model / legacy stream endpoint。修法：新增 docs drift register，先手動表格，第二步轉機器 gate。驗收：README 的 stream promise 和 `resolveAgentsStreamMode()` 不再矛盾。

P1：live auth boundary probe 有價值但不在主 check。修法：放 main preview 或 nightly，配 `AUTH_BOUNDARY_LIVE_BASE_URL` 和 Vercel bypass secret。驗收：protected route spoof probe 2xx 時 CI fail。

P2：blackbox protocol gate 可空跑通過，且未納入主 check。修法：明確標為 manual/nightly research gate，若目標目錄存在則嚴格 fail；若產品要依賴它，必須要求至少一個 checkpoint run。

P2：高風險 gate scripts 是 `.mjs`，不受 TypeScript strict 保護。修法：先把 schema-live/auth-boundary/output-durability 三個 gate 遷到 TS 或補 JSON schema parser。驗收：gate report type 有 compile-time coverage。

P2：`NexusOps` 高 churn orchestration 缺 characterization tests。修法：先不重構，先對 resize、stream indicator、recovery、artifact hydration、read-only gating 補測。驗收：UI refactor 改壞這些行為時 test fail。


---

## V29 迭代修復記錄 (2026-06-17)

### 已處理
| 問題 | 修復 | 檔案 |
|---|---|---|
| 技術債交叉對照文件 | 建立 `V29_TECH_DEBT_CROSS_REFERENCE.md`，對應 6 份報告 | `docs/V29_TECH_DEBT_CROSS_REFERENCE.md` |
| Obsidian 活文件 | 更新 `NEXUS New API VPS 部署狀況.md` | Obsidian `Codex/FreeChat/` |

### 仍待處理
- P1: `check:schema-live` 預設 skipped，不會 fail CI (Section 1)
- P1: `check:blackbox-protocols` / `check:auth-boundary:live` 沒進主 `check` (Section 1)
- P2: Schema-live gate RLS/policy coverage 太窄 (Section 1)
- P2: Gate scripts 用 `.mjs` 無 TypeScript 保護 (Section 3)
- P2: Docs drift（README 描述與實作不一致）(Section 5)
