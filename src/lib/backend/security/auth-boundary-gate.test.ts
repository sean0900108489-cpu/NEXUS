import { execFileSync } from "node:child_process";

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
    expect(report.runtimeAuthGate.usesRuntimeAuthorizationHeader).toBe(true);
    expect(report.runtimeAuthGate.usesSupabaseAuthorizationFallback).toBe(false);
    expect(report.browserStorageGate.authVaultScrubbedBeforePersist).toBe(true);
    expect(report.browserStorageGate.persistenceVersion).toBeGreaterThanOrEqual(15);
    expect(report.supabaseGate.hardeningMigrationPresent).toBe(true);
  });
});
