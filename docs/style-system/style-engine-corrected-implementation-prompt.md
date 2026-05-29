# NEXUS Style Engine Corrected Implementation Prompt

Use this prompt for the next Style Engine pass. It is intentionally strict so Codex does not confuse product ambition with implementation permission.

## Copyable Prompt

```text
你是 Codex，在 /Users/sean/Documents/FreeChat 工作。

本輪任務：執行 NEXUS Style Engine V1 Style Surface Audit。

嚴格限制：

- 只允許新增或修改 Markdown 技術文檔。
- 不允許修改 runtime code。
- 不允許修改 tests。
- 不允許修改 package.json / lockfile。
- 不允許修改 Supabase migrations、database types、資料庫或 live Supabase project。
- 不允許修改 Vercel 設定、部署設定或執行部署。
- 不允許建立 branch、commit、push、PR。
- 不允許重寫 `src/components/nexus/nexus-ops.tsx`。
- 不允許重寫 `src/components/nexus/nexus-graph.tsx`。
- 不允許把 style preview 接進 store/sync/backend/workspace。

請先讀，按權重：

1. `docs/style-system/style-engine-total-upgrade-master-plan.md`
2. `docs/style-system/style-engine-preview-apply-persist-boundary.md`
3. `docs/style-system/style-engine-protected-behavior-ledger.md`
4. `docs/style-system/style-engine-technical-doc-pack-index.md`
5. `docs/style-system/NEXUS_STYLE_ENGINE_CORRECTED_CODEX_PROMPT.md`
6. `docs/style-system/NEXUS_STYLE_ENGINE_TOTAL_UPGRADE_MASTER_PLAN.md`
7. `NEXUS_STYLE_ENGINE_V1_LOW_FRICTION_UPGRADE.md`
8. `/Users/sean/Downloads/nexusstyle總升級.md`，只作長期野心參考，不得覆蓋安全邊界。

請做只讀 repo 掃描：

- git status / branch / commit。
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/components/theme-provider.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/PromptVaultManager.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/auth-screen.tsx`
- `src/lib/nexus-types.ts`
- `src/store/nexus-store.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/state-sync.ts`
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts`
- `src/lib/backend/workspace/workspace-state-entity-repository.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/admin.ts`
- relevant `/api/v1` route patterns
- relevant Supabase migrations

遵守 Next.js repo 規則：

若需要談 Next.js CSS、App Router、Route Handler、Server/Client Component 行為，先讀 `node_modules/next/dist/docs/` 的相關文件再下結論。

本輪要產出：

1. `docs/style-system/style-surface-audit.md`
2. `docs/style-system/hardcoded-visual-token-inventory.md`
3. `docs/style-system/react-flow-style-boundary.md`
4. `docs/style-system/style-contract-v1-inputs.md`
5. 若有必要，更新 `docs/style-system/style-engine-protected-behavior-ledger.md`

文件必須包含：

- current style source inventory
- CSS variable inventory
- `data-theme` / `next-themes` flow
- Tailwind v4 bridge inventory
- hardcoded visual token inventory
- class taxonomy: pure visual / layout / behavior / third-party / state-linked / persistence-linked
- UI organ map: shell / topbar / dock / windows / modals / graph / auth / datapad / prompt vault
- React Flow safety scan
- workspace/theme/sync/backend data-flow map
- Supabase/backend boundary notes
- first Style Migration Unit backlog
- V2 Style Contract input list
- open questions

必須保留的事實：

- `workspace.themeConfig` 是 durable active workspace state，會進 snapshot/sync/Supabase projection。
- Preview 不得進 `workspace.themeConfig`。
- Preview 不得進 `NexusWorkspace`、`ActiveUiStateSnapshot`、`WorkspaceCloudSnapshotPayload`、IndexedDB workspace persistence、`state-sync.ts`、Supabase。
- `glowIntensity` 存在於 UI/type/defaults，但目前 `sanitizeThemeConfig()` 沒保留它。
- React Flow 必須走 adapter。
- `globals.css` 是 Legacy Bridge V0，不得刪。
- 目前 worktree 是 dirty；不得清理、reset、覆蓋非本任務變更。

驗證：

- 因為本輪只寫 Markdown，不需要跑完整 test/build。
- 需要用 `git status --short` 確認只變更預期 Markdown 文件。
- 如果有任何非 Markdown 變更，立即停止並回報。

最後回覆：

- 列出新增/修改的 Markdown 文件路徑。
- 明確說明沒有修改 runtime code、tests、package、Supabase migration/database、Vercel/GitHub。
- 說明未執行 test/build 的原因：本輪是 docs-only。
```

## Future Implementation Prompt Skeleton

Use only after V1 audit and V2 contract are reviewed:

```text
依據 `docs/style-system/` 文檔包，執行 Style Engine V2/V3 的單一小步。

本輪 phase：
[填入 V2 contract / V3 manifest / V4 compiler / V5 preview]

允許文件：
[列出明確 files]

禁止文件：
- `src/store/nexus-store.ts`
- `src/lib/state-sync.ts`
- `src/lib/workspace-kernel.ts`
- `supabase/migrations/**`
- `src/components/nexus/nexus-ops.tsx` broad rewrite
- `src/components/nexus/nexus-graph.tsx` broad rewrite

必須先聲明：
- Preview/Apply/Save/Persist 在本輪的含義
- touched files
- forbidden files
- verification plan
- rollback path

實作後必須回報：
- changed files
- intentionally not changed
- checks run
- browser smoke if UI changed
- sync/backend pollution check
- rollback trigger status
```
