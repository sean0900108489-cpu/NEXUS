import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import {
  getUserPlan,
  isModelAllowedByPlan,
} from "@/lib/backend/models/plan-config";
import {
  SERVER_MODEL_CATALOG,
  type ProductModelCatalogEntry,
} from "@/lib/backend/models/model-catalog";

export const runtime = "nodejs";

/**
 * GET /api/models
 *
 * Returns the public model catalog filtered by the user's plan.
 * Server-side pricing fields (multipliers) are NOT exposed to clients.
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const plan = getUserPlan({ request, userId });

    const models = SERVER_MODEL_CATALOG
      .filter((m) => m.enabled && isModelAllowedByPlan(m.id, plan))
      .map((m) => ({
        best_for: m.best_for,
        description: m.description,
        enabled: m.enabled,
        id: m.id,
        label: m.label,
        min_plan: m.min_plan,
        modality: m.modality,
        provider_family: m.provider_family,
        supports_file_input: m.supports_file_input,
        supports_image_input: m.supports_image_input,
        supports_reasoning: m.supports_reasoning,
        supports_tools: m.supports_tools,
        supports_vision: m.supports_vision,
        supports_long_context: m.supports_long_context,
        default_max_tokens: m.default_max_tokens,
        max_output_tokens: m.max_output_tokens,
      }));

    return Response.json({ models });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
