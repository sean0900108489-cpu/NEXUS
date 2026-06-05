import type {
  AgentStreamRequest,
  ContextPacket,
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
  WorkflowNodeInstance,
} from "@/lib/nexus-types";
import { NEXUS_RUNTIME_AUTHORIZATION_HEADER } from "@/lib/api/nexus-api-client";
import { DEFAULT_BASE_URL } from "@/lib/nexus-defaults";
import {
  getProviderIdForModel,
  getProviderOption,
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";
import {
  fetchWithBackoff,
  isAbortLikeError,
} from "@/lib/stream-retry";

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
type WorkflowStreamError = Extract<WorkflowStreamEvent, { type: "error" }>["error"];
const WORKFLOW_LLM_STREAM_READ_RETRY_DELAYS_MS = [600] as const;

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
  return async ({ node, onToken, prompt, runId, signal, upstream }) =>
    executeWorkflowRuntimeLlm({
      authVault,
      executionAgent,
      node,
      onToken,
      prompt,
      runId,
      signal,
      upstream,
      workspace,
    });
}

export async function executeWorkflowRuntimeLlm({
  authVault,
  executionAgent,
  node,
  onToken,
  prompt,
  runId,
  signal,
  upstream,
  workspace,
}: {
  authVault: IAuthVault;
  executionAgent: NexusAgent;
  node: WorkflowNodeInstance<"model.llm">;
  onToken?: (delta: string, text: string) => void;
  prompt: string;
  runId: string;
  signal?: AbortSignal;
  upstream: ContextPacket;
  workspace: NexusWorkspace;
}) {
  const model = node.data.model?.trim() || executionAgent.model;
  const provider = node.data.provider?.trim() || executionAgent.provider;
  const modelSettings = normalizeAgentModelSettings(
    model,
    node.data.modelSettings ?? executionAgent.modelSettings,
  );
  const providerId = getProviderIdForModel(model, provider);
  const providerOption = getProviderOption(providerId);
  const providerCredential = authVault.providerCredentials?.[providerId];
  const apiKey =
    providerCredential?.apiKey?.replace(/[^\x20-\x7E]/g, "").trim() ||
    authVault.globalApiKey?.replace(/[^\x20-\x7E]/g, "").trim() ||
    "";
  const baseUrl =
    providerCredential?.baseUrl?.replace(/[^\x20-\x7E]/g, "").trim() ||
    authVault.globalBaseUrl?.replace(/[^\x20-\x7E]/g, "").trim() ||
    providerOption?.defaultBaseUrl ||
    DEFAULT_BASE_URL;
  const outputMessageId = `${runId}:${node.id}:output`;
  const request: AgentStreamRequest = {
    model,
    modelSettings,
    reasoningEffort: modelSettings.reasoningEffort,
    outputMessageId,
    workspaceId: workspace.id,
    agent: {
      callsign: executionAgent.callsign,
      contextNotes: executionAgent.contextNotes,
      executionPrompt: executionAgent.executionPrompt,
      identity: executionAgent.identity,
      memory: executionAgent.memory,
      mission: executionAgent.mission,
      model,
      provider: providerId,
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
  const userId = authVault.user?.id?.trim();

  if (userId) {
    headers.set("X-User-Id", userId);
  }
  headers.set("X-Nexus-Workflow-Runtime", "lite");

  const accessToken = await resolveBrowserAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (apiKey) {
    headers.set(NEXUS_RUNTIME_AUTHORIZATION_HEADER, `Bearer ${apiKey}`);
  }

  headers.set("x-nexus-base-url", baseUrl);
  headers.set("x-nexus-provider-id", providerId);

  let stream: Awaited<ReturnType<typeof readWorkflowStream>> | undefined;

  for (let attempt = 0; attempt <= WORKFLOW_LLM_STREAM_READ_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetchWithBackoff(
      `/api/v1/agents/${encodeURIComponent(executionAgent.id)}/stream`,
      {
        body: JSON.stringify(request),
        headers,
        method: "POST",
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(await readWorkflowHttpError(response));
    }

    try {
      stream = await readWorkflowStream(response, { onToken });
      break;
    } catch (error) {
      if (
        signal?.aborted ||
        !isRetryableWorkflowStreamReadError(error) ||
        attempt >= WORKFLOW_LLM_STREAM_READ_RETRY_DELAYS_MS.length
      ) {
        throw error instanceof Error
          ? error
          : new Error("Workflow LLM stream read failed.");
      }

      await waitForWorkflowStreamReadRetry(
        WORKFLOW_LLM_STREAM_READ_RETRY_DELAYS_MS[attempt] ?? 0,
        signal,
      );
    }
  }

  if (!stream) {
    throw new Error("Workflow LLM stream returned no readable result.");
  }

  return {
    metadata: {
      agentId: executionAgent.id,
      model,
      provider: providerId,
      streamReadWarning: stream.readWarning,
      runId,
      sessionId: stream.sessionId ?? undefined,
      taskId: stream.taskId ?? undefined,
      traceId: stream.traceId ?? undefined,
    },
    text: stream.text,
  };
}

async function resolveBrowserAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { getNexusSupabaseClient } = await import("@/lib/supabase/client");
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
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

async function readWorkflowStream(
  response: Response,
  {
    onToken,
  }: {
    onToken?: (delta: string, text: string) => void;
  } = {},
) {
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

  try {
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
          const delta = event.delta ?? event.token ?? "";

          if (delta) {
            text += delta;
            onToken?.(delta, text);
          }
        }

        if (event.type === "error") {
          throw new Error(formatWorkflowStreamError(event.error));
        }
      }
    }
  } catch (error) {
    if (!text || !isRetryableWorkflowStreamReadError(error)) {
      throw error instanceof Error
        ? error
        : new Error("Workflow LLM stream read failed.");
    }

    return {
      readWarning: formatWorkflowStreamReadError(error),
      sessionId,
      taskId,
      text,
      traceId,
    };
  }

  return {
    sessionId,
    taskId,
    text: text || "No signal returned.",
    traceId,
  };
}

