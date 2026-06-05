# 02 Supabase Map

## 這是什麼

Supabase 是本專案後端核心。這份 map 只做 local/static 分析，沒有登入、link、push、部署或操作 production。

## Client 初始化

| 類型 | 檔案 | Env | 風險 |
|---|---|---|---|
| Browser/runtime anon client | src/lib/supabase/client.ts | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | public anon key 可存在前端，但安全依賴 RLS |
| Server admin client | src/lib/supabase/admin.ts | NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | P0：不可進 browser bundle |
| Request scoped client | src/lib/supabase/request.ts | public URL/anon + request access token | token header 必須 request-scoped |

## Touchpoints

- Supabase touchpoint files：137
- Tables detected：24
- RPC detected：record_permission_audit_log
- Dynamic storage bucket：nexus-generated-assets
- Auth-related files：74
- Realtime files：1
- Migrations：25
- RLS/policy migrations：22

## 前端 / 後端依賴最多的 Supabase 檔案

- 137 docs/style-system/execution-runs/20260529-163524+1000/CHECKPOINTS.md
-   57 docs/style-system/execution-runs/20260529-163524+1000/PROGRESS.md
-   56 src/lib/supabase/database.types.ts
-   37 docs/workflow-pro/account-matrix-screen-run.manifest.json
-   29 src/lib/supabase/client.ts
-   28 docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-20260604T175417Z/events.ndjson
-   27 src/store/nexus-store.ts
-   25 docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/v23-blackbox-rerun-20260604T185712Z/events.ndjson
-   24 src/components/nexus/nexus-ops.tsx
-   23 src/store/nexus-store.test.ts
-   21 src/lib/backend/artifacts/artifact-service.test.ts
-   19 src/lib/state-sync.ts
-   19 docs/workflow-pro/account-matrix-preview-verification.md
-   18 src/lib/supabase/request.ts
-   18 src/lib/backend/workspace/workspace-permission-request.test.ts

## Storage 補充

Literal .storage.from('bucket') 掃描沒有命中，但 src/lib/backend/image-generation/generated-image-asset-storage.ts 使用 GENERATED_IMAGE_STORAGE_BUCKET = nexus-generated-assets，並呼叫 client.storage.from(GENERATED_IMAGE_STORAGE_BUCKET).upload/download。對應 migration：supabase/migrations/20260604093000_v22_generated_image_storage.sql。

## 風險

- Service role 必須 server-only。引用目前集中在 src/lib/backend/** 與 API route，但要保留 bundle safety gate。
- Generated image storage 依賴 request-scoped token、bucket policy、path normalization。拆 image/provider/artifact 時不能只看 UI。
- .env.local 有 public Supabase URL/anon key 與 OpenAI image model/key，報告只記錄 presence，不輸出值。
- Supabase CLI 本機不存在，supabase/config.toml 缺失；因此本輪不能做 local schema parity。

## Machine-readable 摘要

    {
      "clients": [
        {
          "file": "src/lib/supabase/client.ts",
          "mode": "browser/runtime public anon client",
          "env": [
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY"
          ],
          "risk": "public anon key acceptable; must keep RLS correct"
        },
        {
          "file": "src/lib/supabase/admin.ts",
          "mode": "server admin client",
          "env": [
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY"
          ],
          "risk": "P0 if imported by client component or bundled to browser"
        },
        {
          "file": "src/lib/supabase/request.ts",
          "mode": "server request-scoped anon client with bearer token",
          "env": [
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY"
          ],
          "risk": "authorization header must stay request scoped"
        }
      ],
      "tables": [
        "agent_memory_records",
        "agent_runtime_events",
        "agent_runtime_sessions",
        "agent_tasks",
        "api_idempotency_keys",
        "artifact_references",
        "artifacts",
        "deployment_checks",
        "feature_flags",
        "messages",
        "notebooks",
        "permission_audit_logs",
        "prompt_revisions",
        "prompts",
        "sync_operations",
        "system_events",
        "tool_permissions",
        "tool_runs",
        "usage_metrics",
        "workflow_templates",
        "workspace_memberships",
        "workspace_snapshots",
        "workspace_state_entities",
        "workspaces"
      ],
      "rpcs": [
        "record_permission_audit_log"
      ],
      "dynamicStorageBuckets": [
        {
          "bucket": "nexus-generated-assets",
          "files": [
            "src/lib/backend/image-generation/generated-image-asset-storage.ts",
            "supabase/migrations/20260604093000_v22_generated_image_storage.sql"
          ],
          "usage": "generated image upload/download via request-scoped Supabase client"
        }
      ],
      "migrations": 25,
      "rlsMigrations": 22
    }
