import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { executeAiGatewayChatRequest } from "@/lib/backend/models/ai-gateway-service";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";

export const runtime = "nodejs";

/**
 * POST /api/global-chat
 *
 * Create a new global conversation or continue an existing one.
 * Uses the ai-gateway-service for the actual LLM call.
 * Messages are persisted to global_conversations + global_messages
 * ONLY after the AI call succeeds (to avoid orphan messages).
 */
export async function POST(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
      modelId?: string;
      conversationId?: string;
    };

    const chatRepo = createGlobalChatRepository();

    // 1. Resolve or create conversation
    let conversationId = body.conversationId;
    let conversation: {
      messages: { content: string; role: string }[];
      messageCount: number;
      id: string;
      userId: string;
    };

    if (conversationId) {
      const existing = await chatRepo.getConversation(conversationId);
      if (!existing) {
        throw new ApiError("VALIDATION_FAILED", "Conversation not found.", 404);
      }
      if (existing.userId !== userId) {
        throw new ApiError("PERMISSION_DENIED", "Access denied.", 403);
      }
      conversation = existing;
    } else {
      const created = await chatRepo.createConversation({
        modelId: body.modelId,
        title: body.message?.slice(0, 100) ?? undefined,
        userId,
      });
      conversationId = created.id;
      conversation = { ...created, messages: [] };
    }

    // 2. If no message, return conversation only (create empty chat)
    if (!body.message?.trim()) {
      return Response.json({ conversation });
    }

    // 3. Call AI gateway FIRST (includes wallet gate + deduction)
    //    Messages are constructed in-memory; persisted only on success.
    const requestId = crypto.randomUUID?.() ?? `gchat_${Date.now()}`;
    const aiResult = await executeAiGatewayChatRequest({
      body: {
        modelId: body.modelId ?? "gpt-4o-mini",
        operatorId: `global-chat-${userId}`,
        messages: [
          ...conversation.messages.map((m) => ({
            content: m.content,
            role: m.role as "user" | "assistant" | "system",
          })),
          { content: body.message, role: "user" },
        ],
      },
      request,
      requestId,
    });

    // 4. AI succeeded — now persist user + assistant messages atomically
    const userSeq = await chatRepo.getNextSequence(conversationId);
    await chatRepo.addMessage({
      content: body.message,
      conversationId,
      role: "user",
      sequence: userSeq,
    });

    const assistantSeq = await chatRepo.getNextSequence(conversationId);
    await chatRepo.addMessage({
      content: aiResult.content,
      conversationId,
      modelId: aiResult.modelId,
      role: "assistant",
      sequence: assistantSeq,
      usage: {
        credits: aiResult.usage.credits,
        inputTokens: aiResult.usage.inputTokens,
        outputTokens: aiResult.usage.outputTokens,
        totalTokens: aiResult.usage.totalTokens,
      },
    });

    // 5. Update conversation metadata
    await chatRepo.updateConversation({
      conversationId,
      lastMessageAt: new Date().toISOString(),
      messageCount: conversation.messageCount + 2,
      modelId: aiResult.modelId,
      title: conversation.messageCount === 0 ? body.message.slice(0, 100) : undefined,
    });

    // 6. Return updated conversation
    const updated = await chatRepo.getConversation(conversationId);
    return Response.json({ conversation: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  return Response.json(
    { error: { code: apiError.code, message: apiError.message } },
    { status: apiError.statusCode },
  );
}
