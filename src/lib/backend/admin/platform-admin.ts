import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError } from "@/lib/backend/api/api-errors";

export type PlatformAdminActor = {
  actorUserId: string;
};

export async function resolvePlatformAdminActor(
  request: Request,
): Promise<PlatformAdminActor> {
  const { actorUserId } = await resolveApiActor(request, {
    declaredUserId: request.headers.get("X-User-Id"),
    required: true,
  });

  if (!actorUserId || !isPlatformAdminUser(actorUserId)) {
    throw new ApiError(
      "PERMISSION_DENIED",
      "Platform admin access is required.",
      403,
    );
  }

  return { actorUserId };
}

export function isPlatformAdminUser(userId: string) {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return false;
  }

  return getPlatformAdminUserIds().has(normalizedUserId);
}

function getPlatformAdminUserIds() {
  return new Set(
    [
      process.env.NEXUS_ADMIN_USER_IDS,
      process.env.NEXUS_ROOT_USER_IDS,
      process.env.NEXUS_PLATFORM_ADMIN_USER_IDS,
    ]
      .flatMap((value) => (value ?? "").split(","))
      .map((value) => value.trim())
      .filter(Boolean),
  );
}
