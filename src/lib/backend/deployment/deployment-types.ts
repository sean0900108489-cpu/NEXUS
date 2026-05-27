import type {
  DeploymentCheckRecord,
  DeploymentCheckStatus,
  DeploymentEnvironment,
  RuntimeHealthResponse,
} from "@/lib/nexus-types";

export type CheckSeverity = Exclude<
  DeploymentCheckStatus,
  "pending" | "running"
>;

export type DeploymentCheckResult = {
  name: string;
  status: CheckSeverity;
  summary: string;
  details?: Record<string, unknown>;
};

export type EnvironmentValidationResult = {
  mode: DeploymentEnvironment;
  runtimeMode: "live" | "mock" | "local";
  status: CheckSeverity;
  checks: Record<string, boolean>;
  missing: string[];
};

export type RuntimeHealthCheck = RuntimeHealthResponse;

export type LatestDeploymentCheckResult = {
  check: DeploymentCheckRecord | null;
};
