import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/workspaces
 *
 * Returns workspaces the authenticated user is a member of.
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    if (!hasSupabaseServiceRoleConfig()) {
      // In test/dev without Supabase, return empty list
      return Response.json({ workspaces: [] });
    }

    const client = getNexusSupabaseAdminClient();

    // Get user's workspace memberships
    const { data: memberships, error: memErr } = await client
      .from("workspace_memberships")
      .select("workspace_id, role, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (memErr) throw new Error(memErr.message);

    if (!memberships?.length) {
      return Response.json({ workspaces: [] });
    }

    // Get workspace details
    const workspaceIds = memberships.map((m: { workspace_id: string }) => m.workspace_id);
    const { data: workspaces, error: wsErr } = await client
      .from("workspaces")
      .select("id, name, owner_user_id, updated_at")
      .in("id", workspaceIds);

    if (wsErr) throw new Error(wsErr.message);

    const result = (memberships as Array<{ workspace_id: string; role: string; updated_at: string | null }>).map(
      (m) => {
        const ws = (workspaces as Array<{ id: string; name: string }> | null)?.find(
          (w) => w.id === m.workspace_id,
        );
        return {
          id: m.workspace_id,
          name: ws?.name ?? m.workspace_id,
          role: m.role,
          updatedAt: m.updated_at ?? null,
        };
      },
    );

    return Response.json({ workspaces: result });
  } catch (error) {
    const apiError = toApiError(error);
    return Response.json(
      { error: { code: apiError.code, message: apiError.message } },
      { status: apiError.statusCode },
    );
  }
}
