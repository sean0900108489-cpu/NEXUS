import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  getDefaultObservabilityService,
  isObservabilityEventSeverity,
  isObservabilityEventSource,
} from "@/lib/backend/observability";
import type { SystemEventListResponse } from "@/lib/nexus-types";

import {
  assertObservabilityAccess,
  readWorkspaceId,
} from "../observability-route-helpers";

export const runtime = "nodejs";

export const GET = apiHandler<undefined, SystemEventListResponse>({
  handler: async ({ request, trace, workspaceId }) => {
    await assertObservabilityAccess({
      trace,
      workspaceId,
    });

    const url = new URL(request.url);
    const severity = url.searchParams.get("severity");
    const source = url.searchParams.get("source");

    return getDefaultObservabilityService().listEvents({
      cursor: url.searchParams.get("cursor"),
      limit: Number(url.searchParams.get("limit") ?? 50),
      severity: isObservabilityEventSeverity(severity) ? severity : null,
      source: isObservabilityEventSource(source) ? source : null,
      traceId: url.searchParams.get("traceId"),
      workspaceId,
    });
  },
  methods: ["GET"],
  route: "/api/v1/observability/events",
  workspaceId: (request) => readWorkspaceId(request),
});
