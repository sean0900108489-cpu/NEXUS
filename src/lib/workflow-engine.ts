import type {
  AgentMessage,
  IWorkflowEdge,
  NexusAgent,
  NexusWorkspace,
  WorkspaceGraphEdge,
} from "@/lib/nexus-types";

const ACTIVE_STATUSES = new Set<NexusAgent["status"]>(["thinking", "streaming"]);
const AUTONOMOUS_PROMPT_CAPABILITIES = new Set<NexusAgent["capabilities"]["type"]>([
  "chat",
  "image",
  "video",
]);
export const WORKFLOW_HANDOFF_STAGGER_MS = 1500;

export type WorkflowAgentSnapshot = {
  status: NexusAgent["status"];
  latestAssistantMessageId?: string;
  activeBaselineAssistantMessageId?: string;
};

export type WorkflowHandoffDecision =
  | {
      type: "dispatch";
      handoffKey: string;
      graphEdge: WorkspaceGraphEdge;
      workflowEdge: IWorkflowEdge;
      sourceAgent: NexusAgent;
      targetAgent: NexusAgent;
      message: AgentMessage;
      prompt: string;
    }
  | {
      type: "blocked-cycle";
      handoffKey: string;
      graphEdge: WorkspaceGraphEdge;
      workflowEdge: IWorkflowEdge;
      sourceAgent: NexusAgent;
      targetAgent: NexusAgent;
      message: AgentMessage;
      cyclePath: string[];
    }
  | {
      type: "skipped-busy";
      handoffKey: string;
      graphEdge: WorkspaceGraphEdge;
      workflowEdge: IWorkflowEdge;
      sourceAgent: NexusAgent;
      targetAgent: NexusAgent;
      message: AgentMessage;
    }
  | {
      type: "skipped-unsupported";
      handoffKey: string;
      graphEdge: WorkspaceGraphEdge;
      workflowEdge: IWorkflowEdge;
      sourceAgent: NexusAgent;
      targetAgent: NexusAgent;
      message: AgentMessage;
    };

export type WorkflowDispatchDecision = Extract<
  WorkflowHandoffDecision,
  { type: "dispatch" }
>;

export function isWorkflowActiveStatus(status: NexusAgent["status"]) {
  return ACTIVE_STATUSES.has(status);
}

export function getLatestCompletedAssistantMessage(
  agent: Pick<NexusAgent, "messages">,
): AgentMessage | undefined {
  return [...agent.messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        !message.streaming &&
        !message.interrupted &&
        Boolean(message.content.trim()),
    );
}

export function getOutgoingWorkflowEdges(
  edges: WorkspaceGraphEdge[],
  sourceAgentId: string,
) {
  return edges.filter((edge) => edge.sourceAgentId === sourceAgentId);
}

export function toWorkflowEdge(edge: WorkspaceGraphEdge): IWorkflowEdge {
  return {
    sourceAgentId: edge.sourceAgentId,
    targetAgentId: edge.targetAgentId,
    passContext: true,
  };
}

export function findPathBetweenAgents(
  edges: WorkspaceGraphEdge[],
  sourceAgentId: string,
  targetAgentId: string,
) {
  const visited = new Set<string>();
  const queue: Array<{ agentId: string; path: string[] }> = [
    { agentId: sourceAgentId, path: [sourceAgentId] },
  ];

  while (queue.length) {
    const current = queue.shift();

    if (!current || visited.has(current.agentId)) {
      continue;
    }

    if (current.agentId === targetAgentId) {
      return current.path;
    }

    visited.add(current.agentId);

    for (const edge of getOutgoingWorkflowEdges(edges, current.agentId)) {
      queue.push({
        agentId: edge.targetAgentId,
        path: [...current.path, edge.targetAgentId],
      });
    }
  }

  return undefined;
}

export function findWorkflowCyclePath(
  edges: WorkspaceGraphEdge[],
  sourceAgentId: string,
  targetAgentId: string,
) {
  if (sourceAgentId === targetAgentId) {
    return [sourceAgentId, targetAgentId];
  }

  const returnPath = findPathBetweenAgents(edges, targetAgentId, sourceAgentId);

  return returnPath ? [sourceAgentId, ...returnPath] : undefined;
}

