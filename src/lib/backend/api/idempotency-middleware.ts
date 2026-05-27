import { createRequestFingerprint, createRequestHash } from "./request-hash";
import type {
  IdempotencyLookupResult,
  IdempotencyRepository,
} from "./idempotency-repository";

export type IdempotencyMiddlewareInput = {
  actorUserId?: string;
  body: unknown;
  idempotencyKey?: string;
  method: string;
  path: string;
  repository: IdempotencyRepository;
  workspaceId: string;
};

export type IdempotencyMiddlewareResult =
  | (IdempotencyLookupResult & {
      requestFingerprint: string;
      requestHash: string;
    })
  | { type: "missing_key"; requestFingerprint?: undefined; requestHash?: undefined };

export async function beginIdempotentRequest({
  actorUserId,
  body,
  idempotencyKey,
  method,
  path,
  repository,
  workspaceId,
}: IdempotencyMiddlewareInput): Promise<IdempotencyMiddlewareResult> {
  if (!idempotencyKey?.trim()) {
    return { type: "missing_key" };
  }

  const requestHash = await createRequestHash(body);
  const requestFingerprint = createRequestFingerprint({
    method,
    path,
    requestHash,
    workspaceId,
  });
  const result = await repository.begin({
    actorUserId,
    idempotencyKey: idempotencyKey.trim(),
    method,
    path,
    requestFingerprint,
    requestHash,
    workspaceId,
  });

  return {
    ...result,
    requestFingerprint,
    requestHash,
  };
}
