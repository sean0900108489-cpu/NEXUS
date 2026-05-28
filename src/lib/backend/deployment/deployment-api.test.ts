import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as latestDeploymentCheckGet } from "@/app/api/v1/deployment/checks/latest/route";
import { POST as runDeploymentCheckPost } from "@/app/api/v1/deployment/checks/run/route";
import { GET as getFeatureFlags } from "@/app/api/v1/feature-flags/route";
import { POST as toggleFeatureFlag } from "@/app/api/v1/feature-flags/[flagKey]/toggle/route";

function makeJsonRequest(
  url: string,
  body: unknown,
  userId = "local-admin",
) {
  const id = crypto.randomUUID();

  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": `mutation_${id}`,
      "X-Request-Id": `req_${id}`,
      "X-User-Id": userId,
      "X-Workspace-Id": "workspace-deploy",
    },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("V5 health and admin deployment APIs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns lightweight health without env raw values or schema drift work", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://health.example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-health-secret");
    vi.stubEnv("DEPLOYMENT_ENV", "local");

    const response = await healthGet(new Request("http://localhost/api/v1/health"));
    const json = await readJson(response);
    const serialized = JSON.stringify(json);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        database: true,
        deployment: expect.any(Boolean),
        env: true,
        mode: "local",
        registry: expect.any(Boolean),
        status: expect.stringMatching(/^(ok|warning)$/),
      },
      ok: true,
    });
    expect(serialized).not.toContain("https://health.example.supabase.co");
    expect(serialized).not.toContain("anon-health-secret");
    expect(serialized).not.toContain("schema_drift");
  });

  it("allows admin preflight runs and denies viewers", async () => {
    const adminResponse = await runDeploymentCheckPost(
      makeJsonRequest("http://localhost/api/v1/deployment/checks/run", {
        environment: "local",
        releaseVersion: "v5-test",
        workspaceId: "workspace-deploy",
      }),
    );
    const adminJson = await readJson(adminResponse);

    expect(adminResponse.status).toBe(200);
    expect(adminJson).toMatchObject({
      data: {
        check: {
          checkType: "preflight",
          environment: "local",
          status: expect.stringMatching(/^(passed|warning|failed|blocked)$/),
        },
      },
      ok: true,
    });

    const viewerResponse = await runDeploymentCheckPost(
      makeJsonRequest(
        "http://localhost/api/v1/deployment/checks/run",
        {
          environment: "local",
          workspaceId: "workspace-deploy",
        },
        "local-viewer",
      ),
    );

    expect(viewerResponse.status).toBe(403);
  });

  it("returns latest deployment check through the admin-only route", async () => {
    await runDeploymentCheckPost(
      makeJsonRequest("http://localhost/api/v1/deployment/checks/run", {
        environment: "local",
        releaseVersion: "v5-latest-test",
        workspaceId: "workspace-deploy",
      }),
    );
    const response = await latestDeploymentCheckGet(
      new Request("http://localhost/api/v1/deployment/checks/latest?workspaceId=workspace-deploy", {
        headers: {
          "X-User-Id": "local-admin",
        },
      }),
    );
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      data: {
        check: expect.any(Object),
      },
      ok: true,
    });
    expect(JSON.stringify(json)).not.toMatch(/sk-|Bearer|service_role/i);
  });
});

describe("V5 feature flag API", () => {
  it("toggles workspace flags as admin and returns frontend-safe projection", async () => {
    const toggleResponse = await toggleFeatureFlag(
      makeJsonRequest("http://localhost/api/v1/feature-flags/sync.local_queue_enabled/toggle", {
        enabled: true,
        metadata: {
          owner: "deployment-test",
        },
        rolloutPercentage: 100,
        scopeKey: "workspace-deploy",
        workspaceId: "workspace-deploy",
      }),
      {
        params: Promise.resolve({ flagKey: "sync.local_queue_enabled" }),
      },
    );
    const toggleJson = await readJson(toggleResponse);

    expect(toggleResponse.status).toBe(200);
    expect(toggleJson).toMatchObject({
      data: {
        flag: {
          enabled: true,
          flagKey: "sync.local_queue_enabled",
          rolloutPercentage: 100,
          scopeKey: "workspace-deploy",
        },
      },
      ok: true,
    });

    const listResponse = await getFeatureFlags(
      new Request("http://localhost/api/v1/feature-flags?workspaceId=workspace-deploy", {
        headers: {
          "X-User-Id": "local-viewer",
        },
      }),
    );
    const listJson = await readJson(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listJson).toMatchObject({
      data: {
        flags: expect.arrayContaining([
          expect.objectContaining({
            enabled: true,
            flagKey: "sync.local_queue_enabled",
          }),
        ]),
      },
      ok: true,
    });
    expect(JSON.stringify(listJson)).not.toContain("deployment-test");
  });

  it("rejects feature flag writes from viewers", async () => {
    const response = await toggleFeatureFlag(
      makeJsonRequest(
        "http://localhost/api/v1/feature-flags/sync.compaction_enabled/toggle",
        {
          enabled: true,
          workspaceId: "workspace-deploy",
        },
        "local-viewer",
      ),
      {
        params: Promise.resolve({ flagKey: "sync.compaction_enabled" }),
      },
    );

    expect(response.status).toBe(403);
  });
});

describe("V5 migration contract", () => {
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/20260527004000_deployment_safety_gate.sql", import.meta.url),
    "utf8",
  );

  it("creates feature_flags and deployment_checks with constraints, indexes, and RLS", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.feature_flags");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.deployment_checks");
    expect(migration).toContain("feature_flags_key_scope_unique");
    expect(migration).toContain("feature_flags_rollout_percentage_check");
    expect(migration).toContain("deployment_checks_environment_check");
    expect(migration).toContain("deployment_checks_status_check");
    expect(migration).toContain("idx_feature_flags_key_scope");
    expect(migration).toContain("idx_deployment_checks_release_created");
    expect(migration).toContain("idx_deployment_checks_status");
    expect(migration).toContain("idx_deployment_checks_type_created");
    expect(migration).toMatch(/feature_flags ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/deployment_checks ENABLE ROW LEVEL SECURITY/i);
  });

  it("does not introduce V6-V9 lifecycle tables", () => {
    expect(migration).not.toMatch(/agent_tasks|tool_runs|artifact_versions|system_events|usage_metrics/i);
  });
});
