import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const projectRoot = new URL("../../../../", import.meta.url);

type AuthBoundaryScanReport = {
  blockingFindings: Array<{ code: string; file: string; message: string }>;
  browserStorageGate: {
    authVaultScrubbedBeforePersist: boolean;
    persistenceVersion: number;
  };
  legacyProductionGate: {
    requiredRoutes: number;
    routesWithProductionBlock: number;
  };
  productionImageGenerationGate: {
    formalRoutes: number;
    routesWithAccessGuard: number;
    routesWithRuntimeAuthorizationHeader: number;
  };
  requestScopedWorkspacePermissionGate: {
    requiredRoutes: number;
    routesWithFormalImageAccessGuard: number;
    routesWithRequestScopedFactory: number;
  };
  routeInventory: {
    apiHandlerRoutes: number;
    authRequiredRoutes: number;
    permissionRoutes: number;
    protectedRoutes: number;
    total: number;
  };
  runtimeAuthGate: {
    usesRuntimeAuthorizationHeader: boolean;
    usesSupabaseAuthorizationFallback: boolean;
  };
  supabaseGate: {
    hardeningMigrationPresent: boolean;
  };
};

describe("V20 auth boundary gate", () => {
  it("keeps the repeatable auth-boundary scan green", () => {
    const output = execFileSync("node", ["scripts/auth-boundary-scan.mjs"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    const report = JSON.parse(output) as AuthBoundaryScanReport;

    expect(report.blockingFindings).toEqual([]);
    expect(report.routeInventory.total).toBeGreaterThanOrEqual(40);
    expect(report.routeInventory.apiHandlerRoutes).toBeGreaterThanOrEqual(1);
    expect(report.routeInventory.protectedRoutes).toBeGreaterThanOrEqual(30);
    expect(report.routeInventory.authRequiredRoutes).toBeGreaterThanOrEqual(15);
    expect(report.routeInventory.permissionRoutes).toBeGreaterThanOrEqual(15);
    expect(report.legacyProductionGate.routesWithProductionBlock).toBe(
      report.legacyProductionGate.requiredRoutes,
    );
    expect(report.productionImageGenerationGate.routesWithAccessGuard).toBe(
      report.productionImageGenerationGate.formalRoutes,
    );
    expect(report.productionImageGenerationGate.routesWithRuntimeAuthorizationHeader).toBe(
      report.productionImageGenerationGate.formalRoutes,
    );
    expect(
      report.requestScopedWorkspacePermissionGate.routesWithRequestScopedFactory +
        report.requestScopedWorkspacePermissionGate.routesWithFormalImageAccessGuard,
    ).toBe(report.requestScopedWorkspacePermissionGate.requiredRoutes);
    expect(report.runtimeAuthGate.usesRuntimeAuthorizationHeader).toBe(true);
    expect(report.runtimeAuthGate.usesSupabaseAuthorizationFallback).toBe(false);
    expect(report.browserStorageGate.authVaultScrubbedBeforePersist).toBe(true);
    expect(report.browserStorageGate.persistenceVersion).toBeGreaterThanOrEqual(15);
    expect(report.supabaseGate.hardeningMigrationPresent).toBe(true);
  });

  it("keeps the live probe ready for protected Vercel previews without logging the bypass secret", () => {
    const source = readFileSync(
      new URL("../../../../scripts/live-auth-boundary-probe.mjs", import.meta.url),
      "utf8",
    );

    expect(source).toContain("VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(source).toContain("x-vercel-protection-bypass");
    expect(source).toContain("platformProtectionLikely");
    expect(source).toContain("vercelProtectionBypass");
    expect(source).toContain('"header-present"');
    expect(source).not.toContain("console.log(vercelProtectionBypassSecret)");
  });
});
