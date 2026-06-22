import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend/api/api-auth", () => ({
  resolveApiActor: vi.fn(),
}));

vi.mock("@/lib/backend/new-api-token/user-new-api-token-service", () => ({
  getUserNewApiToken: vi.fn(),
}));

vi.mock("./model-catalog", () => ({
  assertModelAllowedForPlan: vi.fn(),
  assertRequestedFeaturesAllowed: vi.fn(),
  getCatalogModel: vi.fn(),
}));

vi.mock("./plan-config", () => ({
  estimateModelCredits: vi.fn(),
  getUserPlan: vi.fn(),
  isModelAllowedByPlan: vi.fn(),
}));

vi.mock("./quota-gate", () => ({
  assertSufficientCredits: vi.fn(),
}));

vi.mock("./new-api-chat-service", () => ({
  callNewApiChatCompletion: vi.fn(),
}));

vi.mock("./usage-ledger", () => ({
  createUsageLedgerRepository: vi.fn(),
}));

vi.mock("./wallet-repository", () => ({
  createWalletRepository: vi.fn(),
}));

import { executeAiGatewayChatRequest } from "./ai-gateway-service";
import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
import { assertModelAllowedForPlan, assertRequestedFeaturesAllowed } from "./model-catalog";
import { estimateModelCredits, getUserPlan, isModelAllowedByPlan } from "./plan-config";
import { assertSufficientCredits } from "./quota-gate";
import { callNewApiChatCompletion } from "./new-api-chat-service";
import { createUsageLedgerRepository } from "./usage-ledger";
import { createWalletRepository } from "./wallet-repository";

function makeRequest(): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

function mockModel(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

function mockChatCompletionReply(content: string, totalTokens = 100) {
  return {
    content,
    inputTokens: Math.floor(totalTokens * 0.7),
    outputTokens: Math.floor(totalTokens * 0.3),
    totalTokens,
  };
}

describe("executeAiGatewayChatRequest multimodal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(resolveApiActor).mockResolvedValue({ actorUserId: "user-1" });
    vi.mocked(getUserPlan).mockReturnValue("Free");
    vi.mocked(isModelAllowedByPlan).mockReturnValue(true);
    vi.mocked(assertModelAllowedForPlan).mockReturnValue(mockModel() as any);
    vi.mocked(getUserNewApiToken).mockResolvedValue({ token: "sk-test-token" } as any);
    vi.mocked(estimateModelCredits).mockReturnValue(5);
    vi.mocked(assertSufficientCredits).mockResolvedValue({
      currentBalance: 100,
      estimatedCredits: 5,
      remainingAfterDeduction: 95,
    });

    const mockLedger = { insert: vi.fn().mockResolvedValue({ id: "ledger-1" }) };
    vi.mocked(createUsageLedgerRepository).mockReturnValue(mockLedger as any);

    const mockWallet = {
      getBalance: vi.fn().mockResolvedValue({ currentBalance: 100 }),
      createTransaction: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(createWalletRepository).mockReturnValue(mockWallet as any);
  });

  it("auto-detects vision when ChatContentPart[] has image_url", async () => {
    vi.mocked(callNewApiChatCompletion).mockResolvedValue(mockChatCompletionReply("I see a login screen."));

    await executeAiGatewayChatRequest({
      body: {
        modelId: "gpt-4o-mini",
        operatorId: "test-op",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What do you see?" },
              { type: "image_url", image_url: { url: "https://example.com/photo.png" } },
            ],
          },
        ],
      },
      request: makeRequest(),
      requestId: "req-1",
    });

    expect(assertRequestedFeaturesAllowed).toHaveBeenCalled();
    const featureCall = vi.mocked(assertRequestedFeaturesAllowed).mock.calls[0][0];
    expect(featureCall.requestedFeatures?.vision).toBe(true);
  });

  it("does NOT auto-detect vision for text-only messages", async () => {
    vi.mocked(callNewApiChatCompletion).mockResolvedValue(mockChatCompletionReply("Hello!"));

    await executeAiGatewayChatRequest({
      body: {
        modelId: "gpt-4o-mini",
        operatorId: "test-op",
        messages: [
          { role: "user", content: "Hi there!" },
        ],
      },
      request: makeRequest(),
      requestId: "req-2",
    });

    const featureCall = vi.mocked(assertRequestedFeaturesAllowed).mock.calls[0][0];
    expect(featureCall.requestedFeatures?.vision).toBeUndefined();
  });

  it("records hasMultimodal flag in wallet metadata for image calls", async () => {
    vi.mocked(callNewApiChatCompletion).mockResolvedValue(mockChatCompletionReply("Analysis complete.", 600));
    vi.mocked(estimateModelCredits).mockReturnValue(3);

    await executeAiGatewayChatRequest({
      body: {
        modelId: "gpt-4o-mini",
        operatorId: "test-op",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this." },
              { type: "image_url", image_url: { url: "https://example.com/img.png" } },
            ],
          },
        ],
      },
      request: makeRequest(),
      requestId: "req-3",
    });

    const walletRepo = vi.mocked(createWalletRepository)();
    expect(walletRepo.createTransaction).toHaveBeenCalled();
    const txCall = vi.mocked(walletRepo.createTransaction).mock.calls[0][0];
    expect(txCall.metadata).toMatchObject({ hasMultimodal: true });
  });

  it("text-only calls don't set hasMultimodal flag", async () => {
    vi.mocked(callNewApiChatCompletion).mockResolvedValue(mockChatCompletionReply("OK."));

    await executeAiGatewayChatRequest({
      body: {
        modelId: "gpt-4o-mini",
        operatorId: "test-op",
        messages: [
          { role: "user", content: "Hello" },
        ],
      },
      request: makeRequest(),
      requestId: "req-4",
    });

    const walletRepo = vi.mocked(createWalletRepository)();
    const txCall = vi.mocked(walletRepo.createTransaction).mock.calls[0][0];
    expect(txCall.metadata).toMatchObject({ hasMultimodal: false });
  });
});
