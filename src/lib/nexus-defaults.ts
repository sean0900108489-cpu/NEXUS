import type {
  AgentCapabilityType,
  AgentCapabilities,
  MediaAgentCapabilityType,
  AgentLayout,
  AgentTemplate,
  NexusAgent,
  NexusWorkspace,
  WorkspaceGraphNode,
} from "@/lib/nexus-types";
import { DEFAULT_CHAT_MODEL_IDS } from "@/lib/nexus-registry";

export const WORKSPACE_SCHEMA_VERSION = 1;
export const ACTIVE_WORKSPACE_ID = "workspace-nexus-ops";
export const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_CHAT_SUPPORTED_MODELS = [...DEFAULT_CHAT_MODEL_IDS];

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
        background: #020617;
        color: #67e8f9;
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
    id: "architect",
    callsign: "ARCHITECT",
    title: "System Architect",
    identity: "Orion",
    avatar: "OR",
    accent: "#22d3ee",
    mission:
      "Map product intent into execution plans, technical architecture, and platform-grade interfaces.",
    provider: "openai",
    model: "gpt-5.5-pro-2026-04-23",
    capabilities: getDefaultCapabilities("chat"),
    memory: [
      {
        label: "Architecture bias",
        content: "Favor modular boundaries, durable state, and clear upgrade paths.",
        intensity: 86,
      },
      {
        label: "Workspace doctrine",
        content: "Every agent owns context, memory, mission, model, and tool surface.",
        intensity: 74,
      },
    ],
    contextNotes: [
      {
        title: "North star",
        value: "Command center over chatbot.",
        source: "mission",
      },
      {
        title: "Platform vector",
        value: "Prepare for workflows, collaboration, node graphs, and tools.",
        source: "workspace",
      },
    ],
    tools: [
      {
        name: "Spec Synth",
        scope: "Planning",
        status: "planned",
      },
      {
        name: "Schema Forge",
        scope: "Systems",
        status: "planned",
      },
      {
        name: "Project Scanner",
        scope: "Local FS",
        status: "available",
        executorId: "real-file-scanner",
      },
      {
        name: "Review Mesh",
        scope: "Quality",
        status: "available",
        executorId: "mock.review-mesh",
      },
    ],
  },
  {
    id: "operator",
    callsign: "OPERATOR",
    title: "Code Operator",
    identity: "Vega",
    avatar: "VG",
    accent: "#f472b6",
    mission:
      "Turn complex AI workflows into fast, legible, high-control operator experiences.",
    provider: "openai",
    model: "gpt-5.5-2026-04-23",
    capabilities: getDefaultCapabilities("chat"),
    memory: [
      {
        label: "Interface taste",
        content: "Dense, scannable, tactile, and alive without becoming decorative.",
        intensity: 82,
      },
      {
        label: "Interaction model",
        content: "Workstations can move, resize, collapse, and command their own streams.",
        intensity: 78,
      },
    ],
    contextNotes: [
      {
        title: "Surface",
        value: "Multi-window operational IDE.",
        source: "workspace",
      },
      {
        title: "Control layer",
        value: "Command palette, export/import, local persistence.",
        source: "tool",
      },
    ],
    tools: [
      { name: "Flow Lens", scope: "UX", status: "planned" },
      { name: "Layout Radar", scope: "Interface", status: "planned" },
      { name: "Motion Rail", scope: "Transitions", status: "planned" },
    ],
  },
  {
    id: "sentinel",
    callsign: "SENTINEL",
    title: "Debug Sentinel",
    identity: "Cypher",
    avatar: "CY",
    accent: "#f59e0b",
    mission:
      "Watch the operating field for brittle states, missing constraints, and unsafe deployment assumptions.",
    provider: "openai",
    model: "gpt-5.5-2026-04-23",
    capabilities: getDefaultCapabilities("chat"),
    memory: [
      {
        label: "Guardrail stack",
        content: "Keep secrets server-side, recover from missing API keys, and fail with signal.",
        intensity: 91,
      },
      {
        label: "Ops habit",
        content: "Prefer observable state, importable snapshots, and clean fallback paths.",
        intensity: 76,
      },
    ],
    contextNotes: [
      {
        title: "Runtime",
        value: "Mock stream by design when the server has no OPENAI_API_KEY.",
        source: "tool",
      },
      {
        title: "Continuity",
        value: "Workspace materializes into persisted local state on first load.",
        source: "memory",
      },
    ],
    tools: [
      { name: "Key Vault", scope: "Secrets", status: "planned" },
      { name: "Stream Probe", scope: "Networking", status: "planned" },
      { name: "Export Gate", scope: "Persistence", status: "planned" },
    ],
  },
  {
    id: "archivist",
    callsign: "ARCHIVIST",
    title: "Knowledge Archivist",
    identity: "Sable",
    avatar: "AR",
    accent: "#34d399",
    mission:
      "Summarize decisions, maintain documentation, compress context into reusable memory.",
    provider: "openai",
    model: "gpt-5.5-2026-04-23",
    capabilities: getDefaultCapabilities("chat"),
    memory: [
      {
        label: "Decision ledger",
        content: "Capture the why, not just the outcome.",
        intensity: 84,
      },
      {
        label: "Compression habit",
        content: "Turn long transcripts into reusable memory and documentation notes.",
        intensity: 88,
      },
    ],
    contextNotes: [
      {
        title: "Role",
        value: "Documentation and memory synthesis.",
        source: "mission",
      },
      {
        title: "L1 boundary",
        value: "Keep records reliable before adding full collaboration workflows.",
        source: "workspace",
      },
    ],
    tools: [
      { name: "Decision Digest", scope: "Docs", status: "planned" },
      { name: "Memory Compressor", scope: "Memory", status: "planned" },
      {
        name: "Web Surfer",
        scope: "Web Context",
        status: "available",
        executorId: "web-surfer",
      },
      { name: "Context Index", scope: "Knowledge", status: "planned" },
    ],
  },
];

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
  { agentId: "agent-architect", ...getDefaultGraphPosition(0) },
  { agentId: "agent-operator", ...getDefaultGraphPosition(1) },
  { agentId: "agent-sentinel", ...getDefaultGraphPosition(3) },
  { agentId: "agent-archivist", ...getDefaultGraphPosition(2) },
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
    provider: template.provider,
    model: template.model,
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
        content: `${template.callsign} online. Mission loaded: ${template.mission}`,
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
  const accent = image ? "#a78bfa" : "#fb7185";
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
    provider,
    model,
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
    provider: "local-sandbox",
    model: "html-css-js",
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
    activeAgentId: "agent-operator",
    selectedAgentId: "agent-operator",
    settings: {
      provider: "openai",
      model: "gpt-4o-mini",
      streamMode: "mock",
      viewMode: "panels",
      autosave: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
