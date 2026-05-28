import { describe, expect, it } from "vitest";

import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import {
  buildWorkflowHandoffPrompt,
  evaluateWorkflowHandoffs,
  findWorkflowCyclePath,
  getLatestCompletedAssistantMessage,
  getOutgoingWorkflowEdges,
  queueWorkflowHandoffDispatches,
  toWorkflowEdge,
} from "@/lib/workflow-engine";
import type { AgentMessage, WorkspaceGraphEdge } from "@/lib/nexus-types";

describe("workflow engine", () => {
  it("finds outgoing graph edges and adapts them to L2 workflow edges", () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator] = workspace.agents;
    const edge: WorkspaceGraphEdge = {
      id: "edge-architect-operator",
      sourceAgentId: architect.id,
      targetAgentId: operator.id,
    };

    expect(getOutgoingWorkflowEdges([edge], architect.id)).toEqual([edge]);
    expect(toWorkflowEdge(edge)).toEqual({
      sourceAgentId: architect.id,
      targetAgentId: operator.id,
      passContext: true,
    });
  });

  it("detects cyclic handoff paths before dispatch", () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator, sentinel] = workspace.agents;
    const edges: WorkspaceGraphEdge[] = [
      {
        id: "edge-architect-operator",
        sourceAgentId: architect.id,
        targetAgentId: operator.id,
      },
      {
        id: "edge-operator-sentinel",
        sourceAgentId: operator.id,
        targetAgentId: sentinel.id,
      },
      {
        id: "edge-sentinel-architect",
        sourceAgentId: sentinel.id,
        targetAgentId: architect.id,
      },
    ];

    expect(findWorkflowCyclePath(edges, architect.id, operator.id)).toEqual([
      architect.id,
      operator.id,
      sentinel.id,
      architect.id,
    ]);
    expect(findWorkflowCyclePath(edges.slice(0, 2), architect.id, operator.id)).toBe(
      undefined,
    );
  });

  it("uses only completed assistant messages as handoff payloads", () => {
    const workspace = createDefaultWorkspace();
    const agent = workspace.agents[0];
    const streamingMessage: AgentMessage = {
      id: "streaming",
      role: "assistant",
      content: "not ready",
      createdAt: "2026-05-25T00:00:00.000Z",
      streaming: true,
    };
    const finalMessage: AgentMessage = {
      id: "final",
      role: "assistant",
      content: "ready",
      createdAt: "2026-05-25T00:00:01.000Z",
    };

    expect(
      getLatestCompletedAssistantMessage({
        messages: [...agent.messages, streamingMessage, finalMessage],
      })?.id,
    ).toBe("final");
  });

  it("formats handoff prompts with source and target identities", () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator] = workspace.agents;
    const message = architect.messages[0];

    expect(
      buildWorkflowHandoffPrompt({
        message,
        sourceAgent: architect,
        targetAgent: operator,
      }),
    ).toContain("[L2 AUTO-HANDOFF] Nexus_1 -> Nuxus_2");
  });

  it("evaluates idle transitions into dispatch decisions", () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator] = workspace.agents;
    const finalMessage: AgentMessage = {
      id: "architect-final",
      role: "assistant",
      content: "handoff payload",
      createdAt: "2026-05-25T00:00:01.000Z",
    };
    const previousSnapshots = new Map([
      [
        architect.id,
        {
          activeBaselineAssistantMessageId: architect.messages[0].id,
          latestAssistantMessageId: architect.messages[0].id,
          status: "streaming" as const,
        },
      ],
      [
        operator.id,
        {
          latestAssistantMessageId: operator.messages[0].id,
          status: "idle" as const,
        },
      ],
    ]);

    workspace.agents[0] = {
      ...architect,
      messages: [...architect.messages, finalMessage],
      status: "idle",
    };
    workspace.graph.edges.push({
      id: "edge-architect-operator",
      sourceAgentId: architect.id,
      targetAgentId: operator.id,
    });

    const result = evaluateWorkflowHandoffs({
      previousSnapshots,
      processedHandoffKeys: new Set(),
      workspace,
    });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({
      handoffKey: `${workspace.id}:edge-architect-operator:architect-final`,
      type: "dispatch",
    });
  });

  it("blocks dispatch decisions when the graph contains a cycle", () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator] = workspace.agents;
    const previousSnapshots = new Map([
      [
        architect.id,
        {
          activeBaselineAssistantMessageId: architect.messages[0].id,
          latestAssistantMessageId: architect.messages[0].id,
          status: "thinking" as const,
        },
      ],
    ]);
    const finalMessage: AgentMessage = {
      id: "architect-final",
      role: "assistant",
      content: "handoff payload",
      createdAt: "2026-05-25T00:00:01.000Z",
    };

    workspace.agents[0] = {
      ...architect,
      messages: [...architect.messages, finalMessage],
      status: "idle",
    };
    workspace.graph.edges.push(
      {
        id: "edge-architect-operator",
        sourceAgentId: architect.id,
        targetAgentId: operator.id,
      },
      {
        id: "edge-operator-architect",
        sourceAgentId: operator.id,
        targetAgentId: architect.id,
      },
    );

    const result = evaluateWorkflowHandoffs({
      previousSnapshots,
      processedHandoffKeys: new Set(),
      workspace,
    });

    expect(result.decisions[0]).toMatchObject({
      type: "blocked-cycle",
    });
  });

  it("queues dispatch decisions sequentially", async () => {
    const workspace = createDefaultWorkspace();
    const [architect, operator] = workspace.agents;
    const previousSnapshots = new Map([
      [
        architect.id,
        {
          activeBaselineAssistantMessageId: architect.messages[0].id,
          latestAssistantMessageId: architect.messages[0].id,
          status: "streaming" as const,
        },
      ],
    ]);
    const finalMessage: AgentMessage = {
      id: "architect-final",
      role: "assistant",
      content: "handoff payload",
      createdAt: "2026-05-25T00:00:01.000Z",
    };

    workspace.agents[0] = {
      ...architect,
      messages: [...architect.messages, finalMessage],
      status: "idle",
    };
    workspace.graph.edges.push({
      id: "edge-architect-operator",
      sourceAgentId: architect.id,
      targetAgentId: operator.id,
    });

    const result = evaluateWorkflowHandoffs({
      previousSnapshots,
      processedHandoffKeys: new Set(),
      workspace,
    });
    const decision = result.decisions[0];

    if (decision?.type !== "dispatch") {
      throw new Error("Expected dispatch decision.");
    }

    const dispatched: string[] = [];

    await queueWorkflowHandoffDispatches({
      decisions: [decision, { ...decision, handoffKey: "second-handoff" }],
      dispatch: (queuedDecision) => {
        dispatched.push(queuedDecision.handoffKey);
      },
      staggerMs: 0,
    });

    expect(dispatched).toEqual([decision.handoffKey, "second-handoff"]);
  });
});
