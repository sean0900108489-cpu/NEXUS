import { describe, expect, it } from "vitest";

import {
  createDefaultWorkspace,
  createMediaAgent,
} from "@/lib/nexus-defaults";
import { MockImageAdapter } from "@/lib/adapters/image-adapter";
import { toolExecutors } from "@/lib/tool-executors";
import {
  createNotebookRecoveryMetadata,
  createWorkspaceSnapshot,
  parseWorkspaceSnapshot,
  sanitizeWorkspace,
  validateWorkspaceSnapshot,
} from "@/lib/workspace-kernel";
import type { LocalSyncQueueOperation } from "@/lib/nexus-types";

describe("workspace kernel", () => {
  it("creates the default workspace with four required agents", () => {
    const workspace = createDefaultWorkspace("2026-05-25T00:00:00.000Z");

    expect(workspace.agents).toHaveLength(4);
    expect(workspace.agents.map((agent) => agent.callsign)).toEqual([
      "Nexus_1",
      "Nuxus_2",
      "Nuxus_3",
      "Nexus_4",
    ]);
  });

  it("creates independent message and context arrays per agent", () => {
    const workspace = createDefaultWorkspace();
    const architect = workspace.agents[0];
    const operator = workspace.agents[1];

    expect(architect).toBeDefined();
    expect(operator).toBeDefined();
    expect(architect?.messages).not.toBe(operator?.messages);
    expect(architect?.contextNotes).not.toBe(operator?.contextNotes);

    architect?.messages.push({
      id: "test-message",
      role: "user",
      content: "architect only",
      createdAt: "2026-05-25T00:00:00.000Z",
    });

    expect(operator?.messages.some((message) => message.content === "architect only")).toBe(
      false,
    );
  });

  it("exports and validates schema-versioned workspace JSON", () => {
    const workspace = createDefaultWorkspace();
    const snapshot = createWorkspaceSnapshot(workspace);
    const result = validateWorkspaceSnapshot(snapshot);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.workspace.id).toBe(workspace.id);
    expect(result.ok).toBe(true);
  });

  it("adds pending notebook recovery metadata without raw sync payload content", () => {
    const workspace = createDefaultWorkspace();
    const operation = createLocalNotebookOperation({
      clientMutationId: "mutation-notebook-pending",
      entityId: "notebook-pending",
      payload: {
        content: "raw pending content must stay out of metadata",
        title: "Raw pending title",
      },
      payloadHash: "hash-pending",
      status: "queued",
    });
    const syncedOperation = createLocalNotebookOperation({
      clientMutationId: "mutation-notebook-synced",
      entityId: "notebook-synced",
      payloadHash: "hash-synced",
      status: "synced",
    });
    const notebookRecovery = createNotebookRecoveryMetadata(
      [operation, syncedOperation],
      "2026-05-28T03:00:00.000Z",
    );
    const snapshot = createWorkspaceSnapshot(workspace, { notebookRecovery });

    expect(snapshot.notebookRecovery).toEqual({
      generatedAt: "2026-05-28T03:00:00.000Z",
      operationCount: 1,
      operations: [
        {
          clientMutationId: "mutation-notebook-pending",
          notebookId: "notebook-pending",
          operationType: "upsert",
          payloadHash: "hash-pending",
          queuedAt: "2026-05-28T02:00:00.000Z",
          status: "queued",
          updatedAt: "2026-05-28T02:01:00.000Z",
          workspaceId: "workspace-recovery",
        },
      ],
      schemaVersion: 1,
      source: "local_sync_queue",
    });
    expect(JSON.stringify(snapshot.notebookRecovery)).not.toContain("raw pending content");
    expect(JSON.stringify(snapshot.notebookRecovery)).not.toContain("Raw pending title");
  });

  it("creates graph nodes for every default agent", () => {
    const workspace = createDefaultWorkspace();

    expect(workspace.graph.edges).toEqual([]);
    expect(workspace.graph.nodes.map((node) => node.agentId)).toEqual(
      workspace.agents.map((agent) => agent.id),
    );
  });

  it("keeps API credentials out of default agent records", () => {
    const workspace = createDefaultWorkspace();

    expect(workspace.agents.every((agent) => !("apiKey" in agent))).toBe(true);
    expect(workspace.agents.every((agent) => !("baseUrl" in agent))).toBe(true);
  });

  it("creates default agents with chat capabilities", () => {
    const workspace = createDefaultWorkspace();

    expect(workspace.agents.every((agent) => agent.capabilities.type === "chat")).toBe(
      true,
    );
    expect(
      workspace.agents.every((agent) =>
        agent.capabilities.supportedModels.includes(agent.model),
      ),
    ).toBe(true);
  });

  it("creates media agents with mock media executors", () => {
    const imageAgent = createMediaAgent(
      "image",
      "agent-image-test",
      { x: 0, y: 0, width: 520, height: 600, zIndex: 11 },
      5,
      "2026-05-25T00:00:00.000Z",
    );
    const videoAgent = createMediaAgent(
      "video",
      "agent-video-test",
      { x: 0, y: 0, width: 520, height: 600, zIndex: 12 },
      6,
      "2026-05-25T00:00:00.000Z",
    );

    expect(imageAgent.capabilities.type).toBe("image");
    expect(videoAgent.capabilities.type).toBe("video");
    expect(imageAgent.tools[0].executorId).toBe("real-image-gen");
    expect(videoAgent.tools[0].executorId).toBe("mock-video-gen");
  });

  it("strips legacy per-agent API settings through export validation", () => {
    const workspace = createDefaultWorkspace();
    const architect = workspace.agents[0] as typeof workspace.agents[number] & {
      apiKey?: string;
      baseUrl?: string;
    };
    const operator = workspace.agents[1] as typeof workspace.agents[number] & {
      apiKey?: string;
      baseUrl?: string;
    };

    architect.model = "gpt-4o";
    architect.apiKey = "sk-architect";
    architect.baseUrl = "https://gateway.example.test/v1";
    operator.model = "gpt-4o-mini";
    operator.apiKey = "sk-operator";
    operator.baseUrl = "https://api.openai.com/v1";

    const result = validateWorkspaceSnapshot(createWorkspaceSnapshot(workspace));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workspace.agents[0]).toMatchObject({
        model: "gpt-4o",
      });
      expect(result.workspace.agents[1]).toMatchObject({
        model: "gpt-4o-mini",
      });
      expect("apiKey" in result.workspace.agents[0]).toBe(false);
      expect("baseUrl" in result.workspace.agents[0]).toBe(false);
    }
  });

  it("omits obsolete global and workspace API settings from exported snapshots", () => {
    const workspace = createDefaultWorkspace() as ReturnType<
      typeof createDefaultWorkspace
    > & {
      globalSettings?: { apiKey: string; baseUrl: string };
      settings: ReturnType<typeof createDefaultWorkspace>["settings"] & {
        systemApiConfig?: { apiKey: string; baseUrl: string; model: string };
      };
    };

    workspace.globalSettings = {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
    };
    workspace.settings.systemApiConfig = {
      apiKey: "sk-old",
      baseUrl: "https://gateway.example.test/v1",
      model: "gpt-4o-mini",
    };

    const snapshot = createWorkspaceSnapshot(workspace);

    expect("globalSettings" in snapshot.workspace).toBe(false);
    expect("systemApiConfig" in snapshot.workspace.settings).toBe(false);
  });

  it("preserves valid graph nodes and edges through export validation", () => {
    const workspace = createDefaultWorkspace();

    workspace.graph.nodes[0] = {
      ...workspace.graph.nodes[0],
      x: 444,
      y: 222,
    };
    workspace.graph.edges.push({
      id: "edge-agent-nexus-test",
      sourceAgentId: workspace.agents[0].id,
      targetAgentId: workspace.agents[1].id,
    });

    const result = validateWorkspaceSnapshot(createWorkspaceSnapshot(workspace));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workspace.graph.nodes[0]).toMatchObject({ x: 444, y: 222 });
      expect(result.workspace.graph.edges).toHaveLength(1);
    }
  });

  it("rejects graph edges that reference missing agents", () => {
    const workspace = createDefaultWorkspace();

    workspace.graph.edges.push({
      id: "edge-missing",
      sourceAgentId: workspace.agents[0].id,
      targetAgentId: "agent-missing",
    });

    const result = validateWorkspaceSnapshot({
      schemaVersion: 1,
      exportedAt: "2026-05-25T00:00:00.000Z",
      workspace,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("unknown agent");
    }
  });

  it("normalizes legacy snapshots without graph metadata", () => {
    const workspace = createDefaultWorkspace();
    const legacyWorkspace = structuredClone(workspace) as Partial<typeof workspace>;

    delete legacyWorkspace.graph;
    legacyWorkspace.agents?.forEach((agent) => {
      delete (agent as Partial<typeof agent>).capabilities;
    });

    const result = validateWorkspaceSnapshot({
      schemaVersion: 1,
      exportedAt: "2026-05-25T00:00:00.000Z",
      workspace: legacyWorkspace,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workspace.graph.nodes).toHaveLength(4);
      expect(result.workspace.graph.edges).toEqual([]);
      expect(result.workspace.agents.every((agent) => !("apiKey" in agent))).toBe(true);
      expect(result.workspace.agents.every((agent) => !("baseUrl" in agent))).toBe(true);
      expect(result.workspace.agents.every((agent) => agent.capabilities.type === "chat")).toBe(
        true,
      );
    }
  });

  it("ignores invalid legacy per-agent API settings", () => {
    const workspace = createDefaultWorkspace();

    const result = validateWorkspaceSnapshot({
      schemaVersion: 1,
      exportedAt: "2026-05-25T00:00:00.000Z",
      workspace: {
        ...workspace,
        agents: [{ ...workspace.agents[0], apiKey: 123 }, ...workspace.agents.slice(1)],
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect("apiKey" in result.workspace.agents[0]).toBe(false);
    }
  });

  it("rejects invalid import JSON without yielding a workspace", () => {
    const result = parseWorkspaceSnapshot("{not-json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("invalid JSON");
    }
  });

  it("downgrades queued tools without executors and preserves executable tools", () => {
    const workspace = createDefaultWorkspace();

    const unsafeWorkspace = structuredClone(workspace);
    unsafeWorkspace.agents[0].tools.push({
      id: "tool-stuck",
      name: "No Executor",
      scope: "Test",
      status: "queued",
    });

    const sanitized = sanitizeWorkspace(unsafeWorkspace);
    const downgraded = sanitized.agents[0].tools.find((tool) => tool.id === "tool-stuck");

    expect(downgraded?.status).toBe("planned");
  });

  it("keeps panel layout aligned with agent layout", () => {
    const workspace = createDefaultWorkspace();
    const agent = workspace.agents[0];
    const panel = workspace.panels.find((candidate) => candidate.agentId === agent.id);

    expect(panel?.layout).toEqual(agent.layout);
    expect(panel?.minimized).toBe(agent.minimized);
    expect(panel?.maximized).toBe(agent.maximized);
  });

  it("mock media executors return media artifacts", async () => {
    const imageAgent = createMediaAgent(
      "image",
      "agent-image-test",
      { x: 0, y: 0, width: 520, height: 600, zIndex: 11 },
      5,
    );
    const tool = imageAgent.tools[0];
    const result = await toolExecutors["mock-image-gen"].run(imageAgent, tool, {
      prompt: "neon command center",
    });

    expect(result.media?.type).toBe("image");
    expect(result.media?.url).toContain("data:image/svg+xml");
    expect(result.content).toContain("neon command center");
  });

  it("image adapter dispatcher falls back to mock output without an API key", async () => {
    const imageAgent = createMediaAgent(
      "image",
      "agent-image-adapter-test",
      { x: 0, y: 0, width: 520, height: 600, zIndex: 11 },
      5,
    );
    const tool = imageAgent.tools[0];
    const result = await toolExecutors["real-image-gen"].run(imageAgent, tool, {
      prompt: "fallback neon viewport",
    });

    expect(result.media?.type).toBe("image");
    expect(result.media?.url).toContain("data:image/svg+xml");
    expect(result.content).toContain("fallback neon viewport");
  });

  it("mock image adapter implements the shared executor contract", async () => {
    const imageAgent = createMediaAgent(
      "image",
      "agent-image-contract-test",
      { x: 0, y: 0, width: 520, height: 600, zIndex: 11 },
      5,
    );
    const result = await new MockImageAdapter({
      agent: imageAgent,
      prompt: "contract test",
      toolName: "Mock Image Gen",
    }).execute();

    expect(result.mode).toBe("mock");
    expect(result.media.prompt).toBe("contract test");
  });
});

function createLocalNotebookOperation(
  patch: Partial<LocalSyncQueueOperation>,
): LocalSyncQueueOperation {
  return {
    attemptCount: 0,
    baseVersion: null,
    clientMutationId: "mutation-notebook",
    createdAt: "2026-05-28T02:00:00.000Z",
    entityId: "notebook-pending",
    entityType: "notebook",
    operationType: "upsert",
    payload: {},
    payloadHash: "hash",
    status: "queued",
    updatedAt: "2026-05-28T02:01:00.000Z",
    workspaceId: "workspace-recovery",
    ...patch,
  };
}
