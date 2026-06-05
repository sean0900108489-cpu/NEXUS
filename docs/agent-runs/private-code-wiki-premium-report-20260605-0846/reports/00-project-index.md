# 00 Project Index

## 這是什麼

這份 private codebase wiki 是本次 run 的索引。目標是讓非工程師、人類 reviewer、下一輪 Codex/LLM/agent 都能在不讀完整 repo 的情況下理解 FreeChat / NEXUS / Workflow Pro 的主要邊界。

## 來源

- package.json
- AGENTS.md
- .codewikiignore
- .agentignore
- src/lib/supabase/client.ts
- src/lib/supabase/admin.ts
- src/lib/supabase/request.ts
- src/lib/supabase/database.types.ts
- supabase/migrations/
- src/components/nexus/nexus-ops.tsx
- src/components/nexus/nexus-graph.tsx
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx
- src/store/nexus-store.ts
- src/lib/backend/image-generation/generated-image-asset-storage.ts
- src/lib/backend/security/frontend-bundle-safety.test.ts

## 掃描摘要

- 專案名稱：nexus-ai-ops
- Framework：Next.js detected
- Backend：Supabase
- git tracked files：648
- src files：404
- Supabase migrations：25
- 自製 import graph：400 files / 1317 internal edges / 9 suspected cycles

## 人類版摘要

這個專案已經不是單一前端 App，而是「NEXUS 操作台 + Workflow Pro + Supabase 後端 + provider/runtime + artifact/storage」混合系統。現在最需要的是先把邊界畫清楚，再進重構。最危險的不是單一 bug，而是大型 UI 檔案和中央 store 同時承擔過多責任。

## Machine-readable 摘要

    {
      "project": "nexus-ai-ops",
      "framework": "Next.js",
      "backend": "Supabase",
      "srcFiles": 404,
      "supabaseMigrations": 25,
      "largeFiles": [
        {
          "file": "src/components/nexus/nexus-ops.tsx",
          "lines": 9653,
          "risk": "P0"
        },
        {
          "file": "src/components/nexus/nexus-graph.tsx",
          "lines": 2345,
          "risk": "P1"
        },
        {
          "file": "src/components/nexus/workflow-pro/workflow-pro-surface.tsx",
          "lines": 1721,
          "risk": "P1"
        },
        {
          "file": "src/store/nexus-store.ts",
          "lines": 4814,
          "risk": "P0"
        }
      ]
    }
