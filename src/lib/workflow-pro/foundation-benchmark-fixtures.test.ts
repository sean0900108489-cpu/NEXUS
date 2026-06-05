import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createWorkflowProFoundationBenchmarkFixtures,
  serializeWorkflowProFoundationBenchmarkFixture,
} from "./foundation-benchmark-fixtures";
import { createWorkflowProApplyPlan } from "./workflow-contract-apply-plan";
import { parseWorkflowProContractImportText } from "./workflow-contract-import";
import { validateWorkflowProContractDraft } from "./workflow-contract-validator";

describe("Workflow Pro foundation benchmark fixtures", () => {
  it("ships the three 10-point foundation benchmark contracts", () => {
    const fixtures = createWorkflowProFoundationBenchmarkFixtures();

    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      "baseline-linear",
      "llm-to-image",
      "image-reverse-fanout",
    ]);
    expect(fixtures.map((fixture) => fixture.expectedScore)).toEqual([10, 10, 10]);
  });

  it("validates every benchmark and produces a Runtime Lite apply candidate", () => {
    for (const fixture of createWorkflowProFoundationBenchmarkFixtures()) {
      const validation = validateWorkflowProContractDraft(fixture.contract);
      const applyPlan = createWorkflowProApplyPlan({
        contract: fixture.contract,
        currentRuntimeLite: undefined,
      });

      expect(validation.errors, fixture.id).toEqual([]);
      expect(applyPlan.status, fixture.id).toBe("ready");
      expect(applyPlan.candidateRuntimeLite?.nodes.length, fixture.id).toBe(
        fixture.contract.nodes.length,
      );
      expect(applyPlan.candidateRuntimeLite?.edges.length, fixture.id).toBe(
        fixture.contract.edges.length,
      );
    }
  });

  it("serializes benchmark JSON in the same shape accepted by UI paste import", () => {
    const review = parseWorkflowProContractImportText({
      sourceName: "baseline-linear.json",
      text: serializeWorkflowProFoundationBenchmarkFixture("baseline-linear"),
    });

    expect(review.status).toBe("accepted");
    expect(review.contract?.id).toBe("workflow-pro-foundation-baseline-linear");
  });

  it("records ready-parallel fan-out and explicit join limits in the C benchmark", () => {
    const fixture = createWorkflowProFoundationBenchmarkFixtures().find(
      (candidate) => candidate.id === "image-reverse-fanout",
    );

    expect(fixture?.contract.execution?.parallelGroups).toEqual([
      expect.objectContaining({
        id: "style-llm-fanout",
        runtimeStatus: "native-parallel",
      }),
      expect.objectContaining({
        id: "image-model-fanout",
        runtimeStatus: "native-parallel",
      }),
    ]);
    expect(fixture?.contract.successCriteria.join(" ")).toContain(
      "automatic fan-in merge",
    );
  });

  it("keeps the screen verification manifest aligned with the shipped benchmark fixtures", () => {
    const manifestPath = resolve(
      process.cwd(),
      "docs/workflow-pro/foundation-benchmark-verification.manifest.json",
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      benchmarks: Array<{ id: string; passed: boolean; score: number }>;
      negativeEvidence: Record<string, boolean>;
      score: { earned: number; max: number; passed: boolean };
      schema: string;
    };
    const fixtures = createWorkflowProFoundationBenchmarkFixtures();

    expect(manifest.schema).toBe(
      "nexus.workflowPro.foundationBenchmarkVerification.v1",
    );
    expect(manifest.score).toEqual({ earned: 30, max: 30, passed: true });
    expect(manifest.benchmarks.map((benchmark) => benchmark.id)).toEqual(
      fixtures.map((fixture) => fixture.id),
    );
    expect(manifest.benchmarks.map((benchmark) => benchmark.score)).toEqual(
      fixtures.map((fixture) => fixture.expectedScore),
    );
    expect(manifest.benchmarks.every((benchmark) => benchmark.passed)).toBe(true);
    expect(Object.values(manifest.negativeEvidence)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
