import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const opsSource = readFileSync(new URL("./nexus-ops.tsx", import.meta.url), "utf8");

describe("generated history hydration wiring", () => {
  it("hydrates artifact history for generated-history panel and authenticated workspace sessions", () => {
    expect(opsSource).toContain('activeRightPanel !== "artifacts" && activeRightPanel !== "generations"');
    expect(opsSource).toContain("artifactAutoHydrationKeyRef");
    expect(opsSource).toContain("activeWorkspaceSession?.workspaceId !== workspaceId");
    expect(opsSource).toContain("void fetchArtifactsFromCloud().catch");
  });
});
