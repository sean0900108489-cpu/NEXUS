import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
import type { AgentMessageRole } from "@/lib/nexus-types";
import type { ChatContentPart } from "@/features/composer-attachments/shared/build-multimodal-content-parts";

import {
  assertModelAllowedForPlan,
  assertRequestedFeaturesAllowed,
  getCatalogModel,
} from "./model-catalog";
import { callNewApiChatCompletion } from "./new-api-chat-service";
import {
  estimateModelCredits,
  getUserPlan,
  isModelAllowedByPlan,
} from "./plan-config";
import { assertSufficientCredits } from "./quota-gate";
import {
  createUsageLedgerRepository,
  type UsageLedgerRepository,
} from "./usage-ledger";
import { createWalletRepository } from "./wallet-repository";

export type AiGatewayChatMessage = {
  role: Extract<AgentMessageRole, "system" | "user" | "assistant">;
  content: string | ChatContentPart[];
};

export type AiGatewayChatBody = {
  conversationId?: string;
  messages?: AiGatewayChatMessage[];
  modelId?: string;
  operatorId?: string;
  requestedFeatures?: {
    longContext?: boolean;
    reasoning?: boolean;
    tools?: boolean;
    vision?: boolean;
  };
};

export type AiGatewayChatResult = {
  content: string;
  modelId: string;
  requestId: string;
  usage: {
    credits: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export async function executeAiGatewayChatRequest(input: {
  body: AiGatewayChatBody;
  fetcher?: typeof fetch;
  ledger?: UsageLedgerRepository;
  request: Request;
  requestId: string;
}): Promise<AiGatewayChatResult> {
  const ledger = input.ledger ?? createUsageLedgerRepository();
  let userId: string | undefined;
  let operatorId: string | undefined;
  let conversationId: string | undefined;
  let modelId: string | undefined;
  let hasMultimodal = false;

  try {
    const actor = await resolveApiActor(input.request, {
      declaredUserId: input.request.headers.get("X-User-Id"),
      required: true,
    });
    userId = requireString(actor.actorUserId, "authenticated user");
    operatorId = requireString(input.body.operatorId, "operatorId");
    conversationId =
      typeof input.body.conversationId === "string" && input.body.conversationId.trim()
        ? input.body.conversationId.trim()
        : undefined;
    modelId = requireString(input.body.modelId, "modelId");

    if (!Array.isArray(input.body.messages) || input.body.messages.length === 0) {
      throw new ApiError("VALIDATION_FAILED", "messages is required.", 400);
    }

    // Check if any message has multimodal content
    hasMultimodal = input.body.messages.some(
      (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"),
    );

    const plan = getUserPlan({ request: input.request, userId });
    const model = assertModelAllowedForPlan(modelId, plan);

    if (!isModelAllowedByPlan(model.id, plan)) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "Requested model is not allowed for this plan.",
        403,
        {
          modelId: model.id,
          plan,
        },
      );
    }

    // Auto-detect vision requested when multimodal content present
    const requestedFeatures = {
      ...input.body.requestedFeatures,
      ...(hasMultimodal ? { vision: true } : {}),
    };

    assertRequestedFeaturesAllowed({
      model,
      requestedFeatures: Object.keys(requestedFeatures).length ? requestedFeatures : undefined,
    });

    await assertSufficientCredits({
      estimatedCredits: estimateModelCredits(
        model.id,
        estimateMessageTokens(input.body.messages),
      ),
      modelId: model.id,
      plan,
      userId,
      walletRepo: createWalletRepository(),
    });

    const userNewApiToken = await getUserNewApiToken({ userId });
    const result = await callNewApiChatCompletion(
      {
        apiKey: userNewApiToken.token,
        messages: input.body.messages.map((message) => ({
          content: message.content,
          role: message.role,
        })),
        modelId: model.new_api_model,
        signal: input.request.signal,
      },
      input.fetcher ? { fetcher: input.fetcher } : undefined,
    );
    const credits = estimateModelCredits(model.id, result.totalTokens);

    const usageRecord = await ledger.insert({
      credits,
      conversationId,
      errorCode: null,
      inputTokens: result.inputTokens,
      modelId: model.id,
      newApiModel: model.new_api_model,
      operatorId,
      outputTokens: result.outputTokens,
      providerFamily: model.provider_family,
      requestId: input.requestId,
      sourceType: "operator_chat",
      status: "succeeded",
      totalTokens: result.totalTokens,
      userId,
    });

    // Wallet deduction: record credit consumption
    const walletRepo = createWalletRepository();
    await walletRepo.createTransaction({
      amount: -credits,
      metadata: {
        estimatedCredits: credits,
        hasMultimodal,
        modelId: model.id,
        operationType: "chat_completion",
      },
      operationId: usageRecord.id,
      requestId: input.requestId,
      source: "chat_completion",
      type: "deduction",
      userId,
    }).catch((err) => {
      console.warn("[wallet] deduction write failed", { error: (err as Error).message, requestId: input.requestId, userId });
    });

    return {
      content: result.content,
      modelId: model.id,
      requestId: input.requestId,
      usage: {
        credits,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
      },
    };
  } catch (error) {
    const apiError = toApiError(error);

    if (userId && operatorId && modelId) {
      const model = getCatalogModel(modelId);

      await ledger.insert({
        credits: 0,
        conversationId,
        errorCode: apiError.code,
        inputTokens: 0,
        modelId,
        newApiModel: model?.new_api_model ?? modelId,
        operatorId,
        outputTokens: 0,
        providerFamily: model?.provider_family ?? "unknown",
        requestId: input.requestId,
        sourceType: "operator_chat",
        status: "failed",
        totalTokens: 0,
        userId,
      }).catch(() => undefined);
    }

    throw apiError;
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("VALIDATION_FAILED", `${label} is required.`, 400);
  }

  return value.trim();
}

function estimateMessageTokens(messages: AiGatewayChatMessage[]) {
  const characters = messages.reduce((total, message) => {
    if (typeof message.content === "string") {
      return total + message.content.length + message.role.length;
    }
    // For multimodal content parts, estimate from text parts only
    const textChars = message.content
      .filter((p) => p.type === "text")
      .reduce((sum, p) => sum + (p as { type: "text"; text: string }).text.length, 0);
    // Add rough estimate for image parts
    const imageCount = message.content.filter((p) => p.type === "image_url").length;
    return total + textChars + message.role.length + imageCount * 500; // ~500 token estimate per image
  }, 0);

  return Math.max(1, Math.ceil(characters / 4));
}
