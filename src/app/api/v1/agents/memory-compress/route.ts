import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  executeMemoryCompression,
  getRuntimeBearerToken,
  getCompatibleBaseUrl,
  validateMemoryCompressRequest,
} from "@/lib/backend/api/memory-compress-service";
import { createAgentRuntimeService } from "@/lib/backend/runtime/agent-runtime-service";

export const runtime = "nodejs";
export const maxDuration = 300;

const runtimeService = createAgentRuntimeService();

export const POST = apiHandler({
  handler: async ({ body, request, requestId, trace, traceId, workspaceId }) => {
    await maybeCreateMemoryCompressTask({
      body,
      requestId,
      traceId,
      userId: trace.userId,
      workspaceId,
    });

    return executeMemoryCompression({
      apiKey: getRuntimeBearerToken(request.headers),
      baseUrl: getCompatibleBaseUrl(
        request.headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL,
      ),
      requestPayload: body,
    });
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
