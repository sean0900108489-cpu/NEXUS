import { describe, expect, it, vi } from "vitest";

import {
  ACTIVE_WINDOW_DEFAULT_LIMIT,
  ACTIVE_WINDOW_MAX_LIMIT,
  AGENT_MEMORY_CONTENT_MAX_BYTES,
} from "@/lib/backend/history/history-constants";
import { serializeActiveUiStateSnapshot } from "@/lib/backend/workspace/workspace-snapshot-serializer";
import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import { publishWorkflowRuntimeTrace } from "@/lib/workflow-runtime-lite/trace-client";
import { publishWorkflowGroupRecord } from "@/lib/workflow-pro/group-record-client";
import type {
  AgentMessage,
  AgentMemoryBlock,
  ArtifactVaultCache,
  ArtifactVaultRecord,
  IAuthVault,
  NexusWorkspace,
  NotebookRecord,
  PromptRecord,
  WorkflowRun,
  WorkflowRuntimeLiteState,
  WorkspaceRecoveryStateResponse,
  WorkspaceNotebookRecoveryMetadata,
} from "@/lib/nexus-types";

import {
  collectWorkflowGeneratedArtifactVaultRecords,
  mergeArtifactVaultRecordsIntoCache,
  prepareAuthVaultForLocalPersistence,
  prepareWorkspacesForLocalPersistence,
  useNexusStore,
} from "./nexus-store";

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

vi.mock("@/lib/state-sync", () => {
  const synced = async () => ({
    ok: true,
    syncedAt: "2026-05-28T00:00:00.000Z",
  });

  return {
    supabaseStateSyncManager: {
      deleteNotebook: synced,
      deletePrompt: synced,
      fetchArtifacts: async () => ({
        artifacts: [],
        hasMore: false,
        nextCursor: null,
        workspaceId: "workspace-v15-test",
      }),
      fetchMacros: async () => [],
      fetchNotebooks: async () => [],
      fetchPromptRevisions: async () => [],
      fetchPrompts: async () => [],
      flush: synced,
      getStatus: () => "idle",
      ensureWorkspaceSession: async (input: {
        preferredWorkspaceId?: string | null;
        preferredWorkspaceName?: string | null;
      }) => ({
        created: false,
        preferredWorkspaceId: input.preferredWorkspaceId ?? null,
        reason: "preferred_workspace_member",
        role: "owner",
        workspaceId: input.preferredWorkspaceId ?? "workspace-v15-test",
        workspaceName: input.preferredWorkspaceName ?? "Workspace",
      }),
      insertMessage: synced,
      saveArtifact: synced,
      saveMacro: synced,
      setTransactionLogger: () => undefined,
      syncActiveUiState: synced,
      syncHistoricalArtifact: synced,
      syncHistoricalMessage: synced,
      upsertNotebook: synced,
      upsertPrompt: synced,
      upsertWorkspace: synced,
    },
  };
});

vi.mock("@/lib/workflow-runtime-lite/trace-client", () => ({
  createWorkflowRuntimeTraceSyncError: (error: unknown) => ({
    error: error instanceof Error ? error.message : "Workflow trace sync failed.",
    retryable: true,
  }),
  publishWorkflowRuntimeTrace: vi.fn(async ({ run, workspaceId }) => ({
    eventId: `event-${run.runId}`,
    eventType: "workflow.runtime_lite.run.succeeded",
    schema: "nexus.workflowRuntime.traceEvent.v1",
    status: run.status,
    traceId: `workflow-runtime:${run.runId}`,
    workflowGroupId: run.group?.id ?? "workspace-root",
    workflowRunId: run.runId,
    workspaceId,
  })),
}));

vi.mock("@/lib/workflow-pro/group-record-client", () => ({
  publishWorkflowGroupRecord: vi.fn(async () => ({
    data: {
      edgeCount: 1,
      eventId: "event-workflow-group",
      eventType: "workflow.group_record.upserted",
      nodeCount: 2,
      schema: "nexus.workflowPro.groupRecord.v1",
      traceId: "workflow-group-record:wf_group",
      workflowGroupId: "wf_group",
      workflowId: "wf_group",
      workspaceId: "workspace-v15-test",
    },
    ok: true,
  })),
}));

