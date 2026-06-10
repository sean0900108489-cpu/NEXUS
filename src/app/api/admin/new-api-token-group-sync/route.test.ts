import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import {
  getInMemoryNewApiAdminAuditStore,
  resetNewApiTokenDriftServiceForTests,
} from "@/lib/backend/new-api-admin/token-drift-service";

import { POST } from "./route";

describe("POST /api/admin/new-api-token-group-sync", () => {
  beforeEach(() => {
    getInMemoryNewApiAdminAuditStore().clear();
    vi.stubEnv("NEXUS_ADMIN_USER_IDS", "admin-user");
    vi.stubEnv("NEW_API_BASE_URL", "https://new-api.example.test/v1");
    vi.stubEnv("NEW_API_ADMIN_COOKIE", "session=admin-cookie");
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    resetNewApiTokenDriftServiceForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects non-admin users before attempting sync", async () => {
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({ id: "regular-user" }),
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/admin/new-api-token-group-sync", {
        body: JSON.stringify({ targetGroup: "svip", userId: "user-b" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("PERMISSION_DENIED");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not call unsafe New API token update and returns manual-required guidance", async () => {
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({ id: "admin-user" }),
    });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/admin/new-api-token-group-sync", {
        body: JSON.stringify({ targetGroup: "svip", userId: "user-b" }),
        headers: {
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const payload = await response.json();
    const payloadText = JSON.stringify(payload);

    expect(response.status).toBe(409);
    expect(fetcher).not.toHaveBeenCalled();
    expect(payload.syncEnabled).toBe(false);
    expect(payload.reason).toBe("NEW_API_PARTIAL_GROUP_UPDATE_NOT_VERIFIED");
    expect(payload.manualChecklist).toEqual(
      expect.arrayContaining([
        "Open the New API admin token page for the target downstream token.",
        "Change only the token group field.",
        "Verify quota and model whitelist values are unchanged after saving.",
        "Run GET /api/admin/new-api-token-drift again.",
      ]),
    );
    expect(payloadText).not.toContain("session=admin-cookie");
    expect(payloadText).not.toContain("sk-");
    expect(getInMemoryNewApiAdminAuditStore().all()).toEqual([
      expect.objectContaining({
        action: "new_api_token_group_sync_attempt",
        actorUserId: "admin-user",
        decision: "requires_confirmation",
        resourceId: "user-b",
        resourceType: "new_api_token_mapping",
      }),
    ]);
  });
});
