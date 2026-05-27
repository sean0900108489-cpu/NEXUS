import type {
  AgentCapabilityType,
  IToolExecutor,
  IWorkflowEdge,
  RealToolExecutorType,
  ToolExecutorPermissions,
  WorkflowGraphNodeType,
} from "@/lib/nexus-types";
import {
  LOCAL_FS_SCANNER_PERMISSIONS,
  LocalFsScannerExecutor,
} from "@/lib/tools/fs-scanner-executor";
import { WebSurferExecutor } from "@/lib/tools/web-surfer-executor";

export type RegistryImplementationState =
  | "implemented"
  | "mock"
  | "planned"
  | "not-implemented";

export type CapabilityRegistryEntry = {
  type: AgentCapabilityType;
  state: RegistryImplementationState;
  ownerLayer: "L1" | "L2" | "L3" | "L4";
  description: string;
  providerSlots: string[];
  toolSlots: string[];
};

export type GraphNodeRegistryEntry = {
  type: WorkflowGraphNodeType;
  state: RegistryImplementationState;
  ownerLayer: "L3" | "L4";
  description: string;
};

export type ToolSlotRegistryEntry = {
  id: string;
  state: RegistryImplementationState;
  capability: AgentCapabilityType;
  executorType: RealToolExecutorType;
  permissions?: ToolExecutorPermissions;
  description: string;
};

export interface NexusModelOption {
  id: string;
  label: string;
  provider: string;
  capability: AgentCapabilityType;
  tier?: "standard" | "advanced" | "pro" | "custom";
  releaseDate?: string;
  description?: string;
}

export interface MemoryCompressionProfile {
  id: string;
  label: string;
  description: string;
  fixedSystemPrompt: string;
  defaultRetentionRatio: number;
}

/**
 * @rule SCAN FIRST: Before implementing a new tool, capability, graph node,
 * provider adapter, or handoff behavior, check this registry for an existing
 * slot. Extend the matching slot instead of creating ad-hoc structures.
 */
export const NEXUS_REGISTRY_RULE =
  "SCAN FIRST: check src/lib/nexus-registry.ts before adding new architecture.";

export const CUSTOM_POWER_CHAT_MODEL_IDS = [
  "gpt-5.5-pro-2026-04-23",
  "gpt-5.5-2026-04-23",
] as const;

export const STANDARD_CHAT_MODEL_IDS = [
  "gpt-5.5",
  "gpt-5",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini",
  "o4-mini",
] as const;

export const DEFAULT_CHAT_MODEL_IDS = [
  ...CUSTOM_POWER_CHAT_MODEL_IDS,
  ...STANDARD_CHAT_MODEL_IDS,
] as const;

/**
 * @rule SCAN FIRST: Model ids are the exact provider payload values. Labels are
 * display-only. Do not create parallel model maps elsewhere.
 */
export const NEXUS_MODEL_CATALOG: NexusModelOption[] = [
  {
    id: "gpt-5.5-2026-04-23",
    label: "5.5 // 2026.04.23",
    provider: "custom-openai-compatible",
    capability: "chat",
    tier: "advanced",
    releaseDate: "2026-04-23",
    description: "User custom high-power assistant model",
  },
  {
    id: "gpt-5.5-pro-2026-04-23",
    label: "5.5 Pro // 2026.04.23",
    provider: "custom-openai-compatible",
    capability: "chat",
    tier: "pro",
    releaseDate: "2026-04-23",
    description: "User custom pro-grade high-power assistant model",
  },
  {
    id: "gpt-5.5",
    label: "gpt-5.5",
    provider: "custom-openai-compatible",
    capability: "chat",
    tier: "custom",
  },
  {
    id: "gpt-5",
    label: "gpt-5",
    provider: "custom-openai-compatible",
    capability: "chat",
    tier: "advanced",
  },
  {
    id: "gpt-4.1",
    label: "gpt-4.1",
    provider: "openai-compatible",
    capability: "chat",
    tier: "standard",
  },
  {
    id: "gpt-4o",
    label: "gpt-4o",
    provider: "openai-compatible",
    capability: "chat",
    tier: "standard",
  },
  {
    id: "gpt-4o-mini",
    label: "gpt-4o-mini",
    provider: "openai-compatible",
    capability: "chat",
    tier: "standard",
  },
  {
    id: "o4-mini",
    label: "o4-mini",
    provider: "openai-compatible",
    capability: "chat",
    tier: "standard",
  },
  {
    id: "dall-e-3",
    label: "DALL-E 3",
    provider: "openai-compatible",
    capability: "image",
    tier: "standard",
  },
  {
    id: "gpt-image-1",
    label: "gpt-image-1",
    provider: "openai-compatible",
    capability: "image",
    tier: "standard",
  },
  {
    id: "imagen-4",
    label: "Imagen 4",
    provider: "custom-openai-compatible",
    capability: "image",
    tier: "standard",
  },
  {
    id: "sora",
    label: "Sora",
    provider: "openai-compatible",
    capability: "video",
    tier: "standard",
  },
  {
    id: "runway-gen-3",
    label: "Runway Gen-3",
    provider: "custom-openai-compatible",
    capability: "video",
    tier: "standard",
  },
  {
    id: "veo-3",
    label: "Veo 3",
    provider: "custom-openai-compatible",
    capability: "video",
    tier: "standard",
  },
  {
    id: "html-css-js",
    label: "HTML / CSS / JS",
    provider: "local-preview",
    capability: "sandbox",
    tier: "standard",
  },
];

