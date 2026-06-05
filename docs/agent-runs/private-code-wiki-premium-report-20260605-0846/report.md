# Private Codebase Wiki + Supabase Connection Map + Refactor Risk Map

建立時間：2026-06-04T23:15:16.583Z
Run folder：docs/agent-runs/private-code-wiki-premium-report-20260605-0846/
Branch：agent/private-code-wiki-premium-report

## Executive Summary

本輪已建立 privacy-preserving codebase wiki 基礎。最大的工程事實是：NEXUS/Workflow Pro 的核心功能集中在兩個超大檔 nexus-ops.tsx 與 nexus-store.ts，Supabase 是真實後端核心，且 image/artifact/runtime 已跨 UI、store、API、storage。

## 最高風險

- P0 P0-BEARER-SHAPE-TEST-FIXTURE: source test 中存在 bearer-shaped token assignment
- P0 P0-SUPABASE-SERVICE-ROLE-BOUNDARY: Supabase service role client 必須維持 server-only
- P0 P0-NEXUS-STORE-GOD-OBJECT: nexus-store.ts 同時承擔狀態、persistence、Supabase sync、runtime/provider 邊界
- P0 P0-NEXUS-OPS-BLAST-RADIUS: nexus-ops.tsx 9653 行且 fan-out 最高
- P1 P1-IMPORT-CYCLES: 自製 import graph 發現 9 組疑似循環

## 大型檔案

### src/components/nexus/nexus-ops.tsx

- Lines：9653
- Risk：P0
- 主要責任：NEXUS 主操作台、workspace shell、chat/composer、graph/panel glue、匯入/匯出與 image/storage 入口。
- 適合先抽：workspace/session shell、graph/composer bridge、generated asset/history panels、style-engine controls、workflow-pro launcher
- 不應先動：provider-backed runtime path、auth/workspace permission decisions、artifact download/import/export authority

### src/components/nexus/nexus-graph.tsx

- Lines：2345
- Risk：P1
- 主要責任：React Flow graph surface、agent/runtime node rendering、edge interactions、copy/run/pause controls。
- 適合先抽：node renderers、edge renderers、runtime node action adapter、graph DnD adapter
- 不應先動：node data contract、runtime evidence display semantics

### src/components/nexus/workflow-pro/workflow-pro-surface.tsx

- Lines：1721
- Risk：P1
- 主要責任：Workflow Pro 的 design/brain/evidence/files/settings tabs、contract import/export、benchmark fixture UI。
- 適合先抽：tab panels、contract import review panel、evidence summary widgets、benchmark fixture drawer
- 不應先動：apply-plan callback contract、runtimeSummary interpretation

### src/store/nexus-store.ts

- Lines：4814
- Risk：P0
- 主要責任：Zustand + persist/zundo 中央狀態，workspace、agents、messages、sync、Supabase、workflow runtime、provider calls 的最大收斂點。
- 適合先抽：workflow runtime slice、workspace cloud sync slice、generated history slice、auth/session slice、artifact vault slice
- 不應先動：persistence migration layer、undo/redo temporal integration、provider-backed runtime execution

## Supabase Snapshot

- Touchpoint files：137
- Tables：24
- RPC：record_permission_audit_log
- Dynamic storage bucket：nexus-generated-assets
- Migrations：25
- RLS/policy migrations：22

## 圖片 / provider evidence

五張報告視覺圖已使用真實 OpenAI image API 生成，metadata 在 assets/data/image-metadata.json；只記錄 model、status、source 類型，不保存 raw key。

## 下一輪最高 ROI

先確認 bearer-shaped test fixture，再建立 store action/selector contract map，然後從 workflow-pro-surface.tsx typed panels 做第一個 characterization-backed UI split。
