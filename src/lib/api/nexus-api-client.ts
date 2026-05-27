import type { ApiEnvelope, ApiFailure } from "@/lib/backend/contracts/api-envelope";
import { IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from "@/lib/backend/contracts/idempotency";

type NexusApiRequestOptions = {
  headers?: HeadersInit;
  idempotencyKey?: string;
  signal?: AbortSignal;
  traceId?: string;
  userId?: string;
  workspaceId?: string;
};

export class NexusApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly meta: ApiFailure["meta"];
  readonly retryable: boolean;
  readonly status: number;

  constructor(failure: ApiFailure, status: number) {
    super(failure.error.message);
    this.name = "NexusApiError";
    this.code = failure.error.code;
    this.details = failure.error.details;
    this.meta = failure.meta;
    this.retryable = failure.error.retryable;
    this.status = status;
  }

  toJSON() {
    return {
      code: this.code,
      details: this.details,
      message: this.message,
      retryable: this.retryable,
      status: this.status,
    };
  }
}

export interface NexusApiClient {
  get<TResponse>(path: string, options?: NexusApiRequestOptions): Promise<TResponse>;
  post<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: NexusApiRequestOptions,
  ): Promise<TResponse>;
  put<TResponse, TBody>(
    path: string,
    body: TBody,
    options?: NexusApiRequestOptions,
  ): Promise<TResponse>;
}

export class FetchNexusApiClient implements NexusApiClient {
  async get<TResponse>(path: string, options: NexusApiRequestOptions = {}) {
    return this.request<TResponse>(path, {
      method: "GET",
      options,
    });
  }

  async post<TResponse, TBody>(
    path: string,
    body: TBody,
    options: NexusApiRequestOptions = {},
  ) {
    return this.request<TResponse>(path, {
      body,
      method: "POST",
      options,
    });
  }

  async put<TResponse, TBody>(
    path: string,
    body: TBody,
    options: NexusApiRequestOptions = {},
  ) {
    return this.request<TResponse>(path, {
      body,
      method: "PUT",
      options,
    });
  }

  private async request<TResponse>(
    path: string,
    {
      body,
      method,
      options,
    }: {
      body?: unknown;
      method: "GET" | "POST" | "PUT";
      options: NexusApiRequestOptions;
    },
  ): Promise<TResponse> {
    const headers = new Headers(options.headers);
    const requestId = createClientId("req");
    const traceId = options.traceId ?? createClientId("trace");

    headers.set(REQUEST_ID_HEADER, requestId);
    headers.set("X-Trace-Id", traceId);

    if (options.workspaceId) {
      headers.set("X-Workspace-Id", options.workspaceId);
    }

    if (options.userId) {
      headers.set("X-User-Id", options.userId);
    }

    if (method !== "GET") {
      headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
      headers.set(
        IDEMPOTENCY_KEY_HEADER,
        options.idempotencyKey ?? createClientId("mutation"),
      );
    }

    const response = await fetch(path, {
      body: method === "GET" ? undefined : JSON.stringify(body),
      headers,
      method,
      signal: options.signal,
    });
    const payload = (await response.json().catch(() => undefined)) as
      | ApiEnvelope<TResponse>
      | TResponse
      | undefined;

    if (isApiEnvelope<TResponse>(payload)) {
      if (payload.ok) {
        return payload.data;
      }

      throw new NexusApiError(payload, response.status);
    }

    if (response.ok && payload !== undefined) {
      return payload as TResponse;
    }

    throw new NexusApiError(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Request failed.",
          retryable: true,
        },
        meta: {
          requestId,
          traceId,
        },
        ok: false,
      },
      response.status,
    );
  }
}

export const nexusApiClient = new FetchNexusApiClient();

function isApiEnvelope<TResponse>(
  value: unknown,
): value is ApiEnvelope<TResponse> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      "data" in value &&
      "error" in value &&
      "meta" in value,
  );
}

function createClientId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}
