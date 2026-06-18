# Supabase Touchpoint Map — NEXUS // AI OPS

## Overview

| Metric | Count |
|---|---|
| Database table interfaces (database.types.ts) | 26 |
| Supabase migration files | 28 |
| Supabase client files | 5 |
| Storage buckets (from migrations) | 1 |

---

## Database Table Inventory

All table interfaces are defined in `src/lib/supabase/database.types.ts` (874 lines). The 26 tables:

### Core Identity Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `workspaces` | `Workspaces` | Foundation | Workspace identity (id, name, owner) |
| `workspace_memberships` | `Workspace_Memberships` | 20260527000000 | User-workspace role memberships |
| `workspace_agents` | `Workspace_Agents` | (early) | Agent-to-workspace assignments |
| `agent_profiles` | `Agent_Profiles` | (early) | Agent profile templates |

### Cloud State Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `workspace_snapshots` | `Workspace_Snapshots` | 20260527002000 | Durable workspace snapshots for restore |
| `workspace_state_entities` | `Workspace_State_Entities` | 20260527002000 | Rebuildable projection cache |

### Messaging & History Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `messages` | `Messages` | 20260527012000 | Chat message history with paging |
| `agent_memory_records` | `Agent_Memory_Records` | (in migrations) | Durable agent memory blocks |

### Agent Runtime Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `agent_runtime_sessions` | `Agent_Runtime_Sessions` | 20260527005000 | Agent runtime session tracking |
| `agent_tasks` | `Agent_Tasks` | 20260527005000 | Agent task lifecycle |
| `agent_runtime_events` | `Agent_Runtime_Events` | 20260527005000 | Milestone runtime events |

### Tool Execution Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `tool_runs` | `Tool_Runs` | 20260527006000 | Tool run control plane state |
| `tool_permissions` | `Tool_Permissions` | 20260527006000 | Tool permission switches |

### Artifact Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `artifacts` | `Artifacts` | 20260527007000 | Generated artifact records |
| `artifact_references` | `Artifact_References` | 20260527007000 | Artifact reference/provenance graph |

### Sync Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `sync_operations` | `Sync_Operations` | 20260527003000 | Durable sync operation queue |
| `api_idempotency_keys` | `Api_Idempotency_Keys` | 20260527001000 | Server-side idempotency |

### Deployment & Feature Flag Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `feature_flags` | `Feature_Flags` | 20260527004000 | Feature flag management |
| `deployment_checks` | `Deployment_Checks` | 20260527004000 | Deployment preflight records |

### Content Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `notebooks` | `Notebooks` | 20260527010000 | Datapad/notebook durable storage |
| `prompts` | `Prompts` | 20260527011000 | Prompt vault durable storage |
| `prompt_revisions` | `Prompt_Revisions` | 20260527013000 | Prompt edit history |
| `workflow_templates` | `Workflow_Templates` | 20260525000000 | Reusable workflow blueprints |

### Observability Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `system_events` | `System_Events` | 20260527008000 | System trace events |
| `usage_metrics` | `Usage_Metrics` | 20260527008000 | Usage metric records |

### Model & Billing Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `model_usage_ledger` | (in migrations) | 20260609001000 | Model usage accounting |
| `user_new_api_tokens` | (in migrations) | 20260610002000 | User New API token storage |

### Security Audit Tables
| Table | Interface | Migration | Purpose |
|---|---|---|---|
| `permission_audit_logs` | `Permission_Audit_Logs` | (RPC migration) | Permission decision audit trail |

---

## Supabase Client Files

| File | Lines | Purpose |
|---|---|---|
| `src/lib/supabase/client.ts` | ~90 | Browser/client-side Supabase client singleton |
| `src/lib/supabase/admin.ts` | — | Server-side admin client (service_role) |
| `src/lib/supabase/request.ts` | — | Per-request server client |
| `src/lib/supabase/database.types.ts` | 874 | TypeScript type definitions for all 26 tables |
| `src/lib/supabase/test-connection.ts` | — | Connection testing utility |

---

## Client Configuration Flow

