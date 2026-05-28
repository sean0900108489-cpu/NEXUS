import { apiHandler } from "@/lib/backend/api/api-handler";
import { getDefaultObservabilityService } from "@/lib/backend/observability";
import type { TraceEventsResponse } from "@/lib/nexus-types";

import {
  assertObservabilityAccess,
  readWorkspaceId,
} from "../../observability-route-helpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ traceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { traceId } = await context.params;

  return apiHandler<undefined, TraceEventsResponse>({
    handler: async ({ request: routeRequest, trace, workspaceId }) => {
      await assertObservabilityAccess({
        trace,
        workspaceId,
      });

      const url = new URL(routeRequest.url);

      return getDefaultObservabilityService().getTrace({
        cursor: url.searchParams.get("cursor"),
        limit: Number(url.searchParams.get("limit") ?? 50),
        traceId,
        workspaceId,
      });
    },
    methods: ["GET"],
    route: "/api/v1/observability/traces/[traceId]",
    workspaceId: (routeRequest) => readWorkspaceId(routeRequest),
  })(request);
}
