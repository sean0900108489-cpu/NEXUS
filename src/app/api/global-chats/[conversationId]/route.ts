import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";

export const runtime = "nodejs";

/**
 * GET /api/global-chats/{conversationId}
 *
 * Get a single conversation with all its messages.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const { conversationId } = await params;
    const repo = createGlobalChatRepository();
    const conversation = await repo.getConversation(conversationId);

    if (!conversation) {
      throw new ApiError("VALIDATION_FAILED", "Conversation not found.", 404);
    }
    if (conversation.userId !== userId) {
      throw new ApiError("PERMISSION_DENIED", "Access denied.", 403);
    }

    return Response.json({ conversation });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
