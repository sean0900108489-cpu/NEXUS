import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type BrainProposalIntakeGate = {
  assertions: string[];
  evidence: {
    manualNote: string;
    screenshotPath: string;
  };
  id: string;
  points: number;
  result: "pass" | "fail";
  screenOperated: boolean;
};

type BrainProposalIntakeEvidenceManifest = {
  gates: BrainProposalIntakeGate[];
  mutationPolicy: {
    brainProposalMayMutateGraphDirectly: boolean;
    graphMutation: string;
    rejectedProposalMayImport: boolean;
    staleProposalMayImport: boolean;
  };
  score: {
    earned: number;
    max: number;
    passed: boolean;
  };
  schema: string;
  sourceCode: Record<string, string>;
};

describe("Workflow Pro Brain proposal intake evidence manifest", () => {
  it("keeps the screen-operated positive and negative proposal gates traceable", () => {
    const manifestPath = resolve(
      process.cwd(),
      "docs/workflow-pro/brain-proposal-intake-evidence.manifest.json",
    );
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as BrainProposalIntakeEvidenceManifest;

    expect(manifest.schema).toBe(
      "nexus.workflowPro.brainProposalIntakeEvidence.v1",
    );
    expect(manifest.score).toEqual({ earned: 20, max: 20, passed: true });
    expect(manifest.gates.map((gate) => gate.id)).toEqual([
      "valid-brain-proposal-import-preview",
      "stale-guard-after-edit",
      "malformed-proposal-rejection",
    ]);
    expect(manifest.gates.map((gate) => gate.points)).toEqual([10, 5, 5]);
    expect(manifest.gates.every((gate) => gate.result === "pass")).toBe(true);
    expect(manifest.gates.every((gate) => gate.screenOperated)).toBe(true);

    for (const gate of manifest.gates) {
      expect(gate.assertions.length).toBeGreaterThanOrEqual(4);
      expect(gate.evidence.manualNote).toContain(`R${gate.id === "valid-brain-proposal-import-preview" ? "118" : "119"}`);
      expect(existsSync(resolve(process.cwd(), gate.evidence.screenshotPath))).toBe(
        true,
      );
    }

    expect(manifest.mutationPolicy).toEqual({
      brainProposalMayMutateGraphDirectly: false,
      graphMutation: "operator-explicit-apply-only",
      rejectedProposalMayImport: false,
      staleProposalMayImport: false,
    });
    expect(Object.values(manifest.sourceCode).every((path) =>
      existsSync(resolve(process.cwd(), path)),
    )).toBe(true);
  });
});
