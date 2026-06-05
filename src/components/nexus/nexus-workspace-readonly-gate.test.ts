import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const opsSource = readFileSync(
  new URL("./nexus-ops.tsx", import.meta.url),
  "utf8",
);
const graphSource = readFileSync(
  new URL("./nexus-graph.tsx", import.meta.url),
  "utf8",
);

describe("workspace read-only gate wiring", () => {
  it("remembers the server-issued workspace role and gates workspace mutations", () => {
    expect(opsSource).toContain("WorkspaceSessionEnsureResponse");
    expect(opsSource).toContain("rememberWorkspaceSession");
    expect(opsSource).toContain("isWorkspaceReadOnlyRole(activeWorkspaceRole)");
    expect(opsSource).toContain("blockReadOnlyWorkspaceMutation");
    expect(opsSource).toContain("workspaceReadOnly={activeWorkspaceReadOnly}");
    expect(opsSource).toContain("readOnly={activeWorkspaceReadOnly}");
  });

  it("disables Graph mutation surfaces for read-only workspaces", () => {
    expect(graphSource).toContain("nodesConnectable={!readOnly}");
    expect(graphSource).toContain("nodesDraggable={!readOnly}");
    expect(graphSource).toContain("deleteKeyCode={readOnly ? null");
    expect(graphSource).toContain("disabled={readOnly || workflowRunning}");
    expect(graphSource).toContain("data?.readOnly ? null");
    expect(graphSource).toContain("disabledReason={readOnlyMessage}");
  });
});