```
1. Build time: process.env.NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
     ↓
2. Runtime fetch: GET /api/v1/public-config → { supabase: { url, anonKey, configured } }
     ↓
3. Singleton: createNexusSupabaseClient() → createClient<Database>(url, anonKey)
     ↓
4. Usage: getNexusSupabaseClient() everywhere in frontend code
```

**Source**: `src/lib/supabase/client.ts` — `ensureNexusSupabaseClientConfigured()`, `fetchRuntimeConfig()`

---

## RLS Policy Regime (from migrations)

The V20/V22 migrations implement:
- **Server-only tables**: No anon/authenticated access (idempotency_keys, deployment_checks)
- **Client tables**: Authenticated access with RLS policies checking workspace membership
- **Admin functions**: SECURITY DEFINER RPCs for session management, permission audit logs
- **Grant hardening**: Explicit REVOKE of anon grants, then GRANT only required DML to authenticated

**Key RPC functions**:
- `nexus_ensure_workspace_session()` — Workspace session binding (20260603002000, 20260604081500)
- `record_permission_audit_log()` — Permission decision recording (20260604102000)
- `set_user_new_api_tokens_updated_at()` — Token timestamp trigger (20260610002000)

---

## Storage Buckets

| Bucket | Migration | Purpose |
|---|---|---|
| `nexus-generated-assets` | 20260604093000 | Generated image assets (png/jpeg/webp/gif, 20MB limit) |

---

## Migration Chronology

| Date | Migration | Key Additions |
|---|---|---|
| 2026-05-25 | `00000` | `workflow_templates` table |
| 2026-05-27 | `00000` | `workspace_memberships`, RLS foundation |
| 2026-05-27 | `01000` | `api_idempotency_keys` |
| 2026-05-27 | `02000` | `workspace_snapshots`, `workspace_state_entities` |
| 2026-05-27 | `03000` | `sync_operations` |
| 2026-05-27 | `04000` | `feature_flags`, `deployment_checks` |
| 2026-05-27 | `05000` | `agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events` |
| 2026-05-27 | `06000` | `tool_runs`, `tool_permissions` |
| 2026-05-27 | `07000` | `artifacts` extension, `artifact_references` |
| 2026-05-27 | `08000` | `system_events`, `usage_metrics` |
| 2026-05-27 | `09000` | `messages` extension (paging fields) |
| 2026-05-27 | `10000` | `notebooks` (tombstone support) |
| 2026-05-27 | `11000` | `prompts` (tombstone support) |
| 2026-05-27 | `12000` | `messages` base table guard |
| 2026-05-27 | `13000` | `prompt_revisions` |
| 2026-05-29 | `01000` | Artifacts + tool_runs live parity repair |
| 2026-06-01 | `01000` | V20 auth boundary RLS hardening |
| 2026-06-01 | `02000` | V20 client grant hardening |
| 2026-06-01 | `03000` | V20 schema live parity repair |
| 2026-06-01 | `04000` | V20 grant tightening |
| 2026-06-03 | `01000` | V22 RLS policy performance hardening |
| 2026-06-03 | `02000` | V22 workspace session RPC |
| 2026-06-04 | `081500` | V22 workspace session viewer-readable repair |
| 2026-06-04 | `093000` | V22 generated image storage bucket |
| 2026-06-04 | `102000` | V22 permission audit RPC |
| 2026-06-09 | `001000` | `model_usage_ledger` |
| 2026-06-10 | `002000` | `user_new_api_tokens` |
| 2026-06-10 | `043000` | Model usage ledger source type + nullable tokens |

---

## Supabase Touchpoint Count

| Category | Count |
|---|---|
| Database tables | 26 |
| Migration files | 28 |
| Client library files | 5 |
| Storage buckets | 1 |
| SECURITY DEFINER RPCs | 3 |
| **Total Supabase touchpoints** | **63** |

---

*Evidence: Table names from `src/lib/supabase/database.types.ts` interface list; migrations from `supabase/migrations/*.sql` file headers; client code from `src/lib/supabase/client.ts`*
*All migration chronologies derived from file creation dates and migration content*
