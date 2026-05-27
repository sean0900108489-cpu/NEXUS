import type {
  ActiveUiStateSnapshot,
  AgentTool,
  ContextPacket,
  WorkspaceCloudMessageRef,
  WorkspaceCloudSnapshotAgent,
  WorkspaceCloudSnapshotPayload,
  WorkspaceGraph,
} from "@/lib/nexus-types";
import { WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS } from "@/lib/workflow-runtime-lite/constants";

export const WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION = 1;
export const MAX_WORKSPACE_SNAPSHOT_BYTES = 512 * 1024;
export const WORKSPACE_SNAPSHOT_DEBOUNCE_MS = 1500;
export const WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT = 8;

export function serializeActiveUiStateSnapshot(
  snapshot: ActiveUiStateSnapshot,
  lastKnownChecksum?: string | null,
): WorkspaceCloudSnapshotPayload {
  return {
    lastKnownChecksum: lastKnownChecksum ?? null,
    registryVersion: "nexus-registry-v1",
    schemaVersion: WORKSPACE_CLOUD_SNAPSHOT_SCHEMA_VERSION,
    workspace: {
      activeAgentId: snapshot.activeAgentId,
      agents: snapshot.agents.map(serializeAgent),
      createdAt: snapshot.createdAt,
      graph: serializeGraphForCloud(snapshot.graph),
      id: snapshot.id,
      name: snapshot.name,
      panels: snapshot.panels,
      selectedAgentId: snapshot.selectedAgentId,
      settings: snapshot.settings,
      themeConfig: snapshot.themeConfig,
      updatedAt: snapshot.updatedAt,
    },
  };
}

function serializeGraphForCloud(graph: WorkspaceGraph): WorkspaceGraph {
  if (!graph.runtimeLite) {
    return graph;
  }

  return {
    ...graph,
    runtimeLite: {
      ...graph.runtimeLite,
      nodes: graph.runtimeLite.nodes.map((node) => ({
        ...node,
        inputSnapshot: compactContextPacket(node.inputSnapshot),
        outputSnapshot: compactContextPacket(node.outputSnapshot),
      })),
      runs: graph.runtimeLite.runs.map((run) => ({
        ...run,
        nodeExecutions: run.nodeExecutions.map((execution) => ({
          ...execution,
          inputSnapshot: compactContextPacket(execution.inputSnapshot),
          outputSnapshot: compactContextPacket(execution.outputSnapshot),
        })),
      })),
    },
  };
}

function compactContextPacket(
  packet: ContextPacket | null | undefined,
): ContextPacket | null | undefined {
  if (!packet) {
    return packet;
  }

  const rawText = compactText(packet.rawText);
  const displayText = compactText(packet.displayText);
  const truncated =
    Boolean(packet.truncated) ||
    rawText.length < packet.rawText.length ||
    displayText.length < packet.displayText.length;

  return {
    ...packet,
    displayText,
    rawText,
    tokenEstimate: Math.max(1, Math.ceil(packet.rawText.length / 4)),
    ...(truncated ? { truncated: true } : {}),
  };
}

function compactText(value: string) {
  return value.length <= WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS
    ? value
    : value.slice(0, WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS);
}

export async function computeWorkspaceSnapshotChecksum(
  payload: WorkspaceCloudSnapshotPayload | Record<string, unknown>,
): Promise<string> {
  const canonical = JSON.stringify(stabilizeSnapshotForChecksum(payload));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
}

export function calculateWorkspaceSnapshotPayloadSizeBytes(
  payload: WorkspaceCloudSnapshotPayload | Record<string, unknown>,
) {
  return new TextEncoder().encode(stableStringify(payload)).byteLength;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stabilize(value));
}

function stabilizeSnapshotForChecksum(value: unknown) {
  const stabilized = stabilize(value);

  if (isRecord(stabilized) && isWorkspaceSnapshotPayloadRecord(stabilized)) {
    const checksumPayload = { ...stabilized };

    delete checksumPayload.lastKnownChecksum;

    return checksumPayload;
  }

  return stabilized;
}

function serializeAgent(agent: ActiveUiStateSnapshot["agents"][number]): WorkspaceCloudSnapshotAgent {
  return {
    accent: agent.accent,
    avatar: agent.avatar,
    branchMetadata: agent.branchMetadata,
    callsign: agent.callsign,
    capabilities: agent.capabilities,
    contextNotes: agent.contextNotes,
    createdAt: agent.createdAt,
    id: agent.id,
    identity: agent.identity,
    layout: agent.layout,
    maximized: agent.maximized,
    memory: agent.memory,
    messageWindow: {
      messageCount: agent.messages.length,
      messageRefs: agent.messages
        .slice(-WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT)
        .map(toMessageRef),
    },
    minimized: agent.minimized,
    mission: agent.mission,
    model: agent.model,
    previousLayout: agent.previousLayout,
    provider: agent.provider,
    title: agent.title,
    tools: agent.tools.map(serializeTool),
    updatedAt: agent.updatedAt,
  };
}

function serializeTool(tool: AgentTool): AgentTool {
  return {
    id: tool.id,
    name: tool.name,
    scope: tool.scope,
    status: tool.status,
    executorId: tool.executorId,
    lastRunAt: tool.lastRunAt,
  };
}

function toMessageRef(
  message: ActiveUiStateSnapshot["agents"][number]["messages"][number],
): WorkspaceCloudMessageRef {
  return {
    contentLength: message.content.length,
    createdAt: message.createdAt,
    hasMedia: Boolean(message.media),
    id: message.id,
    mediaType: message.media?.type,
    role: message.role,
  };
}

function stabilize(value: unknown): unknown {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value === null || typeof value !== "object") {
    return typeof value === "number" && !Number.isFinite(value) ? null : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = stabilize(item);
      return next === undefined ? null : next;
    });
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => [key, stabilize(record[key])] as const)
    .filter(([, nextValue]) => nextValue !== undefined);

  return Object.fromEntries(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorkspaceSnapshotPayloadRecord(value: Record<string, unknown>) {
  return (
    "lastKnownChecksum" in value &&
    "registryVersion" in value &&
    "schemaVersion" in value &&
    "workspace" in value
  );
}
