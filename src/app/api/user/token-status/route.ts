import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/user/token-status
 *
 * Returns the current user's New API token readiness.
 * Server-only endpoint — never exposes the token itself.
 *
 * Response shape:
 * { configured: boolean, enabled: boolean, plan: string|null, lastError: string|null }
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    if (!hasSupabaseServiceRoleConfig()) {
      return Response.json({
        configured: false,
        enabled: false,
        plan: null,
        lastError: null,
      });
    }

    const client = getNexusSupabaseAdminClient();

    // 1. Check user_new_api_tokens
    const { data: tokenRow, error: tokenErr } = await client
      .from("user_new_api_tokens" as never)
      .select("plan, enabled, new_api_token_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenErr) throw new Error(tokenErr.message);

    const configured = tokenRow !== null;
    const enabled = configured && (tokenRow as { enabled?: boolean }).enabled === true;
    const plan = configured ? ((tokenRow as { plan?: string }).plan ?? null) : null;

    // 2. Check latest error from model_usage_ledger
    let lastError: string | null = null;
    const { data: ledgerRow, error: ledgerErr } = await client
      .from("model_usage_ledger")
      .select("error_code")
      .eq("user_id", userId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ledgerErr && ledgerRow) {
      lastError = (ledgerRow as { error_code?: string }).error_code ?? null;
    }

    return Response.json({
      configured,
      enabled,
      plan,
      lastError,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
