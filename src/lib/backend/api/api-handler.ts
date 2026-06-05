import type { ApiFailure, ApiSuccess } from "../contracts/api-envelope";
import { createApiFailure, createApiSuccess } from "../contracts/api-envelope";
import { IDEMPOTENCY_KEY_HEADER, REQUEST_ID_HEADER } from "../contracts/idempotency";
import type { TraceContext } from "../observability/trace-context";
import { emitBackendEvent } from "../observability/events";
import type { PermissionService } from "../security/permission-service";
import type { AuthenticatedSessionUser, AuthSessionVerifier } from "../security/auth-session";

import { resolveApiActor } from "./api-auth";
import { ApiError, getApiErrorDescriptor, toApiError } from "./api-errors";
import { assertValidRequest, type ApiRequestValidator } from "./api-request-validator";
import { createServerIdempotencyRepository, type IdempotencyRepository } from "./idempotency-repository";
import { beginIdempotentRequest } from "./idempotency-middleware";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_SCHEMA_VERSION = 1;

export type ApiHandlerContext<TBody> = {
  body: TBody;
  request: Request;
  requestId: string;
  sessionUser?: AuthenticatedSessionUser;
  trace: TraceContext;
  traceId: string;
  workspaceId: string;
};

export type ApiHandlerOptions<TBody, TData> = {
  auth?: {
    required?: boolean;
    verifier?: AuthSessionVerifier;
  };
  handler: (context: ApiHandlerContext<TBody>) => Promise<TData> | TData;
  idempotency?: {
    enabled?: boolean;
    repository?: IdempotencyRepository;
  };
  methods: string[];
  permission?: {
    action: string;
    permissionService?: PermissionService;
    permissionServiceFactory?: (
      context: ApiHandlerContext<TBody>,
    ) => PermissionService;
    resourceId?: (context: ApiHandlerContext<TBody>) => string | undefined;
    resourceType: string;
  };
  route: string;
  schemaVersion?: number;
  validator?: ApiRequestValidator<TBody>;
  workspaceId?: (request: Request, body: unknown) => string | undefined;
};