export function getModelOption(modelId: string) {
  return NEXUS_MODEL_CATALOG.find((model) => model.id === modelId);
}

export function getModelOptionsForCapability(capability: AgentCapabilityType) {
  return NEXUS_MODEL_CATALOG.filter((model) => model.capability === capability);
}

/**
 * @rule SCAN FIRST: Memory compression profiles live here. Before adding agent
 * forking, context summarization, or branch compression behavior, reuse this
 * registry and its fixed prompts instead of creating one-off prompt strings.
 */
export const MEMORY_COMPRESSION_PROFILE_REGISTRY: Record<
  string,
  MemoryCompressionProfile
> = {
  "default-context-compressor": {
    id: "default-context-compressor",
    label: "Default Context Compressor",
    description:
      "Preserves system architecture, constraints, decisions, unresolved bugs, and task continuity while removing filler.",
    fixedSystemPrompt:
      "You are a context essence compressor for NEXUS // AI OPS. Compress the source agent memory into a concise, reusable branch context. Preserve architecture decisions, interface contracts, registry rules, design intent, security constraints, unresolved bugs, verification results, and next actions. Preserve UI/UX intent exactly when present. Discard filler, repeated chat texture, stale speculation, and low-signal wording. Do not invent facts. Return structured context suitable for initializing a forked agent.",
    defaultRetentionRatio: 30,
  },
};

/**
 * @rule SCAN FIRST: Capability slots are the canonical list of agent kinds.
 * Add runtime behavior by filling these slots, not by inventing parallel enums.
 */
export const CAPABILITY_REGISTRY: Record<
  AgentCapabilityType,
  CapabilityRegistryEntry
> = {
  chat: {
    type: "chat",
    state: "implemented",
    ownerLayer: "L1",
    description: "Text streaming agent using mock or OpenAI-compatible chat.",
    providerSlots: ["openai-compatible-chat"],
    toolSlots: ["mock-review-mesh"],
  },
  image: {
    type: "image",
    state: "mock",
    ownerLayer: "L1",
    description: "Image generation workstation with mock artifact preview.",
    providerSlots: ["openai-image-generation", "dall-e-api"],
    toolSlots: ["mock-image-gen", "real-image-gen"],
  },
  video: {
    type: "video",
    state: "mock",
    ownerLayer: "L1",
    description: "Video generation workstation with mock storyboard preview.",
    providerSlots: ["sora-api", "runway-api"],
    toolSlots: ["mock-video-gen", "real-video-gen"],
  },
  sandbox: {
    type: "sandbox",
    state: "implemented",
    ownerLayer: "L3",
    description: "Live UI sandbox workstation with persisted srcDoc preview code.",
    providerSlots: ["local-srcdoc-preview"],
    toolSlots: ["preview-runtime"],
  },
  audio: {
    type: "audio",
    state: "not-implemented",
    ownerLayer: "L4",
    description: "Reserved for speech, transcription, and audio generation agents.",
    providerSlots: ["tts-api", "transcription-api"],
    toolSlots: ["real-audio-gen", "real-transcription"],
  },
  search: {
    type: "search",
    state: "implemented",
    ownerLayer: "L4",
    description: "Web, document, and workspace search sockets with lightweight readers.",
    providerSlots: ["search-api", "local-index"],
    toolSlots: ["web-surfer", "real-web-search", "real-file-scanner"],
  },
  "data-analysis": {
    type: "data-analysis",
    state: "not-implemented",
    ownerLayer: "L4",
    description: "Reserved for tabular analysis, charting, and notebook-style agents.",
    providerSlots: ["analysis-runtime", "db-query"],
    toolSlots: ["real-data-analysis", "real-db-query"],
  },
};

