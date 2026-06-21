# S-7 → S-8 Adapter Mapping

## Actual S-7 Route

```
POST /api/v1/workspaces/:workspaceId/imports
```

## Request Payload

```typescript
{
  sourceConversationId: string;          // required — global conversation to import
  sourceMessageIds?: string[];           // optional — filter specific messages; default = all
  title?: string;                       // optional — title for the imported resource
  note?: string;                        // optional — note/description
  importType?: "artifact" | "note" | "task" | "context_bundle";  // default: "context_bundle"
}
```

## Response Shape (200)

```typescript
{
  importId: string;                     // unique import operation ID
  workspaceId: string;                  // target workspace
  createdResourceType: "artifact" | "note" | "task" | "context_bundle" | "workspace_message" | "unknown";
  createdResourceId: string;            // resource ID within workspace
  source: {
    globalConversationId: string;       // provenance: source conversation
    globalMessageIds: string[];         // provenance: source message IDs
  };
  importedMessages: Array<{
    content: string;                    // message text
    modelId: string | null;             // model that generated this message
    role: "user" | "assistant" | "system";
    sequence: number;                   // original message order
    sourceMessageId: string;            // link back to global_messages.id
  }>;
  meta: {
    title: string;
    note: string | null;
    importedAt: string;                 // ISO 8601
    importedBy: string;                 // user ID
  };
  openUrl: string;                      // e.g., "/workspace/{workspaceId}"
}
```

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_FAILED | Missing sourceConversationId, empty conversation, no messages to import |
| 401 | AUTH_REQUIRED | No valid session |
| 403 | WORKSPACE_ACCESS_DENIED | User not workspace member (editor+ required) |
| 403 | PERMISSION_DENIED | User does not own the source conversation |
| 404 | VALIDATION_FAILED | Source conversation not found |

## S-8 Adapter Code

In `src/lib/nexus-home/api.ts` (from handoff pack), map `importToWorkspace` to:

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
        importType: input.importType,
      }),
    }
  );
}
```

## Behavior Contract

| Property | Behavior |
|----------|----------|
| Copy mode | Global conversation unchanged. Messages copied to workspace context. |
| Delete global source | Workspace copy unaffected (copy lives in workspace, not linked). |
| Delete workspace copy | Global source unaffected. |
| Provenance | `source.globalConversationId` and `source.globalMessageIds` preserved in response. |
| Workspace membership | Editor+ role required. Validated via PermissionService.requireWorkspaceRole. |
| NOVA | Not touched. No NOVA indexing triggered. |
