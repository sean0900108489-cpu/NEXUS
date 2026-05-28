import type { BackendErrorCode } from "../primitives/errors";
import type { RequestId, TraceId } from "../primitives/ids";

export type ApiResponseMeta = {
  requestId: RequestId;
  traceId: TraceId;
};

export type ApiSuccessMeta = ApiResponseMeta & {
  schemaVersion?: number;
};

export type ApiErrorPayload = {
  code: BackendErrorCode | string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  error: null;
  meta: ApiSuccessMeta;
};

export type ApiFailure = {
  ok: false;
  data: null;
  error: ApiErrorPayload;
  meta: ApiResponseMeta;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function createApiSuccess<T>(data: T, meta: ApiSuccessMeta): ApiSuccess<T> {
  return {
    ok: true,
    data,
    error: null,
    meta,
  };
}

export function createApiFailure(
  error: ApiErrorPayload,
  meta: ApiResponseMeta,
): ApiFailure {
  return {
    ok: false,
    data: null,
    error,
    meta,
  };
}
