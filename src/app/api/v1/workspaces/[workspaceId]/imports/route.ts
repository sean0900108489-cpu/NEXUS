import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { createArtifactService } from "@/lib/backend/artifacts/artifact-service";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";

export const runtime = "nodejs";

/**
 * POST /api/v1/workspaces/[workspaceId]/imports
 *
 * Durable copy-only import: global conversation → workspace artifact.
 *
 * COPY-ONLY contract:
 * - Global source remains intact.
 * - Workspace receives a durable artifact (type: context_bundle) with full provenance.
 * - createdResourceId points to a real artifacts.id in the workspace.
 * - Deleting the artifact does NOT affect the global source.
 * - Deleting the global source does NOT affect the artifact.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const { workspaceId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      sourceConversationId?: string;
      sourceMessageIds?: string[];
      title?: string;
      note?: string;
      importType?: "artifact" | "note" | "task" | "context_bundle";
    };

    const sourceConversationId = body.sourceConversationId;
    if (!sourceConversationId) {
      throw new ApiError("VALIDATION_FAILED", "sourceConversationId is required.", 400);
    }

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

    // 3. Collect messages to import
    const messagesToImport = body.sourceMessageIds?.length
      ? source.messages.filter((m) => body.sourceMessageIds!.includes(m.id))
      : source.messages;

    if (messagesToImport.length === 0) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "No messages to import.",
        400,
      );
    }

    // 4. Build context_bundle content from imported messages
    const importType = body.importType ?? "context_bundle";
    const title = body.title ?? source.title ?? "Imported from Global Chat";

    const contentText = messagesToImport
      .map((m) => `[${m.role === "user" ? "You" : "Assistant"}] ${m.content}`)
      .join("\n\n---\n\n");

    const sourceMessageIds = messagesToImport.map((m) => m.id);
    const importIndex = crypto.randomUUID?.() ?? `import_${Date.now()}`;

    // 5. Persist as durable workspace artifact
    const artifactService = createArtifactService();
    const artifact = await artifactService.createArtifact(
      {
        contentText,
        metadata: {
          importIndex,
          importNote: body.note ?? null,
          importType,
          provenance: {
            sourceType: "global_conversation",
            globalConversationId: sourceConversationId,
            globalMessageIds: sourceMessageIds,
            globalMessageCount: messagesToImport.length,
          },
          sourceTitle: source.title ?? "New Chat",
          sourceModelId: source.modelId,
        },
        sourceMessageId: sourceMessageIds[sourceMessageIds.length - 1] ?? null,
        title: `${title} — ${sourceMessageIds.length} messages`,
        type: importType,
        workspaceId,
      },
      { userId },
    );

    // 6. Mark source conversation as imported (badge data, non-blocking)
    try {
      await chatRepo.updateConversation({
        conversationId: sourceConversationId,
        lastMessageAt: source.lastMessageAt ?? new Date().toISOString(),
        messageCount: source.messageCount,
      });
    } catch {
      // Badge update is non-critical
    }

    // 7. Build response with full provenance
    const result = {
      createdResourceId: artifact.artifact.id,
      createdResourceType: importType as
        | "artifact" | "note" | "task" | "context_bundle" | "workspace_message" | "unknown",
      importId: importIndex,
      meta: {
        importedAt: new Date().toISOString(),
        importedBy: userId,
        note: body.note ?? null,
        title,
      },
      openUrl: `/workspace/${workspaceId}`,
      source: {
        globalConversationId: sourceConversationId,
        globalMessageIds: sourceMessageIds,
      },
      workspaceId,
    };

    return Response.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
