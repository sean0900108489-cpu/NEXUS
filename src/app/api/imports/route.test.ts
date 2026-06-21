import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth";
import { getInMemoryGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";

import { POST } from "./route";

describe("POST /api/imports", () => {
  beforeEach(() => {
    getInMemoryGlobalChatRepository().clear();
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => ({
        id: "user-import-test",
      }),
    });
  });

  afterEach(() => {
    resetApiAuthSessionVerifierForTests();
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated requests", async () => {
    resetApiAuthSessionVerifierForTests();
    setApiAuthSessionVerifierForTests({
      verifyRequest: async () => {
        throw new Error("no session");
      },
    });

    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({
          workspaceId: "ws-1",
          sourceConversationId: "conv-1",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects when source conversation does not exist", async () => {
    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({
          workspaceId: "ws-1",
          sourceConversationId: "nonexistent-conv",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-import-test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
  });

  it("rejects when workspaceId or sourceConversationId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-import-test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects empty workspaceId string", async () => {
    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({
          workspaceId: "",
          sourceConversationId: "conv-1",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-import-test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
  });
});
