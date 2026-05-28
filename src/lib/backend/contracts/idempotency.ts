import type { ClientMutationId, RequestId } from "../primitives/ids";

export const REQUEST_ID_HEADER = "X-Request-Id";
export const IDEMPOTENCY_KEY_HEADER = "X-Idempotency-Key";

export const MUTATION_REQUEST_HEADER_NAMES = [
  REQUEST_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
] as const;

export type MutationRequestHeaderName =
  (typeof MUTATION_REQUEST_HEADER_NAMES)[number];

export type IdempotencyKey = string;

export type MutationRequestHeaders = {
  "X-Request-Id": RequestId;
  "X-Idempotency-Key": IdempotencyKey;
};

export type MutationRequestIdentity = {
  requestId: RequestId;
  idempotencyKey: IdempotencyKey;
  clientMutationId?: ClientMutationId;
};

export type HeaderReader =
  | Pick<Headers, "get">
  | Record<string, string | null | undefined>;

export function readMutationRequestIdentity(
  headers: HeaderReader,
): Partial<MutationRequestIdentity> {
  return {
    requestId: readHeader(headers, REQUEST_ID_HEADER),
    idempotencyKey: readHeader(headers, IDEMPOTENCY_KEY_HEADER),
  };
}

export function hasMutationRequestHeaders(
  headers: HeaderReader,
): headers is HeaderReader {
  const identity = readMutationRequestIdentity(headers);

  return Boolean(identity.requestId && identity.idempotencyKey);
}

function readHeader(headers: HeaderReader, headerName: MutationRequestHeaderName) {
  if (isHeadersLike(headers)) {
    return headers.get(headerName) ?? undefined;
  }

  const directValue = headers[headerName];

  if (directValue) {
    return directValue;
  }

  const lowerCaseName = headerName.toLowerCase();
  const matchingKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === lowerCaseName,
  );

  return matchingKey ? headers[matchingKey] ?? undefined : undefined;
}

function isHeadersLike(headers: HeaderReader): headers is Pick<Headers, "get"> {
  return typeof (headers as Pick<Headers, "get">).get === "function";
}
