# S-7 → S-8 Adapter Mapping (Updated — S-7B durable persistence)

## Actual S-7 Route

```
POST /api/v1/workspaces/:workspaceId/imports
```

## Durable Persistence

The import endpoint creates a **durable workspace artifact** via `artifactService.createArtifact()`.

- `createdResourceId` = real `artifacts.id` in the workspace (UUID, persistent).
- `createdResourceType` = `"context_bundle"` (default) or caller's `importType`.
- Artifact type = `"context_bundle"` by default — visible in workspace artifact panel.
- Deleting the artifact does NOT affect the global source.
- Deleting the global source does NOT affect the artifact (copy, not link).
- Provenance is stored in `artifacts.metadata.provenance`.

## Request Payload

```typescript
{
  sourceConversationId: string;          // required — global conversation to import
  sourceMessageIds?: string[];           // optional — filter specific messages; default = all
  title?: string;                       // optional — title for the artifact
  note?: string;                        // optional — note stored in artifact metadata
  importType?: "artifact" | "note" | "task" | "context_bundle";  // default: "context_bundle"
}
```

## Response Shape (200)

```typescript
{
  importId: string;                     // import operation index (UUID)
  workspaceId: string;                  // target workspace
  createdResourceType: "context_bundle";
  createdResourceId: string;            // REAL artifacts.id — durable, queryable
  source: {
    globalConversationId: string;       // provenance: source conversation
    globalMessageIds: string[];         // provenance: source message IDs
  };
  meta: {
    title: string;
    note: string | null;
    importedAt: string;                 // ISO 8601
    importedBy: string;                 // user ID
  };
  openUrl: string;                      // e.g., "/workspace/{workspaceId}"
}
```

**Key change from S-7A:** `createdResourceId` is now a real `artifacts.id`, not a transient UUID. The artifact is persisted to the workspace's artifact store with full provenance metadata.

## What the artifact contains

- `artifacts.type` = `"context_bundle"`
- `artifacts.content_text` = formatted transcript of all imported messages
- `artifacts.title` = `"{title} — {N} messages"`
- `artifacts.metadata.provenance` = `{ sourceType, globalConversationId, globalMessageIds, globalMessageCount }`
- `artifacts.source_message_id` = last imported message ID

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_FAILED | Missing sourceConversationId, empty conversation, no messages to import |
| 401 | AUTH_REQUIRED | No valid session |
| 403 | WORKSPACE_ACCESS_DENIED | User not workspace member (editor+ required) |
| 403 | PERMISSION_DENIED | User does not own the source conversation |
| 404 | VALIDATION_FAILED | Source conversation not found |

## S-8 Adapter Code

In `src/lib/nexus-home/api.ts`:

```typescript
importToWorkspace(input: ImportToWorkspaceInput): Promise<ImportToWorkspaceResult> {
  return requestJson<ImportToWorkspaceResult>(
    `/api/v1/workspaces/${input.workspaceId}/imports`,
    {
      method: 'POST',
      body: JSON.stringify({
        sourceConversationId: input.sourceConversationId,
        sourceMessageIds: input.sourceMessageId ? [input.sourceMessageId] : undefined,
        title: input.title,
        importType: input.importType ?? 'context_bundle',
      }),
    }
  );
}
```

## How S-8 Should Use the Response

1. **Show success state:** "Imported to {workspaceName}" with `openUrl` as CTA.
2. **createdResourceId is real:** S-8 can deep-link to the artifact: `openUrl = /workspace/{workspaceId}` (artifacts are shown in workspace panel).
3. **Provenance is preserved:** `source` → S-8 can display "Imported from: {title}" badge.
4. **Re-import is allowed:** No dedup check. Each import creates a new artifact.