describe("prepareWorkspacesForLocalPersistence", () => {
  it("preserves active messages and memory while marking conservative retention policy", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-v15-test",
      name: "V15 Test",
      timestamp: "2026-05-28T00:00:00.000Z",
    });
    const messages = createMessages(90);
    const memory = createMemoryBlocks(3);
    const source = replaceFirstAgent(workspace, { memory, messages });

    const [persisted] = prepareWorkspacesForLocalPersistence([source]);
    const agent = persisted?.agents[0];

    expect(agent?.messages.map((message) => message.id)).toEqual(
      messages.map((message) => message.id),
    );
    expect(agent?.memory).toEqual(memory);
    expect(agent?.localPersistence).toEqual({
      schemaVersion: 1,
      messages: {
        activeWindowLimit: ACTIVE_WINDOW_DEFAULT_LIMIT,
        durability: "needs_sync_operation_applier_message_projection",
        maxWindowLimit: ACTIVE_WINDOW_MAX_LIMIT,
        mode: "preserve_full_until_durable_projection",
        omittedCount: 0,
        retainedCount: messages.length,
      },
      memory: {
        durability: "needs_memory_write_route",
        maxRecordContentBytes: AGENT_MEMORY_CONTENT_MAX_BYTES,
        mode: "preserve_full_until_durable_write",
        omittedBlockCount: 0,
        retainedBlockCount: memory.length,
      },
    });
  });

  it("preserves core workspace interaction fields during local persistence shaping", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-v15-layout",
      name: "V15 Layout",
      timestamp: "2026-05-28T00:00:00.000Z",
    });

    const [persisted] = prepareWorkspacesForLocalPersistence([workspace]);

    expect(persisted?.activeAgentId).toBe(workspace.activeAgentId);
    expect(persisted?.selectedAgentId).toBe(workspace.selectedAgentId);
    expect(persisted?.graph.nodes).toEqual(workspace.graph.nodes);
    expect(persisted?.graph.edges).toEqual(workspace.graph.edges);
    expect(persisted?.graph.runtimeLite).toBeDefined();
    expect(persisted?.panels).toEqual(workspace.panels);
    expect(persisted?.settings.viewMode).toBe(workspace.settings.viewMode);
  });

  it("keeps model selection scoped to the individual operator", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-per-operator-models",
      name: "Per Operator Models",
      timestamp: "2026-06-09T00:00:00.000Z",
    });
    const firstAgent = workspace.agents[0];
    const secondAgent = workspace.agents[1];

    if (!firstAgent || !secondAgent) {
      throw new Error("Default workspace must include at least two operators.");
    }

    useNexusStore.setState({
      activeWorkspaceId: workspace.id,
      selectedAgentId: secondAgent.id,
      workspaces: [workspace],
    });

    useNexusStore.getState().updateAgentModel(secondAgent.id, "deepseek-v4-flash");

    const updatedWorkspace = useNexusStore
      .getState()
      .workspaces.find((candidate) => candidate.id === workspace.id);
    const updatedFirstAgent = updatedWorkspace?.agents.find(
      (agent) => agent.id === firstAgent.id,
    );
    const updatedSecondAgent = updatedWorkspace?.agents.find(
      (agent) => agent.id === secondAgent.id,
    );

    expect(updatedFirstAgent?.model).toBe(firstAgent.model);
    expect(updatedSecondAgent?.model).toBe("deepseek-v4-flash");
  });

  it("omits inline image data URLs from persisted workflow runtime snapshots", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-data-url-sanitize",
      name: "Runtime Data URL Sanitize",
      timestamp: "2026-06-03T00:00:00.000Z",
    });
    const dataUrl = `data:image/png;base64,${"aW1hZ2U=".repeat(1024)}`;
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: "run-data-url",
      nodes: [
        {
          data: {
            aspectRatio: "16:9",
            modelId: "img2",
            prompt: "",
            quality: "standard",
          },
          error: null,
          id: "image-node",
          inputSnapshot: null,
          outputSnapshot: {
            createdAt: "2026-06-03T00:00:01.000Z",
            displayText: `Image generated at ${dataUrl}`,
            id: "packet-image",
            metadata: {
              artifactVaultRecord: {
                contentUrl: dataUrl,
                createdAt: "2026-06-03T00:00:01.000Z",
                id: "artifact-data-url",
                sourceMessageId: "message-data-url",
                status: "saved",
                type: "generated-image",
                version: 1,
                workspaceId: workspace.id,
              },
              imageUrl: dataUrl,
            },
            rawText: `Image URL: ${dataUrl}`,
            runId: "run-data-url",
            sourceNodeId: "image-node",
          },
          position: { x: 0, y: 0 },
          status: "success",
          type: "model.image",
        },
      ],
      runs: [
        {
          completedAt: "2026-06-03T00:00:03.000Z",
          error: null,
          nodeExecutions: [
            {
              nodeId: "image-node",
              outputSnapshot: {
                createdAt: "2026-06-03T00:00:01.000Z",
                displayText: `Image generated at ${dataUrl}`,
                id: "packet-image-run",
                metadata: {
                  imageUrl: dataUrl,
                },
                rawText: `Image URL: ${dataUrl}`,
                runId: "run-data-url",
                sourceNodeId: "image-node",
              },
              runId: "run-data-url",
              status: "success",
            },
          ],
          runId: "run-data-url",
          startedAt: "2026-06-03T00:00:00.000Z",
          status: "success",
          workflowId: workspace.id,
        },
      ],
      version: 1,
    };
    const source: NexusWorkspace = {
      ...workspace,
      graph: {
        ...workspace.graph,
        runtimeLite,
      },
    };
    const [persisted] = prepareWorkspacesForLocalPersistence([source]);
    const serializedRuntime = JSON.stringify(persisted?.graph.runtimeLite);

    expect(serializedRuntime).not.toContain(dataUrl);
    expect(serializedRuntime).toContain(
      "[inline image data URL omitted from local persistence]",
    );
  });

  it("removes workflow runtime nodes with their connected edges", () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-delete-test",
      name: "Runtime Delete Test",
      timestamp: "2026-06-02T00:00:00.000Z",
    });

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const inputId = useNexusStore.getState().addWorkflowRuntimeNode("input.text");
      const imageId = useNexusStore.getState().addWorkflowRuntimeNode("model.image");
      useNexusStore.getState().connectWorkflowRuntimeNodes({
        id: "wf-edge-delete-test",
        source: inputId,
        sourceHandle: "output",
        target: imageId,
        targetHandle: "input",
      });

      useNexusStore.getState().removeWorkflowRuntimeNodes([imageId]);

      const runtimeLite = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite;

      expect(runtimeLite?.nodes.some((node) => node.id === inputId)).toBe(true);
      expect(runtimeLite?.nodes.some((node) => node.id === imageId)).toBe(false);
      expect(
        runtimeLite?.edges.some(
          (edge) => edge.source === imageId || edge.target === imageId,
        ),
      ).toBe(false);
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("adds workflow runtime nodes at explicit canvas positions", () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-position-test",
      name: "Runtime Position Test",
      timestamp: "2026-06-03T00:00:00.000Z",
    });

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const nodeId = useNexusStore.getState().addWorkflowRuntimeNode("model.image", {
        position: { x: 640, y: 360 },
      });
      const runtimeNode = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite?.nodes.find((node) => node.id === nodeId);

      expect(runtimeNode?.position).toEqual({ x: 640, y: 360 });
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("replaces workflow runtime lite through the store normalization boundary", () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-replace-test",
      name: "Runtime Replace Test",
      timestamp: "2026-06-03T00:00:00.000Z",
    });
    const nextRuntimeLite: WorkflowRuntimeLiteState = {
      edges: [
        {
          id: "edge-valid",
          source: "input-imported",
          sourceHandle: "output",
          target: "output-imported",
          targetHandle: "input",
        },
        {
          id: "edge-invalid",
          source: "input-imported",
          sourceHandle: "output",
          target: "missing-node",
          targetHandle: "input",
        },
      ],
      lastError: "candidate error should clear",
      lastRunId: null,
      nodes: [
        {
          data: { label: "Imported Input", text: "Imported" },
          error: null,
          id: "input-imported",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 10, y: 20 },
          status: "idle",
          type: "input.text",
        },
        {
          data: { label: "Imported Output", renderMode: "markdown" },
          error: null,
          id: "output-imported",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 320, y: 20 },
          status: "idle",
          type: "output.text",
        },
      ],
      runs: [],
      version: 1,
    };

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const oldNodeId = useNexusStore.getState().addWorkflowRuntimeNode("model.llm");
      useNexusStore.getState().replaceWorkflowRuntimeLite(nextRuntimeLite);

      const runtimeLite = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite;

      expect(runtimeLite?.lastError).toBeNull();
      expect(runtimeLite?.nodes.map((node) => node.id)).toEqual([
        "input-imported",
        "output-imported",
      ]);
      expect(runtimeLite?.nodes.some((node) => node.id === oldNodeId)).toBe(false);
      expect(runtimeLite?.edges.map((edge) => edge.id)).toEqual(["edge-valid"]);
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("appends a workflow runtime group without replacing the existing graph", () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-append-test",
      name: "Runtime Append Test",
      timestamp: "2026-06-04T00:00:00.000Z",
    });
    const groupRuntimeLite: WorkflowRuntimeLiteState = {
      edges: [
        {
          id: "edge-imported",
          source: "imported-input",
          sourceHandle: "output",
          target: "imported-output",
          targetHandle: "input",
        },
      ],
      lastError: null,
      lastRunId: null,
      nodes: [
        {
          data: { label: "Imported Input", text: "Append" },
          error: null,
          id: "imported-input",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 0, y: 0 },
          status: "idle",
          type: "input.text",
        },
        {
          data: { label: "Imported Output", renderMode: "markdown" },
          error: null,
          id: "imported-output",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 260, y: 0 },
          status: "idle",
          type: "output.text",
        },
      ],
      runs: [],
      version: 1,
    };

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const existingNodeId = useNexusStore
        .getState()
        .addWorkflowRuntimeNode("model.llm", {
          position: { x: 640, y: 360 },
        });
      const appendResult = useNexusStore
        .getState()
        .appendWorkflowRuntimeGroup(groupRuntimeLite, {
          groupLabel: "Store Brain Append",
          groupSource: "brain",
        });
      const runtimeLite = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite;

      expect(runtimeLite?.nodes.some((node) => node.id === existingNodeId)).toBe(true);
      expect(appendResult.nodeIds).toHaveLength(2);
      expect(appendResult.edgeIds).toHaveLength(1);
      expect(runtimeLite?.nodes).toHaveLength(3);
      expect(runtimeLite?.edges).toHaveLength(1);
      expect(runtimeLite?.nodes.map((node) => node.id)).not.toContain("imported-input");
      expect(
        runtimeLite?.nodes.find((node) => appendResult.nodeIds.includes(node.id))?.group,
      ).toMatchObject({
        label: "Store Brain Append",
        source: "brain",
      });
      expect(
        runtimeLite?.edges.every((edge) =>
          appendResult.nodeIds.includes(edge.source) &&
          appendResult.nodeIds.includes(edge.target),
        ),
      ).toBe(true);
      expect(publishWorkflowGroupRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: appendResult.groupId,
          runtimeLite: expect.objectContaining({
            version: 1,
          }),
          workspaceId: workspace.id,
        }),
      );
    } finally {
      useNexusStore.setState(previousState);
      vi.mocked(publishWorkflowGroupRecord).mockClear();
    }
  });

  it("persists Workflow Pro as the active workspace view mode", () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-workflow-pro-view-test",
      name: "Workflow Pro View Test",
      timestamp: "2026-06-03T00:00:00.000Z",
    });

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        viewMode: "panels",
        workspaces: [workspace],
      });

      useNexusStore.getState().setViewMode("workflow-pro");

      const state = useNexusStore.getState();
      const activeWorkspace = state.workspaces.find(
        (candidate) => candidate.id === workspace.id,
      );

      expect(state.viewMode).toBe("workflow-pro");
      expect(activeWorkspace?.settings.viewMode).toBe("workflow-pro");
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("can start a workflow runtime run from a specific input node", async () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-single-start-test",
      name: "Runtime Single Start Test",
      timestamp: "2026-06-03T00:00:00.000Z",
    });

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const inputA = useNexusStore.getState().addWorkflowRuntimeNode("input.text");
      const inputB = useNexusStore.getState().addWorkflowRuntimeNode("input.text");

      useNexusStore.getState().updateWorkflowRuntimeNodeData(inputA, {
        text: "Alpha",
      });
      useNexusStore.getState().updateWorkflowRuntimeNodeData(inputB, {
        text: "Beta",
      });

      const run = await useNexusStore
        .getState()
        .runWorkflowRuntimeLiteFlow({ startNodeId: inputB });
      const runtimeLite = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite;
      const nodeA = runtimeLite?.nodes.find((node) => node.id === inputA);
      const nodeB = runtimeLite?.nodes.find((node) => node.id === inputB);

      expect(run?.status).toBe("success");
      expect(nodeA?.outputSnapshot).toBeNull();
      expect(nodeB?.outputSnapshot?.rawText).toBe("Beta");
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("publishes completed workflow runtime runs to durable trace in the background", async () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-trace-sync-test",
      name: "Runtime Trace Sync Test",
      timestamp: "2026-06-04T00:00:00.000Z",
    });

    vi.mocked(publishWorkflowRuntimeTrace).mockClear();

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        authVault: {
          ...previousState.authVault,
          user: {
            email: "trace@example.test",
            id: "local-editor",
          } as IAuthVault["user"],
        },
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [workspace],
      });

      const inputId = useNexusStore.getState().addWorkflowRuntimeNode("input.text");

      useNexusStore.getState().updateWorkflowRuntimeNodeData(inputId, {
        text: "Trace me",
      });

      const run = await useNexusStore.getState().runWorkflowRuntimeLiteFlow({
        startNodeId: inputId,
      });

      expect(run?.status).toBe("success");
      expect(publishWorkflowRuntimeTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          run: expect.objectContaining({
            runId: run?.runId,
          }),
          userId: "local-editor",
          workspaceId: workspace.id,
        }),
      );

      await flushMicrotasks();

      const storedRun = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite?.runs.find((candidate) => candidate.runId === run?.runId);

      expect(storedRun?.traceSync).toMatchObject({
        eventId: `event-${run?.runId}`,
        status: "synced",
        traceId: `workflow-runtime:${run?.runId}`,
      });
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("retries failed workflow runtime trace sync by run id", async () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-trace-retry-test",
      name: "Runtime Trace Retry Test",
      timestamp: "2026-06-04T00:00:00.000Z",
    });
    const run: WorkflowRun = {
      completedAt: "2026-06-04T00:00:03.000Z",
      error: null,
      nodeExecutions: [],
      runId: "run-retry-a",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "success",
      traceSync: {
        attemptedAt: "2026-06-04T00:00:04.000Z",
        completedAt: "2026-06-04T00:00:05.000Z",
        error: "Permission denied.",
        retryable: true,
        status: "failed",
        traceId: "workflow-runtime:run-retry-a",
      },
      workflowId: workspace.id,
    };

    vi.mocked(publishWorkflowRuntimeTrace).mockClear();

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        authVault: {
          ...previousState.authVault,
          user: {
            email: "trace@example.test",
            id: "local-editor",
          } as IAuthVault["user"],
        },
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [
          {
            ...workspace,
            graph: {
              ...workspace.graph,
              runtimeLite: {
                edges: [],
                lastError: null,
                lastRunId: run.runId,
                nodes: [],
                runs: [run],
                version: 1,
              },
            },
          },
        ],
      });

      const retried = await useNexusStore
        .getState()
        .retryWorkflowRuntimeTraceSync(run.runId);

      expect(publishWorkflowRuntimeTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          run: expect.objectContaining({
            runId: run.runId,
          }),
          userId: "local-editor",
          workspaceId: workspace.id,
        }),
      );
      expect(retried?.traceSync).toMatchObject({
        eventId: `event-${run.runId}`,
        status: "synced",
        traceId: `workflow-runtime:${run.runId}`,
      });

      const storedRun = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite?.runs.find((candidate) => candidate.runId === run.runId);

      expect(storedRun?.traceSync).toMatchObject({
        eventId: `event-${run.runId}`,
        status: "synced",
      });
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("keeps retry failure evidence on the workflow run", async () => {
    const previousState = useNexusStore.getState();
    const workspace = createDefaultWorkspace({
      id: "workspace-runtime-trace-retry-failure-test",
      name: "Runtime Trace Retry Failure Test",
      timestamp: "2026-06-04T00:00:00.000Z",
    });
    const run: WorkflowRun = {
      completedAt: "2026-06-04T00:00:03.000Z",
      error: null,
      nodeExecutions: [],
      runId: "run-retry-failure",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "success",
      traceSync: {
        attemptedAt: "2026-06-04T00:00:04.000Z",
        completedAt: "2026-06-04T00:00:05.000Z",
        error: "Permission denied.",
        retryable: true,
        status: "failed",
        traceId: "workflow-runtime:run-retry-failure",
      },
      workflowId: workspace.id,
    };

    vi.mocked(publishWorkflowRuntimeTrace).mockRejectedValueOnce(
      new Error("Permission denied."),
    );

    try {
      useNexusStore.setState({
        activeWorkspaceId: workspace.id,
        selectedAgentId: workspace.selectedAgentId,
        workspaces: [
          {
            ...workspace,
            graph: {
              ...workspace.graph,
              runtimeLite: {
                edges: [],
                lastError: null,
                lastRunId: run.runId,
                nodes: [],
                runs: [run],
                version: 1,
              },
            },
          },
        ],
      });

      const retried = await useNexusStore
        .getState()
        .retryWorkflowRuntimeTraceSync(run.runId);

      expect(retried?.traceSync).toMatchObject({
        error: "Permission denied.",
        retryable: true,
        status: "failed",
        traceId: "workflow-runtime:run-retry-failure",
      });

      const storedRun = useNexusStore
        .getState()
        .workspaces.find((candidate) => candidate.id === workspace.id)
        ?.graph.runtimeLite?.runs.find((candidate) => candidate.runId === run.runId);

      expect(storedRun?.traceSync).toMatchObject({
        error: "Permission denied.",
        retryable: true,
        status: "failed",
      });
    } finally {
      useNexusStore.setState(previousState);
    }
  });

  it("hydrates generated artifact history records from workflow image node outputs", () => {
    const existingArtifact: ArtifactVaultRecord = {
      contentUrl: "https://assets.example.test/existing.png",
      createdAt: "2026-06-03T00:00:00.000Z",
      id: "artifact-existing",
      mimeType: "image/png",
      previewText: null,
      sourceAgentId: "agent-existing",
      sourceMessageId: "message-existing",
      status: "saved",
      title: "Existing generated image",
      type: "generated-image",
      version: 1,
      workspaceId: "workspace-runtime-artifact-test",
    };
    const generatedArtifact: ArtifactVaultRecord = {
      contentUrl: "https://assets.example.test/workflow-image.png",
      createdAt: "2026-06-03T00:01:00.000Z",
      id: "artifact-generated",
      mimeType: "image/png",
      previewText: null,
      sourceAgentId: "agent-runtime",
      sourceMessageId: "run-runtime:image",
      status: "saved",
      title: "Workflow image - Y2K wide pants",
      type: "generated-image",
      version: 1,
      workspaceId: "workspace-runtime-artifact-test",
    };
    const cache: ArtifactVaultCache = {
      byId: {
        [existingArtifact.id]: existingArtifact,
      },
      hasMore: false,
      ids: [existingArtifact.id],
      nextCursor: null,
    };
    const run: WorkflowRun = {
      completedAt: "2026-06-03T00:01:30.000Z",
      error: null,
      nodeExecutions: [
        {
          completedAt: "2026-06-03T00:01:25.000Z",
          nodeId: "image-model",
          outputSnapshot: {
            createdAt: "2026-06-03T00:01:25.000Z",
            displayText: "Image generated.",
            id: "packet-image",
            metadata: {
              artifactVaultRecord: generatedArtifact,
            },
            rawText: "Image URL: https://assets.example.test/workflow-image.png",
            runId: "run-runtime",
            sourceNodeId: "image-model",
          },
          runId: "run-runtime",
          status: "success",
        },
      ],
      runId: "run-runtime",
      startedAt: "2026-06-03T00:01:00.000Z",
      status: "success",
      workflowId: "workspace-runtime-artifact-test",
    };

    const records = collectWorkflowGeneratedArtifactVaultRecords(run);
    const merged = mergeArtifactVaultRecordsIntoCache(cache, records);

    expect(records).toEqual([generatedArtifact]);
    expect(merged.ids).toEqual([generatedArtifact.id, existingArtifact.id]);
    expect(merged.byId[generatedArtifact.id]).toMatchObject({
      contentUrl: generatedArtifact.contentUrl,
      title: generatedArtifact.title,
      type: "generated-image",
    });
  });

  it("collects transient generated image records when artifact persistence fails", () => {
    const run: WorkflowRun = {
      completedAt: "2026-06-03T00:01:30.000Z",
      error: null,
      nodeExecutions: [
        {
          completedAt: "2026-06-03T00:01:25.000Z",
          nodeId: "image-model",
          outputSnapshot: {
            createdAt: "2026-06-03T00:01:25.000Z",
            displayText: "Image generated.",
            id: "packet-image",
            metadata: {
              artifactId: null,
              artifactPersistence: {
                error: "Permission denied.",
                status: "failed",
              },
              generatedAsset: {
                assetId: "img_transient",
                durable: false,
                mimeType: "image/png",
                provider: "memory",
                sizeBytes: 1234,
                url: "/api/image-gen/assets/img_transient",
              },
              imageUrl: "/api/image-gen/assets/img_transient",
              prompt: "Y2K flying car",
            },
            rawText: "Image URL: /api/image-gen/assets/img_transient",
            runId: "run-runtime",
            sourceNodeId: "image-model",
          },
          runId: "run-runtime",
          status: "success",
        },
      ],
      runId: "run-runtime",
      startedAt: "2026-06-03T00:01:00.000Z",
      status: "success",
      workflowId: "workspace-runtime-artifact-test",
    };

    const records = collectWorkflowGeneratedArtifactVaultRecords(run);

    expect(records).toEqual([
      expect.objectContaining({
        contentSizeBytes: 1234,
        contentUrl: "/api/image-gen/assets/img_transient",
        id: "transient_img_transient",
        mimeType: "image/png",
        previewText: "Y2K flying car",
        sourceMessageId: "run-runtime:image-model:image",
        status: "saved",
        title: "Workflow image - Y2K flying car",
        type: "generated-image",
        workspaceId: "workspace-runtime-artifact-test",
      }),
    ]);
  });

  it("strips raw provider secrets from locally persisted auth vaults", () => {
    const persisted = prepareAuthVaultForLocalPersistence({
      user: {
        email: "sean@example.com",
        id: "user-secret-test",
      } as IAuthVault["user"],
      globalApiKey: "sk-global-secret",
      globalBaseUrl: "https://api.example.test/v1",
      isLocked: false,
      providerCredentials: {
        deepseek: {
          apiKey: "sk-provider-secret",
          baseUrl: "https://deepseek.example.test/v1",
          isLocked: false,
          liveVerifiedAt: "2026-06-01T00:00:00.000Z",
          verificationError: "secret-shaped diagnostic",
          verificationStatus: "verified",
        },
      },
    });

    expect(persisted.user?.id).toBe("user-secret-test");
    expect(persisted.globalApiKey).toBeNull();
    expect(persisted.globalBaseUrl).toBeNull();
    expect(persisted.isLocked).toBe(true);
    expect(persisted.providerCredentials).toEqual({});
    expect(JSON.stringify(persisted)).not.toContain("sk-global-secret");
    expect(JSON.stringify(persisted)).not.toContain("sk-provider-secret");
  });

  it("does not write raw auth secrets through the local persistence adapter", async () => {
    type PersistOptions = Parameters<typeof useNexusStore.persist.setOptions>[0];
    type TestStorage = NonNullable<PersistOptions["storage"]>;
    const originalStorage = useNexusStore.persist.getOptions().storage;
    const setItem = vi.fn();
    const storage: TestStorage = {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem,
    };

    useNexusStore.persist.setOptions({ storage });

    try {
      useNexusStore.getState().setGlobalApiKey("sk-local-global-secret");
      useNexusStore.getState().setProviderApiKey("deepseek", "sk-local-provider-secret");
      await Promise.resolve();
    } finally {
      useNexusStore.persist.setOptions({ storage: originalStorage });
      useNexusStore.getState().deleteApiKey();
      useNexusStore.getState().deleteProviderCredential("deepseek");
    }

    const persistedWrites = JSON.stringify(setItem.mock.calls);

    expect(setItem).toHaveBeenCalled();
    expect(persistedWrites).not.toContain("sk-local-global-secret");
    expect(persistedWrites).not.toContain("sk-local-provider-secret");
    expect(persistedWrites).toContain('"globalApiKey":null');
    expect(persistedWrites).toContain('"providerCredentials":{}');
  });

  it("rehydrates v13 persisted workspaces into v15 metadata without losing active data", async () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-v13-migration",
      name: "V13 Migration",
      timestamp: "2026-05-28T00:00:00.000Z",
    });
    const messages = createMessages(120);
    const memory = createMemoryBlocks(4);
    const legacyWorkspace = replaceFirstAgent(workspace, { memory, messages });
    const legacyState = {
      activeWorkspaceId: legacyWorkspace.id,
      artifactVault: {
        byId: {},
        hasMore: false,
        ids: [],
        nextCursor: null,
      },
      authVault: {
        globalApiKey: null,
        globalBaseUrl: "https://api.openai.com/v1",
        isLocked: true,
        providerCredentials: {},
        user: null,
      },
      branchingStatus: "idle",
      historicalMessages: {
        legacy: {
          hasMore: false,
          items: [],
          loading: false,
        },
      },
      isVaultManagerOpen: true,
      nextZIndex: 77,
      notebookWindowLayers: {
        notebook_legacy: 9,
      },
      notebooksCache: [],
      openNotebookIds: ["notebook_legacy"],
      promptsCache: [],
      selectedAgentId: legacyWorkspace.selectedAgentId,
      streamMode: "mock",
      transactionHistory: createTransactionHistory(120),
      viewMode: "panels",
      workspaces: [legacyWorkspace],
    };
    const storageValue = {
      state: legacyState,
      version: 13,
    };
    type PersistOptions = Parameters<typeof useNexusStore.persist.setOptions>[0];
    type TestStorage = NonNullable<PersistOptions["storage"]>;
    const originalStorage = useNexusStore.persist.getOptions().storage;
    const setItem = vi.fn();
    const storage: TestStorage = {
      getItem: vi.fn(() => storageValue),
      removeItem: vi.fn(),
      setItem,
    };

    useNexusStore.persist.setOptions({ storage });

    try {
      await useNexusStore.persist.rehydrate();
    } finally {
      useNexusStore.persist.setOptions({ storage: originalStorage });
    }

    const migratedState = useNexusStore.getState();
    const migratedWorkspace = migratedState.workspaces.find(
      (candidate) => candidate.id === legacyWorkspace.id,
    );
    const migratedAgent = migratedWorkspace?.agents[0];

    expect(migratedState.activeWorkspaceId).toBe(legacyWorkspace.id);
    expect(migratedState.historicalMessages).toEqual({});
    expect(migratedState.isVaultManagerOpen).toBe(false);
    expect(migratedState.notebookWindowLayers).toEqual({});
    expect(migratedState.transactionHistory).toHaveLength(100);
    expect(migratedAgent?.messages.map((message) => message.id)).toEqual(
      messages.map((message) => message.id),
    );
    expect(migratedAgent?.memory).toEqual(memory);
    expect(migratedAgent?.localPersistence).toEqual({
      schemaVersion: 1,
      messages: {
        activeWindowLimit: ACTIVE_WINDOW_DEFAULT_LIMIT,
        durability: "needs_sync_operation_applier_message_projection",
        maxWindowLimit: ACTIVE_WINDOW_MAX_LIMIT,
        mode: "preserve_full_until_durable_projection",
        omittedCount: 0,
        retainedCount: messages.length,
      },
      memory: {
        durability: "needs_memory_write_route",
        maxRecordContentBytes: AGENT_MEMORY_CONTENT_MAX_BYTES,
        mode: "preserve_full_until_durable_write",
        omittedBlockCount: 0,
        retainedBlockCount: memory.length,
      },
    });
    expect(setItem).toHaveBeenCalledWith(
      "nexus-ai-ops-workspace",
      expect.objectContaining({ version: 15 }),
    );
  });

  it("scrubs legacy v14 persisted auth secrets during rehydrate", async () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-v14-secret-migration",
      name: "V14 Secret Migration",
      timestamp: "2026-06-01T00:00:00.000Z",
    });
    const legacyState = {
      activeWorkspaceId: workspace.id,
      artifactVault: {
        byId: {},
        hasMore: false,
        ids: [],
        nextCursor: null,
      },
      authVault: {
        globalApiKey: "sk-legacy-global-secret",
        globalBaseUrl: "https://api.example.test/v1",
        isLocked: false,
        providerCredentials: {
          deepseek: {
            apiKey: "sk-legacy-provider-secret",
            baseUrl: "https://deepseek.example.test/v1",
            isLocked: false,
            liveVerifiedAt: "2026-06-01T00:00:00.000Z",
            verificationError: "legacy diagnostic",
            verificationStatus: "verified",
          },
        },
        user: {
          email: "sean@example.com",
          id: "user-v14-secret",
        },
      },
      branchingStatus: "idle",
      deletedNotebooksCache: [],
      historicalMessages: {},
      isVaultManagerOpen: false,
      lastImportError: undefined,
      lastSavedAt: "2026-06-01T00:00:00.000Z",
      nextZIndex: 10,
      notebookDrafts: {},
      notebookWindowLayers: {},
      notebooksCache: [],
      openNotebookIds: [],
      promptsCache: [],
      selectedAgentId: workspace.selectedAgentId,
      streamMode: "live",
      transactionHistory: [],
      viewMode: "panels",
      workspaces: [workspace],
    };
    const storageValue = {
      state: legacyState,
      version: 14,
    };
    type PersistOptions = Parameters<typeof useNexusStore.persist.setOptions>[0];
    type TestStorage = NonNullable<PersistOptions["storage"]>;
    const originalStorage = useNexusStore.persist.getOptions().storage;
    const setItem = vi.fn();
    const storage: TestStorage = {
      getItem: vi.fn(() => storageValue),
      removeItem: vi.fn(),
      setItem,
    };

    useNexusStore.persist.setOptions({ storage });

    try {
      await useNexusStore.persist.rehydrate();
    } finally {
      useNexusStore.persist.setOptions({ storage: originalStorage });
    }

    const authVault = useNexusStore.getState().authVault;
    const persistedWrites = JSON.stringify(setItem.mock.calls);

    expect(authVault.user?.id).toBe("user-v14-secret");
    expect(authVault.globalApiKey).toBeNull();
    expect(authVault.globalBaseUrl).toBeNull();
    expect(authVault.isLocked).toBe(true);
    expect(authVault.providerCredentials).toEqual({});
    expect(useNexusStore.getState().streamMode).toBe("live");
    expect(persistedWrites).not.toContain("sk-legacy-global-secret");
    expect(persistedWrites).not.toContain("sk-legacy-provider-secret");
  });
});

