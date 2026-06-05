# 11 Narrative Intelligence Pass

## 這份 pass 在補什麼

第一版 HTML 的視覺方向成立，但文字多停在「掃描結果」。這一版補的是第二層解讀：讓人類知道每個區塊在系統生命中扮演什麼角色，讓 LLM 知道該如何繼續思考，讓 agent 知道下一步該讀哪裡、不能碰哪裡。

## 核心判斷

NEXUS / Workflow Pro 現在的主要問題不是「檔案太大」這麼單純，而是幾個檔案同時承擔了 UI、authority、runtime、storage、provider、history、sync 的混合責任。這代表下一輪不能直接開始拆檔，而要先分辨：哪些只是 presentation，哪些會改變資料，哪些會觸發 Supabase / provider / artifact side effect。

## 掃描層 / 預架構層 / 施工層

| 層級 | 這一層回答什麼 | 現在狀態 |
|---|---|---|
| 掃描層 | 現在看到哪些檔案、依賴、風險、touchpoint | 已完成，見 reports/00-10 |
| 預架構層 | 這些事實意味著系統應該長出哪些邊界 | 本 pass 新增 |
| 施工層 | 真要改時，第一刀切哪裡、不能切哪裡 | 只列候選，不執行 |

## nexus-ops.tsx 的意義

### 表面上是什麼

它看起來是一個大型 React component / 操作台檔案。

### 系統裡真正扮演什麼

它更像 NEXUS 的操作艙：把 workspace、graph、composer、artifact、generated history、style controls、Workflow Pro entry point、download/import/export 都接在同一個地方。它不是單純的畫面檔，而是很多使用者動作進入系統的前門。

### 為什麼會長成這樣

以 Codex 快速迭代的專案常會先把「能跑起來的完整工作流」集中在一個操作面，因為這樣最容易快速驗證功能。但當 provider、storage、runtime、permission 都接進來後，原本方便的集中點會變成 blast radius。

### 混在一起的責任

- Presentation：panel、dock、toolbar、layout、visual state。
- Interaction glue：graph/composer/panel 開關與事件橋接。
- Authority-adjacent actions：download、import、export、artifact/history 操作。
- Runtime entry：Workflow Pro 與 provider-backed workflow 的入口。
- Storage adjacency：generated image / asset / history 的顯示與操作。

### 未來應該長成什麼骨架

它應該變成 shell orchestrator，而不是所有功能的實作場。下一輪可先抽出 read-only panels 和 visual sections；authority、provider、storage、artifact action 應留在 adapter/service boundary。

### Agent 應該怎麼讀

不要整份讀。先找 props/state hooks、panel render function、與 store/API action 交界。每看到一個 UI button，都問：它只是打開面板，還是會觸發 Supabase / artifact / provider side effect？

### 推測與驗證

「它同時承擔 authority」目前是從 imports、storage hints、API/action hits 推論而來；下一輪需要 symbol-level 查每個 button/callback 的實際路徑。

## nexus-store.ts 的意義

### 表面上是什麼

它是 Zustand store。

### 系統裡真正扮演什麼

它是中央神經結。workspace、agent、messages、runtime、Supabase sync、artifact vault、provider calls、undo/redo 都接到這裡。它不是單純 state container，而是很多 side effect 的調度點。

### 為什麼會長成這樣

早期產品快速成長時，把 state 和 action 都放在一個 store 會讓功能追加很順。但當狀態開始跨 local persistence、cloud sync、runtime execution、provider calls 後，store 就從便利容器變成架構風險。

### 混在一起的責任

- Durable workspace state。
- Local persistence / undo redo。
- Supabase cloud sync。
- Workflow runtime lite state and execution bridge。
- Provider-backed LLM/image runtime call bridge。
- Artifact/generated history state。

### 未來應該長成什麼骨架

不是直接拆成很多檔案，而是先建立 action/selector contract map，再逐步形成 slices：workflowRuntimeSlice、cloudSyncSlice、artifactVaultSlice、authSessionSlice。Persistence 和 temporal 應最後處理。

### Agent 應該怎麼讀

先讀 imports，再讀 state shape，再用 rg 找 action name，不要整份讀。遇到任何 set/get block，要標註它是否寫 local state、IDB、Supabase、runtime trace 或 provider result。

### 推測與驗證

「中央神經結」是基於 imports 和 side-effect keyword scan 的架構推論。下一輪要用 TypeScript AST 或 Serena 查 action groups 與 call graph。

## Supabase Map 的意義

### 表面上是什麼

這是一組 client、admin client、request scoped client、migrations、RLS policy、storage bucket 的後端連接。

### 系統裡真正扮演什麼

Supabase 是本專案的持久化權力層。它決定 workspace/state/artifact/history 是否可被讀寫，也決定前端 refactor 會不會破壞真實資料鏈。

### 混在一起的責任

- public anon config 是前端可見，但安全依賴 RLS。
- service role 是 server-only 權力，不能進 browser bundle。
- request scoped client 用 bearer token 代表使用者上下文。
- generated image storage 透過 bucket constant 使用，不是 literal scan 可以完全看出的簡單路徑。

### 未來骨架

需要把「資料契約」獨立成 typed contract：table/RPC/storage bucket/auth session/permission boundary。任何 UI 拆分前都要知道它碰的是 display data 還是 authority data。

### Agent 應該怎麼讀

先讀 src/lib/supabase/client.ts、admin.ts、request.ts，再讀 supabase-connection-manifest.json。不要假設 NEXT_PUBLIC 就安全；NEXT_PUBLIC 只是可見，真正安全在 RLS 和 request boundary。

## Workflow Pro 的意義

### 表面上是什麼

它是一個 workflow contract / brain / evidence / files / settings UI surface。

### 系統裡真正扮演什麼

Workflow Pro 是下一輪架構重生的候選入口。它的 typed props 比 nexus-ops 更清楚，代表它比較適合先做 characterization-backed UI split。

### 風險

不要先改 apply/import/export callback contract，也不要先動 runtimeSummary 的語意。這些會影響 workflow 是否真的跑完、artifact 是否可追蹤。

### Agent 應該怎麼讀

先讀 props type，再讀 mode panels。把每個 mode 分成 read-only view、import/export action、runtime evidence action 三種。

## 批判結果

第一版不是失敗，它抓到了核心資料與風險。但它的文字還不夠像「理解材料」。v1.1 的提升方向是：每個事實後面要補「這代表下一個人或 LLM 更會判斷什麼」。沒有這個答案的段落，只是展示。
