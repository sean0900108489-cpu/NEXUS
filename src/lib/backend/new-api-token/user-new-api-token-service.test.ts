import { afterEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/backend/api/api-errors";

import { encryptNewApiToken } from "./token-crypto";
import {
  getUserNewApiToken,
  resetUserNewApiTokenRepositoryForTests,
  setUserNewApiTokenRepositoryForTests,
  type UserNewApiTokenRow,
} from "./user-new-api-token-service";

describe("user New API token service", () => {
  afterEach(() => {
    resetUserNewApiTokenRepositoryForTests();
  });

  it("returns a decrypted enabled token for the requested user", async () => {
    const secret = "test-encryption-secret-with-enough-entropy";
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) =>
        makeRow({
          encryptedNewApiToken: encryptNewApiToken("sk-user-a", { secret }),
          userId,
        }),
    });

    await expect(
      getUserNewApiToken({
        encryptionSecret: secret,
        userId: "user-a",
      }),
    ).resolves.toMatchObject({
      group: "pro-group",
      plan: "pro",
      token: "sk-user-a",
      tokenId: "newapi-token-a",
      tokenName: "User A token",
      userId: "user-a",
    });
  });

  it("rejects a user without a mapped token", async () => {
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async () => null,
    });

    await expect(
      getUserNewApiToken({
        encryptionSecret: "test-encryption-secret",
        userId: "missing-user",
      }),
    ).rejects.toMatchObject({
      code: "USER_NEW_API_TOKEN_NOT_CONFIGURED",
    } satisfies Partial<ApiError>);
  });

  it("rejects a disabled mapped token", async () => {
    const secret = "test-encryption-secret-with-enough-entropy";
    setUserNewApiTokenRepositoryForTests({
      findByUserId: async (userId) =>
        makeRow({
          enabled: false,
          encryptedNewApiToken: encryptNewApiToken("sk-disabled", { secret }),
          userId,
        }),
    });

    await expect(
      getUserNewApiToken({
        encryptionSecret: secret,
        userId: "disabled-user",
      }),
    ).rejects.toMatchObject({
      code: "USER_NEW_API_TOKEN_DISABLED",
    } satisfies Partial<ApiError>);
  });
});

function makeRow(overrides: Partial<UserNewApiTokenRow> = {}): UserNewApiTokenRow {
  return {
    enabled: true,
    encryptedNewApiToken: "encrypted",
    group: "pro-group",
    plan: "pro",
    tokenId: "newapi-token-a",
    tokenName: "User A token",
    userId: "user-a",
    ...overrides,
  };
}
