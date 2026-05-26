export const STREAM_RETRY_STATUS_CODES = new Set([429, 503, 504]);
export const STREAM_RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

export type StreamRetryNotice = {
  attempt: number;
  maxRetries: number;
  delayMs: number;
  status?: number;
};

export class StreamRetryError extends Error {
  readonly attempts: number;
  readonly status: number;

  constructor(status: number, attempts: number) {
    super(`Stream failed with ${status} after ${attempts} attempts.`);
    this.attempts = attempts;
    this.name = "StreamRetryError";
    this.status = status;
  }
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Request aborted.", "AbortError");
  }

  const error = new Error("Request aborted.");
  error.name = "AbortError";

  return error;
}

export function isAbortLikeError(error: unknown) {
  return typeof DOMException !== "undefined" && error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function isRetryableNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function getSignal(init: RequestInit) {
  return typeof AbortSignal !== "undefined" && init.signal instanceof AbortSignal
    ? init.signal
    : undefined;
}

async function waitForRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }

  await new Promise<void>((resolve, reject) => {
    function handleAbort() {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init: RequestInit,
  {
    fetcher = fetch,
    maxRetries = STREAM_RETRY_DELAYS_MS.length,
    onRetry,
    retryDelaysMs = STREAM_RETRY_DELAYS_MS,
  }: {
    fetcher?: typeof fetch;
    maxRetries?: number;
    onRetry?: (notice: StreamRetryNotice) => void;
    retryDelaysMs?: readonly number[];
  } = {},
) {
  const signal = getSignal(init);
  let retriesUsed = 0;

  for (;;) {
    try {
      const response = await fetcher(input, init);

      if (!STREAM_RETRY_STATUS_CODES.has(response.status)) {
        return response;
      }

      if (retriesUsed >= maxRetries) {
        throw new StreamRetryError(response.status, retriesUsed + 1);
      }

      const delayMs = retryDelaysMs[Math.min(retriesUsed, retryDelaysMs.length - 1)];

      onRetry?.({
        attempt: retriesUsed + 1,
        delayMs,
        maxRetries,
        status: response.status,
      });
      await waitForRetry(delayMs, signal);
      retriesUsed += 1;
    } catch (error) {
      if (signal?.aborted || isAbortLikeError(error)) {
        throw error;
      }

      if (!isRetryableNetworkError(error) || retriesUsed >= maxRetries) {
        throw error;
      }

      const delayMs = retryDelaysMs[Math.min(retriesUsed, retryDelaysMs.length - 1)];

      onRetry?.({
        attempt: retriesUsed + 1,
        delayMs,
        maxRetries,
      });
      await waitForRetry(delayMs, signal);
      retriesUsed += 1;
    }
  }
}
