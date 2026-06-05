import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import {
  createWorkflowProRuntimeEvidenceManifest,
  createWorkflowProRuntimeEvidenceReport,
} from "./runtime-evidence";

describe("Workflow Pro runtime evidence", () => {
  it("creates a Brain-readable evidence report from the latest run", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: "run-latest",
      nodes: [],
      runs: [
        {
          completedAt: "2026-06-04T00:00:03.000Z",
          error: null,
          nodeExecutions: [
            {
              completedAt: "2026-06-04T00:00:01.000Z",
              inputSnapshot: null,
              latencyMs: 1000,
              nodeId: "input",
              outputSnapshot: {
                createdAt: "2026-06-04T00:00:01.000Z",
                displayText: "Y2K fashion board",
                id: "packet-input",
                metadata: {},
                rawText: "Y2K fashion board",
                runId: "run-latest",
                sourceNodeId: "input",
              },
              runId: "run-latest",
              startedAt: "2026-06-04T00:00:00.000Z",
              status: "success",
            },
            {
              completedAt: "2026-06-04T00:00:03.000Z",
              inputSnapshot: null,
              latencyMs: 2000,
              nodeId: "image",
              outputSnapshot: {
                createdAt: "2026-06-04T00:00:03.000Z",
                displayText: "Image generated.",
                id: "packet-image",
                metadata: {
                  artifactId: "artifact-image-1",
                  artifactVaultRecord: {
                    createdAt: "2026-06-04T00:00:03.000Z",
                    id: "vault-image-1",
                    title: "Workflow image",
                    type: "image",
                    workspaceId: "workspace-test",
                  },
                },
                rawText: "Image URL: https://example.test/image.png",
                runId: "run-latest",
                sourceNodeId: "image",
              },
              runId: "run-latest",
              startedAt: "2026-06-04T00:00:01.000Z",
              status: "success",
            },
          ],
          runId: "run-latest",
          startedAt: "2026-06-04T00:00:00.000Z",
          status: "success",
          traceSync: {
            completedAt: "2026-06-04T00:00:04.000Z",
            eventId: "event-runtime-latest",
            status: "synced",
            traceId: "workflow-runtime:run-latest",
          },
          workflowId: "workspace-test",
        },
      ],
      version: 1,
    };

    const report = createWorkflowProRuntimeEvidenceReport(runtimeLite);

    expect(report.schema).toBe("nexus.workflowPro.runtimeEvidence.v1");
    expect(report.latestRun).toMatchObject({
      artifactCount: 2,
      durationMs: 3000,
      nodeCount: 2,
      runId: "run-latest",
      status: "success",
      traceSync: {
        status: "synced",
      },
    });
    expect(report.timeline).toHaveLength(2);
    expect(report.timeline[1]?.artifactIds).toEqual([
      "artifact-image-1",
      "vault-image-1",
    ]);
    expect(report.warnings).toEqual([]);
    expect(report.recommendations.join("\n")).toContain("Durable backend trace");
  });

  it("flags completed runs without confirmed durable backend trace", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: "run-trace-failed",
      nodes: [],
      runs: [
        {
          completedAt: "2026-06-04T00:00:03.000Z",
          error: null,
          nodeExecutions: [],
          runId: "run-trace-failed",
          startedAt: "2026-06-04T00:00:00.000Z",
          status: "success",
          traceSync: {
            error: "PERMISSION_DENIED: Permission denied.",
            status: "failed",
            traceId: "workflow-runtime:run-trace-failed",
          },
          workflowId: "workspace-test",
        },
      ],
      version: 1,
    };

    const report = createWorkflowProRuntimeEvidenceReport(runtimeLite);

    expect(report.latestRun?.traceSync).toMatchObject({
      status: "failed",
    });
    expect(report.warnings.join("\n")).toContain("no confirmed durable");
    expect(report.recommendations.join("\n")).toContain("authentication");
  });

  it("marks missing execution history as a visible warning", () => {
    const report = createWorkflowProRuntimeEvidenceReport(undefined);

    expect(report.latestRun).toBeNull();
    expect(report.warnings.join("\n")).toContain("No workflow runtime runs");
    expect(report.recommendations.join("\n")).toContain("Run the workflow");
  });

  it("wraps runtime evidence in a stable export manifest", () => {
    const report = createWorkflowProRuntimeEvidenceReport(undefined);
    const manifest = createWorkflowProRuntimeEvidenceManifest({
      createdAt: "2026-06-04T01:00:00.000Z",
      evidence: report,
      workspaceId: "workspace-export-test",
      workspaceName: "NEXUS EXPORT",
    });

    expect(manifest.schema).toBe(
      "nexus.workflowPro.runtimeEvidenceManifest.v1",
    );
    expect(manifest.workspace).toEqual({
      id: "workspace-export-test",
      name: "NEXUS EXPORT",
    });
    expect(manifest.regressionUse).toMatchObject({
      sourceOfTruth: "runtimeLite.runs",
    });
    expect(manifest.regressionUse.screenSections).toContain(
      "Local Workflow Evidence",
    );
    expect(manifest.evidence).toBe(report);
  });
});
