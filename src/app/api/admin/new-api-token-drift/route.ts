import { resolvePlatformAdminActor } from "@/lib/backend/admin/platform-admin";
import { getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";
import { checkNewApiTokenDrift } from "@/lib/backend/new-api-admin/token-drift-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("X-Request-Id") ?? makeId("req");

  try {
    const { actorUserId } = await resolvePlatformAdminActor(request);
    const report = await checkNewApiTokenDrift({
      actorUserId,
      requestId,
    });

    return Response.json({
      ...report,
      requestId,
    });
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
