# S-9: NOVA Workspace-Scoped P0 Fix Design

**Phase:** G (NOVA Workspace Notebook)
**Depends on:** S-1 (Deduplication & Naming)
**Owner Locks:** FINAL-LOCK-3 (NOVA workspace-scoped from Phase 1)
**Status:** Design only — no implementation authorized

## Objective
Design the fix for NOVA's P0 security gaps: replace broad public RLS policies with workspace-scoped policies, add `workspace_id` to all NOVA tables, scope `match_nova_chunks` to workspace. Define the NOVA source map and ingestion/retrieval contract.

## Code Domains Touched (Design Reference Only)
- Supabase RLS policies for nova_documents, nova_chunks, nova_ingest_runs
- Supabase RPC `match_nova_chunks`
- Supabase SECURITY DEFINER functions (audit-only, not modified)

## Data Domains Touched (Design Reference Only)
- `nova_documents` — add workspace_id, fix RLS
- `nova_chunks` — add workspace_id, fix RLS
- `nova_ingest_runs` — add workspace_id, fix RLS
- `match_nova_chunks` RPC — add workspace_id parameter + filter

## What This Slice Designs

### 9.1 Current P0 State (Reference)

```
nova_documents: RLS enabled, policies use true (allow all), roles include anon/authenticated
nova_chunks: RLS enabled, policies use true (allow all), roles include anon/authenticated
nova_ingest_runs: RLS enabled, policies use true (allow all), roles include anon/authenticated
match_nova_chunks: public RPC, no workspace filter, unrestricted vector search

This is the documented P0 security gap from NEXUS Scan Task Brief §3.C.
```

### 9.2 Target Schema Changes (Design Only)

```
ADD COLUMN to nova_documents:
  workspace_id uuid NOT NULL REFERENCES workspaces(id)

ADD COLUMN to nova_chunks:
  workspace_id uuid NOT NULL REFERENCES workspaces(id)
  
ADD COLUMN to nova_ingest_runs:
  workspace_id uuid NOT NULL REFERENCES workspaces(id)

Note: user_id may be added as an audit column (who uploaded/ingested),
      but workspace_id is the PRIMARY security boundary per FINAL-LOCK-3.
```

### 9.3 Target RLS Policies (Design)

```
nova_documents:
  SELECT: workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid())
  INSERT: workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid())
  UPDATE: workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid())
  DELETE: workspace_id IN (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid())

nova_chunks:
  Same pattern as nova_documents (workspace membership check)

nova_ingest_runs:
  Same pattern as nova_documents (workspace membership check)

REMOVED: All broad policies using true for anon/authenticated.
```

### 9.4 match_nova_chunks RPC Scope (Design)

```
Current: match_nova_chunks(query_embedding, match_count)
Target: match_nova_chunks(query_embedding, match_count, workspace_id)

Add WHERE nova_chunks.workspace_id = $workspace_id before similarity search.
Remove public execute grant for anon role.
Grant execute only to authenticated role.
```

### 9.5 NOVA Source Map for Phase 1

Per FINAL-LOCK-3 (workspace-scoped), NOVA indexes these workspace-level sources:

| Source | Data Location | Phase 1 |
|--------|-------------|---------|
| Workspace metadata | workspaces.name, description | ✅ Index |
| Panel chat summaries | messages WHERE workspace_id = current | ✅ Index |
| Uploaded documents | nova_documents WHERE workspace_id = current | ✅ Index |
| Artifact metadata | artifacts WHERE workspace_id = current | ✅ Index |
| Imported main chats | messages WHERE workspace_id = current AND imported_from_global_chat_id IS NOT NULL | ✅ Index |
| Graph node prompts | agent_tasks (deferred) | — Later |
| Graph node outputs | agent_runtime_events (deferred) | — Later |
| Workflow results | workflow-pro (deferred) | — Later |
| Tool outputs | tool_runs (deferred) | — Later |

### 9.6 NOVA Ingestion Contract

```
POST /api/workspaces/{workspaceId}/nova/ingest
Body: { sourceType: 'document' | 'chat_summary' | 'artifact', sourceId: string }
Response: { ingestRunId: string, chunkCount: number }

Rules:
- Source must belong to workspace
- User must be workspace member
- Ingestion creates nova_ingest_runs row with workspace_id
- Chunks created with workspace_id
- Embedding stays Gemini Embedding 2 + pgvector HNSW (not replaced per FINAL-LOCK-3)
```

### 9.7 NOVA Retrieval Contract

```
POST /api/workspaces/{workspaceId}/nova/retrieve
Body: { query: string, maxResults?: number }
Response: { chunks: [{ content, sourceType, sourceId, similarity }] }

Rules:
- Search scoped to workspace_id via match_nova_chunks(embedding, count, workspace_id)
- Results include source provenance (which document/chat/artifact)
- Evidence inline citations per deferred D-9 (default: show in UI)
```

## Validation Method
- All 3 NOVA tables have workspace_id NOT NULL in design
- All 3 table RLS policies reference workspace_memberships check
- match_nova_chunks has workspace_id parameter + filter
- No broad policies remain in design (all true policies removed)
- Source map is explicit about what's Phase 1 vs deferred
- Ingestion and retrieval contracts are unambiguous

## Forbidden Areas
- Do not apply any RLS policy changes to live Supabase
- Do not add columns to nova_documents/chunks/ingest_runs
- Do not modify match_nova_chunks function
- Do not change embedding provider (Gemini Embedding 2 stays)
- Do not expand ingestion beyond Phase 1 source map
- Do not build NOVA ingestion pipeline — contract design only

## Dependency Order
After S-1. Before S-11 (CLI/MCP Resource Model references NOVA resources).

## Rollback / No-Op Validation
Only a design document produced. No RLS changed. No columns added. No functions modified. P0 gaps remain in live Supabase (unchanged from pre-design state).
