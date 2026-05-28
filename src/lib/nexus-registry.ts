import type {
  AgentModelSettings,
  AgentCapabilityType,
  IToolExecutor,
  IWorkflowEdge,
  NexusReasoningDetail,
  NexusReasoningEffort,
  NexusVerbosity,
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
  capabilityProfile?: ModelCapabilityProfile;
}

export type ProviderAdapterKind = "openai-compatible" | "local-preview";
export type ProviderVerificationStatus = "untested" | "verified" | "failed";
export type ModelLiveStatus = "verified" | "unverified" | "local-only";
export type ModelApiFamily = "chat-completions" | "responses" | "local-preview";
export type ProviderRequestParam =
  | "temperature"
  | "top_p"
  | "presence_penalty"
  | "frequency_penalty";

export interface ProviderRegistryEntry {
  id: string;
  label: string;
  adapter: ProviderAdapterKind;
  defaultBaseUrl?: string;
  credentialLabel?: string;
  verificationStatus: ProviderVerificationStatus;
  description: string;
}

export interface ModelThinkingProfile {
  supported: boolean;
  defaultEnabled: boolean;
  defaultReasoningEffort?: NexusReasoningEffort;
  supportedReasoningEfforts: NexusReasoningEffort[];
  providerReasoningEffortMap?: Partial<Record<NexusReasoningEffort, string>>;
  disabledRequestParams: ProviderRequestParam[];
  requestToggleParam?: "thinking";
  requestReasoningEffortParam?: "reasoning_effort" | "reasoning.effort";
  responseReasoningField?: "reasoning_content";
}

export interface ModelVerbosityProfile {
  supported: boolean;
  defaultVerbosity?: NexusVerbosity;
  supportedVerbosity: NexusVerbosity[];
  requestParam?: "text.verbosity";
}

export interface ModelReasoningDetailProfile {
  supported: boolean;
  defaultDetail?: NexusReasoningDetail;
  supportedDetails: NexusReasoningDetail[];
  providerSummaryMap?: Partial<Record<NexusReasoningDetail, string>>;
  requestParam?: "reasoning.summary";
  responseReasoningField?: "reasoning_content";
}

export interface ModelCapabilityProfile {
  providerId: string;
  adapter: ProviderAdapterKind;
  apiFamily: ModelApiFamily;
  liveStatus: ModelLiveStatus;
  supportsStreaming: boolean;
  supportsJsonMode?: boolean;
  supportsToolCalls?: boolean;
  supportsTemperature: boolean;
  defaultTemperature?: number;
  thinking: ModelThinkingProfile;
  verbosity: ModelVerbosityProfile;
  reasoningDetail: ModelReasoningDetailProfile;
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
  "deepseek-v4-pro",
  "deepseek-v4-flash",
] as const;

export const PROVIDER_REGISTRY: Record<string, ProviderRegistryEntry> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    adapter: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com",
    credentialLabel: "DeepSeek API Key",
    verificationStatus: "untested",
    description: "DeepSeek OpenAI-compatible chat completions provider.",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    adapter: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    credentialLabel: "OpenAI API Key",
    verificationStatus: "untested",
    description: "OpenAI first-party chat, image, and media models.",
  },
  "openai-compatible": {
    id: "openai-compatible",
    label: "OpenAI Compatible",
    adapter: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    credentialLabel: "Compatible API Key",
    verificationStatus: "untested",
    description: "Generic OpenAI-compatible runtime endpoint.",
  },
  "custom-openai-compatible": {
    id: "custom-openai-compatible",
    label: "Custom Compatible",
    adapter: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    credentialLabel: "Custom Runtime Key",
    verificationStatus: "untested",
    description: "User-managed OpenAI-compatible endpoint for custom model ids.",
  },
  "local-preview": {
    id: "local-preview",
    label: "Local Preview",
    adapter: "local-preview",
    verificationStatus: "verified",
    description: "Browser-local preview runtime with no external credential.",
  },
  "local-sandbox": {
    id: "local-sandbox",
    label: "Local Sandbox",
    adapter: "local-preview",
    verificationStatus: "verified",
    description: "Local sandbox runtime with no external credential.",
  },
};

const NO_THINKING_PROFILE: ModelThinkingProfile = {
  supported: false,
  defaultEnabled: false,
  supportedReasoningEfforts: [],
  disabledRequestParams: [],
};

const NO_VERBOSITY_PROFILE: ModelVerbosityProfile = {
  supported: false,
  supportedVerbosity: [],
};

