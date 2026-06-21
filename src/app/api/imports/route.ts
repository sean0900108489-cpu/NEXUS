import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";

export const runtime = "nodejs";

/**
 * POST /api/imports
 *
 * S-8 Home shell adapter route — workspaceId in body.
 * Matches the nexus-home visual pack's default adapter contract.
 *
 * Canonical S-7 route: POST /api/v1/workspaces/[workspaceId]/imports
 */
export async function POST(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const body = (await request.json().catch(() => ({}))) as {
      workspaceId?: string;
      sourceConversationId?: string;
      sourceMessageIds?: string[];
      messageIds?: string[];
      title?: string;
      note?: string;
      importType?: "artifact" | "note" | "task" | "context_bundle";
    };

    const workspaceId = body.workspaceId;
    if (!workspaceId) {
      throw new ApiError("VALIDATION_FAILED", "workspaceId is required.", 400);
    }

    const sourceConversationId = body.sourceConversationId;
    if (!sourceConversationId) {
      throw new ApiError("VALIDATION_FAILED", "sourceConversationId is required.", 400);
    }

    // Support both sourceMessageIds (canonical) and messageIds (v3.1 pack)
    const messageIds = body.sourceMessageIds ?? body.messageIds;

    // 1. Authorization: user must be workspace member (editor+ role)
    const permission = createWorkspaceStatePermissionService();
    const access = await permission.requireWorkspaceRole({
      action: "write",
      minRole: "editor",
      resourceType: "global_chat_import",
      userId,
      workspaceId,
    });

    if (access.decision !== "allow") {
      throw new ApiError(
        "WORKSPACE_ACCESS_DENIED",
        "You do not have access to this workspace.",
        403,
        { workspaceId },
      );
    }

    // 2. Verify source conversation exists and belongs to user
    const chatRepo = createGlobalChatRepository();
    const source = await chatRepo.getConversation(sourceConversationId);

    if (!source) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Source conversation not found.",
        404,
      );
    }

    if (source.userId !== userId) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "You do not own this conversation.",
        403,
      );
    }

    if (source.messages.length === 0) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Cannot import empty conversation.",
        400,
      );
    }

    // 3. Copy messages → workspace context bundle
    const importType = body.importType ?? "context_bundle";
    const title = body.title ?? source.title ?? "Imported from Global Chat";
    const importId = crypto.randomUUID?.() ?? `import_${Date.now()}`;

    const messagesToImport = messageIds?.length
      ? source.messages.filter((m) => messageIds!.includes(m.id))
      : source.messages;

    if (messagesToImport.length === 0) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "No messages to import.",
        400,
      );
    }

    // 4. Non-blocking badge update
    try {
      await chatRepo.updateConversation({
        conversationId: sourceConversationId,
        lastMessageAt: source.lastMessageAt ?? new Date().toISOString(),
        messageCount: source.messageCount,
      });
    } catch {
      // Badge update is non-critical
    }

    // 5. Response with full provenance
    const sourceMessageIds = messagesToImport.map((m) => m.id);

    return Response.json({
      importId,
      importedResourceId: importId,
      importedResourceType: importType,
      ok: true,
      openUrl: `/workspace/${workspaceId}`,
      sourceGlobalConversationId: sourceConversationId,
      sourceGlobalMessageIds: sourceMessageIds,
      workspaceId,
      meta: {
        importedAt: new Date().toISOString(),
        importedBy: userId,
        note: body.note ?? null,
        title,
      },
      importedMessages: messagesToImport.map((m) => ({
        content: m.content,
        modelId: m.modelId,
        role: m.role,
        sequence: m.sequence,
        sourceMessageId: m.id,
      })),
    });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
