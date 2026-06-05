# 06 Risk Register

## P0-BEARER-SHAPE-TEST-FIXTURE - source test 中存在 bearer-shaped token assignment

- Severity：P0
- Evidence：
- src/lib/backend/observability/observability-service.test.ts	121	generic_bearer_assignment
- Inference：嚴格掃描後，tracked source 沒有 OpenAI sk-proj 形狀命中；剩餘 source 命中位於 test，可能是 dummy fixture 或 redaction 測試，但未人工確認前仍列 P0。
- Next probe / repair plan：確認 src/lib/backend/observability/observability-service.test.ts:121 的 token 是否為 dummy；若是，改成明確不可能被誤判的 fixture 名稱。

## P0-SUPABASE-SERVICE-ROLE-BOUNDARY - Supabase service role client 必須維持 server-only

- Severity：P0
- Evidence：
- src/lib/supabase/admin.ts
- src/lib/backend/notebooks/notebook-repository.ts:7:} from "@/lib/supabase/admin";
- src/lib/backend/runtime/agent-runtime-repository.ts:14:} from "@/lib/supabase/admin";
- src/lib/backend/workspace/workspace-state-entity-repository.ts:6:} from "@/lib/supabase/admin";
- src/lib/backend/sync/sync-operation-repository.ts:6:} from "@/lib/supabase/admin";
- src/lib/backend/artifacts/artifact-repository.ts:12:} from "@/lib/supabase/admin";
- src/lib/backend/workspace/workspace-permission.ts:6:} from "@/lib/supabase/admin";
- src/lib/backend/api/idempotency-repository.ts:6:} from "@/lib/supabase/admin";
- src/lib/backend/workspace/workspace-snapshot-repository.ts:6:} from "@/lib/supabase/admin";
- Inference：目前引用多在 src/lib/backend/** 與 API route，方向看起來合理；但任何前端 bundle 匯入都會是嚴重事故。
- Next probe / repair plan：保留/強化 frontend-bundle-safety test，下一輪做 bundle/static import gate。

## P0-NEXUS-STORE-GOD-OBJECT - nexus-store.ts 同時承擔狀態、persistence、Supabase sync、runtime/provider 邊界

- Severity：P0
- Evidence：
- src/store/nexus-store.ts
- 19 internal deps
- 4814 src/store/nexus-store.ts
- Inference：模組化前若未建立 slice contract，容易破壞 runtime/history/cloud sync。
- Next probe / repair plan：先產 contract map 與 characterization tests，再拆 slice。

## P0-NEXUS-OPS-BLAST-RADIUS - nexus-ops.tsx 9653 行且 fan-out 最高

- Severity：P0
- Evidence：
- src/components/nexus/nexus-ops.tsx
- 50 internal deps
- 81 src/components/nexus/nexus-ops.tsx
- Inference：它是 UI shell 與 domain glue 的混合體；直接重構會牽動 UI、provider、storage、auth、workflow。
- Next probe / repair plan：先拆純 presentational panels，不先碰 auth/provider/storage authority。

## P1-IMPORT-CYCLES - 自製 import graph 發現 9 組疑似循環

- Severity：P1
- Evidence：
- src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/events.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/observability-types.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/system-event-repository.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- Inference：多數落在 backend observability/index barrel 與 nexus-types 互相依賴，可能影響測試隔離與 bundle 邊界。
- Next probe / repair plan：下一輪用 TypeScript AST/Serena 精查，避免只靠 regex 誤判。

## P1-KNIP-UNUSED-CANDIDATES - Knip report-only 回報 113 個疑似未使用檔案

- Severity：P1
- Evidence：
- src candidates: 111
- docs/agent-runs/private-code-wiki-premium-report-20260605-0846/reports/knip/knip.json
- Inference：Knip 在 Next.js dynamic route/test/generated report 下可能有 false positive；不可自動刪。
- Next probe / repair plan：下一輪分成 confirmed unused / route-convention / test-only / report artifact。

## P1-SUPABASE-LOCAL-CONFIG-MISSING - Supabase migrations 存在，但 local config/CLI 不完整

- Severity：P1
- Evidence：
- supabase/migrations/*.sql
- supabase_config_missing
- supabase_cli_not_found
- Inference：目前可做靜態 map，但不能 local schema diff 或 types regeneration。
- Next probe / repair plan：若要下一輪 schema parity，先建立 local-only Supabase config，不 link production。

## P2-DEPCRUISER-CONFIG-GAP - dependency-cruiser 無 config 時解析 alias 不完整

- Severity：P2
- Evidence：
- reports/dependency-cruiser/dependency-cruiser-internal-summary.json: dependencies=1
- assets/data/import-graph.json: internalEdgeCount=1317
- Inference：需要 tsconfig-aware depcruise config 才能當正式 gate。
- Next probe / repair plan：新增 report-only config 或採 custom import graph 作 interim gate。
