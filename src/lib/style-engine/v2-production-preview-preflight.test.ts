import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createProductionPreviewPreflight,
  type ProductionPreviewPreflightInput,
  type ProductionPreviewSafetyFlags,
  type ProductionPreviewTargetScope,
} from "./v2-production-preview-preflight";

describe("NEXUS production preview preflight contract", () => {
  it("allows an eligible Style Lab-like completed diagnostics preflight", () => {
    const summary = createProductionPreviewPreflight(createPreflightInput());

    expect(summary.verdict).toBe("eligible");
    expect(summary.failClosed).toBe(false);
    expect(summary.blockers).toEqual([]);
    expect(summary.allowedTargetScope?.scopeId).toBe(
      "style-lab-production-chrome-smoke",
    );
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "budget-safe",
          status: "satisfied",
        }),
        expect.objectContaining({
          id: "style-lab-preflight-pass",
          status: "satisfied",
        }),
        expect.objectContaining({
          id: "residue-pass",
          status: "satisfied",
        }),
      ]),
    );
  });

  it("holds an authenticated production route without authenticated smoke", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        flags: {
          hasAuthenticatedSmoke: false,
        },
        targetScope: createTargetScope({
          mutationTarget: "production-route-container",
          requiresAuthSmoke: true,
          scopeId: "nexus-authenticated-root",
          scopeType: "authenticated-production-route",
        }),
      }),
    );

    expect(summary.verdict).toBe("hold");
    expect(summary.reasons.map((reason) => reason.code)).toContain(
      "productionPreviewPreflight.authSmokeMissing",
    );
    expect(summary.allowedTargetScope?.scopeType).toBe(
      "authenticated-production-route",
    );
  });

  it("allows an authenticated production route with auth smoke and rollback", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        flags: {
          hasAuthenticatedSmoke: true,
          hasRollbackPlan: true,
        },
        targetScope: createTargetScope({
          mutationTarget: "production-route-container",
          requiresAuthSmoke: true,
          scopeId: "nexus-authenticated-root",
          scopeType: "authenticated-production-route",
        }),
      }),
    );

    expect(summary.verdict).toBe("eligible");
    expect(summary.allowedTargetScope?.scopeType).toBe(
      "authenticated-production-route",
    );
  });

  it("blocks checksum mismatches", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        diagnosticsChecksum: "nexus-style-fnv1a32:ffff0000",
      }),
    );

    expect(summary.verdict).toBe("blocked");
    expect(summary.failClosed).toBe(true);
    expect(summary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.checksumMismatch",
    );
  });

  it("blocks residue failures", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        residueCheck: "fail",
      }),
    );

    expect(summary.verdict).toBe("blocked");
    expect(summary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.residueFailed",
    );
  });

  it("blocks store, backend, and storage write flags", () => {
    const storeSummary = createProductionPreviewPreflight(
      createPreflightInput({ flags: { writesToStore: true } }),
    );
    const backendSummary = createProductionPreviewPreflight(
      createPreflightInput({ flags: { writesToBackend: true } }),
    );
    const storageSummary = createProductionPreviewPreflight(
      createPreflightInput({ flags: { writesToStorage: true } }),
    );

    expect(storeSummary.verdict).toBe("blocked");
    expect(backendSummary.verdict).toBe("blocked");
    expect(storageSummary.verdict).toBe("blocked");
    expect(storeSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.storeWriteBlocked",
    );
    expect(backendSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.backendWriteBlocked",
    );
    expect(storageSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.storageWriteBlocked",
    );
  });

  it("blocks root-level mutation in an authenticated production route", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        targetScope: createTargetScope({
          mutationTarget: "root-document",
          requiresAuthSmoke: true,
          scopeId: "nexus-authenticated-root",
          scopeType: "authenticated-production-route",
        }),
      }),
    );

    expect(summary.verdict).toBe("blocked");
    expect(summary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.rootMutationBlocked",
    );
  });

  it("holds when rollback evidence is missing", () => {
    const summary = createProductionPreviewPreflight(
      createPreflightInput({
        flags: {
          hasRollbackPlan: false,
        },
      }),
    );

    expect(summary.verdict).toBe("hold");
    expect(summary.reasons.map((reason) => reason.code)).toContain(
      "productionPreviewPreflight.rollbackMissing",
    );
  });

  it("fails closed for missing or invalid input", () => {
    const missingSummary = createProductionPreviewPreflight(null);
    const invalidScopeSummary = createProductionPreviewPreflight(
      createPreflightInput({
        targetScope: createTargetScope({
          scopeId: "",
        }),
      }),
    );

    expect(missingSummary.verdict).toBe("blocked");
    expect(missingSummary.failClosed).toBe(true);
    expect(missingSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.invalidInput",
    );
    expect(invalidScopeSummary.verdict).toBe("blocked");
    expect(invalidScopeSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.invalidTargetScope",
    );
  });

  it("fails closed for unknown mode and scope", () => {
    const unknownModeSummary = createProductionPreviewPreflight(
      createPreflightInput({
        productionApplyMode: "persistent-production-apply",
      }),
    );
    const unknownScopeSummary = createProductionPreviewPreflight(
      createPreflightInput({
        targetScope: createTargetScope({
          scopeType: "unknown-production-scope",
        }),
      }),
    );

    expect(unknownModeSummary.verdict).toBe("blocked");
    expect(unknownModeSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.unknownMode",
    );
    expect(unknownScopeSummary.verdict).toBe("blocked");
    expect(unknownScopeSummary.blockers.map((blocker) => blocker.code)).toContain(
      "productionPreviewPreflight.invalidTargetScope",
    );
  });

  it("emits no raw CSS, selectors, payloads, or executable instructions", () => {
    const summary = createProductionPreviewPreflight(createPreflightInput());
    const serialized = JSON.stringify(summary);
    const source = readFileSync(
      new URL("v2-production-preview-preflight.ts", import.meta.url),
      "utf8",
    );
    const forbiddenSummaryPatterns = [
      /\.nexus-/,
      /\bselector\b/i,
      /\bclassName\b/,
      /\bdocument\./,
      /\bquerySelector\b/,
      /\blocalStorage\b/,
      /\bfetch\s*\(/,
      /<script|javascript:|\burl\s*\(|https?:\/\/|ftp:\/\/|\b(?:blob|file|data):|!important/i,
    ];
    const forbiddenSourcePatterns = [
      /from\s+["']@\/components\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /\bdocument\./,
      /\bquerySelector\b/,
      /\blocalStorage\b/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    for (const pattern of forbiddenSummaryPatterns) {
      expect(serialized, `Preflight summary should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }

    for (const pattern of forbiddenSourcePatterns) {
      expect(source, `Preflight helper should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function createPreflightInput(
  overrides: Partial<
    Omit<ProductionPreviewPreflightInput, "flags" | "targetScope">
  > & {
    flags?: Partial<ProductionPreviewSafetyFlags>;
    targetScope?: ProductionPreviewTargetScope;
  } = {},
): ProductionPreviewPreflightInput {
  const { flags, targetScope, ...restOverrides } = overrides;

  return {
    budgetChecksum: "nexus-style-fnv1a32:85e89afc",
    budgetVerdict: "safe",
    diagnosticsChecksum: "nexus-style-fnv1a32:85e89afc",
    diagnosticsStatus: "reverted",
    flags: createSafetyFlags(flags),
    preflightVerdict: "PASS",
    productionApplyMode: "non-persistent-preview",
    residueCheck: "pass",
    sessionId: "style-preview:style-lab-production-chrome-smoke:001:rn6",
    targetScope: targetScope ?? createTargetScope(),
    variableCount: 30,
    ...restOverrides,
  };
}

function createSafetyFlags(
  overrides: Partial<ProductionPreviewSafetyFlags> = {},
): ProductionPreviewSafetyFlags {
  return {
    hasAuthenticatedSmoke: false,
    hasRollbackPlan: true,
    mutatesDocumentRoot: false,
    touchesProductionBehavior: false,
    writesToBackend: false,
    writesToStorage: false,
    writesToStore: false,
    ...overrides,
  };
}

function createTargetScope(
  overrides: Partial<ProductionPreviewTargetScope> = {},
): ProductionPreviewTargetScope {
  return {
    mutationTarget: "local-container",
    persistence: "none",
    requiresAuthSmoke: false,
    scopeId: "style-lab-production-chrome-smoke",
    scopeType: "style-lab",
    ...overrides,
  };
}
