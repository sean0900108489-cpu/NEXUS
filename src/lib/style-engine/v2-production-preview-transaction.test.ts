import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createNexusStyleChecksumV1 } from "./checksum";
import {
  createProductionPreviewApplyPlan,
  createProductionPreviewResidueCheck,
  createProductionPreviewRevertPlan,
  NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
  type ProductionPreviewApplyPlanInput,
  type ProductionPreviewApplyTransaction,
} from "./v2-production-preview-transaction";

describe("NEXUS production preview first-cut transaction planner", () => {
  it("creates a ready apply plan for the authenticated outer shell target", () => {
    const plan = createProductionPreviewApplyPlan(createApplyInput());

    expect(plan.verdict).toBe("ready");
    expect(plan.failClosed).toBe(false);
    expect(plan.transaction?.targetSelector).toBe(
      NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    );
    expect(plan.transaction?.variableCount).toBe(2);
    expect(plan.transaction?.previousInlineValues["--nexus-panel-bg"]).toBe(
      "rgba(1, 2, 3, 0.4)",
    );
  });

  it("blocks missing, duplicate, html, body, and document-root targets", () => {
    const missing = createProductionPreviewApplyPlan(
      createApplyInput({ target: createTargetFacts({ targetCount: 0 }) }),
    );
    const duplicate = createProductionPreviewApplyPlan(
      createApplyInput({ target: createTargetFacts({ targetCount: 2 }) }),
    );
    const html = createProductionPreviewApplyPlan(
      createApplyInput({
        target: createTargetFacts({
          isHtmlElement: true,
          tagName: "html",
        }),
      }),
    );
    const body = createProductionPreviewApplyPlan(
      createApplyInput({
        target: createTargetFacts({
          isBodyElement: true,
          tagName: "body",
        }),
      }),
    );
    const root = createProductionPreviewApplyPlan(
      createApplyInput({
        target: createTargetFacts({
          isDocumentRoot: true,
        }),
      }),
    );

    for (const plan of [missing, duplicate, html, body, root]) {
      expect(plan.verdict).toBe("blocked");
      expect(plan.transaction).toBeNull();
    }
  });

  it("blocks checksum mismatch, zero variables, and unsafe writes", () => {
    const checksumMismatch = createProductionPreviewApplyPlan(
      createApplyInput({
        checksums: {
          bridgeChecksum: "nexus-style-fnv1a32:00000000",
          budgetChecksum: "nexus-style-fnv1a32:11111111",
          diagnosticsChecksum: "nexus-style-fnv1a32:11111111",
        },
      }),
    );
    const noVariables = createProductionPreviewApplyPlan(
      createApplyInput({ variables: {} }),
    );
    const unsafeWrite = createProductionPreviewApplyPlan(
      createApplyInput({
        safetyFlags: {
          writesToBackend: true,
        },
      }),
    );

    expect(checksumMismatch.verdict).toBe("blocked");
    expect(noVariables.verdict).toBe("blocked");
    expect(unsafeWrite.verdict).toBe("blocked");
  });

  it("holds when rollback or network baseline evidence is missing", () => {
    const rollbackMissing = createProductionPreviewApplyPlan(
      createApplyInput({ hasRollbackPlan: false }),
    );
    const networkBaselineMissing = createProductionPreviewApplyPlan(
      createApplyInput({ networkBaselineWindowId: "" }),
    );

    expect(rollbackMissing.verdict).toBe("hold");
    expect(networkBaselineMissing.verdict).toBe("hold");
  });

  it("models revert operations that restore previous values and remove introduced values", () => {
    const transaction = createReadyTransaction();
    const revertPlan = createProductionPreviewRevertPlan({
      expectedBridgeChecksum: transaction.checksums.bridgeChecksum,
      expectedSessionId: transaction.sessionId,
      target: createTargetFacts(),
      transaction,
    });

    expect(revertPlan.verdict).toBe("ready");
    expect(revertPlan.operations).toEqual([
      {
        kind: "restore",
        name: "--nexus-panel-bg",
        value: "rgba(1, 2, 3, 0.4)",
      },
      {
        kind: "remove",
        name: "--nexus-top-bar-bg",
      },
    ]);
    expect(
      createProductionPreviewRevertPlan({
        expectedBridgeChecksum: transaction.checksums.bridgeChecksum,
        expectedSessionId: transaction.sessionId,
        target: createTargetFacts(),
        transaction,
      }).operations,
    ).toEqual(revertPlan.operations);
  });

  it("checks residue after revert", () => {
    const transaction = createReadyTransaction();

    expect(
      createProductionPreviewResidueCheck({
        currentInlineValues: {
          "--nexus-panel-bg": "rgba(1, 2, 3, 0.4)",
          "--nexus-top-bar-bg": "",
        },
        transaction,
      }),
    ).toMatchObject({
      remainingPreviewVariableCount: 0,
      result: "pass",
    });

    expect(
      createProductionPreviewResidueCheck({
        currentInlineValues: {
          "--nexus-panel-bg": "rgba(9, 9, 9, 0.4)",
          "--nexus-top-bar-bg": "rgba(4, 5, 6, 0.4)",
        },
        transaction,
      }),
    ).toMatchObject({
      remainingPreviewVariableCount: 1,
      result: "fail",
    });
  });

  it("emits no raw CSS blocks, selectors beyond the approved target, or DOM instructions", () => {
    const plan = createProductionPreviewApplyPlan(createApplyInput());
    const serialized = JSON.stringify(plan);
    const source = readFileSync(
      new URL("v2-production-preview-transaction.ts", import.meta.url),
      "utf8",
    );

    expect(serialized).not.toMatch(/<style|<\/style>|<script|javascript:/i);
    expect(serialized).not.toMatch(/document\.|querySelector|localStorage|indexedDB|fetch\s*\(/);
    expect(source).not.toMatch(/from\s+["']@\/components\//);
    expect(source).not.toMatch(/from\s+["']@\/store\//);
    expect(source).not.toMatch(/from\s+["']@\/lib\/backend\//);
    expect(source).not.toMatch(/from\s+["']@\/lib\/sync\//);
    expect(source).not.toMatch(/from\s+["']@\/lib\/supabase\//);
    expect(source).not.toMatch(/\bdocument\./);
    expect(source).not.toMatch(/\bquerySelector\b/);
    expect(source).not.toMatch(/\blocalStorage\b/);
    expect(source).not.toMatch(/\bindexedDB\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});

function createReadyTransaction(): ProductionPreviewApplyTransaction {
  const plan = createProductionPreviewApplyPlan(createApplyInput());

  if (!plan.transaction) {
    throw new Error("Expected ready transaction.");
  }

  return plan.transaction;
}

function createApplyInput(
  overrides: Partial<ProductionPreviewApplyPlanInput> = {},
): ProductionPreviewApplyPlanInput {
  const variables = overrides.variables ?? createVariables();
  const variableChecksum = createNexusStyleChecksumV1(variables);

  return {
    checksums: {
      bridgeChecksum: variableChecksum,
      budgetChecksum: "nexus-style-fnv1a32:85e89afc",
      diagnosticsChecksum: "nexus-style-fnv1a32:85e89afc",
    },
    createdAt: "2026-05-31T00:00:00.000Z",
    hasAuthenticatedEvidence: true,
    hasRollbackPlan: true,
    networkBaselineWindowId: "route-load-baseline",
    preflightVerdict: "eligible",
    previousInlineValues: {
      "--nexus-panel-bg": "rgba(1, 2, 3, 0.4)",
    },
    safetyFlags: {},
    sessionId: "nexus-production-preview-session:test",
    target: createTargetFacts(),
    transactionId: "nexus-production-preview-transaction:test",
    variables,
    ...overrides,
  };
}

function createVariables() {
  return {
    "--nexus-panel-bg": "rgba(248, 232, 210, 0.46)",
    "--nexus-top-bar-bg": "rgba(244, 220, 190, 0.38)",
  };
}

function createTargetFacts(
  overrides: Partial<ProductionPreviewApplyPlanInput["target"]> = {},
): ProductionPreviewApplyPlanInput["target"] {
  return {
    classList: ["nexus-shell", "nexus-outer-shell-frame"],
    isBodyElement: false,
    isDocumentRoot: false,
    isHtmlElement: false,
    selector: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    tagName: "main",
    targetCount: 1,
    visible: true,
    ...overrides,
  };
}
