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

  // ── Negative tests ──────────────────────────

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

  // ── Positive / success test ─────────────────

  it("successfully imports a global conversation with full provenance", async () => {
    const repo = getInMemoryGlobalChatRepository();

    // Seed a global conversation with messages
    const conv = await repo.createConversation({
      modelId: "gpt-4o-mini",
      title: "Test import conversation",
      userId: "user-import-test",
    });

    await repo.addMessage({
      content: "How do I build a wallet system?",
      conversationId: conv.id,
      role: "user",
      sequence: 1,
    });

    await repo.addMessage({
      content: "Start with an immutable ledger: every credit change is a row.",
      conversationId: conv.id,
      modelId: "gpt-4o-mini",
      role: "assistant",
      sequence: 2,
      usage: { credits: 3, inputTokens: 150, outputTokens: 300, totalTokens: 450 },
    });

    await repo.updateConversation({
      conversationId: conv.id,
      lastMessageAt: new Date().toISOString(),
      messageCount: 2,
    });

    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({
          workspaceId: "ws-import-success",
          sourceConversationId: conv.id,
          title: "Wallet design notes",
          importType: "context_bundle",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-import-test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    // Top-level response shape
    expect(body.ok).toBe(true);
    expect(body.workspaceId).toBe("ws-import-success");
    expect(body.importedResourceType).toBe("context_bundle");
    expect(body.importedResourceId).toBeTruthy();
    expect(body.openUrl).toBe("/workspace/ws-import-success");

    // Provenance
    expect(body.sourceGlobalConversationId).toBe(conv.id);
    expect(body.sourceGlobalMessageIds).toHaveLength(2);

    // Imported messages
    const msgs = body.importedMessages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("How do I build a wallet system?");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].modelId).toBe("gpt-4o-mini");

    // Source messages have origin IDs
    expect(msgs[0].sourceMessageId).toBeTruthy();
    expect(msgs[1].sourceMessageId).toBeTruthy();

    // Meta
    expect(body.meta).toBeDefined();
    expect(body.meta.title).toBe("Wallet design notes");
    expect(body.meta.importedBy).toBe("user-import-test");
    expect(body.meta.importedAt).toBeTruthy();

    // Copy-only: global source conversation still exists unchanged
    const original = await repo.getConversation(conv.id);
    expect(original).toBeTruthy();
    expect(original!.messages).toHaveLength(2);
    expect(original!.title).toBe("Test import conversation");
  });

  it("imports only selected messages when messageIds are provided", async () => {
    const repo = getInMemoryGlobalChatRepository();

    const conv = await repo.createConversation({
      title: "Partial import test",
      userId: "user-import-test",
    });

    await repo.addMessage({
      content: "Message 1", conversationId: conv.id, role: "user", sequence: 1,
    });
    const msg2 = await repo.addMessage({
      content: "Message 2", conversationId: conv.id, role: "assistant", modelId: "gpt-4o-mini", sequence: 2,
    });
    await repo.addMessage({
      content: "Message 3", conversationId: conv.id, role: "user", sequence: 3,
    });

    const response = await POST(
      new Request("http://localhost/api/imports", {
        body: JSON.stringify({
          workspaceId: "ws-partial",
          sourceConversationId: conv.id,
          messageIds: [msg2.id],
          importType: "note",
        }),
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "user-import-test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.importedResourceType).toBe("note");
    expect(body.sourceGlobalMessageIds).toHaveLength(1);
    expect(body.sourceGlobalMessageIds[0]).toBe(msg2.id);
    expect(body.importedMessages).toHaveLength(1);
    expect(body.importedMessages[0].content).toBe("Message 2");
  });
});
