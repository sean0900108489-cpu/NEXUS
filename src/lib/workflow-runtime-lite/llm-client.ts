import type {
  AgentStreamRequest,
  ContextPacket,
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
  WorkflowNodeInstance,
} from "@/lib/nexus-types";
import { DEFAULT_BASE_URL } from "@/lib/nexus-defaults";
import { fetchWithBackoff } from "@/lib/stream-retry";

import type { WorkflowRuntimeLlmCall } from "./executors";

type WorkflowStreamEvent =
  | {
      type: "meta";
      agentId?: string;
      requestId?: string;
      sessionId?: string | null;
      taskId?: string;
      traceId?: string;
      workspaceId?: string;
      mode?: "mock" | "openai";
      detail?: string;
    }
  | {
      type: "token";
      delta?: string;
      token?: string;
    }
  | {
      type: "error";
      error?: {
        code?: string;
        message?: string;
        retryable?: boolean;
      };
    }
  | {
      type: "done";
    };

export function resolveWorkflowRuntimeExecutionAgent(
  workspace: NexusWorkspace,
): NexusAgent | undefined {
  const selectedAgent = workspace.selectedAgentId
    ? workspace.agents.find((agent) => agent.id === workspace.selectedAgentId)
    : undefined;
  const activeAgent = workspace.activeAgentId
    ? workspace.agents.find((agent) => agent.id === workspace.activeAgentId)
    : undefined;

  return (
    selectedAgent ??
    activeAgent ??
    workspace.agents.find((agent) => agent.capabilities.type === "chat") ??
    workspace.agents[0]
  );
}

export function createWorkflowRuntimeLlmCall({
  authVault,
  executionAgent,
  workspace,
}: {
  authVault: IAuthVault;
  executionAgent: NexusAgent;
  workspace: NexusWorkspace;
}): WorkflowRuntimeLlmCall {
  return async ({ node, prompt, runId, upstream }) =>
    executeWorkflowRuntimeLlm({
      authVault,
      executionAgent,
      node,
      prompt,
      runId,
      upstream,
      workspace,
    });
}

export async function executeWorkflowRuntimeLlm({
  authVault,
  executionAgent,
  node,
  prompt,
  runId,
  upstream,
  workspace,
}: {
  authVault: IAuthVault;
  executionAgent: NexusAgent;
  node: WorkflowNodeInstance<"model.llm">;
  prompt: string;
  runId: string;
  upstream: ContextPacket;
  workspace: NexusWorkspace;
}) {
  const apiKey = authVault.globalApiKey?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";
  const baseUrl =
    authVault.globalBaseUrl?.replace(/[^\x20-\x7E]/g, "").trim() ||
    DEFAULT_BASE_URL;
  const model = node.data.model?.trim() || executionAgent.model;
  const provider = node.data.provider?.trim() || executionAgent.provider;
  const outputMessageId = `${runId}:${node.id}:output`;
  const request: AgentStreamRequest = {
    model,
    outputMessageId,
    workspaceId: workspace.id,
    agent: {
      callsign: executionAgent.callsign,
      contextNotes: executionAgent.contextNotes,
      identity: executionAgent.identity,
      memory: executionAgent.memory,
      mission: executionAgent.mission,
      model,
      provider,
      title: executionAgent.title,
    },
    messages: [
      {
        content: buildWorkflowRuntimePrompt({
          node,
          prompt,
          upstream,
        }),
        role: "user",
      },
    ],
  };
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Workspace-Id": workspace.id,
  });
  const userId = authVault.user?.id;

  if (userId) {
    headers.set("X-User-Id", userId);
  }

  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  headers.set("x-openai-base-url", baseUrl);

  const response = await fetchWithBackoff(
    `/api/v1/agents/${encodeURIComponent(executionAgent.id)}/stream`,
    {
      body: JSON.stringify(request),
      headers,
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Workflow LLM stream failed with ${response.status}.`);
  }

  const stream = await readWorkflowStream(response);

  return {
    metadata: {
      agentId: executionAgent.id,
      model,
      provider,
      runId,
      sessionId: stream.sessionId ?? undefined,
      taskId: stream.taskId ?? undefined,
      traceId: stream.traceId ?? undefined,
    },
    text: stream.text,
  };
}

export function buildWorkflowRuntimePrompt({
  node,
  prompt,
  upstream,
}: {
  node: WorkflowNodeInstance<"model.llm">;
  prompt: string;
  upstream: ContextPacket;
}) {
  return [
    `[WORKFLOW RUNTIME LITE] model.llm node ${node.id}`,
    "",
    "Node prompt:",
    prompt,
    "",
    "Upstream ContextPacket:",
    `sourceNodeId: ${upstream.sourceNodeId}`,
    `packetId: ${upstream.id}`,
    "",
    upstream.rawText,
  ].join("\n");
}

async function readWorkflowStream(response: Response) {
  if (!response.body) {
    throw new Error("Workflow LLM stream body missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let taskId: string | undefined;
  let sessionId: string | null | undefined;
  let traceId: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split("\n\n");
    buffer = packets.pop() ?? "";

    for (const packet of packets) {
      const line = packet
        .split("\n")
        .find((entry) => entry.trim().startsWith("data:"));

      if (!line) {
        continue;
      }

      const event = JSON.parse(line.replace(/^data:\s*/, "")) as WorkflowStreamEvent;

      if (event.type === "meta") {
        taskId = event.taskId ?? taskId;
        sessionId = event.sessionId ?? sessionId;
        traceId = event.traceId ?? traceId;
      }

      if (event.type === "token") {
        text += event.delta ?? event.token ?? "";
      }

      if (event.type === "error") {
        throw new Error(event.error?.message ?? "Workflow LLM stream failed.");
      }
    }
  }

  return {
    sessionId,
    taskId,
    text: text || "No signal returned.",
    traceId,
  };
}
