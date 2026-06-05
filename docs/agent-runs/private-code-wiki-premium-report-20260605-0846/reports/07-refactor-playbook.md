# 07 Refactor Playbook

## 這是什麼

這不是本輪要執行的重構，而是下一輪安全施工順序。

## P0 前置 Gate

- 確認 source test 中 bearer-shaped token assignment 是否為 dummy fixture。
- 保留 service role server-only bundle gate。
- 為 nexus-store.ts 補 store contract map。
- 為 generated image storage 補 request-scoped smoke/contract test。

## 建議優先模塊化 5 區

1. workflow-pro-surface.tsx tab panels：typed props 已清楚，風險較低。
2. nexus-graph.tsx node renderer / edge renderer：UI-heavy，適合切 presentational。
3. nexus-ops.tsx read-only panels：先拆展示，不碰 authority。
4. nexus-store.ts workflow runtime slice：先 contract map，再拆。
5. generated image asset storage adapter：先補測試，再把 storage path/bucket policy contract 固化。

## 不建議現在動 5 區

1. Service role / auth boundary。
2. Supabase RLS migrations。
3. Store persistence / zundo temporal。
4. Provider-backed LLM/image runtime execution。
5. Artifact download/import/export authority。

## Migration Order

- src/components/nexus/nexus-ops.tsx：先抽 workspace/session shell / graph/composer bridge；暫緩 provider-backed runtime path。
- src/components/nexus/nexus-graph.tsx：先抽 node renderers / edge renderers；暫緩 node data contract。
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx：先抽 tab panels / contract import review panel；暫緩 apply-plan callback contract。
- src/store/nexus-store.ts：先抽 workflow runtime slice / workspace cloud sync slice；暫緩 persistence migration layer。