/**
 * @rule SCAN FIRST: Graph node slots define the future visual workflow surface.
 * Fill these entries before adding new React Flow node types elsewhere.
 */
export const GRAPH_NODE_REGISTRY: Record<
  WorkflowGraphNodeType,
  GraphNodeRegistryEntry
> = {
  "agent-node": {
    type: "agent-node",
    state: "implemented",
    ownerLayer: "L3",
    description: "Current visual node backed by a Nexus agent.",
  },
  "input.text": {
    type: "input.text",
    state: "implemented",
    ownerLayer: "L3",
    description: "Workflow Runtime Lite text input node that creates a ContextPacket.",
  },
  "model.llm": {
    type: "model.llm",
    state: "implemented",
    ownerLayer: "L3",
    description: "Workflow Runtime Lite LLM node backed by the existing provider boundary.",
  },
  "output.text": {
    type: "output.text",
    state: "implemented",
    ownerLayer: "L3",
    description: "Workflow Runtime Lite text output node with ContextPacket pass-through.",
  },
  "tool-node": {
    type: "tool-node",
    state: "not-implemented",
    ownerLayer: "L4",
    description: "Reserved visual node for standalone tools and real executors.",
  },
  "memory-node": {
    type: "memory-node",
    state: "not-implemented",
    ownerLayer: "L4",
    description: "Reserved visual node for memory blocks, vector stores, and context packs.",
  },
  "condition-node": {
    type: "condition-node",
    state: "not-implemented",
    ownerLayer: "L4",
    description: "Reserved visual node for manual or automatic routing conditions.",
  },
};

/**
 * @rule SCAN FIRST: Real executors must be registered here by executor type.
 * Empty arrays are intentional sockets for future local-fs, REST, and DB tools.
 */
export const TOOL_EXECUTOR_REGISTRY: Record<RealToolExecutorType, IToolExecutor[]> = {
  "local-fs": [new LocalFsScannerExecutor()],
  "rest-api": [new WebSurferExecutor()],
  "db-query": [],
};

/**
 * @rule SCAN FIRST: Tool slots identify where real provider integrations belong.
 * Fill an existing slot before introducing a new tool id.
 */
export const TOOL_SLOT_REGISTRY: Record<string, ToolSlotRegistryEntry> = {
  "real-image-gen": {
    id: "real-image-gen",
    state: "implemented",
    capability: "image",
    executorType: "rest-api",
    description: "DALL-E image adapter slot with mock fallback when no agent key is set.",
  },
  "mock-image-gen": {
    id: "mock-image-gen",
    state: "mock",
    capability: "image",
    executorType: "rest-api",
    description: "Local mock image adapter for keyless image agents and tests.",
  },
  "real-video-gen": {
    id: "real-video-gen",
    state: "not-implemented",
    capability: "video",
    executorType: "rest-api",
    description: "Slot for a real Sora, Runway, or compatible video API adapter.",
  },
  "real-file-scanner": {
    id: "real-file-scanner",
    state: "implemented",
    capability: "search",
    executorType: "local-fs",
    permissions: LOCAL_FS_SCANNER_PERMISSIONS,
    description: "Local project file tree scanner with depth and directory safety limits.",
  },
  "web-surfer": {
    id: "web-surfer",
    state: "implemented",
    capability: "search",
    executorType: "rest-api",
    description: "Lightweight webpage reader using r.jina.ai markdown conversion.",
  },
  "real-db-query": {
    id: "real-db-query",
    state: "not-implemented",
    capability: "data-analysis",
    executorType: "db-query",
    description: "Slot for database query tools and analytical data adapters.",
  },
};

/**
 * @rule SCAN FIRST: L2 handoff routing starts here. Do not create autonomous
 * routing state elsewhere until this registry is populated and consumed.
 */
export const HANDOFF_RULE_REGISTRY: IWorkflowEdge[] = [];