const NO_REASONING_DETAIL_PROFILE: ModelReasoningDetailProfile = {
  supported: false,
  supportedDetails: [],
};

const DEFAULT_OPENAI_COMPATIBLE_CHAT_PROFILE: ModelCapabilityProfile = {
  providerId: "openai-compatible",
  adapter: "openai-compatible",
  apiFamily: "chat-completions",
  liveStatus: "unverified",
  supportsStreaming: true,
  supportsJsonMode: true,
  supportsToolCalls: true,
  supportsTemperature: true,
  defaultTemperature: 0.65,
  thinking: NO_THINKING_PROFILE,
  verbosity: NO_VERBOSITY_PROFILE,
  reasoningDetail: NO_REASONING_DETAIL_PROFILE,
};

const OPENAI_RESPONSES_REASONING_PROFILE: ModelCapabilityProfile = {
  providerId: "openai",
  adapter: "openai-compatible",
  apiFamily: "responses",
  liveStatus: "unverified",
  supportsStreaming: true,
  supportsJsonMode: true,
  supportsToolCalls: true,
  supportsTemperature: false,
  thinking: {
    supported: true,
    defaultEnabled: true,
    defaultReasoningEffort: "medium",
    supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
    disabledRequestParams: ["temperature", "top_p", "presence_penalty", "frequency_penalty"],
    requestReasoningEffortParam: "reasoning.effort",
  },
  verbosity: {
    supported: true,
    defaultVerbosity: "medium",
    supportedVerbosity: ["low", "medium", "high"],
    requestParam: "text.verbosity",
  },
  reasoningDetail: {
    supported: true,
    defaultDetail: "medium",
    supportedDetails: ["low", "medium", "high"],
    providerSummaryMap: {
      low: "concise",
      medium: "auto",
      high: "detailed",
    },
    requestParam: "reasoning.summary",
  },
};

const DEEPSEEK_V4_THINKING_PROFILE: ModelCapabilityProfile = {
  providerId: "deepseek",
  adapter: "openai-compatible",
  apiFamily: "chat-completions",
  liveStatus: "unverified",
  supportsStreaming: true,
  supportsJsonMode: true,
  supportsToolCalls: true,
  supportsTemperature: false,
  thinking: {
    supported: true,
    defaultEnabled: true,
    defaultReasoningEffort: "high",
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
    providerReasoningEffortMap: {
      low: "high",
      medium: "high",
      high: "high",
      xhigh: "max",
    },
    disabledRequestParams: [
      "temperature",
      "top_p",
      "presence_penalty",
      "frequency_penalty",
    ],
    requestToggleParam: "thinking",
    requestReasoningEffortParam: "reasoning_effort",
    responseReasoningField: "reasoning_content",
  },
  verbosity: NO_VERBOSITY_PROFILE,
  reasoningDetail: {
    supported: true,
    defaultDetail: "medium",
    supportedDetails: ["low", "medium", "high"],
    responseReasoningField: "reasoning_content",
  },
};

/**
 * @rule SCAN FIRST: Model ids are the exact provider payload values. Labels are
 * display-only. Do not create parallel model maps elsewhere.
 */
