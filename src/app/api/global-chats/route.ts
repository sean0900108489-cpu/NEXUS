import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";

export const runtime = "nodejs";

/**
 * GET /api/global-chats
 *
 * List recent global conversations for the authenticated user.
 * Paginated by cursor.
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20),
      50,
    );
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const repo = createGlobalChatRepository();
    const result = await repo.getRecentChats({ cursor, limit, userId });

    return Response.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}

/**
 * DELETE /api/global-chats?conversationId=...
 *
 * Delete a global conversation and all its messages.
 */
export async function DELETE(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) {
      throw new ApiError("VALIDATION_FAILED", "conversationId is required.", 400);
    }

    const repo = createGlobalChatRepository();
    const conversation = await repo.getConversation(conversationId);
    if (!conversation) {
      throw new ApiError("VALIDATION_FAILED", "Conversation not found.", 404);
    }
    if (conversation.userId !== userId) {
      throw new ApiError("PERMISSION_DENIED", "Access denied.", 403);
    }

    await repo.deleteConversation(conversationId);

    return Response.json({ ok: true });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
