import { describe, expect, it } from "vitest";

import {
  decryptNewApiToken,
  encryptNewApiToken,
} from "./token-crypto";

describe("New API token crypto", () => {
  it("encrypts and decrypts a token without storing plaintext", () => {
    const secret = "test-encryption-secret-with-enough-entropy";
    const token = "sk-new-api-user-token";

    const encrypted = encryptNewApiToken(token, { secret });

    expect(encrypted).not.toContain(token);
    expect(decryptNewApiToken(encrypted, { secret })).toBe(token);
  });

  it("rejects decryption with the wrong secret", () => {
    const encrypted = encryptNewApiToken("sk-new-api-user-token", {
      secret: "first-test-encryption-secret",
    });

    expect(() =>
      decryptNewApiToken(encrypted, {
        secret: "second-test-encryption-secret",
      }),
    ).toThrow(/decrypt/i);
  });
});