describe("notebook cache hydration", () => {
  it("keeps visible local notebooks when a remote fetch returns empty", () => {
    const notebook = createNotebookRecord("notebook-visible", {
      content: "local visible datapad",
      updated_at: "2026-05-28T02:00:00.000Z",
    });

    useNexusStore.setState({
      notebookWindowLayers: {
        [notebook.id]: 42,
      },
      notebooksCache: [notebook],
      openNotebookIds: [notebook.id],
    });

    useNexusStore.getState().setNotebooksCache([]);
    const state = useNexusStore.getState();

    expect(state.notebooksCache).toEqual([notebook]);
    expect(state.openNotebookIds).toEqual([notebook.id]);
    expect(state.notebookWindowLayers).toEqual({
      [notebook.id]: 42,
    });
  });

  it("keeps local visible notebooks in exports after an empty remote hydrate", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-notebook-export",
      name: "Notebook Export",
      timestamp: "2026-05-28T02:10:00.000Z",
    });
    const notebook = createNotebookRecord("notebook-export", {
      content: "export me even if remote is empty",
      workspace_id: workspace.id,
    });

    useNexusStore.setState({
      activeWorkspaceId: workspace.id,
      notebookWindowLayers: {
        [notebook.id]: 51,
      },
      notebooksCache: [notebook],
      openNotebookIds: [notebook.id],
      selectedAgentId: workspace.selectedAgentId,
      workspaces: [workspace],
    });

    useNexusStore.getState().setNotebooksCache([]);
    const notebookRecovery: WorkspaceNotebookRecoveryMetadata = {
      generatedAt: "2026-05-28T03:00:00.000Z",
      operationCount: 1,
      operations: [
        {
          clientMutationId: "mutation-notebook-export",
          notebookId: notebook.id,
          operationType: "upsert",
          payloadHash: "hash-export",
          queuedAt: "2026-05-28T02:00:00.000Z",
          status: "queued",
          updatedAt: "2026-05-28T02:01:00.000Z",
          workspaceId: workspace.id,
        },
      ],
      schemaVersion: 1,
      source: "local_sync_queue",
    };
    const snapshot = useNexusStore.getState().exportActiveWorkspace({
      notebookRecovery,
    });

    expect(snapshot.notebooks).toEqual([notebook]);
    expect(snapshot.notebookRecovery).toEqual(notebookRecovery);
  });

  it("keeps local-only notebooks when a non-empty remote fetch omits them", () => {
    const localOnly = createNotebookRecord("notebook-local-only", {
      content: "local pending datapad",
      updated_at: "2026-05-28T02:15:00.000Z",
    });
    const remote = createNotebookRecord("notebook-remote", {
      content: "remote durable datapad",
      updated_at: "2026-05-28T02:10:00.000Z",
    });

    useNexusStore.setState({
      notebookWindowLayers: {
        [localOnly.id]: 61,
      },
      notebooksCache: [localOnly],
      openNotebookIds: [localOnly.id],
    });

    useNexusStore.getState().setNotebooksCache([remote]);
    const state = useNexusStore.getState();

    expect(state.notebooksCache.map((notebook) => notebook.id)).toEqual([
      localOnly.id,
      remote.id,
    ]);
    expect(state.openNotebookIds).toEqual([localOnly.id]);
    expect(state.notebookWindowLayers).toEqual({
      [localOnly.id]: 61,
    });
  });

  it("keeps the newer local notebook when remote returns an older copy", () => {
    const local = createNotebookRecord("notebook-newer-local", {
      content: "newer local body",
      updated_at: "2026-05-28T02:20:00.000Z",
    });
    const olderRemote = createNotebookRecord(local.id, {
      content: "older remote body",
      updated_at: "2026-05-28T02:00:00.000Z",
    });

    useNexusStore.setState({
      notebooksCache: [local],
      openNotebookIds: [],
    });

    useNexusStore.getState().setNotebooksCache([olderRemote]);

    expect(useNexusStore.getState().notebooksCache).toEqual([local]);
  });

  it("keeps deleted notebooks as local tombstones for export recovery", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-notebook-delete",
      name: "Notebook Delete",
      timestamp: "2026-05-28T02:30:00.000Z",
    });
    const notebook = createNotebookRecord("notebook-delete-local", {
      content: "local-only body that should remain recoverable",
      workspace_id: workspace.id,
    });

    useNexusStore.setState({
      activeWorkspaceId: workspace.id,
      deletedNotebooksCache: [],
      notebookDrafts: {},
      notebookWindowLayers: {
        [notebook.id]: 71,
      },
      notebooksCache: [notebook],
      openNotebookIds: [notebook.id],
      selectedAgentId: workspace.selectedAgentId,
      workspaces: [workspace],
    });

    useNexusStore.getState().saveNotebookDraft(
      notebook.id,
      "Unsaved delete title",
      "unsaved local-only body that should remain recoverable",
    );
    useNexusStore.getState().deleteNotebook(notebook.id);
    const state = useNexusStore.getState();
    const snapshot = state.exportActiveWorkspace();

    expect(state.notebooksCache).toEqual([]);
    expect(state.notebookDrafts[notebook.id]).toBeUndefined();
    expect(state.deletedNotebooksCache[0]).toMatchObject({
      content: "unsaved local-only body that should remain recoverable",
      deleted_at: expect.any(String),
      id: notebook.id,
      title: "Unsaved delete title",
      workspace_id: workspace.id,
    });
    expect(snapshot.notebooks).toEqual([]);
    expect(snapshot.deletedNotebooks?.[0]).toMatchObject({
      content: "unsaved local-only body that should remain recoverable",
      deleted_at: expect.any(String),
      id: notebook.id,
    });
  });

  it("exports unsaved datapad drafts without marking them synced", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-notebook-draft",
      name: "Notebook Draft",
      timestamp: "2026-05-28T02:45:00.000Z",
    });
    const notebook = createNotebookRecord("notebook-draft-local", {
      content: "saved body",
      title: "Saved title",
      workspace_id: workspace.id,
    });

    useNexusStore.setState({
      activeWorkspaceId: workspace.id,
      deletedNotebooksCache: [],
      notebookDrafts: {},
      notebooksCache: [notebook],
      selectedAgentId: workspace.selectedAgentId,
      workspaces: [workspace],
    });

    useNexusStore.getState().saveNotebookDraft(
      notebook.id,
      "Unsaved title",
      "unsaved body for export recovery",
    );
    const snapshot = useNexusStore.getState().exportActiveWorkspace();

    expect(snapshot.notebooks?.[0]).toMatchObject({
      content: "saved body",
      title: "Saved title",
    });
    expect(snapshot.notebookDrafts?.[0]).toMatchObject({
      baseUpdatedAt: notebook.updated_at,
      content: "unsaved body for export recovery",
      notebookId: notebook.id,
      title: "Unsaved title",
      workspaceId: workspace.id,
    });

    useNexusStore.getState().updateNotebook(
      notebook.id,
      "Saved after draft",
      "durable body after draft",
    );

    expect(useNexusStore.getState().notebookDrafts[notebook.id]).toBeUndefined();
  });

  it("keeps global datapads account-scoped instead of active-workspace scoped", () => {
    const workspace = createDefaultWorkspace({
      id: "workspace-global-datapad",
      name: "Global Datapad",
      timestamp: "2026-05-28T03:15:00.000Z",
    });

    useNexusStore.setState({
      activeWorkspaceId: workspace.id,
      deletedNotebooksCache: [],
      notebookDrafts: {},
      notebooksCache: [],
      selectedAgentId: workspace.selectedAgentId,
      workspaces: [workspace],
    });

    const notebookId = useNexusStore.getState().createNotebook();
    let state = useNexusStore.getState();

    expect(state.notebooksCache[0]).toMatchObject({
      id: notebookId,
      workspace_id: null,
    });

    state.saveNotebookDraft(
      notebookId,
      "Global draft title",
      "global draft body",
    );
    expect(useNexusStore.getState().notebookDrafts[notebookId]).toMatchObject({
      notebookId,
      workspaceId: null,
    });

    useNexusStore.getState().updateNotebook(
      notebookId,
      "Global saved title",
      "global saved body",
    );
    state = useNexusStore.getState();

    expect(state.notebooksCache[0]).toMatchObject({
      content: "global saved body",
      title: "Global saved title",
      workspace_id: null,
    });

    state.deleteNotebook(notebookId);
    state = useNexusStore.getState();

    expect(state.notebooksCache).toEqual([]);
    expect(state.deletedNotebooksCache[0]).toMatchObject({
      content: "global saved body",
      title: "Global saved title",
      workspace_id: null,
    });
    expect(state.exportActiveWorkspace().deletedNotebooks?.[0]).toMatchObject({
      id: notebookId,
      workspace_id: null,
    });
  });
});

