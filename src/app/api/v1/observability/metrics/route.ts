import { apiHandler } from "@/lib/backend/api/api-handler";
import { getDefaultObservabilityService } from "@/lib/backend/observability";
import type { UsageMetricsResponse } from "@/lib/nexus-types";

import {
  assertObservabilityAccess,
  readWorkspaceId,
} from "../observability-route-helpers";

export const runtime = "nodejs";

export const GET = apiHandler<undefined, UsageMetricsResponse>({
  handler: async ({ request, trace, workspaceId }) => {
    await assertObservabilityAccess({
      action: "workspace.metrics.read",
      minRole: "editor",
      trace,
      workspaceId,
    });

    const url = new URL(request.url);

    return getDefaultObservabilityService().aggregateMetrics({
      cursor: url.searchParams.get("cursor"),
      limit: Number(url.searchParams.get("limit") ?? 50),
      model: url.searchParams.get("model"),
      provider: url.searchParams.get("provider"),
      workspaceId,
    });
  },
  methods: ["GET"],
  auth: {
    required: true,
  },
  route: "/api/v1/observability/metrics",
  workspaceId: (request) => readWorkspaceId(request),
});
