import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { executeAiGatewayChatRequest } from "@/lib/backend/models/ai-gateway-service";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";
import { getCatalogModel } from "@/lib/backend/models/model-catalog";
import { getNexusSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildMultimodalContentParts } from "@/features/composer-attachments/shared/build-multimodal-content-parts";
import { guardImageAttachments, buildModelCapabilities } from "@/features/composer-attachments/shared/model-capability-guard";
import type { ComposerAttachmentReference } from "@/features/composer-attachments/shared/attachment-types";

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
      attachments?: ComposerAttachmentReference[];
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

    // 2. If no message and no attachments, return conversation only (create empty chat)
    if (!body.message?.trim() && !body.attachments?.length) {
      return Response.json({ conversation });
    }

    // 3. Refresh signed URLs for image attachments (TTL-safe)
    let resolvedAttachments = body.attachments ?? [];
    if (resolvedAttachments.length) {
      resolvedAttachments = await refreshAttachmentSignedUrls(resolvedAttachments);
    }

    // 4. Model capability guard for attachments
    const modelId = body.modelId ?? "gpt-4o-mini";
    const catalogModel = getCatalogModel(modelId);
    if (catalogModel && resolvedAttachments.length) {
      const capabilities = buildModelCapabilities(catalogModel);
      const hasImages = resolvedAttachments.some((a) => a.kind === "image");
      const guard = guardImageAttachments(hasImages, capabilities);
      if (!guard.ok) {
        throw new ApiError("VALIDATION_FAILED", guard.message, 400);
      }
    }

    // 5. Build multimodal content parts from user text + attachments (with fresh URLs)
    const userContent = buildMultimodalContentParts({
      userText: body.message ?? "",
      attachments: resolvedAttachments,
    });

    // 6. Call AI gateway FIRST (includes wallet gate + deduction)
    const requestId = crypto.randomUUID?.() ?? `gchat_${Date.now()}`;
    const aiResult = await executeAiGatewayChatRequest({
      body: {
        modelId,
        operatorId: `global-chat-${userId}`,
        messages: [
          ...conversation.messages.map((m) => ({
            content: m.content,
            role: m.role as "user" | "assistant" | "system",
          })),
          { content: userContent, role: "user" },
        ],
      },
      request,
      requestId,
    });

    // 7. AI succeeded — now persist user + assistant messages atomically
    const userText = typeof userContent === "string" ? userContent : body.message ?? "";
    const userSeq = await chatRepo.getNextSequence(conversationId);
    await chatRepo.addMessage({
      content: userText,
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

    // 8. Update conversation metadata
    await chatRepo.updateConversation({
      conversationId,
      lastMessageAt: new Date().toISOString(),
      messageCount: conversation.messageCount + 2,
      modelId: aiResult.modelId,
      title: conversation.messageCount === 0 ? userText.slice(0, 100) : undefined,
    });

    // 9. Return updated conversation
    const updated = await chatRepo.getConversation(conversationId);
    return Response.json({ conversation: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Refresh signed URLs for attachment references that use Supabase Storage keys.
 * Image attachments get fresh signed URLs; non-images keep their existing keys.
 * Storage keys that are already HTTP URLs are left as-is (already signed).
 */
async function refreshAttachmentSignedUrls(
  attachments: ComposerAttachmentReference[],
): Promise<ComposerAttachmentReference[]> {
  // Only refresh image attachments that have a storageKey in path format (not a URL)
  const needsRefresh = attachments.filter(
    (a) => a.kind === "image" && a.storageKey && !a.storageKey.startsWith("http"),
  );

  if (!needsRefresh.length) return attachments;

  try {
    const supabase = getNexusSupabaseAdminClient();
    const refreshed = await Promise.all(
      needsRefresh.map(async (a) => {
        try {
          const { data } = await supabase.storage
            .from("user-attachments")
            .createSignedUrl(a.storageKey!, 3600);
          return { ...a, storageKey: data?.signedUrl ?? a.storageKey };
        } catch {
          return a; // keep original if refresh fails
        }
      }),
    );

    // Merge refreshed back into the full list
    const refreshedMap = new Map(refreshed.map((a) => [a.id, a]));
    return attachments.map((a) => refreshedMap.get(a.id) ?? a);
  } catch {
    // If Supabase is unavailable, proceed with original keys (signed URL may be stale)
    console.warn("[global-chat] Failed to refresh attachment signed URLs");
    return attachments;
  }
}

function toErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  return Response.json(
    { error: { code: apiError.code, message: apiError.message } },
    { status: apiError.statusCode },
  );
}
