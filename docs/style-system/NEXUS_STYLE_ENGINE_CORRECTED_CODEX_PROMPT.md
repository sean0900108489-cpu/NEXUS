# NEXUS Style Engine Corrected Codex Prompt

Use this prompt when you want Codex to generate the next total upgrade Markdown
pack or technical document folder. It is written to preserve the original
product ambition while preventing the common failure modes: preview state leaking
into sync, over-editing a dirty repo, bypassing Supabase security, or turning
manifest data into uncontrolled CSS/code.

## Copyable Prompt

```text
你是 Codex，在 /Users/sean/Documents/FreeChat 這個 repo 裡工作。

本次任務只允許產生新的 Markdown 技術文檔或技術文檔資料夾，不允許修改任何 runtime code、測試、package、Supabase migration、資料庫、Vercel 設定、GitHub 分支或現有系統內部資料。

背景文件：

1. /Users/sean/Documents/FreeChat/NEXUS_STYLE_ENGINE_V1_LOW_FRICTION_UPGRADE.md
2. /Users/sean/Downloads/nexusstyle總升級.md
3. repo 內所有與 style/theme/workspace/sync/backend/graph/auth/deploy 相關的現況文件與程式碼，只讀取，不修改。

總目標：

我要把 NEXUS 從固定外觀 app 升級成可描述、可驗證、可編譯、可預覽、可套用、可保存、可替換、可回滾的 UI Style Engine。

這不是單純換主題，也不是右上角幾個 preset button。我要的是一個 Style Document / AI Brief → Normalized Intent → NexusStyleManifestV1 → Validator → Compiler → CSS Variables / Component Recipes / React Flow Adapter → Runtime Preview / Apply / Save / Export 的工程系統。

但本次只做文檔，不做實作。

請先完整掃描目前 repo 現況，尤其要理解：

- `src/app/globals.css` 的 CSS variables、data-theme presets、React Flow/global style hooks。
- `tailwind.config.ts` 的 Tailwind v4 token bridge。
- `src/components/theme-provider.tsx` 的 next-themes `data-theme` provider。
- `src/components/nexus/nexus-ops.tsx` 內現有 theme controls、DOM variable patching、`WorkspaceThemeConfig` 的使用。
- `src/lib/nexus-types.ts` 的 `WorkspaceThemeConfig`。
- `src/store/nexus-store.ts` 裡 `updateThemeConfig` 與 `queueThemeConfigCloudSync`。
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts` 怎麼序列化 `themeConfig`。
- `src/lib/backend/workspace/workspace-state-entity-repository.ts` 怎麼把 `themeConfig` 投影到 `workspace_state_entities` 的 `theme` entity。
- `src/lib/workspace-kernel.ts` 的 sanitize/import/export/hydrate 行為，尤其檢查目前 `glowIntensity` 是否有 sanitizer drift。
- `src/components/nexus/nexus-graph.tsx` 與 React Flow 的視覺/行為邊界。
- Supabase auth/client/admin/env/RLS/migration 邊界。
- Vercel preview/build/env/logs/deployment 驗證邊界。
- GitHub PR/CI/review 邊界。

請遵守 Next.js repo 規則：這個 repo 使用的 Next.js 版本可能與常識不同。若需要談到 Next.js 實作或路由/Server Component/Route Handler/CSS 行為，請先查 `node_modules/next/dist/docs/` 的相關文件再下結論。

請使用 Supabase / Vercel / GitHub 的官方或連接器文件確認最新邊界：

- Supabase：Next.js Auth、RLS、API keys、service role、Data API/schema exposure、migration/advisor 安全邊界。
- Vercel：preview deployment、env vars、build logs、rollback/debug、production gate。
- GitHub：只作為 PR/CI/review gate，不要創建 branch、commit、PR，除非我明確要求。

核心判斷：

請評估目前 V1 升級方向是否正確，並產出一個貼合目前 repo 現況、最低摩擦、能逐步施工的總升級技術文檔包。

請一定要把以下四種 state 拆開：

