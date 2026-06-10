import {
  getPublicModelCatalogForPlan,
  normalizeUserPlan,
} from "@/lib/backend/models/model-catalog";
import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { sessionUser } = await resolveApiActor(request, {
      declaredUserId: request.headers.get("X-User-Id"),
      required: true,
    });
    const plan = resolveUserPlan(request, sessionUser?.id);

    return Response.json({
      models: getPublicModelCatalogForPlan(plan),
      plan,
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
        models: [],
      },
      { status: apiError.statusCode },
    );
  }
}

function resolveUserPlan(request: Request, userId: string | undefined) {
  const testPlan = request.headers.get("X-Nexus-Test-Plan");

  if (process.env.NODE_ENV === "test" && testPlan) {
    return normalizeUserPlan(testPlan);
  }

  const userPlanOverrides = parseUserPlanOverrides(process.env.NEXUS_USER_PLAN_OVERRIDES);
  const override = userId ? userPlanOverrides[userId] : undefined;

  return normalizeUserPlan(override ?? process.env.NEXUS_DEFAULT_PLAN ?? "Free");
}

function parseUserPlanOverrides(value: string | undefined) {
  if (!value?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}
