import { apiHandler } from "@/lib/backend/api/api-handler";
import { createDeploymentCheckService } from "@/lib/backend/deployment/deployment-check-service";
import type { RuntimeHealthResponse } from "@/lib/nexus-types";

export const runtime = "nodejs";

const deploymentCheckService = createDeploymentCheckService();

export const GET = apiHandler<undefined, RuntimeHealthResponse>({
  handler: () => deploymentCheckService.getRuntimeHealth(),
  methods: ["GET"],
  route: "/api/v1/health",
});
