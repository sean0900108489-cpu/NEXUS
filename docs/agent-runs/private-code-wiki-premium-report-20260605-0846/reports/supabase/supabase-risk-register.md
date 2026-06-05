# Supabase Risk Register

## P0

- Service role boundary：src/lib/supabase/admin.ts 只能 server-side。Evidence：src/lib/backend/security/frontend-bundle-safety.test.ts 已有 bundle safety test。
- Generated image storage：nexus-generated-assets bucket 需要 RLS/storage policy 與 request token 一致。Evidence：src/lib/backend/image-generation/generated-image-asset-storage.ts、supabase/migrations/20260604093000_v22_generated_image_storage.sql。

## P1

- Supabase CLI missing / config missing：本輪不能 local schema diff。
- 24 tables / 1 RPC / 25 migrations 的 mapping 需要下一輪和 generated types 對齊。
- Auth files 多達 74，重構時要保留 session/request boundary。

## P2

- Storage literal scan 需要補 AST/symbol-level，因為 bucket 透過 constant 使用。
- Realtime 只有 1 個 file 靜態命中，需下一輪確認是否是實際 subscription。
