import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";

import { ApiError } from "@/lib/backend/api/api-errors";

const TOKEN_CRYPTO_VERSION = "napi1";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;
const AUTH_TAG_LENGTH_BYTES = 16;
const PBKDF2_ITERATIONS = 210_000;

export function encryptNewApiToken(
  token: string,
  options: {
    secret?: string;
  } = {},
) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new ApiError("VALIDATION_FAILED", "New API token is required.", 400);
  }

  const secret = resolveTokenEncryptionSecret(options.secret);
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(secret, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });
  const ciphertext = Buffer.concat([
    cipher.update(normalizedToken, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_CRYPTO_VERSION,
    salt.toString("base64url"),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptNewApiToken(
  encryptedToken: string,
  options: {
    secret?: string;
  } = {},
) {
  const secret = resolveTokenEncryptionSecret(options.secret);
  const parts = encryptedToken.split(".");

  if (parts.length !== 5 || parts[0] !== TOKEN_CRYPTO_VERSION) {
    throw new ApiError(
      "USER_NEW_API_TOKEN_DECRYPT_FAILED",
      "Stored New API token could not be decrypted.",
      500,
    );
  }

  try {
    const [, saltText, ivText, tagText, ciphertextText] = parts;
    const salt = Buffer.from(saltText, "base64url");
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const ciphertext = Buffer.from(ciphertextText, "base64url");
    const key = deriveKey(secret, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ApiError(
      "USER_NEW_API_TOKEN_DECRYPT_FAILED",
      "Stored New API token could not be decrypted.",
      500,
    );
  }
}

function resolveTokenEncryptionSecret(value: string | undefined) {
  const secret = value?.trim() || process.env.NEW_API_TOKEN_ENCRYPTION_SECRET?.trim();

  if (!secret || secret.length < 16) {
    throw new ApiError(
      "USER_NEW_API_TOKEN_DECRYPT_FAILED",
      "NEW_API_TOKEN_ENCRYPTION_SECRET is not configured.",
      500,
    );
  }

  return secret;
}

function deriveKey(secret: string, salt: Buffer) {
  return pbkdf2Sync(
    secret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    "sha256",
  );
}
