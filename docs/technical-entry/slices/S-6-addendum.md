# S-6 Addendum: Import Column Clarification

**Date:** 2026-06-20
**Slice:** S-6 Addendum
**Appends to:** S-6 Execution Report (Global Conversations Domain Design)
**Status:** Clarification only. No code changes.

---

## 1. `imported_to_workspace_id` Is Phase 1 Badge Metadata, Not Full Provenance

### Issue

S-6 §2.1 defines `imported_to_workspace_id` on `global_conversations` as a single column. This could be misread as the full provenance model — tracking every import across all workspaces, with FK integrity, cascading updates, and bidirectional references.

### Clarification

**`imported_to_workspace_id` is a Phase 1 badge metadata column. It records the MOST RECENT import destination for display purposes only.**

- It is a convenience field so the Home sidebar can show "📋 Imported to [workspace name]" without a JOIN.
- It does NOT track multiple imports to different workspaces (each import overwrites it).
- It does NOT enforce FK integrity that would block workspace deletion.
- It does NOT create a bidirectional reference (the workspace copy has its own `imported_from_global_chat_id` — designed in S-7).
- If the workspace is deleted, `imported_to_workspace_id` is set to NULL (`ON DELETE SET NULL` is already in S-6 design).
- If the user re-imports the same conversation to a different workspace, the column is overwritten with the new workspace ID.

### Full Provenance Is a Future Concern

Phase 1: One badge column. Most recent import only.
Future: An `import_history` table or array column tracking all imports.

---

## 2. Global Delete Does Not Affect Workspace Copy

### Issue

S-6 §4.4 states CASCADE delete removes `imported_to_workspace_id`. This could be misread as the workspace copy being affected.

### Clarification

**Deleting a global conversation has ZERO effect on any workspace copy created by import (S-7).**

- S-7 Copy mode creates an INDEPENDENT copy in the workspace `messages` table.
- The copy has its own lifecycle, owned by the workspace.
- Deleting the global original does NOT cascade to the workspace copy.
- The workspace copy's `imported_from_global_chat_id` becomes a dangling reference (acceptable — it's provenance metadata, not a live FK).
- This is by design: Copy mode means independence. The user's global chat cleanup should never destroy workspace content.

**Contrast with hypothetical Move mode (not Phase 1):** Move would transfer ownership and the global original would be deleted. Copy preserves both.

---

## Impact on S-7

- S-7 must design the workspace copy with `imported_from_global_chat_id` as a metadata column, not a live FK
- S-7 must explicitly state: "Global delete does not cascade to workspace copy"
- S-7 must handle the dangling reference case gracefully (show "Original deleted" or nothing)

---

## No Implementation Performed

Clarification addendum only. No code written. No Git changes. No Supabase changes.
