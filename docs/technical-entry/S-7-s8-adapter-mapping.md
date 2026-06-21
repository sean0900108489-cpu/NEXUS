# S-7 → S-8 Adapter Mapping (v3.1 aligned)

## Routes

| Adapter expects | Actual route | Notes |
|----------------|-------------|-------|
| `POST /api/imports` | `POST /api/imports` | ✅ Matched — workspaceId in body |
| `POST /api/imports` | `POST /api/v1/workspaces/:id/imports` | Canonical S-7 route — workspaceId in URL |

Both routes share identical import logic. `/api/imports` exists specifically to match the default adapter in `src/lib/nexus-home/api.ts`.

## Request Payload (`POST /api/imports`)

```typescript
{
  workspaceId: string;              // required — target workspace
  sourceConversationId: string;     // required — global conversation to import
  messageIds?: string[];            // optional — v3.1 pack uses "messageIds"
  sourceMessageIds?: string[];      // optional — canonical name (also supported)
  title?: string;                   // optional
  note?: string;                    // optional
  importType?: "artifact" | "note" | "task" | "context_bundle";  // default: "context_bundle"
}
```

## Response Shape (200)

```typescript
{
  ok: true,
  importId: string;                    // unique import operation ID
  workspaceId: string;                 // target workspace
  importedResourceType: string;        // "artifact" | "note" | "task" | "context_bundle"
  importedResourceId: string;          // resource ID
  sourceGlobalConversationId: string;  // provenance
  sourceGlobalMessageIds: string[];    // provenance
  openUrl: string;                     // "/workspace/{workspaceId}"
  meta: {
    importedAt: string;                // ISO 8601
    importedBy: string;                // user ID
    title: string;
    note: string | null;
  };
  importedMessages: Array<{
    content: string;
    modelId: string | null;
    role: "user" | "assistant" | "system";
    sequence: number;
    sourceMessageId: string;
  }>;
}
```

## Error Contract

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_FAILED | Missing workspaceId, sourceConversationId, empty conversation |
| 401 | AUTH_REQUIRED | No valid session |
| 403 | WORKSPACE_ACCESS_DENIED | User not workspace member (editor+ required) |
| 403 | PERMISSION_DENIED | User does not own source conversation |
| 404 | VALIDATION_FAILED | Source conversation not found |

## Behavior Contract

| Property | Behavior |
|----------|----------|
| Copy mode | Global conversation unchanged. Messages copied to workspace context. |
| Delete global | Workspace copy unaffected (independent copy). |
| Delete workspace copy | Global source unaffected. |
| Provenance | `sourceGlobalConversationId` + `sourceGlobalMessageIds` always in response. |
| Duplicate import | Allowed — each import creates a new importId. No idempotency key. |
| Authorization | Editor+ workspace role required. |
| NOVA | Not touched. |