export function buildWorkflowHandoffPrompt({
  message,
  sourceAgent,
  targetAgent,
}: {
  message: AgentMessage;
  sourceAgent: NexusAgent;
  targetAgent: NexusAgent;
}) {
  return [
    `[L2 AUTO-HANDOFF] ${sourceAgent.callsign} -> ${targetAgent.callsign}`,
    "",
    "Use the upstream agent output as context. Continue the workflow from your own mission and role.",
    "",
    "Upstream output:",
    message.content.trim(),
  ].join("\n");
}

export function waitForWorkflowHandoff(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function queueWorkflowHandoffDispatches({
  decisions,
  dispatch,
  staggerMs = WORKFLOW_HANDOFF_STAGGER_MS,
}: {
  decisions: WorkflowDispatchDecision[];
  dispatch: (decision: WorkflowDispatchDecision) => void;
  staggerMs?: number;
}) {
  for (const [index, decision] of decisions.entries()) {
    if (index > 0) {
      await waitForWorkflowHandoff(staggerMs);
    }

    dispatch(decision);
  }
}

export function evaluateWorkflowHandoffs({
  previousSnapshots,
  processedHandoffKeys,
  workspace,
}: {
  previousSnapshots: Map<string, WorkflowAgentSnapshot>;
  processedHandoffKeys: ReadonlySet<string>;
  workspace: NexusWorkspace;
}) {
  const nextSnapshots = new Map<string, WorkflowAgentSnapshot>();
  const decisions: WorkflowHandoffDecision[] = [];
  const completedAgents: Array<{
    agent: NexusAgent;
    message: AgentMessage;
  }> = [];

  for (const agent of workspace.agents) {
    const previous = previousSnapshots.get(agent.id);
    const latestAssistant = getLatestCompletedAssistantMessage(agent);
    const wasActive = previous ? isWorkflowActiveStatus(previous.status) : false;
    const isActive = isWorkflowActiveStatus(agent.status);

    if (
      previous &&
      wasActive &&
      agent.status === "idle" &&
      latestAssistant &&
      latestAssistant.id !== previous.activeBaselineAssistantMessageId &&
      !latestAssistant.content.includes("[stream fault]")
    ) {
      completedAgents.push({ agent, message: latestAssistant });
    }

    nextSnapshots.set(agent.id, {
      status: agent.status,
      latestAssistantMessageId: latestAssistant?.id,
      activeBaselineAssistantMessageId: isActive
        ? wasActive
          ? previous?.activeBaselineAssistantMessageId
          : previous?.latestAssistantMessageId ?? latestAssistant?.id
        : undefined,
    });
  }

  if (!previousSnapshots.size) {
    return { decisions, nextSnapshots };
  }

  for (const { agent: sourceAgent, message } of completedAgents) {
    for (const graphEdge of getOutgoingWorkflowEdges(
      workspace.graph.edges,
      sourceAgent.id,
    )) {
      const workflowEdge = toWorkflowEdge(graphEdge);
      const targetAgent = workspace.agents.find(
        (candidate) => candidate.id === workflowEdge.targetAgentId,
      );
      const handoffKey = `${workspace.id}:${graphEdge.id}:${message.id}`;

      if (!targetAgent || processedHandoffKeys.has(handoffKey)) {
        continue;
      }

      const baseDecision = {
        graphEdge,
        handoffKey,
        message,
        sourceAgent,
        targetAgent,
        workflowEdge,
      };
      const cyclePath = findWorkflowCyclePath(
        workspace.graph.edges,
        workflowEdge.sourceAgentId,
        workflowEdge.targetAgentId,
      );

      if (cyclePath) {
        decisions.push({
          ...baseDecision,
          cyclePath,
          type: "blocked-cycle",
        });
        continue;
      }

      if (isWorkflowActiveStatus(targetAgent.status)) {
        decisions.push({
          ...baseDecision,
          type: "skipped-busy",
        });
        continue;
      }

      if (!AUTONOMOUS_PROMPT_CAPABILITIES.has(targetAgent.capabilities.type)) {
        decisions.push({
          ...baseDecision,
          type: "skipped-unsupported",
        });
        continue;
      }

      decisions.push({
        ...baseDecision,
        prompt: buildWorkflowHandoffPrompt({
          message,
          sourceAgent,
          targetAgent,
        }),
        type: "dispatch",
      });
    }
  }

  return { decisions, nextSnapshots };
}