1. Preview：暫態視覺預覽，runtime/local-only，不得進 workspace/sync/backend。
2. Apply：使用者明確套用的 runtime visual choice，不等於 save。
3. Save：命名 style pack 或 style preference 的保存行為，延後到 persistence contract。
4. Persist：Supabase/backend/account/workspace durable persistence，只能在後期經過 schema/RLS/branch/advisor gate 之後處理。

請把現有 `workspace.themeConfig` 視為已經會進 durable workspace state / sync / Supabase projection 的敏感資料流，不可把 AI-generated manifest、preview draft、raw CSS、imported style document 直接塞進去。

請特別推理我原本提示詞漏掉了什麼，哪些漏項會使升級過程撞牆或出錯，並把這些漏項補成明確閉環：

- 掃描閉環：repo/status/style/class/data-flow/protected behavior/external docs。
- 執行閉環：一個 migration unit 一次，先聲明允許/禁止，再實作，再驗證。
- 審核閉環：changed files、contract changes、behavior impact、risk、rollback。
- 驗證閉環：lint/typecheck/test/build/browser smoke/sync pollution check/Supabase branch/advisor/Vercel preview/GitHub CI。
- 回滾閉環：只回滾當前 style-engine migration unit，不回滾使用者或其他 V16 變更。

請產出以下 Markdown 文件，放在 `docs/style-system/`：

1. `style-engine-total-upgrade-master-plan.md`
   - current-state summary
   - decision: direction correct or not
   - architecture map
   - frontend/function/backend/data-flow coupling map
   - risk map
   - missing prompt items
   - scan/execution/review/verification/rollback loops
   - version ladder V0-V15
   - Supabase/Vercel/GitHub gates
   - immediate next step

2. `style-engine-technical-doc-pack-index.md`
   - list all future technical docs needed
   - each doc purpose, owner, inputs, outputs, acceptance gate

3. `style-engine-protected-behavior-ledger.md`
   - classify behavior classes and protected UI behavior
   - include drag/resize/z-index/pointer-events/scroll/React Flow/auth/modal/store/sync/data lifecycle

4. `style-engine-preview-apply-persist-boundary.md`
   - explicitly define preview/apply/save/persist
   - explain why preview must not enter `workspace.themeConfig`
   - show current theme data flow
   - define future persistence gate

5. `style-engine-corrected-implementation-prompt.md`
   - rewrite this whole request into a cleaner future prompt that I can use to ask Codex to generate or implement the next phase.
   - include allowed actions, forbidden actions, required scans, required outputs, verification loops, and final response expectations.

文件要求：

- 中文為主，可以保留必要英文技術名詞。
- 不是漂亮報告，而是可施工的工程文檔。
- 不要空泛講 marketplace，必須先講 contract、manifest、compiler、preview、adapter、primitive、verification。
- 對每個 version 都要說：目標、輸出、允許碰哪裡、禁止碰哪裡、驗證 gate、rollback trigger。
- 對 Supabase/Vercel/GitHub 只建立 gate，不要做任何 live 操作。
- 最後回覆請列出新增的 Markdown 文件路徑，明確說明沒有修改 code/db/deploy。
```

## Why This Prompt Is Safer

This corrected prompt adds the missing constraints that matter most:

- It makes the task documentation-only.
- It forces Codex to respect the dirty worktree.
- It separates preview, apply, save, and persist.
- It treats current `workspace.themeConfig` as durable sync data.
- It blocks early Supabase schema work.
- It blocks runtime Tailwind class generation.
- It blocks component direct manifest imports.
- It requires Next.js, Supabase, Vercel, and GitHub boundary checks.
- It requires execution, review, verification, and rollback loops.

## Minimal Follow-Up Prompt For Implementation Later

Use this only after the technical document pack is reviewed:

```text
依據 `docs/style-system/` 的 Style Engine 文檔包，開始 V1 Style Surface Audit 的實作前置工作。

本次仍然不要修改 runtime code。只產出：

1. style surface inventory
2. hardcoded visual token inventory
3. protected behavior ledger update
4. current theme data-flow diagram
5. V2 Style Contract input list

請先掃描 repo 狀態，確認 dirty worktree，避免碰任何 V16 sync/backend 未提交變更。最後列出新增/修改的 Markdown 文件與未做的事情。
```
