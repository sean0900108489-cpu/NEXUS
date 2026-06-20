# S-7 Compatibility Addendum: agent_id NULL Query Path & NOVA Import Source Selector

**Date:** 2026-06-20
**Slice:** S-7 Addendum
**Appends to:** S-7 Execution Report (Import-to-Workspace Contract Design)
**Status:** Compatibility clarification. No code changes.

---

## 1. agent_id = NULL Is DB-Compatible, But Query Path Must Be Resolved

### Issue

S-7 §3.3 and §5.1 set `agent_id = NULL` on imported messages. The `messages` table schema (`database.types.ts`) confirms `agent_id: string | null` — NULL is allowed at the database level. However, the existing `MessageRepository` / message query paths likely filter by `workspace_id + agent_id`. Imported messages with `agent_id = NULL` would be invisible to these queries.

### Clarification

**Phase 1 MUST choose one of two query strategies for imported workspace chat panels. The choice is a Phase 1 implementation decision, not a schema change.**

### Option A: Dedicated Imported Chat Panel Query

```
SELECT * FROM messages
WHERE workspace_id = :workspaceId
AND metadata->>'import_batch_id' = :importBatchId
ORDER BY metadata->>'source_sequence' ASC
```

- **Pros:** No schema change. No agent concept pollution. Clean separation.
- **Cons:** Metadata-based filter is not indexed by default. Requires a GIN index on `metadata` or a generated column for `import_batch_id`.
- **Index strategy:** `CREATE INDEX idx_messages_import_batch ON messages ((metadata->>'import_batch_id')) WHERE metadata->>'import_batch_id' IS NOT NULL` (partial index, deferred to implementation).

### Option B: System/Import Agent ID

```
-- Assign a synthetic agent_id to imported messages
agent_id = 'system_import'  -- or a UUID representing "Import Agent"
```

- **Pros:** Compatible with existing `workspace_id + agent_id` query patterns. No new query path needed.
- **Cons:** Pollutes the agent namespace. 'system_import' is not a real agent. NOVA indexing must explicitly exclude it from "agent history" unless imported content is desired. Breaks the semantic model: imported chat is not agent output.

### Recommendation

**Option A (dedicated query path) is preferred.** It preserves the semantic boundary: imported chat is NOT agent output. It avoids polluting the agent namespace. The GIN index on `metadata` is deferred to implementation phase — not a design concern.

If Option A is chosen, the following must be added to S-7 implementation:
1. Imported chat panel uses `import_batch_id` query, not `agent_id` query
2. Workspace message list queries add `WHERE agent_id IS NOT NULL` to exclude imported messages from normal agent history
3. GIN index on `metadata` added when DDL is authorized

---

## 2. NOVA Indexing Must Use Explicit Import Source Selector

### Issue

S-7 §7 states "workspace copy IS indexable by NOVA." This could be misread as NOVA automatically indexing all workspace messages, including imported ones, by default. Nova's normal indexing path may assume it's reading agent conversation history.

### Clarification

**NOVA indexing must distinguish between normal agent chat history and imported global chat content. Imported content must be ingested via an explicit import source selector, not assumed to be automatically included in the normal agent history ingestion path.**

### What This Means for S-9 (NOVA Workspace Notebook)

When S-9 designs NOVA ingestion:

1. **Normal agent chat:** NOVA indexes `messages WHERE workspace_id = :ws AND agent_id IS NOT NULL` (existing agent conversation history)
2. **Imported chat:** NOVA indexes `messages WHERE workspace_id = :ws AND metadata->>'imported' = 'true'` (imported global chat content)
3. **Combined workspace knowledge:** Both paths contribute to workspace knowledge, but they are ingested through separate selectors to avoid:
   - Imported content being misattributed to an agent
   - Agent history ingestion accidentally including imported messages if `agent_id IS NULL` is not filtered
   - Confusion about source provenance in NOVA evidence

### Import Source Type for NOVA

```
NOVA source types:
  - "agent_chat"       → messages WHERE agent_id IS NOT NULL
  - "imported_chat"    → messages WHERE metadata->>'imported' = 'true'
  - "uploaded_document" → nova_documents (future)
  - "artifact"         → artifacts (future)
```

Each source type has its own ingestion selector. NOVA's retrieval response includes `source_type` so evidence can show "From imported chat 'Project Discussion'" vs "From agent DeepSeek V4 Pro conversation."

---

## Impact on S-7

- S-7 §3.3: Add note that agent_id = NULL requires either Option A (dedicated query) or Option B (system agent ID). Recommend Option A.
- S-7 §5.1: Add index strategy note for GIN index on metadata (deferred to implementation).
- S-7 §7: Add NOVA import source selector requirement — imported content must be explicitly selected, not auto-ingested through normal agent history path.

---

## No Implementation Performed

Compatibility clarification only. No code written. No Git changes. No Supabase changes.
