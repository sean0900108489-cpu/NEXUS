import { describe, expect, it } from "vitest";

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

  it("records current fan-out limits in the C benchmark instead of pretending native parallel execution exists", () => {
    const fixture = createWorkflowProFoundationBenchmarkFixtures().find(
      (candidate) => candidate.id === "image-reverse-fanout",
    );

    expect(fixture?.contract.execution?.parallelGroups).toEqual([
      expect.objectContaining({
        id: "style-llm-fanout",
        runtimeStatus: "runtime-lite-sequential",
      }),
      expect.objectContaining({
        id: "image-model-fanout",
        runtimeStatus: "runtime-lite-sequential",
      }),
    ]);
    expect(fixture?.contract.successCriteria.join(" ")).toContain(
      "text-based image reference",
    );
  });
});
