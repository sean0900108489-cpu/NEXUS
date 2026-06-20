import {
  BackendErrorCodes,
  type BackendErrorCode,
} from "../primitives/errors";
import { SecretBoundaryService } from "../security/secret-boundary-service";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "WORKSPACE_ACCESS_DENIED"
  | "PERMISSION_DENIED"
  | "VALIDATION_FAILED"
  | "IDEMPOTENCY_CONFLICT"
  | "IDEMPOTENCY_PENDING"
  | "IDEMPOTENCY_EXPIRED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMITED"
  | "INSUFFICIENT_CREDITS"
  | "USER_NEW_API_TOKEN_DECRYPT_FAILED"
  | "USER_NEW_API_TOKEN_DISABLED"
  | "USER_NEW_API_TOKEN_NOT_CONFIGURED"
  | "INTERNAL_ERROR"
  | BackendErrorCode;

export type ApiErrorDescriptor = {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  statusCode: number;
};

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly statusCode = statusCodeFor(code),
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const descriptors: Record<string, ApiErrorDescriptor> = {
  AUTH_REQUIRED: {
    code: "AUTH_REQUIRED",
    message: "Authentication is required.",
    retryable: false,
    statusCode: 401,
  },
  WORKSPACE_ACCESS_DENIED: {
    code: "WORKSPACE_ACCESS_DENIED",
    message: "Workspace access was denied.",
    retryable: false,
    statusCode: 403,
  },
  WORKSPACE_STATE_NOT_FOUND: {
    code: "WORKSPACE_STATE_NOT_FOUND",
    message: "Workspace state was not found.",
    retryable: false,
    statusCode: 404,
  },
  WORKSPACE_STATE_CONFLICT: {
    code: "WORKSPACE_STATE_CONFLICT",
    message:
      "Workspace state has changed remotely. Refusing to overwrite the latest cloud snapshot.",
    retryable: false,
    statusCode: 409,
  },
  WORKSPACE_STATE_SECRET_DETECTED: {
    code: "WORKSPACE_STATE_SECRET_DETECTED",
    message: "Workspace state contains a secret and was rejected.",
    retryable: false,
    statusCode: 400,
  },
  WORKSPACE_STATE_SCHEMA_MISMATCH: {
    code: "WORKSPACE_STATE_SCHEMA_MISMATCH",
    message: "Workspace state schema version is not supported.",
    retryable: false,
    statusCode: 400,
  },
  WORKSPACE_STATE_INVALID_REGISTRY_REFERENCE: {
    code: "WORKSPACE_STATE_INVALID_REGISTRY_REFERENCE",
    message: "Workspace state references an unknown registry id.",
    retryable: false,
    statusCode: 400,
  },
  WORKSPACE_SNAPSHOT_TOO_LARGE: {
    code: "WORKSPACE_SNAPSHOT_TOO_LARGE",
    message: "Workspace snapshot exceeds the allowed payload size.",
    retryable: false,
    statusCode: 413,
  },
  WORKSPACE_HYDRATION_CONFLICT: {
    code: "WORKSPACE_HYDRATION_CONFLICT",
    message: "Workspace hydration would overwrite newer local state.",
    retryable: false,
    statusCode: 409,
  },
  WORKSPACE_HYDRATION_FAILED: {
    code: "WORKSPACE_HYDRATION_FAILED",
    message: "Workspace hydration failed.",
    retryable: false,
    statusCode: 500,
  },
  PERMISSION_DENIED: {
    code: "PERMISSION_DENIED",
    message: "Permission denied.",
    retryable: false,
    statusCode: 403,
  },
  VALIDATION_FAILED: {
    code: "VALIDATION_FAILED",
    message: "Request validation failed.",
    retryable: false,
    statusCode: 400,
  },
  IDEMPOTENCY_CONFLICT: {
    code: "IDEMPOTENCY_CONFLICT",
    message: "Idempotency key was reused with a different request.",
    retryable: false,
    statusCode: 409,
  },
  IDEMPOTENCY_PENDING: {
    code: "IDEMPOTENCY_PENDING",
    message: "A matching idempotent request is still pending.",
    retryable: true,
    statusCode: 409,
  },
  IDEMPOTENCY_EXPIRED: {
    code: "IDEMPOTENCY_EXPIRED",
    message: "The idempotency key has expired.",
    retryable: false,
    statusCode: 409,
  },
  PROVIDER_TIMEOUT: {
    code: "PROVIDER_TIMEOUT",
    message: "Provider request timed out.",
    retryable: true,
    statusCode: 504,
  },
  PROVIDER_NOT_CONFIGURED: {
    code: "PROVIDER_NOT_CONFIGURED",
    message: "Provider credentials are not configured.",
    retryable: true,
    statusCode: 503,
  },
  PROVIDER_RATE_LIMITED: {
    code: "PROVIDER_RATE_LIMITED",
    message: "Provider rate limit reached.",
    retryable: true,
    statusCode: 429,
  },
  INSUFFICIENT_CREDITS: {
    code: "INSUFFICIENT_CREDITS",
    message: "Insufficient credits for this operation.",
    retryable: false,
    statusCode: 402,
  },
  USER_NEW_API_TOKEN_DECRYPT_FAILED: {
    code: "USER_NEW_API_TOKEN_DECRYPT_FAILED",
    message: "Stored New API token could not be decrypted.",
    retryable: false,
    statusCode: 500,
  },
  USER_NEW_API_TOKEN_DISABLED: {
    code: "USER_NEW_API_TOKEN_DISABLED",
    message: "New API token is disabled for this user.",
    retryable: false,
    statusCode: 403,
  },
  USER_NEW_API_TOKEN_NOT_CONFIGURED: {
    code: "USER_NEW_API_TOKEN_NOT_CONFIGURED",
    message: "New API token is not configured for this user.",
    retryable: false,
    statusCode: 403,
  },
  AGENT_TASK_NOT_FOUND: {
    code: "AGENT_TASK_NOT_FOUND",
    message: "Agent task was not found.",
    retryable: false,
    statusCode: 404,
  },
  TOOL_NOT_FOUND: {
    code: "TOOL_NOT_FOUND",
    message: "Tool was not found.",
    retryable: false,
    statusCode: 404,
  },
  TOOL_INPUT_INVALID: {
    code: "TOOL_INPUT_INVALID",
    message: "Tool input is invalid.",
    retryable: false,
    statusCode: 400,
  },
  TOOL_SECRET_DETECTED: {
    code: "TOOL_SECRET_DETECTED",
    message: "Tool input or output contains a secret and was rejected.",
    retryable: false,
    statusCode: 400,
  },
  TOOL_PERMISSION_DENIED: {
    code: "TOOL_PERMISSION_DENIED",
    message: "Tool execution permission denied.",
    retryable: false,
    statusCode: 403,
  },
  TOOL_PERMISSION_DISABLED: {
    code: "TOOL_PERMISSION_DISABLED",
    message: "Tool execution is disabled for this workspace scope.",
    retryable: false,
    statusCode: 403,
  },
  TOOL_RUN_NOT_FOUND: {
    code: "TOOL_RUN_NOT_FOUND",
    message: "Tool run was not found.",
    retryable: false,
    statusCode: 404,
  },
  TOOL_RUN_NOT_CONFIRMABLE: {
    code: "TOOL_RUN_NOT_CONFIRMABLE",
    message: "Tool run cannot be confirmed.",
    retryable: false,
    statusCode: 409,
  },
  TOOL_CONFIRMATION_EXPIRED: {
    code: "TOOL_CONFIRMATION_EXPIRED",
    message: "Tool run confirmation has expired.",
    retryable: false,
    statusCode: 409,
  },
  TOOL_RUN_FAILED: {
    code: "TOOL_RUN_FAILED",
    message: "Tool run failed.",
    retryable: true,
    statusCode: 500,
  },
  TOOL_MATERIALIZATION_NOT_AVAILABLE: {
    code: "TOOL_MATERIALIZATION_NOT_AVAILABLE",
    message: "Tool result materialization is not available in this version.",
    retryable: false,
    statusCode: 501,
  },
  ARTIFACT_NOT_FOUND: {
    code: "ARTIFACT_NOT_FOUND",
    message: "Artifact was not found.",
    retryable: false,
    statusCode: 404,
  },
  ARTIFACT_SECRET_DETECTED: {
    code: "ARTIFACT_SECRET_DETECTED",
    message: "Artifact content contains a secret and was rejected.",
    retryable: false,
    statusCode: 400,
  },
  ARTIFACT_CONTENT_TOO_LARGE: {
    code: "ARTIFACT_CONTENT_TOO_LARGE",
    message: "Artifact content exceeds the inline storage size cap.",
    retryable: false,
    statusCode: 413,
  },
  ARTIFACT_REFERENCE_INVALID: {
    code: "ARTIFACT_REFERENCE_INVALID",
    message: "Artifact reference is invalid.",
    retryable: false,
    statusCode: 400,
  },
  ARTIFACT_REFERENCE_CONFLICT: {
    code: "ARTIFACT_REFERENCE_CONFLICT",
    message: "Artifact reference conflicts with an existing reference.",
    retryable: false,
    statusCode: 409,
  },
  ARTIFACT_WRITE_FAILED: {
    code: "ARTIFACT_WRITE_FAILED",
    message: "Artifact write failed.",
    retryable: true,
    statusCode: 500,
  },
  SYNC_DOMAIN_NOT_SUPPORTED: {
    code: "SYNC_DOMAIN_NOT_SUPPORTED",
    message: "Sync domain is not supported by the V4 operation applier.",
    retryable: false,
    statusCode: 400,
  },
  SYNC_PAYLOAD_TOO_LARGE: {
    code: "SYNC_PAYLOAD_TOO_LARGE",
    message: "Sync payload exceeds the allowed size.",
    retryable: false,
    statusCode: 413,
  },
  SYNC_OPERATION_CONFLICT: {
    code: "SYNC_OPERATION_CONFLICT",
    message: "Sync operation conflicts with an existing operation.",
    retryable: false,
    statusCode: 409,
  },
  SYNC_OPERATION_NOT_FOUND: {
    code: "SYNC_OPERATION_NOT_FOUND",
    message: "Sync operation was not found.",
    retryable: false,
    statusCode: 404,
  },
  SYNC_OPERATION_NOT_RETRYABLE: {
    code: "SYNC_OPERATION_NOT_RETRYABLE",
    message: "Sync operation cannot be retried.",
    retryable: false,
    statusCode: 409,
  },
  SYNC_OPERATION_NOT_CANCELLABLE: {
    code: "SYNC_OPERATION_NOT_CANCELLABLE",
    message: "Sync operation cannot be cancelled.",
    retryable: false,
    statusCode: 409,
  },
  SYNC_SECRET_DETECTED: {
    code: "SYNC_SECRET_DETECTED",
    message: "Sync payload contains a secret and was rejected.",
    retryable: false,
    statusCode: 400,
  },
  HISTORY_NOT_FOUND: {
    code: "HISTORY_NOT_FOUND",
    message: "Historical record was not found.",
    retryable: false,
    statusCode: 404,
  },
  HISTORY_CURSOR_INVALID: {
    code: "HISTORY_CURSOR_INVALID",
    message: "History cursor is invalid.",
    retryable: false,
    statusCode: 400,
  },
  HISTORY_CURSOR_EXPIRED: {
    code: "HISTORY_CURSOR_EXPIRED",
    message: "History cursor has expired.",
    retryable: false,
    statusCode: 410,
  },
  HISTORY_MEMORY_TOO_LARGE: {
    code: "HISTORY_MEMORY_TOO_LARGE",
    message: "Agent memory record exceeds the allowed content size.",
    retryable: false,
    statusCode: 413,
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "Internal server error.",
    retryable: true,
    statusCode: 500,
  },
};

