# 03 Nexus Domain Map

## 這是什麼

NEXUS 不是單純 UI，它把 workspace、agents、chat、graph、artifact、style engine、Workflow Pro、provider runtime 放在同一個操作台。

## 主要 domain

| Domain | 主要檔案 | 說明 |
|---|---|---|
| Ops shell | src/components/nexus/nexus-ops.tsx | 主操作台與多 panel glue |
| Graph | src/components/nexus/nexus-graph.tsx | React Flow agent/runtime graph |
| Workflow Pro | src/components/nexus/workflow-pro/workflow-pro-surface.tsx, src/lib/workflow-pro/* | workflow contract、brain context、evidence、files |
| Store | src/store/nexus-store.ts | workspace/agent/message/runtime/sync central state |
| Backend services | src/lib/backend/** | repositories、security、workspace、observability、artifacts |
| Supabase | src/lib/supabase/**, supabase/migrations/** | DB/auth/storage/RLS backend |
| Image/runtime | src/lib/workflow-runtime-lite/**, src/lib/backend/image-generation/** | LLM/image calls、generated assets |

## 風險

- Domain 邊界目前不完全等於檔案邊界。
- nexus-ops.tsx 和 nexus-store.ts 是「讀懂專案」的瓶頸。
- Workflow Pro UI 已經有較清楚的 typed props，可優先抽 panel；provider/runtime 實作要晚一輪。

## Agent 應該怎麼讀

1. 先讀本報告與 context-packs/repo-map-compact.md。
2. 只讀大型檔案的 import/type/action 區。
3. 用 symbol-level 搜尋定位目標功能。
4. 不要一開始重構 provider/storage/auth。
