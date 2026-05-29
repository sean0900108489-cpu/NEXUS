import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/backend/api/api-errors";
import type { Database } from "@/lib/supabase/database.types";

export type AuthenticatedSessionUser = {
  email?: string | null;
  id: string;
};

export interface AuthSessionVerifier {
  verifyRequest(request: Request): Promise<AuthenticatedSessionUser>;
}

let authClient: SupabaseClient<Database> | undefined;

export class SupabaseBearerAuthSessionVerifier implements AuthSessionVerifier {
  async verifyRequest(request: Request): Promise<AuthenticatedSessionUser> {
    const token =
      getBearerToken(request.headers.get("authorization")) ??
      getSupabaseCookieAccessToken(request.headers.get("cookie"));

    if (!token) {
      throw new ApiError(
        "AUTH_REQUIRED",
        "Authentication is required.",
        401,
      );
    }

    const { data, error } = await getSupabaseAuthClient().auth.getUser(token);

    if (error || !data.user?.id) {
      throw new ApiError(
        "AUTH_INVALID_CREDENTIAL",
        "A valid authenticated session is required.",
        401,
      );
    }

    return {
      email: data.user.email ?? null,
      id: data.user.id,
    };
  }
}

export function createSupabaseBearerAuthSessionVerifier() {
  return new SupabaseBearerAuthSessionVerifier();
}

function getSupabaseAuthClient() {
  if (authClient) {
    return authClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "Workspace recovery requires Supabase authentication configuration.",
      401,
    );
  }

  authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return authClient;
}

export function getBearerToken(header: string | null) {
  const value = header?.trim();

  if (!value) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(value);
  const token = match?.[1]?.trim();

  return token || null;
}

function getSupabaseCookieAccessToken(header: string | null) {
  if (!header) {
    return null;
  }

  for (const value of parseCookieValues(header)) {
    const token = readAccessTokenFromCookieValue(value);

    if (token) {
      return token;
    }
  }

  return null;
}

function parseCookieValues(header: string) {
  return header
    .split(";")
    .map((part) => part.trim())
    .map((part) => {
      const separator = part.indexOf("=");

      return separator === -1 ? "" : part.slice(separator + 1);
    })
    .filter(Boolean);
}

function readAccessTokenFromCookieValue(value: string) {
  const decoded = safeDecodeURIComponent(value);
  const candidates = new Set([decoded]);

  if (decoded.startsWith("base64-")) {
    const base64Value = decoded.slice("base64-".length);
    const parsed = safeBase64Decode(base64Value);

    if (parsed) {
      candidates.add(parsed);
    }
  }

  for (const candidate of candidates) {
    const token = readAccessTokenFromJson(candidate);

    if (token) {
      return token;
    }
  }

  return null;
}

function readAccessTokenFromJson(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;

      return typeof record.access_token === "string" ? record.access_token : null;
    }

    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0];
    }
  } catch {
    return null;
  }

  return null;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeBase64Decode(value: string) {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value, "base64").toString("utf8");
    }

    if (typeof atob !== "undefined") {
      return atob(value);
    }
  } catch {
    return null;
  }

  return null;
}
