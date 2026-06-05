import { describe, expect, it } from "vitest";

import { assertObservabilityAccess } from "./observability-route-helpers";

const WORKSPACE_ID = "workspace-observability";

function makeTrace(userId: string) {
  return {
    requestId: `req-${userId}`,
    source: "api" as const,
    traceId: `trace-${userId}`,
    userId,
    workspaceId: WORKSPACE_ID,
  };
}

describe("observability route access", () => {
  it("allows viewer workspace reads by default", async () => {
    await expect(
      assertObservabilityAccess({
        trace: makeTrace("local-viewer"),
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("requires editor role for write-like observability actions", async () => {
    await expect(
      assertObservabilityAccess({
        action: "workflow.trace.write",
        trace: makeTrace("local-viewer"),
        workspaceId: WORKSPACE_ID,
      }),
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      statusCode: 403,
    });

    await expect(
      assertObservabilityAccess({
        action: "workflow.trace.write",
        trace: makeTrace("local-editor"),
        workspaceId: WORKSPACE_ID,
      }),
    ).resolves.toBeUndefined();
  });
});
