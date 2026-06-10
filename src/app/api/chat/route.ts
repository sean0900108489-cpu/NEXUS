import { getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";
import {
  executeAiGatewayChatRequest,
  type AiGatewayChatBody,
} from "@/lib/backend/models/ai-gateway-service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const requestId = request.headers.get("X-Request-Id") ?? makeId("req");

  try {
    const body = (await request.json()) as AiGatewayChatBody;
    const result = await executeAiGatewayChatRequest({
      body,
      request,
      requestId,
    });

    return Response.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    const descriptor = getApiErrorDescriptor(apiError.code);

    return Response.json(
      {
        error: {
          code: apiError.code,
          message: apiError.message || descriptor.message,
          retryable: descriptor.retryable,
        },
        requestId,
      },
      { status: apiError.statusCode },
    );
  }
}

function makeId(prefix: string) {
  return `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}
