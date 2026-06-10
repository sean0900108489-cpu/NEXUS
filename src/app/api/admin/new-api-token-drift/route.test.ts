import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import {
  getInMemoryNewApiAdminAuditStore,
  resetNewApiTokenDriftServiceForTests,
  setNewApiTokenMappingRepositoryForTests,
} from "@/lib/backend/new-api-admin/token-drift-service";

import { GET } from "./route";

describe("GET /api/admin/new-api-token-drift", () => {
  beforeEach(() => {
    getInMemoryNewApiAdminAuditStore().clear();
    vi.stubEnv("NEXUS_ADMIN_USER_IDS", "admin-user");
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");
    vi.stubEnv("NEW_API_ADMIN_COOKIE", "session=admin-cookie");
    vi.stubEnv("NEW_API_ADMIN_USER_ID", "2");
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetNewApiTokenDriftServiceForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects non-admin users before calling New API admin endpoints", async () => {
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({ id: "regular-user" }),
    });
    setNewApiTokenMappingRepositoryForTests({
      listEnabledMappings: async () => {
        throw new Error("mapping repository should not be called");
      },
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(
      new Request("http://localhost/api/admin/new-api-token-drift", {
        headers: { Authorization: "Bearer session-token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("PERMISSION_DENIED");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns an admin drift report without raw or encrypted tokens", async () => {
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({ id: "admin-user" }),
    });
    setNewApiTokenMappingRepositoryForTests({
      listEnabledMappings: async () => [
        {
          enabled: true,
          newApiGroup: "svip",
          plan: "pro",
          tokenId: "101",
          tokenName: "NEXUS User B",
          userId: "user-b",
        },
      ],
    });
    const fetcher = vi.fn(async () =>
      Response.json({
        data: {
          id: 101,
          group: "default",
          key: "sk-raw-downstream-token",
          model_limits: ["gpt-4o", "deepseek-chat"],
          name: "NEXUS User B",
          remain_quota: 998877,
          token: "sk-another-raw-token",
          unlimited_quota: false,
        },
        success: true,
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(
      new Request("http://localhost/api/admin/new-api-token-drift", {
        headers: { Authorization: "Bearer session-token" },
      }),
    );
    const payload = await response.json();
    const payloadText = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      "https://new-api.example.test/api/token/101",
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "session=admin-cookie",
          "New-Api-User": "2",
        }),
        method: "GET",
      }),
    );
    expect(payload.summary).toMatchObject({
      checked: 1,
      drifted: 1,
    });
    expect(payload.items).toEqual([
      expect.objectContaining({
        groupMatch: false,
        nexusGroup: "svip",
        nexusPlan: "pro",
        newApiGroup: "default",
        suggestedAction: "update_new_api_group_to_match_nexus_mapping",
        tokenName: "NEXUS User B",
        userId: "user-b",
      }),
    ]);
    expect(payload.items[0].quotaSummary).toEqual({
      remainingQuota: 998877,
      unlimited: false,
    });
    expect(payload.items[0].modelLimitSummary).toEqual({
      count: 2,
      models: ["gpt-4o", "deepseek-chat"],
      restricted: true,
    });
    expect(payloadText).not.toContain("sk-raw-downstream-token");
    expect(payloadText).not.toContain("sk-another-raw-token");
    expect(payloadText).not.toContain("encrypted_new_api_token");
    expect(JSON.stringify(getInMemoryNewApiAdminAuditStore().all())).not.toContain(
      "sk-raw-downstream-token",
    );
    expect(getInMemoryNewApiAdminAuditStore().all()).toEqual([
      expect.objectContaining({
        action: "new_api_token_drift_check",
        actorUserId: "admin-user",
        decision: "allowed",
        resourceType: "new_api_token_mapping",
      }),
    ]);
  });
});
