import type { ObservabilityEventSource } from "@/lib/nexus-types";

import type { TraceContext } from "./trace-context";

export class TraceContextMiddleware {
  fromRequest(
    request: Request,
    input: {
      resourceId?: string;
      resourceType?: string;
      source: ObservabilityEventSource;
      workspaceId?: string;
    },
  ): TraceContext {
    return {
      requestId: readHeader(request.headers, "X-Request-Id") ?? makeTraceId("req"),
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      source: input.source,
      traceId: readHeader(request.headers, "X-Trace-Id") ?? makeTraceId("trace"),
      userId: readHeader(request.headers, "X-User-Id"),
      workspaceId:
        input.workspaceId ?? readHeader(request.headers, "X-Workspace-Id") ?? undefined,
    };
  }

  headers(trace: Pick<TraceContext, "requestId" | "traceId" | "workspaceId">) {
    const headers: Record<string, string> = {
      "X-Request-Id": trace.requestId,
      "X-Trace-Id": trace.traceId,
    };

    if (trace.workspaceId) {
      headers["X-Workspace-Id"] = trace.workspaceId;
    }

    return headers;
  }

  withTrace<T extends Record<string, unknown>>(value: T, trace: TraceContext) {
    return {
      ...value,
      requestId: trace.requestId,
      traceId: trace.traceId,
      workspaceId: trace.workspaceId,
    };
  }
}

function readHeader(headers: Headers, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
}

function makeTraceId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}