describe("prompt cache hydration", () => {
  it("keeps local prompts when a remote fetch omits them", () => {
    const local = createPromptRecord("prompt-local", {
      content: "local prompt body",
      updated_at: "2026-05-28T03:10:00.000Z",
    });
    const remote = createPromptRecord("prompt-remote", {
      content: "remote prompt body",
      updated_at: "2026-05-28T03:00:00.000Z",
    });

    useNexusStore.setState({
      promptsCache: [local],
    });

    useNexusStore.getState().setPromptsCache([remote]);

    expect(useNexusStore.getState().promptsCache.map((prompt) => prompt.id)).toEqual([
      local.id,
      remote.id,
    ]);
  });

  it("keeps the newer local prompt over an older remote copy", () => {
    const local = createPromptRecord("prompt-newer-local", {
      content: "newer local prompt",
      updated_at: "2026-05-28T03:20:00.000Z",
    });
    const olderRemote = createPromptRecord(local.id, {
      content: "older remote prompt",
      updated_at: "2026-05-28T03:00:00.000Z",
    });

    useNexusStore.setState({
      promptsCache: [local],
    });

    useNexusStore.getState().setPromptsCache([olderRemote]);

    expect(useNexusStore.getState().promptsCache).toEqual([local]);
  });
});

describe("workspace login recovery", () => {
  it("rebinds the active local workspace to the writable cloud session id", () => {
    const localWorkspace = createDefaultWorkspace({
      id: "workspace-shared-local",
      name: "Shared Local",
      timestamp: "2026-05-28T04:00:00.000Z",
    });
    localWorkspace.agents[0]?.messages.push({
      content: "Keep this active message",
      createdAt: "2026-05-28T04:01:00.000Z",
      id: "message-local",
      role: "user",
    });

    useNexusStore.setState({
      activeWorkspaceId: localWorkspace.id,
      notebookDrafts: {
        "notebook-1": {
          content: "draft",
          notebookId: "notebook-1",
          title: "Draft",
          updatedAt: "2026-05-28T04:01:00.000Z",
          workspaceId: localWorkspace.id,
        },
      },
      notebooksCache: [
        {
          content: "body",
          id: "notebook-1",
          title: "Notebook",
          workspace_id: localWorkspace.id,
        },
      ],
      selectedAgentId: localWorkspace.selectedAgentId,
      workspaces: [localWorkspace],
    });

    useNexusStore.getState().bindActiveWorkspaceToCloudSession({
      workspaceId: "workspace-owned-cloud",
      workspaceName: "Owned Cloud",
    });
    const state = useNexusStore.getState();
    const reboundWorkspace = state.workspaces[0];

    expect(state.activeWorkspaceId).toBe("workspace-owned-cloud");
    expect(reboundWorkspace?.id).toBe("workspace-owned-cloud");
    expect(reboundWorkspace?.name).toBe("Owned Cloud");
    expect(reboundWorkspace?.agents[0]?.messages).toEqual(
      localWorkspace.agents[0]?.messages,
    );
    expect(state.notebooksCache[0]?.workspace_id).toBe("workspace-owned-cloud");
    expect(state.notebookDrafts["notebook-1"]?.workspaceId).toBe(
      "workspace-owned-cloud",
    );
  });

  it("applies a missing cloud workspace recovery snapshot without full message content", () => {
    const localWorkspace = createDefaultWorkspace({
      id: "workspace-local",
      name: "Local Workspace",
      timestamp: "2026-05-28T04:00:00.000Z",
    });
    const cloudWorkspace = createDefaultWorkspace({
      id: "workspace-cloud",
      name: "Cloud Workspace",
      timestamp: "2026-05-28T03:00:00.000Z",
    });
    cloudWorkspace.agents[0]?.messages.push({
      content: "Cloud message content is not in active cloud snapshots.",
      createdAt: "2026-05-28T03:01:00.000Z",
      id: "message-cloud",
      role: "user",
    });
    const recovery = createWorkspaceRecoveryResponse(cloudWorkspace, {
      action: "hydrate",
      checksum: "sha256:cloud",
      reason: "local_missing",
      workspaceId: cloudWorkspace.id,
    });

    useNexusStore.setState({
      activeWorkspaceId: localWorkspace.id,
      selectedAgentId: localWorkspace.selectedAgentId,
      workspaces: [localWorkspace],
    });

    const result = useNexusStore.getState().applyWorkspaceRecoveryState(recovery);
    const state = useNexusStore.getState();

    expect(result).toMatchObject({
      status: "applied",
      workspaceId: cloudWorkspace.id,
    });
    expect(state.activeWorkspaceId).toBe(cloudWorkspace.id);
    expect(state.workspaces.some((workspace) => workspace.id === localWorkspace.id)).toBe(true);
    expect(
      state.workspaces.find((workspace) => workspace.id === cloudWorkspace.id)?.agents[0]
        ?.messages,
    ).toEqual([]);
  });

  it("does not overwrite a newer local workspace during recovery", () => {
    const localWorkspace = createDefaultWorkspace({
      id: "workspace-newer-local",
      name: "Newer Local",
      timestamp: "2026-05-29T00:00:00.000Z",
    });
    const cloudWorkspace = createDefaultWorkspace({
      id: localWorkspace.id,
      name: "Older Cloud",
      timestamp: "2026-05-28T00:00:00.000Z",
    });
    const recovery = createWorkspaceRecoveryResponse(cloudWorkspace, {
      action: "hydrate",
      checksum: "sha256:older-cloud",
      reason: "recover",
      workspaceId: cloudWorkspace.id,
    });

    useNexusStore.setState({
      activeWorkspaceId: localWorkspace.id,
      selectedAgentId: localWorkspace.selectedAgentId,
      workspaces: [localWorkspace],
    });

    const result = useNexusStore.getState().applyWorkspaceRecoveryState(recovery);
    const state = useNexusStore.getState();

    expect(result).toEqual({
      checksum: "sha256:older-cloud",
      reason: "local_newer",
      status: "conflicted",
      workspaceId: localWorkspace.id,
    });
    expect(state.workspaces[0]?.name).toBe("Newer Local");
  });
});

