# 05 UI Dataflow

## 這是什麼

UI dataflow 目前大致是：NEXUS Ops shell 讀取 store -> graph/composer/panels 發出 action -> store 呼叫 API/Supabase/runtime -> 結果回寫 store -> UI panels/graph/render history。

## Evidence

- src/components/nexus/nexus-ops.tsx：主 UI shell，9653 行，internal deps 最高。
- src/components/nexus/nexus-graph.tsx：React Flow graph，agent/runtime node/edge interaction。
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx：typed props 很完整，適合作為較安全的 UI panel 抽離起點。
- src/store/nexus-store.ts：中央 action/state/side effect。

## 風險

- UI panel 的可見狀態與 backend authority 混在一起。
- nexus-ops.tsx 同時碰 graph、download、upload、generated history、storage、style engine，任何拆分都需要 screen smoke test。
- Workflow Pro 的 typed props 相對健康，但 apply/import/export callbacks 是外部契約，不能直接改。

## 之後怎麼拆

先拆純 UI panel 和 read-only view，再拆 action adapter。每次拆完都要跑本地頁面 screen test 與 store characterization tests。