export function apiHandler<TBody = unknown, TData = unknown>(
  options: ApiHandlerOptions<TBody, TData>,
) {
  return async function handleApiRoute(request: Request): Promise<Response> {
    const startedAt = Date.now();
    const method = request.method.toUpperCase();
    const requestId = readHeader(request.headers, REQUEST_ID_HEADER) ?? makeId("req");
    const traceId = readHeader(request.headers, "X-Trace-Id") ?? makeId("trace");
    let statusCode = 500;
    let errorCode: string | undefined;
    let retryable: boolean | undefined;
    let workspaceId = "__global__";
    let idempotencyHit = false;
    let idempotencyRecordId: string | undefined;
    let idempotencyRepositoryForRequest: IdempotencyRepository | undefined;

    try {
      if (!options.methods.map((candidate) => candidate.toUpperCase()).includes(method)) {
        throw new ApiError("VALIDATION_FAILED", "HTTP method is not supported.", 405, {
          issues: [
            {
              code: "invalid_method",
              message: "HTTP method is not supported.",
              path: ["method"],
            },
          ],
        });
      }

      const rawBody = method === "GET" || method === "HEAD" ? undefined : await parseJsonBody(request);
      const body = assertValidRequest(options.validator, rawBody);
      workspaceId =
        options.workspaceId?.(request, body) ??
        readHeader(request.headers, "X-Workspace-Id") ??
        getWorkspaceIdFromBody(body) ??
        "__global__";
      const declaredUserId = readHeader(request.headers, "X-User-Id");
      const authRequired = Boolean(options.permission || options.auth?.required);
      const { actorUserId, sessionUser } = await resolveApiActor(request, {
        declaredUserId,
        required: authRequired,
        verifier: options.auth?.verifier,
      });
      const trace: TraceContext = {
        requestId,
        source: "api",
        traceId,
        userId: actorUserId,
        workspaceId: workspaceId === "__global__" ? undefined : workspaceId,
      };
      const context: ApiHandlerContext<TBody> = {
        body,
        request,
        requestId,
        sessionUser,
        trace,
        traceId,
        workspaceId,
      };

      if (options.permission) {
        const permissionService =
          options.permission.permissionServiceFactory?.(context) ??
          options.permission.permissionService;

        if (!permissionService) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "Permission service is not configured.",
            500,
          );
        }

        const decision = await permissionService.check({
          action: options.permission.action,
          resourceId: options.permission.resourceId?.(context),
          resourceType: options.permission.resourceType,
          userId: actorUserId ?? "",
          workspaceId,
        }, {
          requestId,
          traceId,
        });

        if (decision.decision !== "allow") {
          throw new ApiError(
            decision.reasonCode === "WORKSPACE_ACCESS_DENIED"
              ? "WORKSPACE_ACCESS_DENIED"
              : "PERMISSION_DENIED",
            "Permission denied.",
            403,
            {
              reasonCode: decision.reasonCode,
              requiredScopes: decision.requiredScopes,
            },
          );
        }
      }

      const mutation = MUTATION_METHODS.has(method);
      const idempotencyEnabled =
        mutation && (options.idempotency?.enabled ?? process.env.API_IDEMPOTENCY_ENABLED !== "false");
      const idempotencyRepository =
        options.idempotency?.repository ?? createServerIdempotencyRepository();
      idempotencyRepositoryForRequest = idempotencyRepository;

      if (idempotencyEnabled) {
        const idempotency = await beginIdempotentRequest({
          actorUserId,
          body,
          idempotencyKey: readHeader(request.headers, IDEMPOTENCY_KEY_HEADER),
          method,
          path: new URL(request.url).pathname,
          repository: idempotencyRepository,
          workspaceId,
        });

        if (idempotency.type === "missing_key") {
          throw new ApiError(
            "IDEMPOTENCY_KEY_MISSING",
            "X-Idempotency-Key is required for mutation requests.",
            400,
          );
        }

        if (idempotency.type === "hit") {
          idempotencyHit = true;
          statusCode = idempotency.statusCode;

          return jsonResponse(idempotency.responsePayload, statusCode, {
            "X-Idempotency-Hit": "true",
          });
        }

        if (idempotency.type === "conflict") {
          throw new ApiError("IDEMPOTENCY_CONFLICT", getApiErrorDescriptor("IDEMPOTENCY_CONFLICT").message, 409);
        }

        if (idempotency.type === "pending") {
          throw new ApiError("IDEMPOTENCY_PENDING", getApiErrorDescriptor("IDEMPOTENCY_PENDING").message, 409);
        }

        idempotencyRecordId = idempotency.recordId;
      }

      const data = await options.handler(context);
      const envelope = createApiSuccess(data, {
        requestId,
        schemaVersion: options.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
        traceId,
      }) satisfies ApiSuccess<TData>;
      statusCode = 200;

      if (idempotencyRecordId) {
        await idempotencyRepository.complete(idempotencyRecordId, statusCode, envelope);
      }

      return jsonResponse(envelope, statusCode);
    } catch (error) {
      const apiError = toApiError(error);
      const descriptor = getApiErrorDescriptor(apiError.code);
      const envelope = createApiFailure(
        {
          code: apiError.code,
          details: apiError.details,
          message: apiError.message || descriptor.message,
          retryable: descriptor.retryable,
        },
        {
          requestId,
          traceId,
        },
      ) satisfies ApiFailure;
      statusCode = apiError.statusCode || descriptor.statusCode;
      errorCode = apiError.code;
      retryable = descriptor.retryable;

      if (idempotencyRecordId && idempotencyRepositoryForRequest) {
        try {
          await idempotencyRepositoryForRequest.fail(idempotencyRecordId, statusCode, envelope);
        } catch {
          // Failure replay persistence must not expose infra details to clients.
        }
      }

      return jsonResponse(envelope, statusCode);
    } finally {
      await emitApiEvent({
        errorCode,
        idempotencyHit,
        latencyMs: Date.now() - startedAt,
        method,
        requestId,
        retryable,
        route: options.route,
        statusCode,
        traceId,
        workspaceId: workspaceId === "__global__" ? undefined : workspaceId,
      });
    }
  };
}

async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("VALIDATION_FAILED", "Invalid JSON body.", 400, {
      issues: [
        {
          code: "invalid_json",
          message: "Invalid JSON body.",
          path: [],
        },
      ],
    });
  }
}

function jsonResponse(payload: unknown, status: number, headers?: Record<string, string>) {
  return Response.json(payload, {
    headers,
    status,
  });
}

function readHeader(headers: Headers, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
}

function getWorkspaceIdFromBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  return typeof record.workspaceId === "string" && record.workspaceId.trim()
    ? record.workspaceId.trim()
    : undefined;
}

function makeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}

async function emitApiEvent(event: {
  errorCode?: string;
  idempotencyHit?: boolean;
  latencyMs: number;
  method: string;
  requestId: string;
  retryable?: boolean;
  route: string;
  statusCode: number;
  traceId: string;
  workspaceId?: string;
}) {
  try {
    await emitBackendEvent({
      name: "api.v1.request",
      payload: {
        errorCode: event.errorCode,
        idempotencyHit: event.idempotencyHit,
        latencyMs: event.latencyMs,
        method: event.method,
        retryable: event.retryable,
        route: event.route,
        source: "api",
        statusCode: event.statusCode,
        workspaceId: event.workspaceId,
      },
      status: event.statusCode < 400 ? "succeeded" : "failed",
      trace: {
        requestId: event.requestId,
        source: "api",
        traceId: event.traceId,
        workspaceId: event.workspaceId,
      },
    });
  } catch {
    // API event hooks are best-effort in V2.
  }
}
