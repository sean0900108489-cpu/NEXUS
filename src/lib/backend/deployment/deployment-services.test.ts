import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { EnvironmentValidator } from "./environment-validator";
import {
  FeatureFlagService,
  InMemoryFeatureFlagRepository,
} from "./feature-flag-service";
import { RegistryConsistencyChecker } from "./registry-consistency-checker";
import { SchemaDriftChecker } from "./schema-drift-checker";

describe("EnvironmentValidator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local mode without live provider keys but still detects public Supabase env", () => {
    const validator = new EnvironmentValidator({
      env: {
        DEPLOYMENT_ENV: "local",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      },
    });
    const result = validator.validate("local");

    expect(result.status).toBe("passed");
    expect(result.checks.providerCredentialConfigured).toBe(false);
    expect(JSON.stringify(result)).not.toContain("https://example.supabase.co");
    expect(JSON.stringify(result)).not.toContain("OPENAI_API_KEY");
  });

  it("blocks production live mode when a required provider key is missing", () => {
    const validator = new EnvironmentValidator({
      env: {
        DEPLOYMENT_ENV: "production",
        NEXUS_RUNTIME_MODE: "live",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      },
    });
    const result = validator.validate("production");

    expect(result.status).toBe("blocked");
    expect(result.missing).toContain("providerCredential");
    expect(JSON.stringify(result)).not.toContain("OPENAI_API_KEY");
  });
});

describe("FeatureFlagService", () => {
  it("implements global flags, workspace overrides, and deterministic rollout", async () => {
    const repository = new InMemoryFeatureFlagRepository();
    const service = new FeatureFlagService({ repository });

    await service.toggleFlag({
      enabled: true,
      flagKey: "sync.durable_queue_enabled",
      rolloutPercentage: 100,
    });
    expect(
      await service.isEnabled("sync.durable_queue_enabled", {
        userId: "user-a",
        workspaceId: "workspace-a",
      }),
    ).toBe(true);

    await service.toggleFlag({
      enabled: false,
      flagKey: "sync.durable_queue_enabled",
      scopeKey: "workspace-a",
    });
    expect(
      await service.isEnabled("sync.durable_queue_enabled", {
        userId: "user-a",
        workspaceId: "workspace-a",
      }),
    ).toBe(false);

    await service.toggleFlag({
      enabled: true,
      flagKey: "workspace.cloud_state_enabled",
      rolloutPercentage: 50,
    });
    const first = await service.isEnabled("workspace.cloud_state_enabled", {
      userId: "user-stable",
      workspaceId: "workspace-a",
    });
    const second = await service.isEnabled("workspace.cloud_state_enabled", {
      userId: "user-stable",
      workspaceId: "workspace-a",
    });

    expect(first).toBe(second);
    expect(
      readFileSync(
        new URL("./feature-flag-service.ts", import.meta.url),
        "utf8",
      ),
    ).not.toContain("Math.random");
  });
});

describe("deployment checkers", () => {
  it("passes schema drift checks for V1-V5 additive tables and generated types", async () => {
    const result = await new SchemaDriftChecker().check();

    expect(result.status).toBe("passed");
    expect(result.details?.missingMigrations).toEqual([]);
    expect(result.details?.missingTypes).toEqual([]);
  });

  it("accepts declared registry aliases and fallbacks without rewriting ids", () => {
    const result = new RegistryConsistencyChecker().check();

    expect(result.status).not.toBe("failed");
    expect(result.details).toMatchObject({
      acceptedAliases: [
        {
          executorId: "mock.review-mesh",
          registryId: "mock-review-mesh",
        },
      ],
      acceptedFallbacks: [
        {
          fallbackExecutorId: "mock-video-gen",
          slotId: "real-video-gen",
        },
      ],
    });
  });
});
