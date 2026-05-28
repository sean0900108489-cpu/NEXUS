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
    const token = getBearerToken(request.headers.get("authorization"));

    if (!token) {
      throw new ApiError(
        "AUTH_REQUIRED",
        "Workspace recovery requires an authenticated session.",
        401,
      );
    }

    const { data, error } = await getSupabaseAuthClient().auth.getUser(token);

    if (error || !data.user?.id) {
      throw new ApiError(
        "AUTH_INVALID_CREDENTIAL",
        "Workspace recovery requires a valid authenticated session.",
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

function getBearerToken(header: string | null) {
  const value = header?.trim();

  if (!value) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(value);
  const token = match?.[1]?.trim();

  return token || null;
}
