#!/usr/bin/env node
import {
  createCipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import { readFileSync } from "node:fs";

const VERSION = "napi1";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;
const AUTH_TAG_LENGTH_BYTES = 16;
const PBKDF2_ITERATIONS = 210_000;

function usage() {
  console.error(
    [
      "Usage:",
      "  NEW_API_TOKEN_ENCRYPTION_SECRET='...' node scripts/new-api-token-encrypt.mjs --token-file /path/to/token.txt",
      "  NEW_API_TOKEN_ENCRYPTION_SECRET='...' node scripts/new-api-token-encrypt.mjs --token 'sk-...'",
      "",
      "Prefer --token-file so the raw token is not stored in shell history.",
    ].join("\n"),
  );
}

function readArg(name) {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveToken() {
  const tokenFile = readArg("--token-file");
  const inlineToken = readArg("--token");

  if (tokenFile) {
    return readFileSync(tokenFile, "utf8").trim();
  }

  return inlineToken?.trim() ?? "";
}

function deriveKey(secret, salt) {
  return pbkdf2Sync(
    secret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    "sha256",
  );
}

const secret = process.env.NEW_API_TOKEN_ENCRYPTION_SECRET?.trim() ?? "";
const token = resolveToken();

if (!secret || secret.length < 16 || !token) {
  usage();
  process.exit(1);
}

const salt = randomBytes(SALT_LENGTH_BYTES);
const iv = randomBytes(IV_LENGTH_BYTES);
const key = deriveKey(secret, salt);
const cipher = createCipheriv(ALGORITHM, key, iv, {
  authTagLength: AUTH_TAG_LENGTH_BYTES,
});
const ciphertext = Buffer.concat([
  cipher.update(token, "utf8"),
  cipher.final(),
]);
const tag = cipher.getAuthTag();

process.stdout.write(
  [
    VERSION,
    salt.toString("base64url"),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join("."),
);
