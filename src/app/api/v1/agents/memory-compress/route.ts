import { apiHandler } from "@/lib/backend/api/api-handler";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import {
  executeMemoryCompression,
  getCompatibleBaseUrl,
  normalizeConfig,
  validateMemoryCompressRequest,
} from "@/lib/backend/api/memory-compress-service";
import { createAgentRuntimeService } from "@/lib/backend/runtime/agent-runtime-service";
import {
  assertModelAllowedForPlan,
  getCatalogModel,
  type ProductModelCatalogEntry,
} from "@/lib/backend/models/model-catalog";
import {
  estimateModelCredits,
  getUserPlan,
  isModelAllowedByPlan,
} from "@/lib/backend/models/plan-config";
import { assertSufficientCredits } from "@/lib/backend/models/quota-gate";
import { createUsageLedgerRepository } from "@/lib/backend/models/usage-ledger";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";

export const runtime = "nodejs";
export const maxDuration = 300;

const runtimeService = createAgentRuntimeService();

export const POST = apiHandler({
  handler: async ({ body, request, requestId, trace, traceId, workspaceId }) => {
    const productGate = await assertMemoryCompressionProductGate({
      body,
      request,
      requestId,
      userId: trace.userId,
    });

    await maybeCreateMemoryCompressTask({
      body,
      requestId,
      traceId,
      userId: trace.userId,
      workspaceId,
    });

    const userNewApiToken = await getMemoryCompressionNewApiToken({
      productGate,
      requestId,
    });
    const result = await executeMemoryCompression({
      apiKey: userNewApiToken.token,
      baseUrl: getCompatibleBaseUrl(
        process.env.NEW_API_BASE_URL || process.env.OPENAI_BASE_URL,
      ),
      requestPayload: body,
    });

    await recordMemoryCompressionUsage({
      credits:
        result && typeof result === "object" && "mockFallback" in result
          ? 0
          : productGate.estimatedCredits,
      errorCode: null,
      modelId: productGate.model.id,
      newApiModel: productGate.model.new_api_model,
      operatorId: productGate.operatorId,
      providerFamily: productGate.model.provider_family,
      requestId,
      status: "succeeded",
      userId: productGate.userId,
    }).catch(() => undefined);

    return result;
  },
  idempotency: {
    enabled: true,
  },
  auth: {
    required: true,
  },
  methods: ["POST"],
  route: "/api/v1/agents/memory-compress",
  validator: validateMemoryCompressRequest,
  workspaceId: (_request, body) =>
    body && typeof body === "object" && "workspaceId" in body
      ? (body as { workspaceId?: string }).workspaceId
      : undefined,
});

async function assertMemoryCompressionProductGate({
  body,
  request,
  requestId,
  userId,
}: {
  body: unknown;
  request: Request;
  requestId: string;
  userId?: string;
}) {
  const record = isRecord(body) ? body : {};
  const config = normalizeConfig(record.config);
  const modelId = config.compressorModelId;
  const operatorId = getMemoryOperatorId(record);

  try {
    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    const plan = getUserPlan({ request, userId });
    const model = assertModelAllowedForPlan(modelId, plan);

    if (model.modality !== "chat") {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Memory compression requires a chat model.",
        400,
        { modelId },
      );
    }

    if (!isModelAllowedByPlan(model.id, plan)) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "Requested model is not allowed for this plan.",
        403,
        { modelId: model.id, plan },
      );
    }

    const estimatedCredits = estimateModelCredits(
      model.id,
      estimateMemoryCompressionTokens(record),
    );

    await assertSufficientCredits({
      estimatedCredits,
      ledger: createUsageLedgerRepository(),
      plan,
      userId,
    });

    return {
      estimatedCredits,
      model,
      operatorId,
      userId,
    };
  } catch (error) {
    const apiError = toApiError(error);
    const model = getCatalogModel(modelId);

    if (userId) {
      await recordMemoryCompressionUsage({
        credits: 0,
        errorCode: apiError.code,
        modelId,
        newApiModel: model?.new_api_model ?? modelId,
        operatorId,
        providerFamily: model?.provider_family ?? "unknown",
        requestId,
        status: "failed",
        userId,
      }).catch(() => undefined);
    }

    throw apiError;
  }
}

async function getMemoryCompressionNewApiToken({
  productGate,
  requestId,
}: {
  productGate: {
    estimatedCredits: number;
    model: ProductModelCatalogEntry;
    operatorId: string;
    userId: string;
  };
  requestId: string;
}) {
  try {
    return await getUserNewApiToken({ userId: productGate.userId });
  } catch (error) {
    const apiError = toApiError(error);

    await recordMemoryCompressionUsage({
      credits: 0,
      errorCode: apiError.code,
      modelId: productGate.model.id,
      newApiModel: productGate.model.new_api_model,
      operatorId: productGate.operatorId,
      providerFamily: productGate.model.provider_family,
      requestId,
      status: "failed",
      userId: productGate.userId,
    }).catch(() => undefined);

    throw apiError;
  }
}

async function recordMemoryCompressionUsage({
  credits,
  errorCode,
  modelId,
  newApiModel,
  operatorId,
  providerFamily,
  requestId,
  status,
  userId,
}: {
  credits: number;
  errorCode: string | null;
  modelId: string;
  newApiModel: string;
  operatorId: string;
  providerFamily: string;
  requestId: string;
  status: "failed" | "succeeded";
  userId: string;
}) {
  await createUsageLedgerRepository().insert({
    credits,
    conversationId: null,
    errorCode,
    inputTokens: 0,
    modelId,
    newApiModel,
    operatorId,
    outputTokens: 0,
    providerFamily,
    requestId,
    sourceType: "memory_compress",
    status,
    totalTokens: 0,
    userId,
  });
}

function getMemoryOperatorId(record: Record<string, unknown>) {
  const payload = isRecord(record.payload) ? record.payload : {};

  return typeof record.agentId === "string" && record.agentId.trim()
    ? record.agentId.trim()
    : typeof payload.agentId === "string" && payload.agentId.trim()
      ? payload.agentId.trim()
      : "memory-compressor";
}

function estimateMemoryCompressionTokens(record: Record<string, unknown>) {
  const serialized = JSON.stringify(record.payload ?? record);

  return Math.max(1, Math.ceil(serialized.length / 4));
}

async function maybeCreateMemoryCompressTask({
  body,
  requestId,
  traceId,
  userId,
  workspaceId,
}: {
  body: unknown;
  requestId: string;
  traceId: string;
  userId?: string;
  workspaceId: string;
}) {
  if (!userId || workspaceId === "__global__") {
    return;
  }

  const record = isRecord(body) ? body : {};
  const config = isRecord(record.config) ? record.config : {};
  const payload = isRecord(record.payload) ? record.payload : {};
  const agentId =
    typeof record.agentId === "string"
      ? record.agentId
      : typeof payload.agentId === "string"
        ? payload.agentId
        : "memory-compressor";
  const model =
    typeof config.compressorModelId === "string"
      ? config.compressorModelId
      : undefined;

  await runtimeService.createMemoryCompressTaskQueued(
    {
      agentId,
      metadata: {
        mode: config.mode,
        queuedOnly: true,
        runtimeCompletion: "not_completed_by_task",
        synchronousCompressionResponse: true,
        workerAvailable: false,
      },
      model,
      provider: "openai-compatible",
      workspaceId,
    },
    {
      requestId,
      traceId,
      userId,
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
