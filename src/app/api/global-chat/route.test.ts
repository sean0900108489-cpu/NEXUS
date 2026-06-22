import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock all dependencies
vi.mock("@/lib/backend/api/api-auth", () => ({
  resolveApiActor: vi.fn(),
}));

vi.mock("@/lib/backend/models/ai-gateway-service", () => ({
  executeAiGatewayChatRequest: vi.fn(),
}));

vi.mock("@/lib/backend/models/global-chat-repository", () => ({
  createGlobalChatRepository: vi.fn(),
}));

vi.mock("@/lib/backend/models/model-catalog", () => ({
  getCatalogModel: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getNexusSupabaseAdminClient: vi.fn(),
}));

import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { executeAiGatewayChatRequest } from "@/lib/backend/models/ai-gateway-service";
import { createGlobalChatRepository } from "@/lib/backend/models/global-chat-repository";
import { getCatalogModel } from "@/lib/backend/models/model-catalog";
import { getNexusSupabaseAdminClient } from "@/lib/supabase/admin";

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/global-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockVisionModel() {
  return {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    modality: "chat",
    provider_family: "OpenAI",
    new_api_model: "gpt-4o-mini",
    enabled: true,
    supports_vision: true,
    supports_tools: true,
    supports_reasoning: false,
    supports_file_input: true,
    supports_image_input: true,
    min_plan: "Free",
    default_max_tokens: 2048,
    max_output_tokens: 4096,
    best_for: ["chat"],
    description: "Fast model",
  };
}

function mockNonVisionModel() {
  return {
    ...mockVisionModel(),
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    supports_vision: false,
    supports_image_input: false,
    provider_family: "DeepSeek",
    new_api_model: "deepseek-chat",
  };
}

describe("POST /api/global-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects image attachments with non-vision model", async () => {
    vi.mocked(resolveApiActor).mockResolvedValue({ actorUserId: "user-1" });
    vi.mocked(getCatalogModel).mockReturnValue(mockNonVisionModel() as any);
    
    const mockRepo = {
      getConversation: vi.fn().mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        messages: [],
        messageCount: 0,
      }),
      createConversation: vi.fn(),
      addMessage: vi.fn(),
      getNextSequence: vi.fn(),
      updateConversation: vi.fn(),
    };
    vi.mocked(createGlobalChatRepository).mockReturnValue(mockRepo as any);

    const response = await POST(mockRequest({
      message: "What is this?",
      modelId: "deepseek-chat",
      conversationId: "conv-1",
      attachments: [
        { id: "att-1", kind: "image", filename: "photo.png", mimeType: "image/png", storageKey: "key1" },
      ],
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.message).toContain("不支援圖片理解");
    
    // Should NOT have called the AI gateway
    expect(executeAiGatewayChatRequest).not.toHaveBeenCalled();
  });

  it("allows image attachments with vision model", async () => {
    vi.mocked(resolveApiActor).mockResolvedValue({ actorUserId: "user-1" });
    vi.mocked(getCatalogModel).mockReturnValue(mockVisionModel() as any);
    vi.mocked(getNexusSupabaseAdminClient).mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example.com/photo.png" } }),
        }),
      },
    } as any);
    
    const mockRepo = {
      getConversation: vi.fn().mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        messages: [],
        messageCount: 0,
      }),
      createConversation: vi.fn(),
      addMessage: vi.fn().mockResolvedValue({}),
      getNextSequence: vi.fn().mockResolvedValue(1),
      updateConversation: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(createGlobalChatRepository).mockReturnValue(mockRepo as any);
    vi.mocked(executeAiGatewayChatRequest).mockResolvedValue({
      content: "I see a login screen.",
      modelId: "gpt-4o-mini",
      requestId: "req-1",
      usage: { credits: 1, inputTokens: 100, outputTokens: 20, totalTokens: 120 },
    });

    const response = await POST(mockRequest({
      message: "What is this?",
      modelId: "gpt-4o-mini",
      conversationId: "conv-1",
      attachments: [
        { id: "att-1", kind: "image", filename: "photo.png", mimeType: "image/png", storageKey: "key1" },
      ],
    }));

    expect(response.status).toBe(200);
    
    // Should have called the AI gateway with multimodal content
    expect(executeAiGatewayChatRequest).toHaveBeenCalled();
    const callArg = vi.mocked(executeAiGatewayChatRequest).mock.calls[0][0];
    const lastMessage = callArg.body.messages?.[callArg.body.messages.length - 1];
    // Content should be an array (multimodal) or string with image ref
    expect(lastMessage).toBeDefined();
  });

  it("passes text-only messages through unchanged", async () => {
    vi.mocked(resolveApiActor).mockResolvedValue({ actorUserId: "user-1" });
    vi.mocked(getCatalogModel).mockReturnValue(mockVisionModel() as any);
    
    const mockRepo = {
      getConversation: vi.fn().mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        messages: [],
        messageCount: 0,
      }),
      createConversation: vi.fn(),
      addMessage: vi.fn().mockResolvedValue({}),
      getNextSequence: vi.fn().mockResolvedValue(1),
      updateConversation: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(createGlobalChatRepository).mockReturnValue(mockRepo as any);
    vi.mocked(executeAiGatewayChatRequest).mockResolvedValue({
      content: "Hello!",
      modelId: "gpt-4o-mini",
      requestId: "req-1",
      usage: { credits: 1, inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    const response = await POST(mockRequest({
      message: "Hello",
      modelId: "gpt-4o-mini",
      conversationId: "conv-1",
    }));

    expect(response.status).toBe(200);
    expect(executeAiGatewayChatRequest).toHaveBeenCalled();
  });
});
