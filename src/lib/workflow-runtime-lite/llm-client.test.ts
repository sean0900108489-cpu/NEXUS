import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
  WorkflowNodeInstance,
} from "@/lib/nexus-types";
import { NEXUS_RUNTIME_AUTHORIZATION_HEADER } from "@/lib/api/nexus-api-client";

import { executeWorkflowRuntimeLlm } from "./llm-client";
import { createWorkflowRuntimeNode } from "./state";

describe("workflow runtime LLM client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends workflow stream identity headers and surfaces typed HTTP errors", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;

      return Response.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Authentication is required.",
            retryable: false,
          },
          type: "error",
        },
        { status: 401 },
      );
    });

    vi.stubGlobal("fetch", fetcher);

    await expect(
      executeWorkflowRuntimeLlm({
        authVault: makeAuthVault(),
        executionAgent: makeAgent(),
        node: makeLlmNode(),
        prompt: "Summarize",
        runId: "run-test",
        upstream: {
          createdAt: new Date().toISOString(),
          displayText: "Hello",
          id: "packet-test",
          metadata: {},
          rawText: "Hello",
          runId: "run-test",
          sourceNodeId: "input",
        },
        workspace: makeWorkspace(),
      }),
    ).rejects.toThrow(
      "Authentication is required. (AUTH_REQUIRED, HTTP 401).",
    );

    expect(fetcher).toHaveBeenCalled();

    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Headers;

    expect(headers.get("X-User-Id")).toBeNull();
    expect(headers.get("X-Nexus-Workflow-Runtime")).toBe("lite");
    expect(headers.get(NEXUS_RUNTIME_AUTHORIZATION_HEADER)).toBe("Bearer sk-test");
    expect(headers.get("Authorization")).toBeNull();
  });
});

function makeAuthVault(): IAuthVault {
  return {
    globalApiKey: "sk-test",
    globalBaseUrl: "https://api.openai.com/v1",
    isLocked: true,
    user: null,
  };
}

function makeAgent(): NexusAgent {
  return {
    accent: "neutral",
    avatar: "AI",
    callsign: "TEST",
    capabilities: {
      supportedModels: ["gpt-4o-mini"],
      type: "chat",
    },
    contextNotes: [],
    createdAt: new Date().toISOString(),
    id: "agent-test",
    identity: "test agent",
    executionPrompt: "",
    layout: {
      height: 200,
      width: 320,
      x: 0,
      y: 0,
      zIndex: 1,
    },
    maximized: false,
    memory: [],
    minimized: false,
    mission: "test",
    model: "gpt-4o-mini",
    modelSettings: {},
    messages: [],
    profileLocked: false,
    provider: "openai-compatible",
    status: "idle",
    telemetry: {
      confidence: 0,
      errors: 0,
      latency: 0,
      tasks: 0,
      tokens: 0,
      toolRuns: 0,
    },
    title: "Test Agent",
    tools: [],
    updatedAt: new Date().toISOString(),
  };
}

function makeLlmNode(): WorkflowNodeInstance<"model.llm"> {
  return {
    ...createWorkflowRuntimeNode({
      id: "llm-test",
      position: {
        x: 100,
        y: 0,
      },
      type: "model.llm",
    }),
    data: {
      label: "Test LLM",
      model: "gpt-4o-mini",
      prompt: "Summarize",
      provider: "openai-compatible",
    },
  };
}

function makeWorkspace(): NexusWorkspace {
  return {
    agents: [makeAgent()],
    createdAt: new Date().toISOString(),
    graph: {
      edges: [],
      nodes: [],
    },
    id: "workspace-test",
    name: "Workspace Test",
    panels: [],
    settings: {
      autosave: true,
      branchingSettings: {
        defaultRetentionRatio: 0.5,
      },
      agentTemplateProfiles: {},
      model: "gpt-4o-mini",
      provider: "openai-compatible",
      streamMode: "live",
      viewMode: "graph",
    },
    updatedAt: new Date().toISOString(),
  };
}