async function waitForWorkflowStreamReadRetry(delayMs: number, signal?: AbortSignal) {
  if (!delayMs) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    function handleAbort() {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function readWorkflowHttpError(response: Response) {
  const fallback = `Workflow LLM stream failed with HTTP ${response.status}.`;

  try {
    const payload = (await response.clone().json()) as unknown;

    if (isRecord(payload)) {
      const rawError = payload.error;

      if (isRecord(rawError)) {
        const code = typeof rawError.code === "string" ? rawError.code : undefined;
        const message =
          typeof rawError.message === "string" && rawError.message.trim()
            ? rawError.message.trim()
            : undefined;

        if (message && code) {
          return `${message} (${code}, HTTP ${response.status}).`;
        }

        if (message) {
          return `${message} (HTTP ${response.status}).`;
        }
      }
    }
  } catch {
    // Fall back to text below.
  }

  try {
    const text = (await response.text()).trim();

    if (text) {
      return `${fallback} ${text.slice(0, 240)}`;
    }
  } catch {
    // Fall through to the generic message.
  }

  return fallback;
}

function formatWorkflowStreamError(error: WorkflowStreamError) {
  const message = error?.message?.trim() || "Workflow LLM stream failed.";

  return error?.code ? `${message} (${error.code}).` : message;
}

function formatWorkflowStreamReadError(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : "Workflow LLM stream read was interrupted.";
}

function isRetryableWorkflowStreamReadError(error: unknown) {
  if (isAbortLikeError(error)) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const message = formatWorkflowStreamReadError(error).toLowerCase();

  return (
    message.includes("bodystreambuffer") ||
    message.includes("body stream") ||
    message.includes("aborted") ||
    message.includes("network")
  );
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Request aborted.", "AbortError");
  }

  const error = new Error("Request aborted.");
  error.name = "AbortError";

  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