export const NEXUS_MODEL_CATALOG: NexusModelOption[] = [
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "deepseek",
    capability: "chat",
    tier: "pro",
    description: "DeepSeek V4 Pro with registry-defined thinking mode policy.",
    capabilityProfile: DEEPSEEK_V4_THINKING_PROFILE,
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "deepseek",
    capability: "chat",
    tier: "standard",
    description: "DeepSeek V4 Flash with the same OpenAI-compatible thinking policy.",
    capabilityProfile: DEEPSEEK_V4_THINKING_PROFILE,
  },
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
    provider: "openai",
    capability: "chat",
    tier: "custom",
    description: "OpenAI GPT-5.5 via the Responses API with registry-defined reasoning and verbosity controls.",
    capabilityProfile: OPENAI_RESPONSES_REASONING_PROFILE,
  },
  {
    id: "gpt-5",
    label: "gpt-5",
    provider: "openai",
    capability: "chat",
    tier: "advanced",
    description: "OpenAI GPT-5 reasoning model via the Responses API.",
    capabilityProfile: OPENAI_RESPONSES_REASONING_PROFILE,
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

export function getProviderOption(providerId: string | undefined) {
  if (!providerId) {
    return undefined;
  }

  return PROVIDER_REGISTRY[providerId];
}

export function getModelCapabilityProfile(modelId: string | undefined) {
  const option = modelId ? getModelOption(modelId) : undefined;

  if (option?.capabilityProfile) {
    return option.capabilityProfile;
  }

  if (option?.capability === "sandbox") {
    return {
      providerId: option.provider,
      adapter: "local-preview",
      apiFamily: "local-preview",
      liveStatus: "local-only",
      supportsStreaming: false,
      supportsTemperature: false,
      thinking: NO_THINKING_PROFILE,
      verbosity: NO_VERBOSITY_PROFILE,
      reasoningDetail: NO_REASONING_DETAIL_PROFILE,
    } satisfies ModelCapabilityProfile;
  }

  if (option?.capability === "chat") {
    return {
      ...DEFAULT_OPENAI_COMPATIBLE_CHAT_PROFILE,
      providerId: option.provider,
      supportsTemperature:
        !option.id.toLowerCase().startsWith("o") &&
        !option.id.toLowerCase().startsWith("gpt-5"),
    };
  }

  if (option) {
    return {
      providerId: option.provider,
      adapter: "openai-compatible",
      apiFamily: "chat-completions",
      liveStatus: "unverified",
      supportsStreaming: false,
      supportsTemperature: false,
      thinking: NO_THINKING_PROFILE,
      verbosity: NO_VERBOSITY_PROFILE,
      reasoningDetail: NO_REASONING_DETAIL_PROFILE,
    } satisfies ModelCapabilityProfile;
  }

  return undefined;
}

export function getProviderIdForModel(modelId: string | undefined, fallback?: string) {
  return getModelCapabilityProfile(modelId)?.providerId || fallback || "openai-compatible";
}

export function mapReasoningEffortForModel(
  modelId: string,
  effort?: NexusReasoningEffort,
) {
  const thinking = getModelCapabilityProfile(modelId)?.thinking;

  if (!thinking?.supported) {
    return undefined;
  }

  const requested =
    effort && thinking.supportedReasoningEfforts.includes(effort)
      ? effort
      : thinking.defaultReasoningEffort ?? thinking.supportedReasoningEfforts[0] ?? "high";

  return thinking.providerReasoningEffortMap?.[requested] ?? requested;
}

export function mapReasoningDetailForModel(
  modelId: string,
  detail?: NexusReasoningDetail,
) {
  const reasoningDetail = getModelCapabilityProfile(modelId)?.reasoningDetail;

  if (!reasoningDetail?.supported) {
    return undefined;
  }

  const requested =
    detail && reasoningDetail.supportedDetails.includes(detail)
      ? detail
      : reasoningDetail.defaultDetail ?? reasoningDetail.supportedDetails[0] ?? "medium";

  return reasoningDetail.providerSummaryMap?.[requested] ?? requested;
}

export function normalizeAgentModelSettings(
  modelId: string | undefined,
  settings: AgentModelSettings | undefined = {},
): AgentModelSettings {
  const capability = getModelCapabilityProfile(modelId);
  const next: AgentModelSettings = {};
  const reasoning = capability?.thinking;
  const verbosity = capability?.verbosity;
  const reasoningDetail = capability?.reasoningDetail;

  if (reasoning?.supported) {
    next.reasoningEffort =
      settings.reasoningEffort &&
      reasoning.supportedReasoningEfforts.includes(settings.reasoningEffort)
        ? settings.reasoningEffort
        : reasoning.defaultReasoningEffort ?? reasoning.supportedReasoningEfforts[0];
  }

  if (verbosity?.supported) {
    next.verbosity =
      settings.verbosity && verbosity.supportedVerbosity.includes(settings.verbosity)
        ? settings.verbosity
        : verbosity.defaultVerbosity ?? verbosity.supportedVerbosity[0];
  }

  if (reasoningDetail?.supported) {
    next.reasoningDetail =
      settings.reasoningDetail &&
      reasoningDetail.supportedDetails.includes(settings.reasoningDetail)
        ? settings.reasoningDetail
        : reasoningDetail.defaultDetail ?? reasoningDetail.supportedDetails[0];
  }

  if (
    capability?.supportsTemperature &&
    typeof settings.temperature === "number" &&
    Number.isFinite(settings.temperature)
  ) {
    next.temperature = Math.max(0, Math.min(2, settings.temperature));
  } else if (capability?.supportsTemperature && capability.defaultTemperature !== undefined) {
    next.temperature = capability.defaultTemperature;
  }

  return next;
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
    providerSlots: ["openai-compatible-chat", "deepseek-chat"],
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
