import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError } from "@/lib/backend/api/api-errors";
import { encryptNewApiToken, decryptNewApiToken } from "@/lib/backend/new-api-token/token-crypto";
import { normalizeNewApiBaseUrl } from "@/lib/backend/models/new-api-chat-service";
import {
  normalizeUserPlan,
  getAllowedModelCatalogForPlan,
  toPublicModelCatalogEntry,
} from "@/lib/backend/models/model-catalog";
import { getNexusSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/model-gateway/provision
 *
 * Platform-managed New API token provisioning.
 * Authenticated NEXUS users get a machine-created New API downstream token.
 * No end-user token input required.
 */
export async function POST(request: Request) {
  try {
    // --- Auth ---
    const { actorUserId } = await resolveApiActor(request, { required: true });
    const userId = actorUserId ?? "";

    if (!userId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    // --- Resolve plan ---
    const plan = resolveUserPlan(userId);

    // --- Admin credential ---
    const adminToken = process.env.NEW_API_ADMIN_TOKEN?.trim();
    if (!adminToken) {
      throw new ApiError(
        "PROVIDER_NOT_CONFIGURED",
        "Platform model gateway is not configured.",
        503,
      );
    }

    const newApiBaseUrl = normalizeNewApiBaseUrl(process.env.NEW_API_BASE_URL);
    const provisionUrl = `${newApiBaseUrl.replace(/\/v1$/, "").replace(/:80$/, "").replace(/\/$/, "")}:3002/provision`;

    // --- Check existing token ---
    const adminClient = getNexusSupabaseAdminClient();
    const { data: existingRows, error: dbError } = await adminClient
      .from("user_new_api_tokens")
      .select("encrypted_new_api_token, plan, enabled")
      .eq("user_id", userId)
      .limit(1);

    if (dbError) {
      throw new ApiError("INTERNAL_ERROR", dbError.message, 500);
    }

    const existingRow = existingRows?.[0] as
      | {
          encrypted_new_api_token?: string;
          plan?: string;
          enabled?: boolean;
        }
      | undefined;

    let token: string | null = null;

    if (existingRow?.encrypted_new_api_token && existingRow?.enabled) {
      try {
        token = decryptNewApiToken(existingRow.encrypted_new_api_token);
        const probeOk = await probeNewApiToken(
          `${newApiBaseUrl}/models`,
          token,
        );
        if (!probeOk) {
          token = null;
        }
      } catch {
        token = null;
      }
    }

    // --- Provision new token if needed ---
    if (!token) {
      const userEmail =
        (
          await adminClient
            .from("users" as never)
            .select("email")
            .eq("id", userId)
            .single()
        ).data as { email?: string } | null;

      const username = sanitizeUsername(userEmail?.email ?? userId);
      const provisionResp = await fetch(
        `${provisionUrl}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        },
      );

      if (!provisionResp.ok) {
        throw new ApiError(
          "PROVIDER_TIMEOUT",
          `Model gateway provision failed: HTTP ${provisionResp.status}.`,
          504,
        );
      }

      const provisionBody = (await provisionResp.json()) as { key?: string };

      if (!provisionBody.key) {
        throw new ApiError(
          "PROVIDER_TIMEOUT",
          "Model gateway returned an empty token.",
          504,
        );
      }

      token = provisionBody.key;

      const encrypted = encryptNewApiToken(token);

      const { error: upsertError } = await (adminClient
        .from("user_new_api_tokens" as never)
        .upsert as Function)({
            user_id: userId,
            encrypted_new_api_token: encrypted,
            new_api_token_name: `nexus-user-${username}`,
            new_api_group: "default",
            plan,
            enabled: true,
          },
          { onConflict: "user_id" },
        );

      if (upsertError) {
        throw new ApiError("INTERNAL_ERROR", upsertError.message, 500);
      }
    }

    // --- Build response (never returns token) ---
    const allowedModels = getAllowedModelCatalogForPlan(plan as "Free" | "Basic" | "Pro" | "Team").map(
      toPublicModelCatalogEntry,
    );

    return Response.json({
      status: "connected",
      plan,
      models: allowedModels.map((m) => ({
        id: m.id,
        label: m.label,
        provider_family: m.provider_family,
        min_plan: m.min_plan,
        description: m.description,
      })),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        { status: "error", code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }

    return Response.json(
      {
        status: "error",
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}

function resolveUserPlan(userId: string): string {
  try {
    const overridesRaw = process.env.NEXUS_USER_PLAN_OVERRIDES;
    if (overridesRaw) {
      const overrides = JSON.parse(overridesRaw) as Record<string, string>;
      if (overrides[userId]) {
        return normalizeUserPlan(overrides[userId]);
      }
    }

    if (process.env.NEXUS_DEFAULT_PLAN) {
      return normalizeUserPlan(process.env.NEXUS_DEFAULT_PLAN);
    }
  } catch {
    // Fall through
  }

  return "Free";
}

async function probeNewApiToken(
  modelsUrl: string,
  token: string,
): Promise<boolean> {
  try {
    const resp = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return false;

    const body = (await resp.json()) as { data?: unknown[] };
    return Array.isArray(body.data) && body.data.length > 0;
  } catch {
    return false;
  }
}

function sanitizeUsername(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
}