function createMessages(count: number): AgentMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    content: `message-${index}`,
    createdAt: `2026-05-28T00:${String(index).padStart(2, "0")}:00.000Z`,
    id: `message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
  }));
}

function createMemoryBlocks(count: number): AgentMemoryBlock[] {
  return Array.from({ length: count }, (_, index) => ({
    content: `memory-${index}`,
    id: `memory-${index}`,
    intensity: index + 1,
    label: `Memory ${index}`,
    updatedAt: `2026-05-28T00:${String(index).padStart(2, "0")}:00.000Z`,
  }));
}

function replaceFirstAgent(
  workspace: NexusWorkspace,
  patch: Pick<NexusWorkspace["agents"][number], "memory" | "messages">,
): NexusWorkspace {
  return {
    ...workspace,
    agents: workspace.agents.map((agent, index) =>
      index === 0
        ? {
            ...agent,
            ...patch,
          }
        : agent,
    ),
  };
}

function createNotebookRecord(
  id: string,
  patch: Partial<NotebookRecord> = {},
): NotebookRecord {
  return {
    content: "",
    created_at: "2026-05-28T02:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    id,
    title: "Test Datapad",
    updated_at: "2026-05-28T02:00:00.000Z",
    workspace_id: "workspace-v16-test",
    ...patch,
  };
}

function createPromptRecord(
  id: string,
  patch: Partial<PromptRecord> = {},
): PromptRecord {
  return {
    content: "",
    created_at: "2026-05-28T03:00:00.000Z",
    deleted_at: null,
    deleted_by: null,
    id,
    title: "Test Prompt",
    updated_at: "2026-05-28T03:00:00.000Z",
    workspace_id: "workspace-v16-test",
    ...patch,
  };
}

function createWorkspaceRecoveryResponse(
  workspace: NexusWorkspace,
  plan: WorkspaceRecoveryStateResponse["plan"],
): WorkspaceRecoveryStateResponse {
  return {
    latest: {
      checksum: plan?.checksum ?? "sha256:cloud",
      payloadSizeBytes: 1,
      schemaVersion: 1,
      snapshot: serializeActiveUiStateSnapshot(workspace),
      snapshotType: "active",
      updatedAt: workspace.updatedAt,
      workspaceId: workspace.id,
    },
    plan,
    userId: "recover-owner",
  };
}

function createTransactionHistory(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    action: `action-${index}`,
    agentId: "agent-nexus-1",
    detail: `detail-${index}`,
    id: `transaction-${index}`,
    timestamp: `2026-05-28T01:${String(index).padStart(2, "0")}:00.000Z`,
  }));
}
