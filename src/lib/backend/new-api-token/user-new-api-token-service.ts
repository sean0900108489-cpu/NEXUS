import { ApiError } from "@/lib/backend/api/api-errors";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

import { decryptNewApiToken } from "./token-crypto";

export type UserNewApiTokenRow = {
  enabled: boolean;
  encryptedNewApiToken: string;
  group?: string | null;
  plan: string;
  tokenId?: string | null;
  tokenName?: string | null;
  userId: string;
};

export type UserNewApiToken = {
  group?: string | null;
  plan: string;
  token: string;
  tokenId?: string | null;
  tokenName?: string | null;
  userId: string;
};

export interface UserNewApiTokenRepository {
  findByUserId(userId: string): Promise<UserNewApiTokenRow | null>;
}

class SupabaseUserNewApiTokenRepository implements UserNewApiTokenRepository {
  async findByUserId(userId: string) {
    const client = getNexusSupabaseAdminClient();
    const { data, error } = await client
      .from("user_new_api_tokens" as never)
      .select(
        [
          "user_id",
          "new_api_token_name",
          "encrypted_new_api_token",
          "new_api_token_id",
          "new_api_group",
          "plan",
          "enabled",
        ].join(","),
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const row = data as {
      enabled?: boolean | null;
      encrypted_new_api_token?: string | null;
      new_api_group?: string | null;
      new_api_token_id?: string | null;
      new_api_token_name?: string | null;
      plan?: string | null;
      user_id?: string | null;
    };

    if (!row.user_id || !row.encrypted_new_api_token) {
      return null;
    }

    return {
      enabled: row.enabled === true,
      encryptedNewApiToken: row.encrypted_new_api_token,
      group: row.new_api_group ?? null,
      plan: row.plan ?? "free",
      tokenId: row.new_api_token_id ?? null,
      tokenName: row.new_api_token_name ?? null,
      userId: row.user_id,
    };
  }
}

let repositoryOverride: UserNewApiTokenRepository | null = null;

export async function getUserNewApiToken(input: {
  encryptionSecret?: string;
  repository?: UserNewApiTokenRepository;
  userId: string;
}): Promise<UserNewApiToken> {
  const userId = input.userId.trim();

  if (!userId) {
    throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
  }

  const repository = input.repository ?? repositoryOverride ?? createUserNewApiTokenRepository();
  const row = await repository.findByUserId(userId);

  if (!row) {
    throw new ApiError(
      "USER_NEW_API_TOKEN_NOT_CONFIGURED",
      "New API token is not configured for this user.",
      403,
    );
  }

  if (!row.enabled) {
    throw new ApiError(
      "USER_NEW_API_TOKEN_DISABLED",
      "New API token is disabled for this user.",
      403,
    );
  }

  return {
    group: row.group ?? null,
    plan: row.plan,
    token: decryptNewApiToken(row.encryptedNewApiToken, {
      secret: input.encryptionSecret,
    }),
    tokenId: row.tokenId ?? null,
    tokenName: row.tokenName ?? null,
    userId: row.userId,
  };
}

export function createUserNewApiTokenRepository(): UserNewApiTokenRepository {
  if (!hasSupabaseServiceRoleConfig()) {
    return {
      findByUserId: async () => null,
    };
  }

  return new SupabaseUserNewApiTokenRepository();
}

export function setUserNewApiTokenRepositoryForTests(
  repository: UserNewApiTokenRepository,
) {
  repositoryOverride = repository;
}

export function resetUserNewApiTokenRepositoryForTests() {
  repositoryOverride = null;
}
