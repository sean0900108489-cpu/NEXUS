import type {
  AgentCapabilityType,
  AgentCapabilities,
  MediaAgentCapabilityType,
  AgentLayout,
  AgentTemplate,
  AgentTemplateProfile,
  AgentTemplateProfileUpdate,
  NexusAgent,
  NexusWorkspace,
  WorkspaceBranchingSettings,
  WorkspaceGraphNode,
} from "@/lib/nexus-types";
import {
  DEFAULT_CHAT_MODEL_IDS,
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";

export const WORKSPACE_SCHEMA_VERSION = 1;
export const ACTIVE_WORKSPACE_ID = "workspace-nexus-ops";
export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_CHAT_SUPPORTED_MODELS = [...DEFAULT_CHAT_MODEL_IDS];
export const DEFAULT_WORKSPACE_BRANCHING_SETTINGS: WorkspaceBranchingSettings = {
  defaultRetentionRatio: 30,
};

export const DEFAULT_CAPABILITIES: Record<AgentCapabilityType, AgentCapabilities> = {
  chat: {
    type: "chat",
    supportedModels: DEFAULT_CHAT_SUPPORTED_MODELS,
  },
  image: {
    type: "image",
    supportedModels: ["dall-e-3", "gpt-image-1", "imagen-4"],
  },
  video: {
    type: "video",
    supportedModels: ["sora", "runway-gen-3", "veo-3"],
  },
  sandbox: {
    type: "sandbox",
    supportedModels: ["html-css-js"],
  },
  audio: {
    type: "audio",
    supportedModels: [],
  },
  search: {
    type: "search",
    supportedModels: [],
  },
  "data-analysis": {
    type: "data-analysis",
    supportedModels: [],
  },
};

const INITIAL_TIMESTAMP = "2026-05-25T00:00:00.000Z";

export const DEFAULT_SANDBOX_CODE = `<!doctype html>
<html>
  <head>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #111111;
        color: #e5e5e5;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }

      .panel {
        border: 1px solid rgba(103, 232, 249, 0.45);
        padding: 28px;
        background: rgba(8, 47, 73, 0.28);
        box-shadow: 0 0 48px rgba(34, 211, 238, 0.18);
      }
    </style>
  </head>
  <body>
    <section class="panel">
      <h1>NEXUS UI Sandbox</h1>
      <p>Edit the code pane to render live interface experiments.</p>
    </section>
  </body>
</html>`;

export function getDefaultCapabilities(type: AgentCapabilityType) {
  return {
    type,
    supportedModels: [...DEFAULT_CAPABILITIES[type].supportedModels],
  };
}

export const agentTemplates: AgentTemplate[] = [
  {
    id: "nexus-1",
    callsign: "Nexus_1",
    title: "Custom Agent",
    identity: "",
    avatar: "N1",
    accent: "#d4d4d4",
    mission: "",
    executionPrompt: "",
    profileLocked: false,
    provider: "deepseek",
    model: "deepseek-v4-pro",
    modelSettings: normalizeAgentModelSettings("deepseek-v4-pro"),
    capabilities: getDefaultCapabilities("chat"),
    memory: [],
    contextNotes: [],
    tools: [],
  },
  {
    id: "nuxus-2",
    callsign: "Nuxus_2",
    title: "Custom Agent",
    identity: "",
    avatar: "N2",
    accent: "#c4c4c4",
    mission: "",
    executionPrompt: "",
    profileLocked: false,
    provider: "deepseek",
    model: "deepseek-v4-pro",
    modelSettings: normalizeAgentModelSettings("deepseek-v4-pro"),
    capabilities: getDefaultCapabilities("chat"),
    memory: [],
    contextNotes: [],
    tools: [],
  },
  {
    id: "nuxus-3",
    callsign: "Nuxus_3",
    title: "Custom Agent",
    identity: "",
    avatar: "N3",
    accent: "#d0d0d0",
    mission: "",
    executionPrompt: "",
    profileLocked: false,
    provider: "deepseek",
    model: "deepseek-v4-pro",
    modelSettings: normalizeAgentModelSettings("deepseek-v4-pro"),
    capabilities: getDefaultCapabilities("chat"),
    memory: [],
    contextNotes: [],
    tools: [],
  },
  {
    id: "nexus-4",
    callsign: "Nexus_4",
    title: "Custom Agent",
    identity: "",
    avatar: "N4",
    accent: "#c8c8c8",
    mission: "",
    executionPrompt: "",
    profileLocked: false,
    provider: "deepseek",
    model: "deepseek-v4-pro",
    modelSettings: normalizeAgentModelSettings("deepseek-v4-pro"),
    capabilities: getDefaultCapabilities("chat"),
    memory: [],
    contextNotes: [],
    tools: [],
  },
];

export function resolveAgentTemplateProfile(
  template: AgentTemplate,
  profile?: Partial<AgentTemplateProfile> | null,
): AgentTemplateProfile {
  return {
    callsign: profile?.callsign?.trim() || template.callsign,
    title: profile?.title?.trim() || template.title,
    identity:
      typeof profile?.identity === "string" ? profile.identity : template.identity,
    mission:
      typeof profile?.mission === "string" ? profile.mission : template.mission,
    executionPrompt:
      typeof profile?.executionPrompt === "string"
        ? profile.executionPrompt
        : template.executionPrompt ?? "",
    profileLocked:
      typeof profile?.profileLocked === "boolean"
        ? profile.profileLocked
        : template.profileLocked ?? false,
  };
}

export function applyAgentTemplateProfile(
  template: AgentTemplate,
  profile?: AgentTemplateProfileUpdate | null,
): AgentTemplate {
  const resolved = resolveAgentTemplateProfile(template, profile);

  return {
    ...template,
    callsign: resolved.callsign,
    title: resolved.title,
    identity: resolved.identity,
    mission: resolved.mission,
    executionPrompt: resolved.executionPrompt,
    profileLocked: resolved.profileLocked,
  };
}

export const defaultLayouts: AgentLayout[] = [
  { x: 24, y: 64, width: 500, height: 560, zIndex: 3 },
  { x: 92, y: 124, width: 500, height: 540, zIndex: 4 },
  { x: 160, y: 190, width: 500, height: 420, zIndex: 2 },
  { x: 228, y: 250, width: 500, height: 420, zIndex: 1 },
];

export function getDefaultGraphPosition(index: number) {
  return {
    x: 60 + (index % 2) * 760,
    y: 100 + Math.floor(index / 2) * 360,
  };
}

export const defaultGraphNodes: WorkspaceGraphNode[] = [
  { agentId: "agent-nexus-1", ...getDefaultGraphPosition(0) },
  { agentId: "agent-nuxus-2", ...getDefaultGraphPosition(1) },
  { agentId: "agent-nuxus-3", ...getDefaultGraphPosition(2) },
  { agentId: "agent-nexus-4", ...getDefaultGraphPosition(3) },
];

export function makeId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}-${value}`;
}

export function cloneWorkspace(workspace: NexusWorkspace) {
  return JSON.parse(JSON.stringify(workspace)) as NexusWorkspace;
}

export function createAgentFromTemplate(
  template: AgentTemplate,
  id: string,
  layout: AgentLayout,
  timestamp = new Date().toISOString(),
): NexusAgent {
  const agent: NexusAgent = {
    id,
    callsign: template.callsign,
    title: template.title,
    identity: template.identity,
    mission: template.mission,
    executionPrompt: template.executionPrompt ?? "",
    profileLocked: template.profileLocked ?? false,
    provider: template.provider,
    model: template.model,
    modelSettings: normalizeAgentModelSettings(template.model, template.modelSettings),
    capabilities: template.capabilities
      ? {
          type: template.capabilities.type,
          supportedModels: [...template.capabilities.supportedModels],
        }
      : getDefaultCapabilities("chat"),
    status: "idle",
    accent: template.accent,
    avatar: template.avatar,
    memory: template.memory.map((block, index) => ({
      ...block,
      id: `${id}-memory-${index}`,
      updatedAt: timestamp,
    })),
    contextNotes: template.contextNotes.map((item, index) => ({
      ...item,
      id: `${id}-context-${index}`,
    })),
    tools: template.tools.map((tool, index) => ({
      ...tool,
      id: `${id}-tool-${index}`,
    })),
    messages: [
      {
        id: `${id}-boot`,
        role: "assistant",
        createdAt: timestamp,
        content: template.mission
          ? `${template.callsign} online. Mission loaded: ${template.mission}`
          : `${template.callsign} online. Profile ready for operator configuration.`,
      },
    ],
    layout,
    minimized: false,
    maximized: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    telemetry: {
      tokens: 0,
      latency: 0.42,
      confidence: 91,
      tasks: 0,
      toolRuns: 0,
      errors: 0,
    },
  };

  return agent;
}

export function createMediaAgent(
  type: MediaAgentCapabilityType,
  id: string,
  layout: AgentLayout,
  index: number,
  timestamp = new Date().toISOString(),
): NexusAgent {
  const image = type === "image";
  const callsign = `${image ? "IMAGE" : "VIDEO"}-${index}`;
  const model = image ? "dall-e-3" : "sora";
  const accent = image ? "#a78bfa" : "#c7c7c7";
  const provider = image ? "openai-image" : "openai-video";
  const title = image ? "Image Generator" : "Video Generator";
  const mission = image
    ? "Generate visual concepts, mock assets, and image-ready prompts from operator intent."
    : "Generate storyboard motion previews, scene concepts, and video-ready prompts from operator intent.";

  return {
    id,
    callsign,
    title,
    identity: image ? "Prism" : "Kinetix",
    mission,
    executionPrompt: "",
    profileLocked: false,
    provider,
    model,
    modelSettings: normalizeAgentModelSettings(model),
    capabilities: getDefaultCapabilities(type),
    status: "idle",
    accent,
    avatar: image ? "IM" : "VD",
    memory: [
      {
        id: `${id}-memory-0`,
        label: image ? "Visual style" : "Motion language",
        content: image
          ? "Prefer inspectable composition, clear subjects, and production-ready prompt detail."
          : "Prefer concise shot language, visible motion beats, and reusable storyboard structure.",
        intensity: 78,
        updatedAt: timestamp,
      },
      {
        id: `${id}-memory-1`,
        label: "Generation safety",
        content: "Keep generated media clearly marked as mock output until a live provider is configured.",
        intensity: 86,
        updatedAt: timestamp,
      },
    ],
    contextNotes: [
      {
        id: `${id}-context-0`,
        title: "Capability",
        value: image ? "Image generation canvas." : "Video generation preview.",
        source: "mission",
      },
      {
        id: `${id}-context-1`,
        title: "Executor",
        value: image
          ? "Image adapter uses DALL-E when this agent has an API key, otherwise mock output."
          : "Mock media generator writes artifacts back into this agent transcript.",
        source: "tool",
      },
    ],
    tools: [
      {
        id: `${id}-tool-0`,
        name: image ? "Image Adapter" : "Mock Video Gen",
        scope: image ? "Image" : "Video",
        status: "available",
        executorId: image ? "real-image-gen" : "mock-video-gen",
      },
    ],
    messages: [
      {
        id: `${id}-boot`,
        role: "assistant",
        createdAt: timestamp,
        content: `${callsign} online. ${title} capability loaded: ${mission}`,
      },
    ],
    layout,
    minimized: false,
    maximized: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    telemetry: {
      tokens: 0,
      latency: 0.42,
      confidence: 91,
      tasks: 0,
      toolRuns: 0,
      errors: 0,
    },
  };
}

export function createSandboxAgent(
  id: string,
  layout: AgentLayout,
  index: number,
  timestamp = new Date().toISOString(),
): NexusAgent {
  const callsign = `SANDBOX-${index}`;

  return {
    id,
    callsign,
    title: "Live UI Sandbox",
    identity: "Canvas",
    mission: "Prototype raw HTML, CSS, and JavaScript in a live isolated preview.",
    executionPrompt: "",
    profileLocked: false,
    provider: "local-sandbox",
    model: "html-css-js",
    modelSettings: normalizeAgentModelSettings("html-css-js"),
    capabilities: getDefaultCapabilities("sandbox"),
    sandboxCode: DEFAULT_SANDBOX_CODE,
    sandboxUrl: "",
    status: "idle",
    accent: "#2dd4bf",
    avatar: "UI",
    memory: [
      {
        id: `${id}-memory-0`,
        label: "Preview contract",
        content: "Keep interface experiments self-contained inside srcDoc.",
        intensity: 80,
        updatedAt: timestamp,
      },
      {
        id: `${id}-memory-1`,
        label: "Interaction mode",
        content: "Raw HTML, CSS, and JavaScript persist locally with the agent.",
        intensity: 84,
        updatedAt: timestamp,
      },
    ],
    contextNotes: [
      {
        id: `${id}-context-0`,
        title: "Capability",
        value: "Live UI sandbox preview.",
        source: "mission",
      },
      {
        id: `${id}-context-1`,
        title: "Execution boundary",
        value: "No autonomous routing; iframe preview only.",
        source: "tool",
      },
    ],
    tools: [
      {
        id: `${id}-tool-0`,
        name: "Preview Runtime",
        scope: "UI Sandbox",
        status: "planned",
      },
    ],
    messages: [
      {
        id: `${id}-boot`,
        role: "assistant",
        createdAt: timestamp,
        content: `${callsign} online. Live UI sandbox capability loaded: edit code to render a local preview.`,
      },
    ],
    layout,
    minimized: false,
    maximized: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    telemetry: {
      tokens: 0,
      latency: 0.18,
      confidence: 92,
      tasks: 0,
      toolRuns: 0,
      errors: 0,
    },
  };
}

export type CreateDefaultWorkspaceOptions = {
  id?: string;
  name?: string;
  timestamp?: string;
};

export function createDefaultWorkspace(
  timestampOrOptions: string | CreateDefaultWorkspaceOptions = INITIAL_TIMESTAMP,
): NexusWorkspace {
  const options =
    typeof timestampOrOptions === "string"
      ? { timestamp: timestampOrOptions }
      : timestampOrOptions;
  const timestamp = options.timestamp ?? INITIAL_TIMESTAMP;
  const workspaceId = options.id ?? ACTIVE_WORKSPACE_ID;
  const workspaceName = options.name ?? "NEXUS // AI OPS";
  const agents = agentTemplates.map((template, index) =>
    createAgentFromTemplate(
      template,
      `agent-${template.id}`,
      defaultLayouts[index],
      timestamp,
    ),
  );

  return {
    id: workspaceId,
    name: workspaceName,
    agents,
    panels: agents.map((agent) => ({
      id: `panel-${agent.id}`,
      type: "agent",
      agentId: agent.id,
      layout: agent.layout,
      minimized: agent.minimized,
      maximized: agent.maximized,
    })),
    graph: {
      nodes: defaultGraphNodes,
      edges: [],
    },
    activeAgentId: "agent-nexus-1",
    selectedAgentId: "agent-nexus-1",
    settings: {
      provider: "deepseek",
      model: "deepseek-v4-pro",
      streamMode: "mock",
      viewMode: "panels",
      autosave: true,
      branchingSettings: { ...DEFAULT_WORKSPACE_BRANCHING_SETTINGS },
      agentTemplateProfiles: {},
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
