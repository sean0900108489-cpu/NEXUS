import { describe, expect, it, vi } from "vitest";

import {
  ACTIVE_WINDOW_DEFAULT_LIMIT,
  ACTIVE_WINDOW_MAX_LIMIT,
  AGENT_MEMORY_CONTENT_MAX_BYTES,
} from "@/lib/backend/history/history-constants";
import { serializeActiveUiStateSnapshot } from "@/lib/backend/workspace/workspace-snapshot-serializer";
import { createDefaultWorkspace } from "@/lib/nexus-defaults";
import type {
  AgentMessage,
  AgentMemoryBlock,
  NexusWorkspace,
  NotebookRecord,
  WorkspaceRecoveryStateResponse,
  WorkspaceNotebookRecoveryMetadata,
} from "@/lib/nexus-types";

import { prepareWorkspacesForLocalPersistence, useNexusStore } from "./nexus-store";

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

  it("rehydrates v13 persisted workspaces into v14 metadata without losing active data", async () => {
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
      expect.objectContaining({ version: 14 }),
    );
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
});

describe("workspace login recovery", () => {
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
    id,
    title: "Test Datapad",
    updated_at: "2026-05-28T02:00:00.000Z",
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