export function getApiErrorDescriptor(code: ApiErrorCode): ApiErrorDescriptor {
  const descriptor = descriptors[code];

  if (descriptor) {
    return descriptor;
  }

  return {
    code,
    message: code === BackendErrorCodes.INTERNAL_ERROR ? "Internal server error." : code,
    retryable: code.startsWith("PROVIDER_") || code.startsWith("INTERNAL_"),
    statusCode: statusCodeFor(code),
  };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && typeof error === "object" && "code" in error) {
    const candidate = error as { code?: unknown; message?: unknown; details?: unknown };

    if (typeof candidate.code === "string") {
      const descriptor = getApiErrorDescriptor(candidate.code as ApiErrorCode);

      return new ApiError(
        descriptor.code,
        typeof candidate.message === "string"
          ? sanitizeErrorMessage(candidate.message)
          : descriptor.message,
        descriptor.statusCode,
        sanitizeErrorDetails(candidate.details),
      );
    }
  }

  return new ApiError(
    "INTERNAL_ERROR",
    getApiErrorDescriptor("INTERNAL_ERROR").message,
    500,
  );
}

export function sanitizeErrorDetails(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const secretBoundary = new SecretBoundaryService();
  const redacted = secretBoundary.redact(value);

  return redacted && typeof redacted === "object" && !Array.isArray(redacted)
    ? (redacted as Record<string, unknown>)
    : undefined;
}

export function sanitizeErrorMessage(message: string) {
  return new SecretBoundaryService().redact(message) as string;
}

function statusCodeFor(code: string) {
  if (code === "AUTH_REQUIRED" || code.startsWith("AUTH_")) {
    return 401;
  }

  if (
    code === "WORKSPACE_ACCESS_DENIED" ||
    code === "PERMISSION_DENIED" ||
    code.startsWith("PERMISSION_")
  ) {
    return 403;
  }

  if (code === "VALIDATION_FAILED" || code.startsWith("VALIDATION_")) {
    return 400;
  }

  if (code.startsWith("IDEMPOTENCY_")) {
    return 409;
  }

  if (code === "PROVIDER_RATE_LIMITED") {
    return 429;
  }

  if (code === "PROVIDER_TIMEOUT") {
    return 504;
  }

  if (code.startsWith("TOOL_")) {
    return 400;
  }

  if (code === "HISTORY_CURSOR_EXPIRED") {
    return 410;
  }

  if (code.startsWith("HISTORY_")) {
    return 400;
  }

  return 500;
}
