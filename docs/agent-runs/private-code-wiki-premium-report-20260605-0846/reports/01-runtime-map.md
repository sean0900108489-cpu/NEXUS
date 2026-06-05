# 01 Runtime Map

## 這是什麼

Runtime map 描述 request/API/runtime/provider/workflow 執行邊界。這輪沒有啟動 production provider workflow，也沒有連 production Supabase；這是靜態理解與風險建圖。

## 依賴什麼

- API client：src/lib/api/nexus-api-client.ts
- Central store/runtime bridge：src/store/nexus-store.ts
- Workflow runtime lite：src/lib/workflow-runtime-lite/*
- Workflow Pro UI：src/components/nexus/workflow-pro/workflow-pro-surface.tsx
- Backend API/service layer：src/lib/backend/**、src/app/api/**

## 風險

- src/store/nexus-store.ts 是 client store，但匯入 runtime、Supabase client、LLM/image runtime lite，多個 side effect 收斂在同一檔。
- runtime/provider 可用性不能只靠 static scan；下一輪若要驗證 provider-backed behavior，必須用真實 API 且不記錄 raw key。
- Backend observability 與 nexus-types.ts 之間有疑似循環。

## 之後怎麼拆

1. 先建立 runtime contract map，不拆程式。
2. 把 workflow runtime state/action 以 slice contract 描述出來。
3. 對 runWorkflowRuntimeLite、trace publish、group record publish 建 characterization tests。
4. 再考慮從 store 抽出 runtime service adapter。

## Agent 應該怎麼讀

先讀 context-packs/repo-map-compact.md，再讀 src/store/nexus-store.ts 的 import/action 區，不要一次讀完整 4814 行。
