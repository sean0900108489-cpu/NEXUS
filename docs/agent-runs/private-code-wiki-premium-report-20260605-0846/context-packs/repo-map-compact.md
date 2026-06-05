# Compact Agent Context

Project: nexus-ai-ops
Framework: Next.js detected
Backend: Supabase
Run: docs/agent-runs/private-code-wiki-premium-report-20260605-0846

Critical files:
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

Large files:
- src/components/nexus/nexus-ops.tsx: 9653 lines, P0, NEXUS 主操作台、workspace shell、chat/composer、graph/panel glue、匯入/匯出與 image/storage 入口。
- src/components/nexus/nexus-graph.tsx: 2345 lines, P1, React Flow graph surface、agent/runtime node rendering、edge interactions、copy/run/pause controls。
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx: 1721 lines, P1, Workflow Pro 的 design/brain/evidence/files/settings tabs、contract import/export、benchmark fixture UI。
- src/store/nexus-store.ts: 4814 lines, P0, Zustand + persist/zundo 中央狀態，workspace、agents、messages、sync、Supabase、workflow runtime、provider calls 的最大收斂點。

Supabase clients:
- browser anon: src/lib/supabase/client.ts
- server admin: src/lib/supabase/admin.ts
- request scoped: src/lib/supabase/request.ts

Risks:
- P0-BEARER-SHAPE-TEST-FIXTURE P0: source test 中存在 bearer-shaped token assignment
- P0-SUPABASE-SERVICE-ROLE-BOUNDARY P0: Supabase service role client 必須維持 server-only
- P0-NEXUS-STORE-GOD-OBJECT P0: nexus-store.ts 同時承擔狀態、persistence、Supabase sync、runtime/provider 邊界
- P0-NEXUS-OPS-BLAST-RADIUS P0: nexus-ops.tsx 9653 行且 fan-out 最高
- P1-IMPORT-CYCLES P1: 自製 import graph 發現 9 組疑似循環
- P1-KNIP-UNUSED-CANDIDATES P1: Knip report-only 回報 113 個疑似未使用檔案
- P1-SUPABASE-LOCAL-CONFIG-MISSING P1: Supabase migrations 存在，但 local config/CLI 不完整
- P2-DEPCRUISER-CONFIG-GAP P2: dependency-cruiser 無 config 時解析 alias 不完整

Next safest command:
請先做 source/test/docs 的 secret-shape fixture 清理計畫，不改功能；再從 Workflow Pro tab panels 做第一個 characterization-backed UI split。
