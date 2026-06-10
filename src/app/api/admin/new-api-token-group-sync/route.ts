import { resolvePlatformAdminActor } from "@/lib/backend/admin/platform-admin";
import { getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";
import { recordNewApiTokenGroupSyncAttempt } from "@/lib/backend/new-api-admin/token-drift-service";

export const runtime = "nodejs";

type GroupSyncPayload = {
  targetGroup?: unknown;
  tokenId?: unknown;
  userId?: unknown;
};

export async function POST(request: Request) {
  const requestId = request.headers.get("X-Request-Id") ?? makeId("req");

  try {
    const { actorUserId } = await resolvePlatformAdminActor(request);
    const payload = (await request.json()) as GroupSyncPayload;
    const targetGroup = getString(payload.targetGroup);
    const targetUserId = getString(payload.userId);

    await recordNewApiTokenGroupSyncAttempt({
      actorUserId,
      requestId,
      targetGroup,
      targetUserId,
    });

    return Response.json(
      {
        manualChecklist: [
          "Open the New API admin token page for the target downstream token.",
          "Change only the token group field.",
          "Verify quota and model whitelist values are unchanged after saving.",
          "Run GET /api/admin/new-api-token-drift again.",
        ],
        reason: "NEW_API_PARTIAL_GROUP_UPDATE_NOT_VERIFIED",
        requestId,
        syncEnabled: false,
      },
      { status: 409 },
    );
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

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function makeId(prefix: string) {
  return `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}
