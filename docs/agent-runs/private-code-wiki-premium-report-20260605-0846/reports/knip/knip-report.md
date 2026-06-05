# Knip Report

## 邊界

Knip 只跑 report-only，沒有刪檔、沒有改 package。

## 結果

- Total issues：113
- Prefix counts：
- scripts: 1
- reports: 1
- src: 111

## 注意

Next.js dynamic routes、test fixtures、report artifacts 容易 false positive。這份報告只能作為疑點清單，不可直接自動刪檔。

## First src candidates

- src/components/nexus/dynamic-icon.tsx
- src/lib/adapters/image-adapter.ts
- src/lib/adapters/memory-compression-adapter.ts
- src/lib/api/nexus-api-client.ts
- src/lib/attachments/attachment-compiler-execution.ts
- src/lib/attachments/attachment-types.ts
- src/lib/backend/api/api-auth-test-helper.ts
- src/lib/backend/api/api-contract-service.ts
- src/lib/backend/api/api-errors.ts
- src/lib/backend/api/api-handler.ts
- src/lib/backend/api/idempotency-repository.ts
- src/lib/backend/api/index.ts
- src/lib/backend/api/memory-compress-service.ts
- src/lib/backend/api/route-compatibility.ts
- src/lib/backend/artifacts/artifact-constants.ts
- src/lib/backend/artifacts/artifact-materializer.ts
- src/lib/backend/artifacts/artifact-service.ts
- src/lib/backend/artifacts/index.ts
- src/lib/backend/contracts/feature-flags.ts
- src/lib/backend/contracts/idempotency.ts
- src/lib/backend/contracts/layering.ts
- src/lib/backend/contracts/permission.ts
- src/lib/backend/deployment/deployment-check-service.ts
- src/lib/backend/deployment/deployment-types.ts
- src/lib/backend/history/agent-memory-record-repository.ts
- src/lib/backend/history/history-constants.ts
- src/lib/backend/history/index.ts
- src/lib/backend/history/message-repository.ts
- src/lib/backend/image-generation/generated-image-asset-cache.ts
- src/lib/backend/image-generation/generated-image-asset-storage.ts
