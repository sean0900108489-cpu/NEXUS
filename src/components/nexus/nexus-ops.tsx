"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileUp,
  Fullscreen,
  GitBranch,
  Home,
  Layers3,
  Lock,
  Maximize2,
  Menu,
  Minimize2,
  PanelRight,
  Pencil,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RadioTower,
  RefreshCcw,
  Search,
  SendHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  Settings,
  Square,
  Trash2,
  Unlock,
  Upload,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RndDragCallback, RndResizeCallback } from "react-rnd";

import {
  DEFAULT_BASE_URL,
  DEFAULT_SANDBOX_CODE,
  DEFAULT_WORKSPACE_BRANCHING_SETTINGS,
  agentTemplates,
  makeId,
  resolveAgentTemplateProfile,
} from "@/lib/nexus-defaults";
import type {
  AgentCapabilityType,
  AgentCreationCapabilityType,
  AgentMediaArtifact,
  ArtifactGetResponse,
  ArtifactVaultRecord,
  AgentModelSettings,
  AgentProfileUpdate,
  AgentTemplateProfile,
  AgentTemplateProfileUpdate,
  HistoricalMessageRecord,
  MediaAgentCapabilityType,
  AgentMessage,
  AgentStreamRequest,
  AgentTaskCreateRequest,
  AgentTaskCreateResponse,
  AgentTemplate,
  IAuthVault,
  NexusReasoningDetail,
  NexusReasoningEffort,
  NexusVerbosity,
  NexusAgent,
  NexusWorkspace,
  NotebookRecord,
  PromptRecord,
  StreamMode,
  SystemEventListResponse,
  SystemEventRecord,
  WorkflowTemplateRecord,
  WorkspaceBranchingSettings,
  WorkspaceRecoveryListItem,
  WorkspaceSnapshot,
  WorkspaceThemeConfig,
  WorkspaceViewMode,
} from "@/lib/nexus-types";
import {
  NEXUS_RUNTIME_AUTHORIZATION_HEADER,
  nexusApiClient,
} from "@/lib/api/nexus-api-client";
import { createNotebookRecoveryMetadata, parseWorkspaceSnapshot } from "@/lib/workspace-kernel";
import { buildLocalWorkspaceRecoveryContext } from "@/lib/workspace-recovery-local";
import { hasToolExecutor } from "@/lib/tool-executors";
import { fetchWithBackoff, isAbortLikeError } from "@/lib/stream-retry";
import { supabaseStateSyncManager } from "@/lib/state-sync";
import { localSyncQueueAdapter, type QueueStatusProjection } from "@/lib/sync/local-sync-queue-adapter";
import {
  ensureNexusSupabaseClientConfigured,
  getNexusSupabaseClient,
} from "@/lib/supabase/client";
import { getEmbeddableUrl, getIframeBlockReason } from "@/lib/embed-url";
import { buildMockPredictiveIntelSuggestions } from "@/lib/predictive-intel";
import {
  PROVIDER_REGISTRY,
  getModelOption,
  getModelCapabilityProfile,
  getModelOptionsForCapability,
  getProviderIdForModel,
  getProviderOption,
} from "@/lib/nexus-registry";
import {
  evaluateWorkflowHandoffs,
  queueWorkflowHandoffDispatches,
  type WorkflowDispatchDecision,
  type WorkflowAgentSnapshot,
} from "@/lib/workflow-engine";
import { useNexusStore } from "@/store/nexus-store";
import { DynamicIcon } from "@/components/nexus/dynamic-icon";
import { AgentBranchModal } from "@/components/nexus/AgentBranchModal";
import { AuthScreen } from "@/components/nexus/auth-screen";
import { DatapadWindow } from "@/components/nexus/DatapadWindow";
import { NexusGraph } from "@/components/nexus/nexus-graph";
import { PromptVaultManager } from "@/components/nexus/PromptVaultManager";

const Rnd = dynamic(() => import("react-rnd").then((module) => module.Rnd), {
  ssr: false,
});

const EMPTY_AGENTS: NexusAgent[] = [];
const EMPTY_GRAPH = { nodes: [], edges: [] };
const SANDBOX_MIN_SPLIT = 20;
const SANDBOX_MAX_SPLIT = 80;

type LegoThemeKey = keyof WorkspaceThemeConfig;
type AgentHistoricalPage = {
  error?: string;
  hasMore: boolean;
  items: HistoricalMessageRecord[];
  loading?: boolean;
  nextCursor?: string;
};

const LEGO_THEME_DEFAULTS: Required<WorkspaceThemeConfig> = {
  radius: "4px",
  blur: "8px",
  borderWidth: "0px",
  glowIntensity: "28%",
  iconWeight: "2px",
  fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  chatOpacity: "88%",
};

const LEGO_THEME_VARIABLES: Record<LegoThemeKey, string> = {
  radius: "--radius-base",
  blur: "--backdrop-blur",
  borderWidth: "--border-width",
  glowIntensity: "--agent-glow-intensity",
  iconWeight: "--icon-weight",
  fontFamily: "--font-main",
  chatOpacity: "--chat-panel-opacity",
};

const typographyOptions = [
  {
    id: "sans",
    label: "Sans-serif",
    value: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  },
  {
    id: "mono",
    label: "Monospace",
    value:
      "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  {
    id: "serif",
    label: "Serif",
    value: "Georgia, Cambria, 'Times New Roman', Times, serif",
  },
] as const;

type NexusTheme = "cyberpunk" | "apple" | "tesla" | "terminal";
type RightDockPanelId =
  | "intel"
  | "providers"
  | "models"
  | "theme"
  | "memory"
  | "artifacts"
  | "workflows"
  | "trace"
  | "account";

const themeOptions: Array<{ id: NexusTheme; label: string }> = [
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "apple", label: "Apple" },
  { id: "tesla", label: "Tesla" },
  { id: "terminal", label: "Terminal" },
];

type WorkspaceSize = {
  width: number;
  height: number;
};

type ClientStreamEvent =
  | {
      type: "meta";
      mode?: "mock" | "openai";
      detail?: string;
      taskId?: string;
      sessionId?: string | null;
      traceId?: string;
    }
  | { type: "token"; token?: string; delta?: string }
  | { type: "reasoning"; delta?: string }
  | { type: "done" };

type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  icon: ReactNode;
  run: () => void;
};

const capabilityOptions: Array<{
  type: AgentCreationCapabilityType;
  label: string;
  detail: string;
}> = [
  { type: "chat", label: "Chat", detail: "OpenAI-compatible text stream" },
  { type: "image", label: "Image", detail: "DALL-E / image model canvas" },
  { type: "video", label: "Video", detail: "Sora / Runway preview canvas" },
  { type: "sandbox", label: "Sandbox", detail: "Live HTML/CSS preview" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cssNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? "");

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeThemeConfig(
  config?: WorkspaceThemeConfig,
): Required<WorkspaceThemeConfig> {
  return {
    ...LEGO_THEME_DEFAULTS,
    ...(config ?? {}),
    borderWidth: LEGO_THEME_DEFAULTS.borderWidth,
  };
}

function normalizeTypographyValue(value?: string) {
  if (value?.includes("font-geist-mono") || value?.includes("ui-monospace")) {
    return typographyOptions[1].value;
  }

  if (value?.includes("Georgia") || value?.includes("Times")) {
    return typographyOptions[2].value;
  }

  return typographyOptions[0].value;
}

function applyLegoThemeConfigToDom(config?: WorkspaceThemeConfig) {
  if (typeof document === "undefined") {
    return;
  }

  const rootStyle = document.documentElement.style;

  if (!config) {
    Object.values(LEGO_THEME_VARIABLES).forEach((variable) => {
      rootStyle.removeProperty(variable);
    });
    return;
  }

  (Object.entries(LEGO_THEME_VARIABLES) as Array<[LegoThemeKey, string]>).forEach(
    ([key, variable]) => {
      const value = config[key];
      const nextValue =
        key === "borderWidth" ? LEGO_THEME_DEFAULTS.borderWidth : value;

      if (typeof nextValue === "string" && nextValue.trim()) {
        rootStyle.setProperty(variable, nextValue);
      } else {
        rootStyle.removeProperty(variable);
      }
    },
  );
}

function readLegoThemeConfigFromDom(
  config?: WorkspaceThemeConfig,
): Required<WorkspaceThemeConfig> {
  if (typeof document === "undefined") {
    return normalizeThemeConfig(config);
  }

  const computed = getComputedStyle(document.documentElement);
  const fromDom = (key: LegoThemeKey) =>
    computed.getPropertyValue(LEGO_THEME_VARIABLES[key]).trim();

  return {
    radius: config?.radius || fromDom("radius") || LEGO_THEME_DEFAULTS.radius,
    blur: config?.blur || fromDom("blur") || LEGO_THEME_DEFAULTS.blur,
    borderWidth: LEGO_THEME_DEFAULTS.borderWidth,
    glowIntensity:
      config?.glowIntensity ||
      fromDom("glowIntensity") ||
      LEGO_THEME_DEFAULTS.glowIntensity,
    iconWeight:
      config?.iconWeight || fromDom("iconWeight") || LEGO_THEME_DEFAULTS.iconWeight,
    fontFamily: normalizeTypographyValue(
      config?.fontFamily || fromDom("fontFamily") || LEGO_THEME_DEFAULTS.fontFamily,
    ),
    chatOpacity:
      config?.chatOpacity || fromDom("chatOpacity") || LEGO_THEME_DEFAULTS.chatOpacity,
  };
}

function normalizeTheme(value?: string): NexusTheme {
  return themeOptions.some((option) => option.id === value)
    ? (value as NexusTheme)
    : "cyberpunk";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
}

function getModelLabel(modelId: string) {
  return getModelOption(modelId)?.label ?? modelId;
}

function getProviderLabel(providerId: string | undefined) {
  return getProviderOption(providerId)?.label ?? providerId ?? "Unknown";
}

function uniqueModelIds(models: Array<string | undefined>) {
  return Array.from(
    new Set(
      models
        .map((model) => model?.trim())
        .filter((model): model is string => Boolean(model)),
    ),
  );
}

function getAgentModelGroups(agent: NexusAgent) {
  const capabilityType = getCapabilityType(agent);
  const currentModel = agent.model?.trim();
  const supportedModels = agent.capabilities?.supportedModels ?? [];
  const catalogModels = getModelOptionsForCapability(capabilityType).map(
    (model) => model.id,
  );

  const models = uniqueModelIds([currentModel, ...supportedModels, ...catalogModels]);
  const grouped = models.reduce<Array<{ label: string; models: string[] }>>(
    (groups, modelId) => {
      const option = getModelOption(modelId);
      const providerId = option?.provider ?? agent.provider;
      const label = getProviderLabel(providerId);
      const group = groups.find((candidate) => candidate.label === label);

      if (group) {
        group.models.push(modelId);
        return groups;
      }

      groups.push({ label, models: [modelId] });
      return groups;
    },
    [],
  );

  return grouped.length
    ? grouped
    : [{ label: "Agent Supported Models", models }];
}

function resolveRuntimeCredentialForModel(authVault: IAuthVault, model: string, fallbackProvider?: string) {
  const providerId = getProviderIdForModel(model, fallbackProvider);
  const provider = getProviderOption(providerId);
  const providerCredential = authVault.providerCredentials?.[providerId];
  const apiKey =
    providerCredential?.apiKey?.replace(/[^\x20-\x7E]/g, "").trim() ||
    authVault.globalApiKey?.replace(/[^\x20-\x7E]/g, "").trim() ||
    "";
  const baseUrl =
    providerCredential?.baseUrl?.replace(/[^\x20-\x7E]/g, "").trim() ||
    authVault.globalBaseUrl?.replace(/[^\x20-\x7E]/g, "").trim() ||
    provider?.defaultBaseUrl ||
    DEFAULT_BASE_URL;

  return {
    apiKey,
    baseUrl,
    providerId,
    providerLabel: provider?.label ?? providerId,
    verificationStatus:
      providerCredential?.verificationStatus ?? provider?.verificationStatus ?? "untested",
    liveVerifiedAt: providerCredential?.liveVerifiedAt ?? null,
  };
}

function isMediaCapability(
  capabilityType: AgentCapabilityType,
): capabilityType is MediaAgentCapabilityType {
  return capabilityType === "image" || capabilityType === "video";
}

function isSandboxCapability(capabilityType: AgentCapabilityType) {
  return capabilityType === "sandbox";
}

function shouldPreserveNativeUndo(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.closest("[contenteditable='true'], [contenteditable='plaintext-only']")
  ) {
    return true;
  }

  return target instanceof HTMLElement && target.isContentEditable;
}

function getLatestMediaArtifact(agent: NexusAgent): AgentMediaArtifact | undefined {
  return [...agent.messages].reverse().find((message) => message.media)?.media;
}

function normalizeSandboxUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

async function readStreamEvents(
  response: Response,
  onEvent: (event: ClientStreamEvent) => void,
) {
  if (!response.body) {
    throw new Error("Stream body missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split("\n\n");
    buffer = packets.pop() ?? "";

    for (const packet of packets) {
      const line = packet
        .split("\n")
        .find((entry) => entry.trim().startsWith("data:"));

      if (!line) {
        continue;
      }

      try {
        onEvent(JSON.parse(line.replace(/^data:\s*/, "")) as ClientStreamEvent);
      } catch {
        onEvent({ type: "meta", detail: "Malformed stream event.", mode: "mock" });
      }
    }
  }
}

function IconButton({
  label,
  children,
  onClick,
  active,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "grid h-9 w-9 place-items-center border border-white/10 bg-white/[0.045] text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-100",
        active && "border-cyan-300/60 bg-cyan-300/15 text-cyan-100",
        disabled && "pointer-events-none opacity-40",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function resolveAgentsStreamMode(authVault: IAuthVault): StreamMode {
  return authVault.globalApiKey?.trim() ||
    Object.values(authVault.providerCredentials ?? {}).some((entry) => entry.apiKey?.trim())
    ? "live"
    : "mock";
}

function syncSupabaseSessionUser(user: IAuthVault["user"]) {
  const currentUser = useNexusStore.getState().authVault.user;

  if ((currentUser?.id ?? null) === (user?.id ?? null)) {
    return;
  }

  useNexusStore.setState((state) => ({
    authVault: {
      ...state.authVault,
      user,
      isLocked: user ? state.authVault.isLocked : true,
    },
    streamMode: user ? state.streamMode : "mock",
  }));
}

async function resolveSupabaseAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function streamModeTone(streamMode: StreamMode) {
  if (streamMode === "live") {
    return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
  }

  if (streamMode === "mixed") {
    return "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100";
  }

  return "border-amber-300/40 bg-amber-300/10 text-amber-100";
}

function artifactPreview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= 120) {
    return compact || "Empty artifact payload";
  }

  return `${compact.slice(0, 117)}...`;
}

function traceSeverityClass(severity: SystemEventRecord["severity"]) {
  if (severity === "critical" || severity === "error") {
    return "text-rose-200";
  }

  if (severity === "warn") {
    return "text-amber-200";
  }

  if (severity === "debug") {
    return "text-slate-500";
  }

  return "text-cyan-100";
}

export function NexusOps() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllersRef = useRef<
    Map<string, { controller: AbortController; taskId?: string; workspaceId?: string }>
  >(new Map());
  const workflowAgentSnapshotsRef = useRef<Map<string, WorkflowAgentSnapshot>>(
    new Map(),
  );
  const processedWorkflowHandoffsRef = useRef<Set<string>>(new Set());
  const workflowDispatchQueueRef = useRef<Promise<void>>(Promise.resolve());
  const workflowQueueEpochRef = useRef(0);
  const recoveredLoginUserRef = useRef<string | null>(null);
  const [workspaceSize, setWorkspaceSize] = useState<WorkspaceSize>({
    width: 1200,
    height: 780,
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState<RightDockPanelId | null>(null);
  const [leftDockOpen, setLeftDockOpen] = useState(false);
  const [notice, setNotice] = useState("Workspace persistence online");
  const [macros, setMacros] = useState<WorkflowTemplateRecord[]>([]);
  const [macrosLoading, setMacrosLoading] = useState(false);
  const [macroError, setMacroError] = useState<string | undefined>();
  const [macroRefreshToken, setMacroRefreshToken] = useState(0);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactError, setArtifactError] = useState<string | undefined>();
  const [artifactRefreshToken, setArtifactRefreshToken] = useState(0);
  const [macroComposerOpen, setMacroComposerOpen] = useState(false);
  const [macroName, setMacroName] = useState("");
  const [macroDescription, setMacroDescription] = useState("");
  const [branchAgentId, setBranchAgentId] = useState<string | null>(null);
  const [themeMounted, setThemeMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [workspaceRecoveryItems, setWorkspaceRecoveryItems] = useState<
    WorkspaceRecoveryListItem[]
  >([]);
  const [workspaceRecoveryLoading, setWorkspaceRecoveryLoading] = useState(false);

  const activeWorkspaceId = useNexusStore((state) => state.activeWorkspaceId);
  const workspaces = useNexusStore((state) => state.workspaces);
  const selectedAgentId = useNexusStore((state) => state.selectedAgentId);
  const viewMode = useNexusStore((state) => state.viewMode);
  const isVaultManagerOpen = useNexusStore((state) => state.isVaultManagerOpen);
  const authVault = useNexusStore((state) => state.authVault);
  const artifactVaultCache = useNexusStore((state) => state.artifactVault);
  const promptsCache = useNexusStore((state) => state.promptsCache);
  const notebooksCache = useNexusStore((state) => state.notebooksCache);
  const openNotebookIds = useNexusStore((state) => state.openNotebookIds);
  const materializeDefaultWorkspace = useNexusStore(
    (state) => state.materializeDefaultWorkspace,
  );
  const saveWorkspaceSnapshot = useNexusStore((state) => state.saveWorkspaceSnapshot);
  const createWorkspace = useNexusStore((state) => state.createWorkspace);
  const switchWorkspace = useNexusStore((state) => state.switchWorkspace);
  const renameWorkspace = useNexusStore((state) => state.renameWorkspace);
  const exportActiveWorkspace = useNexusStore((state) => state.exportActiveWorkspace);
  const spawnAgent = useNexusStore((state) => state.spawnAgent);
  const saveCurrentCanvasAsMacro = useNexusStore(
    (state) => state.saveCurrentCanvasAsMacro,
  );
  const instantiateMacro = useNexusStore((state) => state.instantiateMacro);
  const duplicateAgent = useNexusStore((state) => state.duplicateAgent);
  const removeAgent = useNexusStore((state) => state.removeAgent);
  const focusAgent = useNexusStore((state) => state.focusAgent);
  const selectAgent = useNexusStore((state) => state.selectAgent);
  const updateLayout = useNexusStore((state) => state.updateLayout);
  const updateAgentProfile = useNexusStore((state) => state.updateAgentProfile);
  const updateAgentCallsign = useNexusStore((state) => state.updateAgentCallsign);
  const setAgentProfileLocked = useNexusStore(
    (state) => state.setAgentProfileLocked,
  );
  const updateAgentMission = useNexusStore((state) => state.updateAgentMission);
  const updateAgentModel = useNexusStore((state) => state.updateAgentModel);
  const updateAgentModelSettings = useNexusStore(
    (state) => state.updateAgentModelSettings,
  );
  const updateAgentTemplateProfile = useNexusStore(
    (state) => state.updateAgentTemplateProfile,
  );
  const updateMemoryBlock = useNexusStore((state) => state.updateMemoryBlock);
  const minimizeAgent = useNexusStore((state) => state.minimizeAgent);
  const restoreAgent = useNexusStore((state) => state.restoreAgent);
  const toggleMaximizeAgent = useNexusStore((state) => state.toggleMaximizeAgent);
  const minimizeAll = useNexusStore((state) => state.minimizeAll);
  const restoreAll = useNexusStore((state) => state.restoreAll);
  const arrangeAgents = useNexusStore((state) => state.arrangeAgents);
  const clearAgentMessages = useNexusStore((state) => state.clearAgentMessages);
  const resetWorkspace = useNexusStore((state) => state.resetWorkspace);
  const importWorkspace = useNexusStore((state) => state.importWorkspace);
  const applyWorkspaceRecoveryState = useNexusStore(
    (state) => state.applyWorkspaceRecoveryState,
  );
  const setStreamMode = useNexusStore((state) => state.setStreamMode);
  const setViewMode = useNexusStore((state) => state.setViewMode);
  const openVaultManager = useNexusStore((state) => state.openVaultManager);
  const setNotebooksCache = useNexusStore((state) => state.setNotebooksCache);
  const toggleNotebookOpen = useNexusStore((state) => state.toggleNotebookOpen);
  const createNotebook = useNexusStore((state) => state.createNotebook);
  const logout = useNexusStore((state) => state.logout);
  const setGlobalApiKey = useNexusStore((state) => state.setGlobalApiKey);
  const setGlobalBaseUrl = useNexusStore((state) => state.setGlobalBaseUrl);
  const setProviderApiKey = useNexusStore((state) => state.setProviderApiKey);
  const setProviderBaseUrl = useNexusStore((state) => state.setProviderBaseUrl);
  const setProviderVerificationStatus = useNexusStore(
    (state) => state.setProviderVerificationStatus,
  );
  const lockProviderCredential = useNexusStore((state) => state.lockProviderCredential);
  const unlockProviderCredential = useNexusStore((state) => state.unlockProviderCredential);
  const deleteProviderCredential = useNexusStore((state) => state.deleteProviderCredential);
  const lockVault = useNexusStore((state) => state.lockVault);
  const unlockVault = useNexusStore((state) => state.unlockVault);
  const deleteApiKey = useNexusStore((state) => state.deleteApiKey);
  const updateThemeConfig = useNexusStore((state) => state.updateThemeConfig);
  const updateBranchingSettings = useNexusStore(
    (state) => state.updateBranchingSettings,
  );
  const updateSandboxCode = useNexusStore((state) => state.updateSandboxCode);
  const updateSandboxUrl = useNexusStore((state) => state.updateSandboxUrl);
  const saveArtifactToCloud = useNexusStore((state) => state.saveArtifactToCloud);
  const fetchArtifactsFromCloud = useNexusStore(
    (state) => state.fetchArtifactsFromCloud,
  );
  const updateGraphNodePosition = useNexusStore(
    (state) => state.updateGraphNodePosition,
  );
  const connectGraphAgents = useNexusStore((state) => state.connectGraphAgents);
  const removeGraphEdges = useNexusStore((state) => state.removeGraphEdges);
  const addWorkflowRuntimeNode = useNexusStore(
    (state) => state.addWorkflowRuntimeNode,
  );
  const updateWorkflowRuntimeNodeData = useNexusStore(
    (state) => state.updateWorkflowRuntimeNodeData,
  );
  const updateWorkflowRuntimeNodePosition = useNexusStore(
    (state) => state.updateWorkflowRuntimeNodePosition,
  );
  const connectWorkflowRuntimeNodes = useNexusStore(
    (state) => state.connectWorkflowRuntimeNodes,
  );
  const removeWorkflowRuntimeEdges = useNexusStore(
    (state) => state.removeWorkflowRuntimeEdges,
  );
  const runWorkflowRuntimeLiteFlow = useNexusStore(
    (state) => state.runWorkflowRuntimeLiteFlow,
  );
  const runTool = useNexusStore((state) => state.runTool);
  const historicalMessages = useNexusStore((state) => state.historicalMessages);
  const fetchHistoricalMessages = useNexusStore(
    (state) => state.fetchHistoricalMessages,
  );

  const workspace =
    workspaces.find((candidate) => candidate.id === activeWorkspaceId) ?? workspaces[0];
  const workspaceName = workspace?.name ?? "NEXUS // AI OPS";
  const themeConfig = workspace?.themeConfig;
  const branchingSettings = workspace?.settings.branchingSettings;
  const activeAgentId = workspace?.activeAgentId;
  const agents = workspace?.agents ?? EMPTY_AGENTS;
  const artifactVault = useMemo(
    () =>
      artifactVaultCache.ids
        .map((id) => artifactVaultCache.byId[id])
        .filter((artifact): artifact is ArtifactVaultRecord => Boolean(artifact)),
    [artifactVaultCache],
  );
  const effectiveStreamMode = useMemo(
    () => resolveAgentsStreamMode(authVault),
    [authVault],
  );

  const visibleAgents = agents.filter((agent) => !agent.minimized);
  const minimizedAgents = agents.filter((agent) => agent.minimized);
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const activeAgent =
    agents.find((agent) => agent.id === activeAgentId) ?? selectedAgent;
  const workflowRunning = Boolean(
    workspace?.graph.runtimeLite?.runs.some((run) => run.status === "running"),
  );
  const workflowRuntimeLite = workspace?.graph.runtimeLite;
  const workflowRuns = workflowRuntimeLite?.runs ?? [];
  const latestWorkflowRun =
    (workflowRuntimeLite?.lastRunId
      ? workflowRuns.find((run) => run.runId === workflowRuntimeLite.lastRunId)
      : undefined) ??
    workflowRuns.at(-1) ??
    null;
  const workflowLastError = workflowRuntimeLite?.lastError?.trim();
  const workflowFeedback = workflowLastError
    ? {
        detail: workflowLastError,
        status: "failed" as const,
        title: "Workflow Runtime Lite",
      }
    : workflowRunning
      ? {
          status: "running" as const,
          title: "Workflow Runtime Lite",
        }
      : latestWorkflowRun?.status === "success"
        ? {
            status: latestWorkflowRun.status,
            title: "Workflow Runtime Lite",
          }
        : latestWorkflowRun?.status === "failed" ||
            latestWorkflowRun?.status === "failed_interrupted"
          ? {
              detail: latestWorkflowRun.error ?? null,
              status: latestWorkflowRun.status,
              title: "Workflow Runtime Lite",
            }
          : latestWorkflowRun
            ? {
                status: latestWorkflowRun.status,
                title: "Workflow Runtime Lite",
              }
            : null;
  const branchAgent = agents.find((agent) => agent.id === branchAgentId);
  const activeTheme = themeMounted
    ? normalizeTheme(theme ?? resolvedTheme)
    : "cyberpunk";
  const [syncQueueStatus, setSyncQueueStatus] = useState<QueueStatusProjection>({
    conflicted: 0,
    failed: 0,
    pending: 0,
    syncing: 0,
  });

  const recoverWorkspaceAfterLogin = useCallback((userId: string) => {
    const state = useNexusStore.getState();
    const localWorkspace =
      state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
      state.workspaces[0];

    setWorkspaceRecoveryLoading(true);
    void buildLocalWorkspaceRecoveryContext(localWorkspace)
      .then(async (localRecovery) => {
        const [recovery, recoveryList] = await Promise.all([
          supabaseStateSyncManager.fetchLatestWorkspaceRecoveryState({
            ...localRecovery,
            userId,
          }),
          supabaseStateSyncManager.fetchWorkspaceRecoveryList({
            localChecksum: localRecovery.localChecksum,
            userId,
          }),
        ]);

        setWorkspaceRecoveryItems(recoveryList.items);

        return recovery;
      })
      .then((recovery) => {
        const result = applyWorkspaceRecoveryState(recovery);

        if (result.status === "applied") {
          setNotice("Workspace recovered from cloud");
        } else if (result.status === "conflicted") {
          console.warn("[Workspace Recovery Conflict]: local workspace is newer.", result);
        }
      })
      .catch((error) => {
        console.error("[Workspace Recovery Error]:", error);
      })
      .finally(() => {
        setWorkspaceRecoveryLoading(false);
      });
  }, [applyWorkspaceRecoveryState]);

  const recoverSelectedWorkspace = useCallback((workspaceId: string) => {
    const userId = useNexusStore.getState().authVault.user?.id;
    const state = useNexusStore.getState();
    const localWorkspace = state.workspaces.find(
      (candidate) => candidate.id === workspaceId,
    );

    if (!userId) {
      return;
    }

    setWorkspaceRecoveryLoading(true);
    void buildLocalWorkspaceRecoveryContext(localWorkspace)
      .then((localRecovery) =>
        supabaseStateSyncManager.fetchWorkspaceRecoveryState({
          ...localRecovery,
          userId,
          workspaceId,
        }),
      )
      .then((recovery) => {
        const result = applyWorkspaceRecoveryState(recovery);

        if (result.status === "applied") {
          setNotice("Workspace recovered from cloud");
        } else if (result.status === "conflicted") {
          setNotice("Recovery skipped: local workspace is newer");
        } else {
          setNotice("Workspace recovery skipped");
        }
      })
      .catch((error) => {
        console.error("[Workspace Recovery Error]:", error);
      })
      .finally(() => {
        setWorkspaceRecoveryLoading(false);
      });
  }, [applyWorkspaceRecoveryState]);

  const handleSessionUser = useCallback((user: IAuthVault["user"]) => {
    syncSupabaseSessionUser(user);

    if (!user) {
      recoveredLoginUserRef.current = null;
      return;
    }

    if (recoveredLoginUserRef.current === user.id) {
      return;
    }

    recoveredLoginUserRef.current = user.id;
    recoverWorkspaceAfterLogin(user.id);
  }, [recoverWorkspaceAfterLogin]);

  useEffect(() => {
    materializeDefaultWorkspace();
  }, [materializeDefaultWorkspace]);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      void localSyncQueueAdapter.getStatus().then((status) => {
        if (mounted) {
          setSyncQueueStatus(status);
        }
      });
    };
    const intervalId = window.setInterval(refresh, 2000);
    refresh();

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabaseStateSyncManager
      .fetchNotebooks()
      .then((notebooks) => {
        if (mounted) {
          setNotebooksCache(notebooks);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [setNotebooksCache]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setThemeMounted(true), 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    applyLegoThemeConfigToDom(themeConfig);
  }, [themeConfig, workspace?.id]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    void ensureNexusSupabaseClientConfigured()
      .then(() => {
        if (!mounted) {
          return;
        }

        const supabase = getNexusSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) {
            return;
          }

          handleSessionUser(session?.user ?? null);
        });
        unsubscribe = () => data.subscription.unsubscribe();

        return supabase.auth
          .getSession()
          .then(({ data: sessionData }) => {
            if (!mounted) {
              return;
            }

            handleSessionUser(sessionData.session?.user ?? null);
          })
          .catch(() => undefined)
          .finally(() => {
            if (mounted) {
              setAuthChecked(true);
            }
          });
      })
      .catch(() => {
        if (mounted) {
          window.setTimeout(() => setAuthChecked(true), 0);
        }
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [handleSessionUser]);

  useEffect(() => {
    setStreamMode(effectiveStreamMode);
  }, [effectiveStreamMode, setStreamMode]);

  useEffect(() => {
    const node = workspaceRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setWorkspaceSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = typeof event.key === "string" ? event.key.toLowerCase() : "";

      if (!key) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }

      if ((event.metaKey || event.ctrlKey) && key === "z") {
        if (shouldPreserveNativeUndo(event.target)) {
          return;
        }

        event.preventDefault();

        if (event.shiftKey) {
          useNexusStore.temporal.getState().redo();
          setNotice("Redo applied");
          return;
        }

        useNexusStore.temporal.getState().undo();
        setNotice("Undo applied");
      }

      if (key === "escape") {
        setPaletteOpen(false);
        setActiveRightPanel(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const notifyWorkflow = useCallback((message: string) => {
    window.setTimeout(() => setNotice(message), 0);
  }, []);

  const handleThemeChange = useCallback((nextTheme: NexusTheme) => {
    setTheme(nextTheme);
    setNotice(`Theme switched to ${themeOptions.find((option) => option.id === nextTheme)?.label ?? nextTheme}`);
  }, [setTheme]);

  const refreshMacros = useCallback(async () => {
    setMacrosLoading(true);
    setMacroError(undefined);

    try {
      const nextMacros = await supabaseStateSyncManager.fetchMacros();
      setMacros(nextMacros);
    } catch (error) {
      setMacroError(error instanceof Error ? error.message : "Macro fetch failed.");
    } finally {
      setMacrosLoading(false);
    }
  }, []);

  const refreshArtifacts = useCallback(async () => {
    setArtifactsLoading(true);
    setArtifactError(undefined);

    try {
      await fetchArtifactsFromCloud();
    } catch (error) {
      setArtifactError(error instanceof Error ? error.message : "Artifact fetch failed.");
    } finally {
      setArtifactsLoading(false);
    }
  }, [fetchArtifactsFromCloud]);

  const retryFailedSyncOperation = useCallback(() => {
    void localSyncQueueAdapter
      .getOperations()
      .then((operations) =>
        operations.find((operation) =>
          ["failed", "conflicted"].includes(operation.status),
        ),
      )
      .then((operation) => {
        if (!operation) {
          return undefined;
        }

        return localSyncQueueAdapter.retry(operation.clientMutationId);
      })
      .then(() => {
        setNotice("Sync retry queued.");
      })
      .catch(() => {
        setNotice("Sync retry could not be queued.");
      });
  }, []);

  useEffect(() => {
    if (activeRightPanel !== "workflows") {
      return;
    }

    window.setTimeout(() => {
      void refreshMacros();
    }, 0);
  }, [activeRightPanel, macroRefreshToken, refreshMacros]);

  useEffect(() => {
    if (activeRightPanel !== "artifacts") {
      return;
    }

    window.setTimeout(() => {
      void refreshArtifacts();
    }, 0);
  }, [activeRightPanel, artifactRefreshToken, refreshArtifacts]);

  const handleExport = useCallback(() => {
    const downloadSnapshot = (snapshot: WorkspaceSnapshot) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `nexus-ai-ops-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    };

    void localSyncQueueAdapter
      .getOperations()
      .then((operations) => {
        downloadSnapshot(
          exportActiveWorkspace({
            notebookRecovery: createNotebookRecoveryMetadata(operations),
          }),
        );
        setNotice("Workspace snapshot exported");
      })
      .catch((error) => {
        console.error("[Workspace Export Sync Metadata Error]:", error);
        downloadSnapshot(exportActiveWorkspace());
        setNotice("Workspace snapshot exported");
      });
  }, [exportActiveWorkspace]);

  const handleImport = useCallback(async (file?: File) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = parseWorkspaceSnapshot(text);
      const snapshot = JSON.parse(text) as Partial<WorkspaceSnapshot>;

      if (!result.ok) {
        throw new Error(result.error);
      }

      importWorkspace({
        schemaVersion: 1,
        deletedNotebooks: Array.isArray(snapshot.deletedNotebooks)
          ? snapshot.deletedNotebooks
          : undefined,
        exportedAt: new Date().toISOString(),
        notebookDrafts: Array.isArray(snapshot.notebookDrafts)
          ? snapshot.notebookDrafts
          : undefined,
        notebooks: Array.isArray(snapshot.notebooks) ? snapshot.notebooks : undefined,
        workspace: result.workspace,
      });
      setNotice("Workspace snapshot imported");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed");
    }
  }, [importWorkspace]);

  const openMacroComposer = useCallback(() => {
    if (!workspace) {
      return;
    }

    setMacroName(`${workspace.name} Blueprint`);
    setMacroDescription("Saved graph topology and agent configuration.");
    setMacroComposerOpen(true);
  }, [workspace]);

  const handleSaveMacro = useCallback(() => {
    const name = macroName.trim();

    if (!name) {
      setNotice("Macro name required before vault lock.");
      return;
    }

    saveCurrentCanvasAsMacro(name, macroDescription);
    setMacroComposerOpen(false);
    setNotice("Blueprint successfully locked into the Cloud Vault.");
    window.setTimeout(() => {
      setMacroRefreshToken((current) => current + 1);
    }, 900);
  }, [macroDescription, macroName, saveCurrentCanvasAsMacro]);

  const handleSpawnMacro = useCallback((macro: WorkflowTemplateRecord) => {
    const spawnedAgentIds = instantiateMacro(macro);

    if (!spawnedAgentIds.length) {
      setNotice(`Macro ${macro.name} has no agents to spawn`);
      return;
    }

    setViewMode("graph");
    setNotice(`Macro ${macro.name} spawned (${spawnedAgentIds.length} agents)`);
  }, [instantiateMacro, setViewMode]);

  const handleSaveSandboxArtifact = useCallback((agentId: string, content: string) => {
    saveArtifactToCloud(agentId, content, "sandbox");
    setNotice("Sandbox artifact saved to the Global Artifact Vault.");
    window.setTimeout(() => {
      setArtifactRefreshToken((current) => current + 1);
    }, 900);
  }, [saveArtifactToCloud]);

  const artifactRequestUserId = authVault.user?.id ?? "local-owner";
  const handleCopyArtifact = useCallback((artifact: ArtifactVaultRecord) => {
    void (async () => {
      try {
        const response = await nexusApiClient.get<ArtifactGetResponse>(
          `/api/v1/artifacts/${encodeURIComponent(artifact.id)}?workspaceId=${encodeURIComponent(artifact.workspaceId)}`,
          {
            userId: artifactRequestUserId,
            workspaceId: artifact.workspaceId,
          },
        );
        const payload =
          response.artifact.contentText ??
          response.artifact.contentUrl ??
          artifact.previewText ??
          artifact.contentUrl ??
          artifact.contentHash ??
          "";

        await navigator.clipboard.writeText(payload);
        setNotice("Artifact payload copied");
      } catch {
        setNotice("Clipboard unavailable for artifact payload");
      }
    })();
  }, [artifactRequestUserId]);

  const handleSend = useCallback(async (agentId: string, content: string) => {
    const trimmed = content.trim();

    if (!trimmed) {
      return;
    }

    const state = useNexusStore.getState();
    const workspace =
      state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
      state.workspaces[0];
    const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
    const model =
      agent?.model?.trim() ||
      workspace?.settings.model?.trim() ||
      "gpt-4o-mini";
    const runtimeCredential = resolveRuntimeCredentialForModel(
      state.authVault,
      model,
      agent?.provider ?? workspace?.settings.provider,
    );
    const safeKey = runtimeCredential.apiKey;
    const safeBaseUrl = runtimeCredential.baseUrl;
    const userId = state.authVault.user?.id;

    if (!agent || agent.status === "streaming" || agent.status === "thinking") {
      return;
    }

    const userMessage: AgentMessage = {
      id: makeId("message"),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: AgentMessage = {
      id: makeId("message"),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true,
    };

    let taskResponse: AgentTaskCreateResponse;

    try {
      taskResponse = await nexusApiClient.post<
        AgentTaskCreateResponse,
        AgentTaskCreateRequest
      >(
        `/api/v1/agents/${agentId}/tasks`,
        {
          inputMessageId: userMessage.id,
          metadata: {
            messageCount: agent.messages.length + 1,
          },
          model,
          outputMessageId: assistantMessage.id,
          provider: runtimeCredential.providerId,
          taskType: "chat",
          workspaceId: workspace.id,
        },
        {
          idempotencyKey: `task_${userMessage.id}`,
          userId,
          workspaceId: workspace.id,
        },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to create agent task.";

      setNotice(`${agent.callsign} task rejected: ${detail}`);
      useNexusStore.getState().setAgentStatus(agentId, "error");
      throw error instanceof Error ? error : new Error(detail);
    }

    const request: AgentStreamRequest = {
      model,
      modelSettings: agent.modelSettings ?? {},
      reasoningEffort: agent.modelSettings?.reasoningEffort,
      outputMessageId: assistantMessage.id,
      sessionId: taskResponse.session.id,
      taskId: taskResponse.task.id,
      workspaceId: workspace.id,
      agent: {
        identity: agent.identity,
        callsign: agent.callsign,
        title: agent.title,
        mission: agent.mission,
        executionPrompt: agent.executionPrompt,
        provider: runtimeCredential.providerId,
        model,
        memory: agent.memory,
        contextNotes: agent.contextNotes,
      },
      messages: [...agent.messages, userMessage]
        .filter((message) => message.role !== "system" && !message.streaming)
        .slice(-16)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    };

    state.focusAgent(agentId);
    state.addMessage(agentId, userMessage);
    state.addMessage(agentId, assistantMessage);
    state.setAgentStatus(agentId, "thinking");
    setNotice(
      safeKey
        ? `${agent.callsign} live stream opened via ${runtimeCredential.providerLabel}`
        : `${agent.callsign} mock stream opened; ${runtimeCredential.providerLabel} key missing`,
    );
    state.setStreamMode(safeKey ? "live" : "mock");

    let received = "";
    let firstTokenReceived = false;
    let streamFailed = false;
    let streamInterrupted = false;
    const controller = new AbortController();
    abortControllersRef.current.set(agentId, {
      controller,
      taskId: taskResponse.task.id,
      workspaceId: workspace.id,
    });

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
        "X-Workspace-Id": workspace.id,
      });

      if (userId) {
        headers.set("X-User-Id", userId);
      }

      const accessToken = await resolveSupabaseAccessToken();

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      if (safeKey) {
        headers.set(NEXUS_RUNTIME_AUTHORIZATION_HEADER, `Bearer ${safeKey}`);
      }
      headers.set("x-nexus-base-url", safeBaseUrl);
      headers.set("x-nexus-provider-id", runtimeCredential.providerId);

      const response = await fetchWithBackoff(
        `/api/v1/agents/${agentId}/stream`,
        {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify(request),
        },
        {
          onRetry: ({ attempt, delayMs, maxRetries, status }) => {
            const retryTarget = status ? `HTTP ${status}` : "network congestion";
            useNexusStore.getState().setAgentStatus(agentId, "thinking");
            setNotice(
              `${agent.callsign} backoff ${attempt}/${maxRetries}: ${retryTarget}, retrying in ${Math.round(delayMs / 1000)}s`,
            );
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Stream failed with ${response.status}.`);
      }

      await readStreamEvents(response, (event) => {
        if (event.type === "token") {
          const delta = event.delta ?? event.token ?? "";

          if (!delta) {
            return;
          }

          if (!firstTokenReceived) {
            firstTokenReceived = true;
            useNexusStore.getState().setAgentStatus(agentId, "streaming");
          }

          received += delta;
          useNexusStore
            .getState()
            .appendToMessage(agentId, assistantMessage.id, delta);
        }

        if (event.type === "reasoning") {
          const delta = event.delta ?? "";

          if (!delta) {
            return;
          }

          useNexusStore
            .getState()
            .appendReasoningToMessage(agentId, assistantMessage.id, delta);
        }

        if (event.type === "meta") {
          setNotice(event.detail ?? `${agent.callsign} task ${event.taskId ?? taskResponse.task.id} streaming`);
          if (event.mode) {
            useNexusStore.getState().setStreamMode(event.mode === "openai" ? "live" : "mock");
          }
        }
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown stream fault.";
      const interrupted =
        isAbortLikeError(error) || detail.toLowerCase().includes("abort");

      if (interrupted) {
        streamInterrupted = true;
        useNexusStore
          .getState()
          .appendToMessage(agentId, assistantMessage.id, "\n\n[interrupted]");
      } else {
        streamFailed = true;
        received += detail;
        useNexusStore
          .getState()
          .appendToMessage(agentId, assistantMessage.id, `\n\n[stream fault] ${detail}`);
        useNexusStore.getState().setAgentStatus(agentId, "error");
        setNotice(`${agent.callsign} stream failed: ${detail}`);
      }
    } finally {
      abortControllersRef.current.delete(agentId);
      useNexusStore
        .getState()
        .finishMessage(
          agentId,
          assistantMessage.id,
          streamInterrupted ? "Stream interrupted." : "Stream completed without payload.",
          streamInterrupted,
        );
      if (!streamFailed) {
        useNexusStore.getState().setAgentStatus(agentId, "idle");
      }
      useNexusStore.getState().updateAgentTelemetry(agentId, received.length);
      if (!streamFailed) {
        setNotice(`${agent.callsign} stream closed`);
      }
    }
  }, []);

  const handleRunWorkflowRuntimeLite = useCallback(async () => {
    setNotice("Workflow Runtime Lite started");

    try {
      const run = await runWorkflowRuntimeLiteFlow();

      if (!run) {
        setNotice("Workflow Runtime Lite could not start");
        return;
      }

      if (run.status === "success") {
        setNotice(`Workflow Runtime Lite completed: ${run.runId}`);
        return;
      }

      setNotice(run.error ?? "Workflow Runtime Lite failed");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Workflow Runtime Lite failed: ${error.message}`
          : "Workflow Runtime Lite failed",
      );
    }
  }, [runWorkflowRuntimeLiteFlow]);

  const handleCopyWorkflowOutput = useCallback(async (nodeId: string) => {
    const runtimeNode = useNexusStore
      .getState()
      .workspaces.find(
        (candidate) =>
          candidate.id === useNexusStore.getState().activeWorkspaceId,
      )
      ?.graph.runtimeLite?.nodes.find((node) => node.id === nodeId);
    const packet = runtimeNode?.outputSnapshot;
    const text = packet?.rawText || packet?.displayText || "";

    if (!text) {
      setNotice("Output node is still empty");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("Output copied");
    } catch {
      setNotice("Clipboard unavailable for output");
    }
  }, []);

  const handlePredictiveIntel = useCallback(async (agentId: string) => {
    const state = useNexusStore.getState();
    const workspace =
      state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
      state.workspaces[0];
    const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
    const lastAssistantMessage =
      [...(agent?.messages ?? [])]
        .reverse()
        .find((message) => message.role === "assistant" && !message.streaming)
        ?.content.trim() ?? "";
    const fallback = buildMockPredictiveIntelSuggestions({
      agent,
      lastAssistantMessage,
    });
    const runtimeCredential = resolveRuntimeCredentialForModel(
      state.authVault,
      agent?.model ?? workspace?.settings.model ?? "gpt-4o-mini",
      agent?.provider ?? workspace?.settings.provider,
    );
    const safeKey = runtimeCredential.apiKey;
    const safeBaseUrl = runtimeCredential.baseUrl;

    if (!agent || !lastAssistantMessage) {
      return fallback;
    }

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
      });

      if (safeKey) {
        headers.set("Authorization", `Bearer ${safeKey}`);
      }

      headers.set("x-nexus-base-url", safeBaseUrl);
      headers.set("x-nexus-provider-id", runtimeCredential.providerId);

      const response = await fetch("/api/predictive-intel", {
        method: "POST",
        headers,
        body: JSON.stringify({
          lastMessage: lastAssistantMessage,
          model: agent.model,
          agent: {
            callsign: agent.callsign,
            capabilityType: getCapabilityType(agent),
            mission: agent.mission,
            title: agent.title,
          },
          lastAssistantMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Predictive Intel failed with ${response.status}.`);
      }

      const data = (await response.json()) as {
        suggestions?: unknown;
      };
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.filter((item): item is string => typeof item === "string")
        : [];

      return suggestions.length === 3 ? suggestions : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const handleStop = useCallback((agentId: string) => {
    const active = abortControllersRef.current.get(agentId);

    active?.controller.abort();
    if (active?.taskId && active.workspaceId) {
      void nexusApiClient.post(
        `/api/v1/agents/${agentId}/tasks/${active.taskId}/cancel`,
        {
          workspaceId: active.workspaceId,
        },
        {
          idempotencyKey: `cancel_${active.taskId}`,
          userId: useNexusStore.getState().authVault.user?.id,
          workspaceId: active.workspaceId,
        },
      ).catch(() => undefined);
    }
    setNotice("Stream stop requested");
  }, []);

  const handleMediaGenerate = useCallback(async (agentId: string, content: string) => {
    const prompt = content.trim();

    if (!prompt) {
      return;
    }

    const state = useNexusStore.getState();
    const workspace =
      state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
      state.workspaces[0];
    const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
    const capabilityType = agent ? getCapabilityType(agent) : "chat";
    const globalApiKey = state.authVault.globalApiKey?.trim() ?? "";

    if (
      !agent ||
      !isMediaCapability(capabilityType) ||
      agent.status === "streaming" ||
      agent.status === "thinking"
    ) {
      return;
    }

    const executorId = capabilityType === "image" ? "real-image-gen" : "mock-video-gen";
    const tool = agent.tools.find((candidate) => candidate.executorId === executorId);
    const userMessage: AgentMessage = {
      id: makeId("message"),
      role: "user",
      content: `Generate ${capabilityType}: ${prompt}`,
      createdAt: new Date().toISOString(),
    };

    state.focusAgent(agentId);
    state.addMessage(agentId, userMessage);
    state.setAgentStatus(agentId, "thinking");
    setNotice(
      capabilityType === "image" && globalApiKey
        ? `${agent.callsign} DALL-E image generation queued`
        : `${agent.callsign} ${capabilityType} generation queued`,
    );

    if (!tool) {
      state.addMessage(agentId, {
        id: makeId("message"),
        role: "assistant",
        content:
          capabilityType === "image"
            ? "No image adapter is attached to this agent."
            : `No mock ${capabilityType} generator is attached to this agent.`,
        createdAt: new Date().toISOString(),
      });
      state.setAgentStatus(agentId, "idle");
      return;
    }

    try {
      await wait(180);
      useNexusStore.getState().setAgentStatus(agentId, "streaming");
      await useNexusStore.getState().runTool(agentId, tool.id, { prompt });
      useNexusStore.getState().updateAgentTelemetry(agentId, prompt.length + 640);
      setNotice(
        capabilityType === "image" && globalApiKey
          ? `${agent.callsign} DALL-E image generated`
          : `${agent.callsign} ${capabilityType} preview generated`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Media generator failed.";
      useNexusStore.getState().addMessage(agentId, {
        id: makeId("message"),
        role: "assistant",
        content: `[media fault] ${detail}`,
        createdAt: new Date().toISOString(),
      });
      useNexusStore.getState().setAgentStatus(agentId, "error");
    } finally {
      useNexusStore.getState().setAgentStatus(agentId, "idle");
    }
  }, []);

  useEffect(() => {
    workflowAgentSnapshotsRef.current.clear();
    processedWorkflowHandoffsRef.current.clear();
    workflowDispatchQueueRef.current = Promise.resolve();
    workflowQueueEpochRef.current += 1;
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!workspace) {
      workflowAgentSnapshotsRef.current.clear();
      return;
    }

    const { decisions, nextSnapshots } = evaluateWorkflowHandoffs({
      previousSnapshots: workflowAgentSnapshotsRef.current,
      processedHandoffKeys: processedWorkflowHandoffsRef.current,
      workspace,
    });

    workflowAgentSnapshotsRef.current = nextSnapshots;

    if (!decisions.length) {
      return;
    }

    const dispatchDecisions: WorkflowDispatchDecision[] = [];

    for (const decision of decisions) {
      processedWorkflowHandoffsRef.current.add(decision.handoffKey);

      if (decision.type === "blocked-cycle") {
        const cycleLabel = decision.cyclePath
          .map(
            (agentId) =>
              agents.find((candidate) => candidate.id === agentId)?.callsign ??
              agentId,
          )
          .join(" -> ");
        notifyWorkflow(`L2 handoff blocked: workflow loop detected (${cycleLabel})`);
        continue;
      }

      if (decision.type === "skipped-busy") {
        notifyWorkflow(
          `L2 handoff skipped: ${decision.targetAgent.callsign} is already processing.`,
        );
        continue;
      }

      if (decision.type === "skipped-unsupported") {
        notifyWorkflow(
          `L2 handoff skipped: ${decision.targetAgent.callsign} cannot process autonomous prompts yet.`,
        );
        continue;
      }

      dispatchDecisions.push(decision);
    }

    if (!dispatchDecisions.length) {
      return;
    }

    const queueEpoch = workflowQueueEpochRef.current;

    workflowDispatchQueueRef.current = workflowDispatchQueueRef.current
      .catch(() => undefined)
      .then(() =>
        queueWorkflowHandoffDispatches({
          decisions: dispatchDecisions,
          dispatch: (decision) => {
            if (workflowQueueEpochRef.current !== queueEpoch) {
              return;
            }

            notifyWorkflow(
              `L2 handoff: ${decision.sourceAgent.callsign} -> ${decision.targetAgent.callsign}`,
            );

            if (decision.targetAgent.capabilities.type === "chat") {
              void handleSend(decision.targetAgent.id, decision.prompt);
              return;
            }

            void handleMediaGenerate(decision.targetAgent.id, decision.prompt);
          },
        }),
      )
      .catch(() => {
        notifyWorkflow("L2 handoff queue recovered after a dispatch fault.");
      });
  }, [
    agents,
    handleMediaGenerate,
    handleSend,
    notifyWorkflow,
    workspace,
  ]);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      ...agentTemplates.map((template) => ({
        id: `spawn-${template.id}`,
        label: `Spawn ${template.callsign}`,
        detail: `${template.identity} / ${template.title}`,
        icon: <Plus className="h-4 w-4" />,
        run: () => {
          spawnAgent(template.id);
          setPaletteOpen(false);
          setNotice(`${template.callsign} spawned`);
        },
      })),
      {
        id: "arrange",
        label: "Arrange Workstations",
        detail: "Cascade visible agent windows",
        icon: <Layers3 className="h-4 w-4" />,
        run: () => {
          arrangeAgents(workspaceSize);
          setPaletteOpen(false);
          setNotice("Workspace arranged");
        },
      },
      {
        id: "restore",
        label: "Restore All",
        detail: "Bring minimized agents back online",
        icon: <Fullscreen className="h-4 w-4" />,
        run: () => {
          restoreAll();
          setPaletteOpen(false);
          setNotice("All workstations restored");
        },
      },
      {
        id: "minimize",
        label: "Minimize All",
        detail: "Collapse every active workstation",
        icon: <Minimize2 className="h-4 w-4" />,
        run: () => {
          minimizeAll();
          setPaletteOpen(false);
          setNotice("All workstations minimized");
        },
      },
      {
        id: "save",
        label: "Save Workspace Snapshot",
        detail: "Materialize the current workspace into local persistence",
        icon: <Save className="h-4 w-4" />,
        run: () => {
          saveWorkspaceSnapshot();
          setPaletteOpen(false);
          setNotice("Workspace snapshot saved");
        },
      },
      {
        id: "export",
        label: "Export Workspace",
        detail: "Download a portable NEXUS snapshot",
        icon: <Download className="h-4 w-4" />,
        run: () => {
          handleExport();
          setPaletteOpen(false);
        },
      },
      {
        id: "import",
        label: "Import Workspace",
        detail: "Load a NEXUS snapshot",
        icon: <Upload className="h-4 w-4" />,
        run: () => {
          fileInputRef.current?.click();
          setPaletteOpen(false);
        },
      },
      {
        id: "reset",
        label: "Reset Workspace",
        detail: "Reload the default command field",
        icon: <RefreshCcw className="h-4 w-4" />,
        run: () => {
          resetWorkspace();
          setPaletteOpen(false);
          setNotice("Workspace reset");
        },
      },
    ],
    [
      arrangeAgents,
      handleExport,
      minimizeAll,
      resetWorkspace,
      restoreAll,
      saveWorkspaceSnapshot,
      spawnAgent,
      workspaceSize,
    ],
  );

  if (!authChecked || !authVault.user) {
    return <AuthScreen checked={authChecked} />;
  }

  return (
    <main className="nexus-shell flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100">
      <input
        ref={fileInputRef}
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          void handleImport(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
        type="file"
      />

      <TopBar
        activeWorkspaceId={activeWorkspaceId}
        notice={notice}
        onCreateWorkspace={() => {
          const nextWorkspace = createWorkspace();
          setNotice(`Workspace ${nextWorkspace.name} created and synced to cloud.`);
        }}
        onExport={handleExport}
        onImport={() => fileInputRef.current?.click()}
        onOpenPalette={() => setPaletteOpen(true)}
        onRenameWorkspace={(name) => {
          renameWorkspace(name);
          setNotice("Workspace renamed");
        }}
        onRecoverWorkspace={recoverSelectedWorkspace}
        onSwitchWorkspace={(workspaceId) => {
          const target = workspaces.find((candidate) => candidate.id === workspaceId);
          switchWorkspace(workspaceId);
          setNotice(`${target?.name ?? "Workspace"} active`);
        }}
        onToggleSettings={() =>
          setActiveRightPanel((current) => (current ? null : "providers"))
        }
        onSave={() => {
          saveWorkspaceSnapshot();
          setNotice("Workspace snapshot saved");
        }}
        onSaveMacro={openMacroComposer}
        onSpawn={() => {
          const id = spawnAgent();
          focusAgent(id);
          setNotice("Agent spawned");
        }}
        onSyncRetry={retryFailedSyncOperation}
        settingsOpen={Boolean(activeRightPanel)}
        streamMode={effectiveStreamMode}
        syncStatus={syncQueueStatus}
        viewMode={viewMode}
        workspaceRecoveryItems={workspaceRecoveryItems}
        workspaceRecoveryLoading={workspaceRecoveryLoading}
        onSetViewMode={setViewMode}
        workspaceName={workspaceName}
        workspaces={workspaces}
      />

      <section className="flex min-h-0 flex-1 gap-2 p-2">
        <motion.aside
          animate={{ width: leftDockOpen ? 266 : 44 }}
          className="relative hidden h-full min-h-0 shrink-0 overflow-hidden xl:block"
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <SidebarToggleButton
            collapsed={!leftDockOpen}
            label={leftDockOpen ? "Collapse left sidebar" : "Expand left sidebar"}
            onClick={() => setLeftDockOpen((current) => !current)}
            side="left"
          />
          <AnimatePresence initial={false} mode="wait">
            {leftDockOpen ? (
              <motion.div
                key="left-expanded"
                animate={{ opacity: 1, x: 0 }}
                className="h-full min-h-0"
                exit={{ opacity: 0, x: -12 }}
                initial={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
              >
                <LeftDock
                  activeAgentId={activeAgentId}
                  agents={agents}
                  agentTemplateProfiles={
                    workspace?.settings.agentTemplateProfiles ?? {}
                  }
                  onFocus={focusAgent}
                  onRestore={restoreAgent}
                  onSelect={selectAgent}
                  onSpawn={(template) => {
                    const id = spawnAgent(template.id);
                    focusAgent(id);
                    setNotice(`${template.callsign} spawned`);
                  }}
                  onUpdateAgentModel={updateAgentModel}
                  onUpdateAgentModelSettings={updateAgentModelSettings}
                  onUpdateAgentTemplateProfile={updateAgentTemplateProfile}
                  selectedAgentId={selectedAgent?.id}
                />
              </motion.div>
            ) : (
              <CollapsedSidebarRail key="left-collapsed" label="Agents" side="left" />
            )}
          </AnimatePresence>
        </motion.aside>

        <section
          ref={workspaceRef}
          className="nexus-workspace nexus-scanline relative z-0 isolate min-h-0 min-w-0 flex-1 overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl"
        >
          {viewMode === "panels" ? (
            <>
              <AnimatePresence>
                {visibleAgents.map((agent) => (
                  <AgentWindow
                    key={agent.id}
                    agent={agent}
                    onClear={clearAgentMessages}
                    onClose={removeAgent}
                    onDuplicate={duplicateAgent}
                    onFocus={focusAgent}
                    onMinimize={minimizeAgent}
                    onGeneratePredictiveIntel={handlePredictiveIntel}
                    onGenerateMedia={handleMediaGenerate}
                    onOpenVaultManager={openVaultManager}
                    onOpenBranchInterface={setBranchAgentId}
                    promptsCache={promptsCache}
                    onSend={handleSend}
                    onStop={handleStop}
                    onToggleMaximize={(agentId) =>
                      toggleMaximizeAgent(agentId, workspaceSize)
                    }
                    onSaveArtifact={handleSaveSandboxArtifact}
                    onUpdateSandboxCode={updateSandboxCode}
                    onUpdateSandboxUrl={updateSandboxUrl}
                    onUpdateLayout={updateLayout}
                    historicalPage={
                      historicalMessages[`${activeWorkspaceId}::${agent.id}`]
                    }
                    onLoadHistory={fetchHistoricalMessages}
                    selected={agent.id === selectedAgent?.id}
                    workspaceId={activeWorkspaceId}
                  />
                ))}
              </AnimatePresence>

              <MinimizedRail agents={minimizedAgents} onRestore={restoreAgent} />
            </>
          ) : (
            <NexusGraph
              agents={agents}
              graph={workspace?.graph ?? EMPTY_GRAPH}
              onAddWorkflowNode={(type) => {
                addWorkflowRuntimeNode(type);
                setNotice(`${type} node added`);
              }}
              onConnectAgents={connectGraphAgents}
              onConnectWorkflowNodes={connectWorkflowRuntimeNodes}
              onCopyWorkflowOutput={handleCopyWorkflowOutput}
              onFocusAgent={selectAgent}
              onOpenAgent={(agentId) => {
                setViewMode("panels");
                focusAgent(agentId);
              }}
              onRemoveAgent={removeAgent}
              onRemoveEdges={removeGraphEdges}
              onRemoveWorkflowEdges={removeWorkflowRuntimeEdges}
              onRunWorkflow={() => {
                void handleRunWorkflowRuntimeLite();
              }}
              onUpdateWorkflowNodeData={updateWorkflowRuntimeNodeData}
              onUpdateWorkflowNodePosition={updateWorkflowRuntimeNodePosition}
              onUpdateNodePosition={updateGraphNodePosition}
              workflowFeedback={workflowFeedback}
              workflowRunning={workflowRunning}
            />
          )}

          <AnimatePresence>
            {openNotebookIds.map((notebookId) => (
              <DatapadWindow key={notebookId} notebookId={notebookId} />
            ))}
          </AnimatePresence>
        </section>

      </section>

      <RightFloatingDock
        activePanel={activeRightPanel}
        onTogglePanel={(panel) =>
          setActiveRightPanel((current) => (current === panel ? null : panel))
        }
      />

      <CommandPalette
        commands={commands}
        onClose={() => setPaletteOpen(false)}
        open={paletteOpen}
      />

      <MacroComposerModal
        description={macroDescription}
        name={macroName}
        onClose={() => setMacroComposerOpen(false)}
        onConfirm={handleSaveMacro}
        onDescriptionChange={setMacroDescription}
        onNameChange={setMacroName}
        open={macroComposerOpen}
      />

      <AnimatePresence>
        {isVaultManagerOpen && <PromptVaultManager />}
      </AnimatePresence>

      <AnimatePresence>
        {branchAgent ? (
          <AgentBranchModal
            agent={branchAgent}
            defaultRetentionRatio={
              branchingSettings?.defaultRetentionRatio
            }
            onBranchComplete={(newAgentId) => {
              focusAgent(newAgentId);
              setNotice("[BRANCH SECURED] New agent deployed to canvas.");
            }}
            onClose={() => setBranchAgentId(null)}
          />
        ) : null}
      </AnimatePresence>

      <AgentSettingsSidebar
        activeAgent={activeAgent}
        activePanel={activeRightPanel ?? "providers"}
        agents={agents}
        agent={selectedAgent}
        authVault={authVault}
        artifactError={artifactError}
        artifacts={artifactVault}
        artifactsLoading={artifactsLoading}
        workspaceId={workspace?.id ?? activeWorkspaceId}
        macroError={macroError}
        macros={macros}
        macrosLoading={macrosLoading}
        notebooks={notebooksCache}
        openNotebookIds={openNotebookIds}
        branchingSettings={branchingSettings}
        onAddAgent={(type) => {
          const id = spawnAgent(undefined, type);
          focusAgent(id);
          setNotice(`${type.toUpperCase()} agent spawned`);
        }}
        onClose={() => setActiveRightPanel(null)}
        onCopyArtifact={handleCopyArtifact}
        onCreateNotebook={() => {
          const id = createNotebook();
          setNotice("Global datapad created");
          return id;
        }}
        onRefreshArtifacts={refreshArtifacts}
        onRefreshMacros={refreshMacros}
        onSpawnMacro={handleSpawnMacro}
        onToggleNotebook={toggleNotebookOpen}
        onDeleteApiKey={deleteApiKey}
        onDeleteProviderCredential={deleteProviderCredential}
        onLockVault={lockVault}
        onLockProviderCredential={lockProviderCredential}
        onLogout={logout}
        onRunTool={runTool}
        onSelectAgent={selectAgent}
        onSetGlobalApiKey={setGlobalApiKey}
        onSetGlobalBaseUrl={setGlobalBaseUrl}
        onSetProviderApiKey={setProviderApiKey}
        onSetProviderBaseUrl={setProviderBaseUrl}
        onSetProviderVerificationStatus={setProviderVerificationStatus}
        onUnlockVault={unlockVault}
        onUnlockProviderCredential={unlockProviderCredential}
        onUpdateMemory={updateMemoryBlock}
        onUpdateAgentCallsign={updateAgentCallsign}
        onUpdateAgentProfile={updateAgentProfile}
        onSetAgentProfileLocked={setAgentProfileLocked}
        onUpdateMission={updateAgentMission}
        onUpdateThemeConfig={updateThemeConfig}
        onUpdateBranchingSettings={updateBranchingSettings}
        activeTheme={activeTheme}
        onSetTheme={handleThemeChange}
        onUpdateAgentModel={updateAgentModel}
        open={Boolean(activeRightPanel)}
        streamMode={effectiveStreamMode}
        themeConfig={themeConfig}
      />
    </main>
  );
}

function SidebarToggleButton({
  collapsed,
  label,
  onClick,
  side,
}: {
  collapsed: boolean;
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  const Icon =
    side === "left"
      ? collapsed
        ? ChevronRight
        : ChevronLeft
      : collapsed
        ? ChevronLeft
        : ChevronRight;

  return (
    <button
      aria-label={label}
      className={cx(
        "absolute top-3 z-[70] grid h-8 w-8 place-items-center border border-cyan-300/35 bg-slate-950/95 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:bg-cyan-300/10",
        side === "left" ? "right-1" : "left-1",
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CollapsedSidebarRail({
  label,
  side,
}: {
  label: string;
  side: "left" | "right";
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="nexus-panel flex h-full items-center justify-center"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
    >
      <div
        className={cx(
          "rotate-180 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500 [writing-mode:vertical-rl]",
          side === "right" && "text-cyan-200/70",
        )}
      >
        {label}
      </div>
    </motion.div>
  );
}

const rightDockPanels: Array<{
  id: RightDockPanelId;
  label: string;
  detail: string;
  icon: ReactNode;
}> = [
  {
    id: "intel",
    label: "Intel",
    detail: "Selected agent mission, memory, tools, and telemetry",
    icon: <PanelRight className="h-4 w-4" />,
  },
  {
    id: "providers",
    label: "Providers",
    detail: "Provider credentials, base URLs, and live verification",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    id: "models",
    label: "Models",
    detail: "Per-agent model routing and capability recognition",
    icon: <BrainCircuit className="h-4 w-4" />,
  },
  {
    id: "theme",
    label: "Theme",
    detail: "LEGO theme engine controls",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "memory",
    label: "Memory",
    detail: "Branching defaults and workspace datapads",
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: "artifacts",
    label: "Artifacts",
    detail: "Artifact vault references",
    icon: <Archive className="h-4 w-4" />,
  },
  {
    id: "workflows",
    label: "Workflows",
    detail: "Macro blueprint vault",
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    id: "trace",
    label: "Trace",
    detail: "Sync status and observability events",
    icon: <RadioTower className="h-4 w-4" />,
  },
  {
    id: "account",
    label: "Account",
    detail: "Operator identity and logout",
    icon: <Home className="h-4 w-4" />,
  },
];

function getRightDockPanelMeta(panel: RightDockPanelId) {
  return rightDockPanels.find((candidate) => candidate.id === panel) ?? rightDockPanels[1];
}

function RightFloatingDock({
  activePanel,
  onTogglePanel,
}: {
  activePanel: RightDockPanelId | null;
  onTogglePanel: (panel: RightDockPanelId) => void;
}) {
  return (
    <nav
      aria-label="Right workspace tools"
      className="pointer-events-none fixed right-3 top-1/2 z-[130] hidden -translate-y-1/2 xl:block"
    >
      <div className="pointer-events-auto grid gap-2 border border-cyan-300/25 bg-slate-950/90 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_32px_rgba(34,211,238,0.14)] backdrop-blur-xl">
        {rightDockPanels.map((panel) => (
          <button
            key={panel.id}
            aria-label={panel.label}
            aria-pressed={activePanel === panel.id}
            className={cx(
              "grid h-9 w-9 place-items-center border text-slate-400 transition",
              activePanel === panel.id
                ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-black/25 hover:border-cyan-300/35 hover:text-cyan-100",
            )}
            onClick={() => onTogglePanel(panel.id)}
            title={panel.label}
            type="button"
          >
            {panel.icon}
          </button>
        ))}
      </div>
    </nav>
  );
}

function TopBar({
  activeWorkspaceId,
  workspaceName,
  workspaces,
  notice,
  onCreateWorkspace,
  onOpenPalette,
  onSpawn,
  onImport,
  onExport,
  onSave,
  onSaveMacro,
  onRenameWorkspace,
  onRecoverWorkspace,
  onSwitchWorkspace,
  onSyncRetry,
  onToggleSettings,
  settingsOpen,
  streamMode,
  syncStatus,
  viewMode,
  workspaceRecoveryItems,
  workspaceRecoveryLoading,
  onSetViewMode,
}: {
  activeWorkspaceId: string;
  workspaceName: string;
  workspaces: NexusWorkspace[];
  notice: string;
  onCreateWorkspace: () => void;
  onOpenPalette: () => void;
  onSpawn: () => void;
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onSaveMacro: () => void;
  onRenameWorkspace: (name: string) => void;
  onRecoverWorkspace: (workspaceId: string) => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onSyncRetry: () => void;
  onToggleSettings: () => void;
  settingsOpen: boolean;
  streamMode: StreamMode;
  syncStatus: QueueStatusProjection;
  viewMode: WorkspaceViewMode;
  workspaceRecoveryItems: WorkspaceRecoveryListItem[];
  workspaceRecoveryLoading: boolean;
  onSetViewMode: (mode: WorkspaceViewMode) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(workspaceName);
  const [menuOpen, setMenuOpen] = useState(false);

  function cancelRename() {
    setDraftName(workspaceName);
    setRenaming(false);
  }

  function openRename() {
    setDraftName(workspaceName);
    setRenaming(true);
  }

  function commitRename(event?: FormEvent) {
    event?.preventDefault();
    const nextName = draftName.trim();

    if (nextName && nextName !== workspaceName) {
      onRenameWorkspace(nextName);
    }

    setRenaming(false);
  }

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3">
      <div className="relative">
        <button
          aria-expanded={menuOpen}
          aria-label="Workspace menu"
          className="flex h-8 max-w-[min(420px,calc(100vw-24px))] items-center gap-2 border border-cyan-300/25 bg-cyan-300/[0.045] px-2.5 text-left text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <Menu className="h-4 w-4 shrink-0" />
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em]">
            {workspaceName}
          </span>
          <ChevronDown
            className={cx("h-3.5 w-3.5 shrink-0 transition", menuOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute left-0 top-[calc(100%+8px)] z-[90] w-[min(420px,calc(100vw-24px))] border border-cyan-300/30 bg-slate-950/96 p-2 shadow-[0_22px_80px_rgba(0,0,0,0.55),0_0_36px_rgba(34,211,238,0.12)] backdrop-blur-xl"
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
            >
              <div className="border-b border-white/10 px-2 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-200/70">
                      Workspace
                    </div>
                    <div className="mt-1 truncate font-mono text-sm uppercase tracking-[0.14em] text-white">
                      {workspaceName}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{notice}</div>
                  </div>
                  <span
                    className={cx(
                      "shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
                      streamModeTone(streamMode),
                    )}
                  >
                    STREAM: {streamMode}
                  </span>
                </div>

                {renaming ? (
                  <form className="mt-3 flex items-center gap-2" onSubmit={commitRename}>
                    <input
                      aria-label="Workspace name"
                      autoFocus
                      className="min-w-0 flex-1 border border-cyan-300/30 bg-black/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-white outline-none transition focus:border-cyan-200"
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      value={draftName}
                    />
                    <button
                      aria-label="Apply workspace name"
                      className="grid h-8 w-8 place-items-center border border-emerald-300/40 bg-emerald-300/10 text-emerald-100 transition hover:bg-emerald-300/20"
                      type="submit"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Cancel workspace rename"
                      className="grid h-8 w-8 place-items-center border border-white/10 bg-white/[0.045] text-slate-400 transition hover:text-white"
                      onClick={cancelRename}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    className="mt-3 inline-flex h-7 items-center gap-2 border border-white/10 bg-white/[0.035] px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-100"
                    onClick={openRename}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </button>
                )}
              </div>

              <div className="grid gap-2 border-b border-white/10 p-2">
                <div className="grid grid-cols-2 gap-1">
                  {(["panels", "graph"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cx(
                        "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition",
                        viewMode === mode
                          ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
                          : "border-white/10 bg-white/[0.025] text-slate-500 hover:text-slate-200",
                      )}
                      onClick={() => {
                        onSetViewMode(mode);
                        setMenuOpen(false);
                      }}
                      type="button"
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="cyber-scroll max-h-44 overflow-y-auto">
                  {workspaces.map((workspace) => {
                    const active = workspace.id === activeWorkspaceId;

                    return (
                      <button
                        key={workspace.id}
                        className={cx(
                          "mb-1 flex w-full items-center gap-3 border px-3 py-2 text-left transition",
                          active
                            ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-50"
                            : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10",
                        )}
                        onClick={() => {
                          setMenuOpen(false);
                          onSwitchWorkspace(workspace.id);
                        }}
                        type="button"
                      >
                        <span
                          className={cx(
                            "grid h-7 w-7 shrink-0 place-items-center border",
                            active
                              ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                              : "border-white/10 bg-black/20 text-slate-500",
                          )}
                        >
                          {active ? <Check className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs uppercase tracking-[0.16em]">
                            {workspace.name}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            {workspace.id}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-300/20"
                  onClick={() => {
                    setMenuOpen(false);
                    onCreateWorkspace();
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Workspace
                </button>
              </div>

              {(workspaceRecoveryItems.length || workspaceRecoveryLoading) ? (
                <div className="grid gap-1 border-b border-white/10 p-2">
                  <div className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    Cloud Recovery
                  </div>
                  {workspaceRecoveryLoading ? (
                    <div className="border border-white/10 bg-white/[0.025] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Refreshing
                    </div>
                  ) : null}
                  {workspaceRecoveryItems.map((item) => (
                    <button
                      key={item.workspaceId}
                      className={cx(
                        "flex w-full items-center gap-3 border px-3 py-2 text-left transition",
                        item.isLocalChecksumMatch
                          ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10",
                      )}
                      onClick={() => {
                        setMenuOpen(false);
                        onRecoverWorkspace(item.workspaceId);
                      }}
                      type="button"
                    >
                      <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs uppercase tracking-[0.14em]">
                          {item.workspaceName}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                          {item.isLocalChecksumMatch ? "Current checksum" : item.updatedAt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-1 p-2">
                <TopMenuAction icon={<Command className="h-3.5 w-3.5" />} label="Palette" onClick={() => {
                  setMenuOpen(false);
                  onOpenPalette();
                }} />
                <TopMenuAction icon={<Plus className="h-3.5 w-3.5" />} label="Spawn" onClick={() => {
                  setMenuOpen(false);
                  onSpawn();
                }} />
                <TopMenuAction icon={<Save className="h-3.5 w-3.5" />} label="Save" onClick={() => {
                  setMenuOpen(false);
                  onSave();
                }} />
                {viewMode === "graph" ? (
                  <TopMenuAction icon={<Archive className="h-3.5 w-3.5" />} label="Pack" onClick={() => {
                    setMenuOpen(false);
                    onSaveMacro();
                  }} />
                ) : null}
                <TopMenuAction icon={<FileUp className="h-3.5 w-3.5" />} label="Import" onClick={() => {
                  setMenuOpen(false);
                  onImport();
                }} />
                <TopMenuAction icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={() => {
                  setMenuOpen(false);
                  onExport();
                }} />
                <TopMenuAction
                  active={settingsOpen}
                  icon={<Settings className="h-3.5 w-3.5" />}
                  label="Settings"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleSettings();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <SyncBadge status={syncStatus} onRetry={onSyncRetry} />
      </div>
    </header>
  );
}

function SyncBadge({
  onRetry,
  status,
}: {
  onRetry: () => void;
  status: QueueStatusProjection;
}) {
  const hasIssue = status.failed > 0 || status.conflicted > 0;
  const active = status.pending > 0 || status.syncing > 0;
  const label = hasIssue
    ? `${status.failed + status.conflicted} sync issue`
    : active
      ? `${status.pending + status.syncing} syncing`
      : "Synced";

  return (
    <button
      aria-label={hasIssue ? "Retry failed sync operation" : "Sync status"}
      className={cx(
        "inline-flex h-8 items-center gap-2 border px-2 font-mono text-[9px] uppercase tracking-[0.14em] transition",
        hasIssue
          ? "border-rose-300/45 bg-rose-300/12 text-rose-100 hover:bg-rose-300/20"
          : active
            ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
            : "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100",
      )}
      onClick={hasIssue ? onRetry : undefined}
      type="button"
    >
      {hasIssue ? <RefreshCcw className="h-3.5 w-3.5" /> : <RadioTower className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function TopMenuAction({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cx(
        "inline-flex h-8 items-center justify-center gap-2 border px-2 font-mono text-[9px] uppercase tracking-[0.14em] transition",
        active
          ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
          : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/35 hover:text-cyan-100",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function MacroComposerModal({
  description,
  name,
  onClose,
  onConfirm,
  onDescriptionChange,
  onNameChange,
  open,
}: {
  description: string;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  onDescriptionChange: (value: string) => void;
  onNameChange: (value: string) => void;
  open: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[140] grid place-items-center bg-black/68 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.form
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-[min(520px,calc(100vw-32px))] border border-fuchsia-300/35 bg-slate-950/96 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.62),0_0_52px_rgba(217,70,239,0.16)]"
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            onSubmit={submit}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-fuchsia-100">
                  <PackageCheck className="h-4 w-4" />
                  Pack Workflow
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Freeze the current graph topology, agent configs, and visual wiring
                  into a reusable cloud blueprint.
                </p>
              </div>
              <IconButton label="Close macro composer" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Macro Name
              </span>
              <input
                autoFocus
                className="mt-2 w-full border border-fuchsia-300/25 bg-black/35 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/70"
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="NEXUS Incident Response Mesh"
                type="text"
                value={name}
              />
            </label>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Description
              </span>
              <textarea
                className="mt-2 min-h-28 w-full resize-none border border-white/10 bg-black/35 px-3 py-2.5 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/70"
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Describe when this blueprint should be spawned."
                value={description}
              />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="border border-white/10 bg-white/[0.045] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:text-white"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="border border-fuchsia-300/45 bg-fuchsia-300/12 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-300/22 disabled:opacity-40"
                disabled={!name.trim()}
                type="submit"
              >
                Confirm Vault Lock
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProviderVaultPanel({
  authVault,
  onDeleteProviderCredential,
  onLockProviderCredential,
  onSetProviderApiKey,
  onSetProviderBaseUrl,
  onSetProviderVerificationStatus,
  onUnlockProviderCredential,
}: {
  authVault: IAuthVault;
  onDeleteProviderCredential: (providerId: string) => void;
  onLockProviderCredential: (providerId: string) => void;
  onSetProviderApiKey: (providerId: string, key: string) => void;
  onSetProviderBaseUrl: (providerId: string, baseUrl: string) => void;
  onSetProviderVerificationStatus: (
    providerId: string,
    status: "untested" | "verified" | "failed",
    error?: string,
  ) => void;
  onUnlockProviderCredential: (providerId: string) => void;
}) {
  const providerId = "deepseek";
  const provider = PROVIDER_REGISTRY[providerId];
  const credential = authVault.providerCredentials?.[providerId];
  const [keyDraft, setKeyDraft] = useState("");
  const [baseUrlDraft, setBaseUrlDraft] = useState(
    credential?.baseUrl ?? provider.defaultBaseUrl ?? "",
  );
  const [verifying, setVerifying] = useState(false);
  const deepseekModels = getModelOptionsForCapability("chat").filter(
    (model) => model.provider === providerId,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setBaseUrlDraft(credential?.baseUrl ?? provider.defaultBaseUrl ?? "");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [credential?.baseUrl, provider.defaultBaseUrl]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!credential?.apiKey || credential.isLocked) {
        setKeyDraft("");
        return;
      }

      setKeyDraft(credential.apiKey);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [credential?.apiKey, credential?.isLocked]);

  const verifyProvider = async () => {
    const apiKey = credential?.apiKey?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";

    if (!apiKey || verifying) {
      return;
    }

    setVerifying(true);

    try {
      const response = await fetch("/api/v1/providers/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "x-nexus-base-url": baseUrlDraft,
        },
        body: JSON.stringify({
          baseUrl: baseUrlDraft,
          model: "deepseek-v4-pro",
          providerId,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        verified?: boolean;
      };

      if (!response.ok || !data.verified) {
        onSetProviderVerificationStatus(
          providerId,
          "failed",
          data.error ?? "Live verification failed.",
        );
        return;
      }

      onSetProviderVerificationStatus(providerId, "verified");
    } catch (error) {
      onSetProviderVerificationStatus(
        providerId,
        "failed",
        error instanceof Error ? error.message : "Live verification failed.",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="mb-4 border border-cyan-300/25 bg-cyan-300/[0.045] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
            Providers / Model Vault
          </div>
          <div className="mt-1 text-xs text-slate-500">
            DeepSeek is routed through the provider registry.
          </div>
        </div>
        <span
          className={cx(
            "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
            credential?.verificationStatus === "verified"
              ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
              : credential?.verificationStatus === "failed"
                ? "border-rose-300/35 bg-rose-300/10 text-rose-100"
                : "border-amber-300/35 bg-amber-300/10 text-amber-100",
          )}
        >
          {credential?.verificationStatus ?? "untested"}
        </span>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
            DeepSeek Base URL
          </span>
          <input
            className="w-full border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
            onBlur={() => onSetProviderBaseUrl(providerId, baseUrlDraft)}
            onChange={(event) => setBaseUrlDraft(event.target.value)}
            placeholder={provider.defaultBaseUrl}
            spellCheck={false}
            type="url"
            value={baseUrlDraft}
          />
        </label>

        {credential?.apiKey && credential.isLocked ? (
          <div className="border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-sm text-slate-300">
            ••••••••••••••••
          </div>
        ) : (
          <input
            autoComplete="new-password"
            className="w-full border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
            onChange={(event) => setKeyDraft(event.target.value)}
            placeholder="DeepSeek API key"
            type="password"
            value={keyDraft}
          />
        )}

        <div className="grid grid-cols-4 gap-2">
          <button
            className="border border-emerald-300/35 bg-emerald-300/10 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-40"
            disabled={!keyDraft.trim()}
            onClick={() => {
              onSetProviderBaseUrl(providerId, baseUrlDraft);
              onSetProviderApiKey(providerId, keyDraft);
              onLockProviderCredential(providerId);
              setKeyDraft("");
            }}
            type="button"
          >
            Save
          </button>
          <button
            className="border border-cyan-300/35 bg-cyan-300/10 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
            disabled={!credential?.apiKey}
            onClick={() =>
              credential?.isLocked
                ? onUnlockProviderCredential(providerId)
                : onLockProviderCredential(providerId)
            }
            type="button"
          >
            {credential?.isLocked ? "Unlock" : "Lock"}
          </button>
          <button
            className="border border-cyan-300/35 bg-cyan-300/10 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
            disabled={!credential?.apiKey || verifying}
            onClick={() => void verifyProvider()}
            type="button"
          >
            {verifying ? "Checking" : "Verify"}
          </button>
          <button
            className="border border-rose-300/35 bg-rose-300/10 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-300/20 disabled:opacity-40"
            disabled={!credential?.apiKey}
            onClick={() => onDeleteProviderCredential(providerId)}
            type="button"
          >
            Delete
          </button>
        </div>

        {credential?.verificationError ? (
          <div className="border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-[11px] text-rose-100">
            {credential.verificationError}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {deepseekModels.map((model) => {
          const capability = getModelCapabilityProfile(model.id);
          const thinking = capability?.thinking;
          const effortMap = thinking?.providerReasoningEffortMap;

          return (
            <article key={model.id} className="border border-white/10 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white">
                    {model.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{model.id}</div>
                </div>
                <span className="border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100">
                  {model.tier ?? "standard"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                  Provider: {provider.label}
                </span>
                <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                  Thinking: {thinking?.supported ? "Supported" : "No"}
                </span>
                <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                  Default: {thinking?.defaultEnabled ? "On" : "Off"}
                </span>
                <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                  Live: {credential?.verificationStatus === "verified" ? "Verified" : "Untested"}
                </span>
              </div>
              {thinking?.supported ? (
                <div className="mt-3 border border-cyan-300/20 bg-cyan-300/[0.04] p-2 text-[11px] leading-5 text-slate-400">
                  <div>
                    Effort: {thinking.supportedReasoningEfforts.join(" / ")}; xhigh maps
                    to {effortMap?.xhigh ?? "xhigh"}
                  </div>
                  <div>Disabled params: {thinking.disabledRequestParams.join(", ")}</div>
                  <div>Reasoning field: {thinking.responseReasoningField ?? "none"}</div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AgentSettingsSidebar({
  open,
  activeAgent,
  activePanel,
  activeTheme,
  agent,
  agents,
  authVault,
  artifactError,
  artifacts,
  artifactsLoading,
  workspaceId,
  macroError,
  macros,
  macrosLoading,
  notebooks,
  openNotebookIds,
  branchingSettings,
  streamMode,
  themeConfig,
  onAddAgent,
  onClose,
  onCopyArtifact,
  onCreateNotebook,
  onDeleteApiKey,
  onDeleteProviderCredential,
  onLockVault,
  onLockProviderCredential,
  onLogout,
  onRefreshArtifacts,
  onRefreshMacros,
  onRunTool,
  onSelectAgent,
  onSetGlobalApiKey,
  onSetGlobalBaseUrl,
  onSetProviderApiKey,
  onSetProviderBaseUrl,
  onSetProviderVerificationStatus,
  onSetAgentProfileLocked,
  onSpawnMacro,
  onToggleNotebook,
  onUnlockVault,
  onUnlockProviderCredential,
  onUpdateBranchingSettings,
  onUpdateMemory,
  onUpdateAgentCallsign,
  onUpdateAgentProfile,
  onUpdateMission,
  onUpdateThemeConfig,
  onUpdateAgentModel,
  onSetTheme,
}: {
  open: boolean;
  activeAgent?: NexusAgent;
  activePanel: RightDockPanelId;
  activeTheme: NexusTheme;
  agent?: NexusAgent;
  agents: NexusAgent[];
  authVault: IAuthVault;
  artifactError?: string;
  artifacts: ArtifactVaultRecord[];
  artifactsLoading: boolean;
  workspaceId: string;
  macroError?: string;
  macros: WorkflowTemplateRecord[];
  macrosLoading: boolean;
  notebooks: NotebookRecord[];
  openNotebookIds: string[];
  branchingSettings?: WorkspaceBranchingSettings;
  streamMode: StreamMode;
  themeConfig?: WorkspaceThemeConfig;
  onAddAgent: (type: AgentCreationCapabilityType) => void;
  onClose: () => void;
  onCopyArtifact: (artifact: ArtifactVaultRecord) => void;
  onCreateNotebook: () => string;
  onDeleteApiKey: () => void;
  onDeleteProviderCredential: (providerId: string) => void;
  onLockVault: () => void;
  onLockProviderCredential: (providerId: string) => void;
  onLogout: () => void;
  onRefreshArtifacts: () => void;
  onRefreshMacros: () => void;
  onRunTool: (agentId: string, toolId: string) => Promise<void>;
  onSelectAgent: (agentId: string) => void;
  onSetGlobalApiKey: (key: string) => void;
  onSetGlobalBaseUrl: (baseUrl: string) => void;
  onSetProviderApiKey: (providerId: string, key: string) => void;
  onSetProviderBaseUrl: (providerId: string, baseUrl: string) => void;
  onSetProviderVerificationStatus: (
    providerId: string,
    status: "untested" | "verified" | "failed",
    error?: string,
  ) => void;
  onSetAgentProfileLocked: (agentId: string, locked: boolean) => void;
  onSpawnMacro: (macro: WorkflowTemplateRecord) => void;
  onToggleNotebook: (id: string) => void;
  onUnlockVault: () => void;
  onUnlockProviderCredential: (providerId: string) => void;
  onUpdateBranchingSettings: (settings: Partial<WorkspaceBranchingSettings>) => void;
  onUpdateMemory: (agentId: string, memoryId: string, content: string) => void;
  onUpdateAgentCallsign: (agentId: string, callsign: string) => void;
  onUpdateAgentProfile: (agentId: string, profile: AgentProfileUpdate) => void;
  onUpdateMission: (agentId: string, mission: string) => void;
  onUpdateThemeConfig: (config: Partial<WorkspaceThemeConfig>) => void;
  onUpdateAgentModel: (agentId: string, model: string) => void;
  onSetTheme: (theme: NexusTheme) => void;
}) {
  const [newAgentType, setNewAgentType] =
    useState<AgentCreationCapabilityType>("chat");
  const [vaultKeyDraft, setVaultKeyDraft] = useState("");
  const [vaultBaseUrlDraft, setVaultBaseUrlDraft] = useState(
    authVault.globalBaseUrl ?? DEFAULT_BASE_URL,
  );
  const [traceEvents, setTraceEvents] = useState<SystemEventRecord[]>([]);
  const [traceEventsCursor, setTraceEventsCursor] = useState<string | null>(null);
  const [traceEventsHasMore, setTraceEventsHasMore] = useState(false);
  const [traceEventsLoading, setTraceEventsLoading] = useState(false);
  const [traceEventsError, setTraceEventsError] = useState<string | undefined>();
  const traceViewerUserId = authVault.user?.id ?? "local-owner";
  const panelMeta = getRightDockPanelMeta(activePanel);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!authVault.globalApiKey || authVault.isLocked) {
        setVaultKeyDraft("");
        return;
      }

      setVaultKeyDraft(authVault.globalApiKey);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authVault.globalApiKey, authVault.isLocked]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVaultBaseUrlDraft(authVault.globalBaseUrl ?? DEFAULT_BASE_URL);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authVault.globalBaseUrl]);

  const loadTraceEvents = useCallback(async (mode: "next" | "reset" = "reset") => {
    setTraceEventsLoading(true);
    setTraceEventsError(undefined);

    try {
      const params = new URLSearchParams({
        limit: "20",
        workspaceId,
      });

      if (mode === "next" && traceEventsCursor) {
        params.set("cursor", traceEventsCursor);
      }

      const response = await nexusApiClient.get<SystemEventListResponse>(
        `/api/v1/observability/events?${params.toString()}`,
        {
          userId: traceViewerUserId,
          workspaceId,
        },
      );

      setTraceEvents((current) =>
        mode === "next" ? [...current, ...response.events] : response.events,
      );
      setTraceEventsCursor(response.nextCursor ?? null);
      setTraceEventsHasMore(response.hasMore);
    } catch (error) {
      setTraceEventsError(
        error instanceof Error ? error.message : "Trace events unavailable.",
      );
    } finally {
      setTraceEventsLoading(false);
    }
  }, [traceEventsCursor, traceViewerUserId, workspaceId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
	          className="fixed bottom-3 right-3 top-[88px] z-[120] flex w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden border border-cyan-300/25 bg-slate-950/88 shadow-[0_24px_90px_rgba(0,0,0,0.55),0_0_44px_rgba(34,211,238,0.14)] backdrop-blur-xl xl:right-16"
          exit={{ opacity: 0, x: 36 }}
          initial={{ opacity: 0, x: 48 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
	          <header className="flex items-center justify-between border-b border-white/10 bg-cyan-300/[0.04] p-4">
	            <div>
	              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100">
	                {panelMeta.label}
	              </div>
	              <div className="mt-1 text-xs text-slate-500">{panelMeta.detail}</div>
	            </div>
	            <IconButton label="Close panel" onClick={onClose}>
	              <X className="h-4 w-4" />
	            </IconButton>
	          </header>

          <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto p-4">
	            <div
	              className={cx(
	                "mb-4 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]",
	                streamModeTone(streamMode),
	              )}
	            >
	              STREAM: {streamMode}
	            </div>

	            {activePanel === "intel" ? (
		              <RightIntel
		                activeAgent={activeAgent}
		                agent={agent}
                    agents={agents}
                    selectedAgentId={agent?.id}
                    onSelectAgent={onSelectAgent}
		                onRunTool={onRunTool}
                    onSetAgentProfileLocked={onSetAgentProfileLocked}
                    onUpdateAgentCallsign={onUpdateAgentCallsign}
                    onUpdateAgentProfile={onUpdateAgentProfile}
		                onUpdateMemory={onUpdateMemory}
		                onUpdateMission={onUpdateMission}
		              />
	            ) : null}

	            {activePanel === "providers" ? (
	              <ProviderVaultPanel
	                authVault={authVault}
	                onDeleteProviderCredential={onDeleteProviderCredential}
	                onLockProviderCredential={onLockProviderCredential}
	                onSetProviderApiKey={onSetProviderApiKey}
	                onSetProviderBaseUrl={onSetProviderBaseUrl}
	                onSetProviderVerificationStatus={onSetProviderVerificationStatus}
	                onUnlockProviderCredential={onUnlockProviderCredential}
	              />
	            ) : null}

	            <section
	              className={cx(
	                "mb-4 border border-white/10 bg-white/[0.025] p-2",
	                activePanel !== "theme" && "hidden",
	              )}
	            >
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
                Theme / Style
              </div>
              <div className="flex origin-left scale-75 flex-wrap gap-1">
                {themeOptions.map((option) => (
                  <button
                    key={option.id}
                    aria-pressed={activeTheme === option.id}
                    className={cx(
                      "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition",
                      activeTheme === option.id
                        ? "border-primary/45 bg-primary/12 text-primary"
                        : "border-white/10 bg-black/20 text-muted hover:text-soft",
                    )}
                    onClick={() => onSetTheme(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

	            {activePanel === "theme" ? (
	              <LegoThemeEngineControls
	                onCommitThemeConfig={onUpdateThemeConfig}
	                themeConfig={themeConfig}
	              />
	            ) : null}

	            <section
	              className={cx(
	                "mb-4 border border-fuchsia-300/25 bg-fuchsia-300/[0.045] p-3 shadow-[0_0_28px_rgba(217,70,239,0.08)]",
	                activePanel !== "memory" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                    🧬 Branching & Memory Compression
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Global defaults for summary branch extraction
                  </div>
                </div>
                <span className="border border-fuchsia-300/30 bg-fuchsia-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fuchsia-100">
                  {branchingSettings?.defaultRetentionRatio ??
                    DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio}
                  %
                </span>
              </div>

              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Default Summary Retention Ratio
                </span>
                <input
                  className="accent-fuchsia-300"
                  max={100}
                  min={5}
                  onChange={(event) =>
                    onUpdateBranchingSettings({
                      defaultRetentionRatio: Number(event.target.value),
                    })
                  }
                  type="range"
                  value={
                    branchingSettings?.defaultRetentionRatio ??
                    DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio
                  }
                />
                <span className="text-xs leading-5 text-slate-400">
                  New summary branches start by retaining the most important{" "}
                  {branchingSettings?.defaultRetentionRatio ??
                    DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio}
                  % of source memory.
                </span>
              </label>

              <div className="mt-3 border border-dashed border-fuchsia-300/20 bg-black/25 p-3 opacity-60">
                <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  Future Default Weights
                  <span className="border border-amber-300/25 px-2 py-0.5 text-[8px] text-amber-100">
                    Reserved
                  </span>
                </div>
                <div className="mt-2 grid gap-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between gap-3">
                    <span>Architecture</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <span>Locked</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Semantic Meaning</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <span>Locked</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>UI/UX Intent</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <span>Locked</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Task Continuity</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <span>Locked</span>
                  </div>
                </div>
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-cyan-300/25 bg-cyan-300/[0.045] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]",
	                activePanel !== "account" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    Account Profile
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-400">
                    {authVault.user?.email ?? "Authenticated operator"}
                  </div>
                </div>
                <button
                  className="border border-rose-300/30 bg-rose-300/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-300/20"
                  onClick={onLogout}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-fuchsia-300/25 bg-fuchsia-300/[0.045] p-3 shadow-[0_0_28px_rgba(217,70,239,0.08)]",
	                activePanel !== "providers" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                    Global API Vault
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    One local runtime key for every workspace and agent
                  </div>
                </div>
                <span
                  className={cx(
                    "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
                    authVault.globalApiKey
                      ? authVault.isLocked
                        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                        : "border-amber-300/35 bg-amber-300/10 text-amber-100"
                      : "border-rose-300/35 bg-rose-300/10 text-rose-100",
                  )}
                >
                  {authVault.globalApiKey
                    ? authVault.isLocked
                      ? "Locked"
                      : "Unlocked"
                    : "Empty"}
                </span>
              </div>

              {authVault.globalApiKey && authVault.isLocked ? (
                <div className="grid gap-3">
                  <div className="border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-sm text-slate-300">
                    ••••••••••••••••
                  </div>
                  <label className="grid gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      OpenAI-compatible Base URL
                    </span>
                    <input
                      className="w-full border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/60"
                      onBlur={() => onSetGlobalBaseUrl(vaultBaseUrlDraft)}
                      onChange={(event) => setVaultBaseUrlDraft(event.target.value)}
                      placeholder={DEFAULT_BASE_URL}
                      spellCheck={false}
                      type="url"
                      value={vaultBaseUrlDraft}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/20"
                      onClick={onUnlockVault}
                      type="button"
                    >
                      Unlock
                    </button>
                    <button
                      className="border border-rose-300/35 bg-rose-300/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-300/20"
                      onClick={onDeleteApiKey}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      OpenAI-compatible Base URL
                    </span>
                    <input
                      className="w-full border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/60"
                      onBlur={() => onSetGlobalBaseUrl(vaultBaseUrlDraft)}
                      onChange={(event) => setVaultBaseUrlDraft(event.target.value)}
                      placeholder={DEFAULT_BASE_URL}
                      spellCheck={false}
                      type="url"
                      value={vaultBaseUrlDraft}
                    />
                  </label>
                  <input
                    autoComplete="new-password"
                    className="w-full border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/60"
                    onChange={(event) => setVaultKeyDraft(event.target.value)}
                    placeholder="sk-..."
                    type="password"
                    value={vaultKeyDraft}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-40"
                      disabled={!vaultKeyDraft.trim()}
                      onClick={() => {
                        onSetGlobalBaseUrl(vaultBaseUrlDraft);
                        onSetGlobalApiKey(vaultKeyDraft);
                        onLockVault();
                        setVaultKeyDraft("");
                      }}
                      type="button"
                    >
                      Save & Lock
                    </button>
                    <button
                      className="border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                      onClick={authVault.globalApiKey ? onLockVault : onDeleteApiKey}
                      type="button"
                    >
                      {authVault.globalApiKey ? "Lock" : "Clear"}
                    </button>
                  </div>
                </div>
              )}
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-cyan-300/25 bg-cyan-300/[0.035] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]",
	                activePanel !== "models" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-cyan-100" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    🧠 Agent Routing & Models
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Per-agent model selection. Authentication stays in the Global API Vault.
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
	                {agents.map((agent) => {
	                  const modelGroups = getAgentModelGroups(agent);
	                  const modelOption = getModelOption(agent.model);
	                  const capability = getModelCapabilityProfile(agent.model);
	                  const providerCredential =
	                    authVault.providerCredentials?.[
	                      capability?.providerId ?? modelOption?.provider ?? agent.provider
	                    ];
	                  const providerVerified =
	                    providerCredential?.verificationStatus === "verified";

	                  return (
                    <div
                      key={agent.id}
                      className="border border-white/10 bg-black/25 p-2"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white">
                            {agent.callsign}
                          </div>
                          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                            {getCapabilityType(agent)}
                          </div>
                        </div>
                        <span className="max-w-32 truncate border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100">
                          {getModelLabel(agent.model)}
                        </span>
                      </div>
	                      <select
	                        className="w-full border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[11px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
                        onChange={(event) =>
                          onUpdateAgentModel(agent.id, event.currentTarget.value)
                        }
                        value={agent.model}
                      >
                        {modelGroups.map((group) => (
                          <optgroup key={group.label} label={group.label.toUpperCase()}>
                            {group.models.map((model) => (
                              <option key={model} value={model}>
                                {getModelLabel(model)}
                              </option>
                            ))}
	                          </optgroup>
	                        ))}
	                      </select>
	                      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
	                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
	                          Provider: {getProviderLabel(capability?.providerId ?? agent.provider)}
	                        </span>
	                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
	                          Key: {providerCredential?.apiKey ? "Set" : "Missing"}
	                        </span>
	                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
	                          Thinking: {capability?.thinking.supported ? "Supported" : "No"}
	                        </span>
	                        <span
	                          className={cx(
	                            "border px-2 py-1",
	                            providerVerified
	                              ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
	                              : "border-amber-300/25 bg-amber-300/10 text-amber-100",
	                          )}
	                        >
	                          Live: {providerVerified ? "Verified" : "Untested"}
	                        </span>
	                      </div>
	                      {capability?.thinking.supported ? (
	                        <div className="mt-2 border border-cyan-300/20 bg-cyan-300/[0.04] p-2 text-[11px] leading-5 text-slate-400">
	                          <span className="font-mono uppercase tracking-[0.14em] text-cyan-100">
	                            Reasoning
	                          </span>
	                          <span className="ml-2">
	                            {capability.thinking.supportedReasoningEfforts.join(" / ")}
	                          </span>
	                          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
	                            xhigh maps to{" "}
	                            {capability.thinking.providerReasoningEffortMap?.xhigh ?? "xhigh"};
	                            disabled params:{" "}
	                            {capability.thinking.disabledRequestParams.join(", ")}
	                          </div>
	                        </div>
	                      ) : null}
	                    </div>
	                  );
	                })}
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-white/10 bg-white/[0.035] p-3",
	                activePanel !== "models" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    Add New Agent
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Chat, image, video, or sandbox workstation
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20"
                  onClick={() => onAddAgent(newAgentType)}
                  title="Add new agent"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {capabilityOptions.map((option) => (
                  <button
                    key={option.type}
                    className={cx(
                      "border px-2 py-2 text-left transition",
                      newAgentType === option.type
                        ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-black/20 text-slate-400 hover:border-white/25",
                    )}
                    onClick={() => setNewAgentType(option.type)}
                    type="button"
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-[0.16em]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-emerald-300/30 bg-emerald-300/[0.045] p-3 shadow-[0_0_28px_rgba(16,185,129,0.09)]",
	                activePanel !== "memory" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                    📓 Global Datapads
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Cross-workspace notebooks for durable operator context
                  </div>
                </div>
                <button
                  className="border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/20"
                  onClick={onCreateNotebook}
                  type="button"
                >
                  ➕ New Datapad
                </button>
              </div>

              {notebooks.length ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {notebooks.map((notebook) => {
                    const active = openNotebookIds.includes(notebook.id);

                    return (
                      <button
                        key={notebook.id}
                        className={cx(
                          "min-h-20 border p-2 text-left transition",
                          active
                            ? "border-emerald-300/60 bg-emerald-300/12 shadow-[0_0_22px_rgba(16,185,129,0.14)]"
                            : "border-white/10 bg-black/25 hover:border-emerald-300/35 hover:bg-emerald-300/10",
                        )}
                        onClick={() => onToggleNotebook(notebook.id)}
                        type="button"
                      >
                        <span className="block line-clamp-2 font-mono text-[10px] uppercase tracking-[0.13em] text-emerald-50">
                          {notebook.title || "Untitled Datapad"}
                        </span>
                        <span className="mt-2 block line-clamp-2 text-[11px] leading-4 text-slate-500">
                          {notebook.content.trim() || "Empty global notebook"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-emerald-300/20 bg-black/20 px-3 py-4 text-xs leading-5 text-slate-500">
                  No global datapads yet. Create one to keep notes available across
                  every workspace.
                </div>
              )}
            </section>

	            <section
	              className={cx(
	                "mt-5 border border-emerald-300/35 bg-emerald-300/[0.05] p-3 shadow-[0_0_34px_rgba(16,185,129,0.1)]",
	                activePanel !== "artifacts" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                    🗃️ Artifact Vault
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Saved code payloads, URLs, and generated interface artifacts
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-emerald-300/35 bg-emerald-300/10 text-emerald-100 transition hover:bg-emerald-300/20"
                  onClick={onRefreshArtifacts}
                  title="Refresh artifact vault"
                  type="button"
                >
                  <RefreshCcw className={cx("h-4 w-4", artifactsLoading && "animate-spin")} />
                </button>
              </div>

              {artifactError ? (
                <div className="border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
                  {artifactError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {artifactsLoading && !artifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Loading artifacts
                  </div>
                ) : null}

                {!artifactsLoading && !artifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-slate-500">
                    No artifacts saved yet. Use Save Artifact inside a Sandbox workstation.
                  </div>
                ) : null}

                {artifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="border border-white/10 bg-black/25 p-3 transition hover:border-emerald-300/35 hover:bg-emerald-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-100">
                            {artifact.type}
                          </span>
                          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            {formatTime(artifact.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                          {artifactPreview(
                            artifact.previewText ??
                              artifact.contentUrl ??
                              artifact.contentHash ??
                              artifact.title ??
                              "",
                          )}
                        </p>
                      </div>
                      <button
                        className="shrink-0 border border-emerald-300/45 bg-emerald-300/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/22"
                        onClick={() => onCopyArtifact(artifact)}
                        type="button"
                      >
                        Copy Code/URL
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

	            <section
	              className={cx(
	                "mt-5 border border-cyan-300/25 bg-cyan-300/[0.045] p-3",
	                activePanel !== "trace" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    Trace Viewer
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Latest workspace events
                  </div>
                </div>
                <button
                  className="border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                  disabled={traceEventsLoading}
                  onClick={() => void loadTraceEvents("reset")}
                  type="button"
                >
                  Refresh
                </button>
              </div>

              {traceEventsError ? (
                <div className="mb-2 border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[11px] text-amber-100">
                  {traceEventsError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {!traceEvents.length && !traceEventsLoading ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-slate-500">
                    No trace events loaded.
                  </div>
                ) : null}

                {traceEvents.map((event) => (
                  <article
                    key={event.id}
                    className="border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[9px] uppercase tracking-[0.14em] ${traceSeverityClass(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        {formatTime(event.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-slate-300">
                      {event.source} / {event.eventType}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                      {event.message ?? event.resourceType ?? event.traceId}
                    </p>
                  </article>
                ))}
              </div>

              {traceEventsHasMore ? (
                <button
                  className="mt-3 w-full border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 disabled:opacity-40"
                  disabled={traceEventsLoading}
                  onClick={() => void loadTraceEvents("next")}
                  type="button"
                >
                  Load More
                </button>
              ) : null}
            </section>

	            <section
	              className={cx(
	                "mt-5 border border-fuchsia-300/35 bg-fuchsia-300/[0.055] p-3 shadow-[0_0_34px_rgba(217,70,239,0.12)]",
	                activePanel !== "workflows" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-100">
                    📁 Macro Blueprint Vault
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Spawn saved cloud topologies into the active canvas
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100 transition hover:bg-fuchsia-300/20"
                  onClick={onRefreshMacros}
                  title="Refresh macro vault"
                  type="button"
                >
                  <RefreshCcw className={cx("h-4 w-4", macrosLoading && "animate-spin")} />
                </button>
              </div>

              {macroError ? (
                <div className="border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
                  {macroError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {macrosLoading && !macros.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Loading blueprints
                  </div>
                ) : null}

                {!macrosLoading && !macros.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-slate-500">
                    No macros saved yet. Switch to Graph view and run Pack Workflow.
                  </div>
                ) : null}

                {macros.map((macro) => (
                  <article
                    key={macro.id}
                    className="border border-white/10 bg-black/25 p-3 transition hover:border-fuchsia-300/35 hover:bg-fuchsia-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
                          {macro.name}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {macro.description || "No description"}
                        </p>
                      </div>
                      <button
                        className="shrink-0 border border-fuchsia-300/45 bg-fuchsia-300/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/22"
                        onClick={() => onSpawnMacro(macro)}
                        type="button"
                      >
                        [ SPAWN ]
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-fuchsia-200/70">
                      <span>{macro.blueprintData.agents.length} agents</span>
                      <span>{macro.blueprintData.graph.edges.length} edges</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function LegoThemeEngineControls({
  onCommitThemeConfig,
  themeConfig,
}: {
  onCommitThemeConfig: (config: Partial<WorkspaceThemeConfig>) => void;
  themeConfig?: WorkspaceThemeConfig;
}) {
  const [localConfig, setLocalConfig] = useState<Required<WorkspaceThemeConfig>>(
    LEGO_THEME_DEFAULTS,
  );
  const localConfigRef = useRef(localConfig);

  const setNextConfig = useCallback((nextConfig: Required<WorkspaceThemeConfig>) => {
    localConfigRef.current = nextConfig;
    setLocalConfig(nextConfig);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextConfig = readLegoThemeConfigFromDom(themeConfig);

      setNextConfig(nextConfig);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [setNextConfig, themeConfig]);

  const commitThemeConfig = useCallback(() => {
    onCommitThemeConfig(localConfigRef.current);
  }, [onCommitThemeConfig]);

  const updateTransientThemeConfig = useCallback(
    (key: LegoThemeKey, value: string) => {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(LEGO_THEME_VARIABLES[key], value);
      }

      setNextConfig({
        ...localConfigRef.current,
        [key]: value,
      });
    },
    [setNextConfig],
  );

  const rangeControl = ({
    key,
    label,
    max,
    min,
    step = 1,
    unit = "px",
  }: {
    key: Exclude<LegoThemeKey, "fontFamily">;
    label: string;
    max: number;
    min: number;
    step?: number;
    unit?: "px" | "%";
  }) => {
    const value = cssNumber(localConfig[key], cssNumber(LEGO_THEME_DEFAULTS[key], min));
    const updateValue = (nextValue: string) => {
      updateTransientThemeConfig(key, `${nextValue}${unit}`);
    };

    return (
      <label className="block border border-white/10 bg-black/20 p-3">
        <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
          <span>{label}</span>
          <span className="text-cyan-100">{localConfig[key]}</span>
        </span>
        <input
          className="mt-3 w-full accent-cyan-300"
          max={max}
          min={min}
          onInput={(event) =>
            updateValue(event.currentTarget.value)
          }
          onKeyUp={commitThemeConfig}
          onMouseUp={commitThemeConfig}
          onPointerUp={commitThemeConfig}
          onTouchEnd={commitThemeConfig}
          step={step}
          type="range"
          value={value}
        />
      </label>
    );
  };

  return (
    <section className="mb-4 border border-cyan-300/35 bg-cyan-300/[0.055] p-3 shadow-[0_0_36px_rgba(0,255,204,0.12)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
            <DynamicIcon className="h-4 w-4" name="Blocks" />
            LEGO THEME ENGINE
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Transient DOM mutation with debounced workspace sync
          </div>
        </div>
        <span className="border border-cyan-300/25 bg-black/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100">
          0ms
        </span>
      </div>

      <div className="mb-3 border border-cyan-300/25 bg-black/25 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
          <span className="flex items-center gap-2 text-cyan-100">
            <DynamicIcon className="h-3.5 w-3.5" name="Sparkles" />
            Live Token Preview
          </span>
          <span>
            {localConfig.radius} / {localConfig.blur} / {localConfig.glowIntensity}
          </span>
        </div>
        <button
          className="flex w-full items-center justify-between border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300/15"
          type="button"
        >
          <span>Geometry + Glass Sample</span>
          <DynamicIcon className="h-4 w-4" name="ScanLine" />
        </button>
      </div>

      <div className="grid gap-2">
        {rangeControl({
          key: "radius",
          label: "Border Radius",
          min: 0,
          max: 24,
        })}
        {rangeControl({
          key: "blur",
          label: "Glass Blur",
          min: 0,
          max: 32,
        })}
        {rangeControl({
          key: "glowIntensity",
          label: "Agent Glow",
          min: 0,
          max: 100,
          unit: "%",
        })}
        {rangeControl({
          key: "chatOpacity",
          label: "Chat Opacity",
          min: 35,
          max: 100,
          unit: "%",
        })}
        {rangeControl({
          key: "iconWeight",
          label: "Icon Weight",
          min: 1,
          max: 3,
          step: 0.5,
        })}

        <label className="block border border-white/10 bg-black/20 p-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Typography
          </span>
          <select
            className="mt-2 w-full border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-slate-100 outline-none transition focus:border-cyan-300/60"
            onChange={(event) => {
              updateTransientThemeConfig("fontFamily", event.currentTarget.value);
              onCommitThemeConfig({
                ...localConfigRef.current,
                fontFamily: event.currentTarget.value,
              });
            }}
            value={localConfig.fontFamily}
          >
            {typographyOptions.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function ModelTuningSelect<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly TValue[];
  value?: TValue;
  onChange: (value: TValue) => void;
}) {
  if (!options.length) {
    return null;
  }

  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        className="w-full border border-white/10 bg-black/45 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-100 outline-none transition focus:border-cyan-300/60"
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
        value={value ?? options[0]}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgentModelTuningPanel({
  agent,
  onUpdateAgentModel,
  onUpdateAgentModelSettings,
}: {
  agent: NexusAgent;
  onUpdateAgentModel: (agentId: string, model: string) => void;
  onUpdateAgentModelSettings: (
    agentId: string,
    settings: Partial<AgentModelSettings>,
  ) => void;
}) {
  const modelGroups = getAgentModelGroups(agent);
  const capability = getModelCapabilityProfile(agent.model);
  const settings = agent.modelSettings ?? {};

  return (
    <div className="mx-3 mb-3 grid gap-3 border border-cyan-300/20 bg-black/25 p-3">
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Model
        </span>
        <select
          className="w-full border border-white/10 bg-black/45 px-2 py-1.5 font-mono text-[10px] text-slate-100 outline-none transition focus:border-cyan-300/60"
          onChange={(event) =>
            onUpdateAgentModel(agent.id, event.currentTarget.value)
          }
          value={agent.model}
        >
          {modelGroups.map((group) => (
            <optgroup key={group.label} label={group.label.toUpperCase()}>
              {group.models.map((model) => (
                <option key={model} value={model}>
                  {getModelLabel(model)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <ModelTuningSelect<NexusReasoningEffort>
          label="Reasoning"
          onChange={(reasoningEffort) =>
            onUpdateAgentModelSettings(agent.id, { reasoningEffort })
          }
          options={capability?.thinking.supportedReasoningEfforts ?? []}
          value={settings.reasoningEffort}
        />
        <ModelTuningSelect<NexusVerbosity>
          label="Verbosity"
          onChange={(verbosity) =>
            onUpdateAgentModelSettings(agent.id, { verbosity })
          }
          options={capability?.verbosity.supportedVerbosity ?? []}
          value={settings.verbosity}
        />
        <ModelTuningSelect<NexusReasoningDetail>
          label="Detail"
          onChange={(reasoningDetail) =>
            onUpdateAgentModelSettings(agent.id, { reasoningDetail })
          }
          options={capability?.reasoningDetail.supportedDetails ?? []}
          value={settings.reasoningDetail}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
          Provider: {getProviderLabel(capability?.providerId ?? agent.provider)}
        </span>
        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
          API: {capability?.apiFamily ?? "unknown"}
        </span>
      </div>
    </div>
  );
}

function AgentTemplateProfilePanel({
  profile,
  template,
  onSpawn,
  onUpdate,
}: {
  profile: AgentTemplateProfile;
  template: AgentTemplate;
  onSpawn: (template: AgentTemplate) => void;
  onUpdate: (templateId: string, profile: AgentTemplateProfileUpdate) => void;
}) {
  const locked = profile.profileLocked;

  return (
    <div className="mx-3 mb-3 grid gap-2 border border-cyan-300/20 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Custom Agent
        </span>
        <div className="flex items-center gap-1.5">
          <button
            aria-label={`${profile.callsign} launch custom agent`}
            className="grid h-7 w-7 place-items-center border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20"
            onClick={() => onSpawn(template)}
            title={`${profile.callsign} launch custom agent`}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            aria-pressed={locked}
            className={cx(
              "grid h-7 w-7 place-items-center border transition",
              locked
                ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100"
                : "border-white/10 bg-white/[0.035] text-slate-500 hover:border-cyan-300/45 hover:text-cyan-100",
            )}
            onClick={() => onUpdate(template.id, { profileLocked: !locked })}
            title={locked ? "Unlock custom agent" : "Lock custom agent"}
            type="button"
          >
            {locked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Name
        </span>
        <input
          className="w-full border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { callsign: event.currentTarget.value })
          }
          value={profile.callsign}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Role
        </span>
        <input
          className="w-full border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { identity: event.currentTarget.value })
          }
          value={profile.identity}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Task
        </span>
        <textarea
          className="min-h-16 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { mission: event.currentTarget.value })
          }
          value={profile.mission}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Execution
        </span>
        <textarea
          className="min-h-20 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { executionPrompt: event.currentTarget.value })
          }
          value={profile.executionPrompt}
        />
      </label>
    </div>
  );
}

function LeftDock({
  agents,
  agentTemplateProfiles,
  activeAgentId,
  selectedAgentId,
  onSpawn,
  onFocus,
  onSelect,
  onRestore,
  onUpdateAgentModel,
  onUpdateAgentModelSettings,
  onUpdateAgentTemplateProfile,
}: {
  agents: NexusAgent[];
  agentTemplateProfiles: Record<string, AgentTemplateProfile>;
  activeAgentId?: string;
  selectedAgentId?: string;
  onSpawn: (template: AgentTemplate) => void;
  onFocus: (agentId: string) => void;
  onSelect: (agentId: string) => void;
  onRestore: (agentId: string) => void;
  onUpdateAgentModel: (agentId: string, model: string) => void;
  onUpdateAgentModelSettings: (
    agentId: string,
    settings: Partial<AgentModelSettings>,
  ) => void;
  onUpdateAgentTemplateProfile: (
    templateId: string,
    profile: AgentTemplateProfileUpdate,
  ) => void;
}) {
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  return (
    <div className="nexus-panel flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-slate-300">
            Agent Bay
          </h2>
          <BrainCircuit className="h-4 w-4 text-cyan-200" />
        </div>
        <div className="mt-4 grid gap-2">
          {agentTemplates.map((template) => {
            const profile = resolveAgentTemplateProfile(
              template,
              agentTemplateProfiles[template.id],
            );
            const open = expandedTemplateId === template.id;

            return (
              <article
                key={template.id}
                className="border border-white/10 bg-white/[0.035] transition hover:border-cyan-300/30"
              >
                <div className="flex items-start gap-2 p-3">
                  <button
                    className="group min-w-0 flex-1 text-left"
                    onClick={() => onSpawn(template)}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 place-items-center border font-mono text-xs font-semibold"
                        style={{
                          borderColor: `${template.accent}88`,
                          color: template.accent,
                          backgroundColor: `${template.accent}14`,
                        }}
                      >
                        {template.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
                            {profile.callsign}
                          </span>
                          {profile.profileLocked ? (
                            <Lock className="h-3 w-3 shrink-0 text-emerald-200" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {profile.title}
                        </span>
                      </span>
                    </div>
                  </button>
                  <button
                    aria-expanded={open}
                    aria-label={`${profile.callsign} custom agent settings`}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center border text-slate-500 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100",
                      open &&
                        "border-cyan-300/55 bg-cyan-300/15 text-cyan-100",
                    )}
                    onClick={() =>
                      setExpandedTemplateId((current) =>
                        current === template.id ? null : template.id,
                      )
                    }
                    title={`${profile.callsign} custom agent settings`}
                    type="button"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open ? (
                  <AgentTemplateProfilePanel
                    profile={profile}
                    template={template}
                    onSpawn={onSpawn}
                    onUpdate={onUpdateAgentTemplateProfile}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-slate-300">
            Operators
          </h2>
          <span className="font-mono text-[10px] text-slate-500">{agents.length}</span>
        </div>
        <div className="grid gap-2">
          {agents.map((agent) => (
            <article
              key={agent.id}
              className={cx(
                "border transition",
                selectedAgentId === agent.id
                  ? "border-cyan-300/45 bg-cyan-300/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/25",
              )}
            >
              <div className="flex items-start gap-2 p-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    onSelect(agent.id);
                    if (agent.minimized) {
                      onRestore(agent.id);
                    } else {
                      onFocus(agent.id);
                    }
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: agent.accent }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
                          {agent.callsign}
                        </span>
                        {activeAgentId === agent.id && (
                          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-200" />
                        )}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-400">
                        {getCapabilityType(agent)} / {agent.model}
                      </span>
                    </span>
                  </div>
                </button>
                <button
                  aria-expanded={expandedAgentId === agent.id}
                  aria-label={`${agent.callsign} model settings`}
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center border text-slate-500 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100",
                    expandedAgentId === agent.id &&
                      "border-cyan-300/55 bg-cyan-300/15 text-cyan-100",
                  )}
                  onClick={() =>
                    setExpandedAgentId((current) =>
                      current === agent.id ? null : agent.id,
                    )
                  }
                  title={`${agent.callsign} model settings`}
                  type="button"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
              {expandedAgentId === agent.id ? (
                <AgentModelTuningPanel
                  agent={agent}
                  onUpdateAgentModel={onUpdateAgentModel}
                  onUpdateAgentModelSettings={onUpdateAgentModelSettings}
                />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentWindow({
  agent,
  selected,
  onFocus,
  onUpdateLayout,
  onMinimize,
  onToggleMaximize,
  onClose,
  onDuplicate,
  onClear,
  onGeneratePredictiveIntel,
  onGenerateMedia,
  onOpenBranchInterface,
  onOpenVaultManager,
  onSaveArtifact,
  promptsCache,
  historicalPage,
  onLoadHistory,
  onSend,
  onStop,
  onUpdateSandboxCode,
  onUpdateSandboxUrl,
  workspaceId,
}: {
  agent: NexusAgent;
  selected: boolean;
  onFocus: (agentId: string) => void;
  onUpdateLayout: (
    agentId: string,
    geometry: Partial<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  ) => void;
  onMinimize: (agentId: string) => void;
  onToggleMaximize: (agentId: string) => void;
  onClose: (agentId: string) => void;
  onDuplicate: (agentId: string) => void;
  onClear: (agentId: string) => void;
  onGeneratePredictiveIntel: (agentId: string) => Promise<string[]>;
  onGenerateMedia: (agentId: string, content: string) => Promise<void>;
  onOpenBranchInterface: (agentId: string) => void;
  onOpenVaultManager: () => void;
  onSaveArtifact: (agentId: string, content: string) => void;
  promptsCache: PromptRecord[];
  historicalPage?: AgentHistoricalPage;
  onLoadHistory: (agentId: string) => Promise<void>;
  onSend: (agentId: string, content: string) => Promise<void>;
  onStop: (agentId: string) => void;
  onUpdateSandboxCode: (agentId: string, sandboxCode: string) => void;
  onUpdateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
  workspaceId: string;
}) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sandboxEditorCollapsed, setSandboxEditorCollapsed] = useState(false);
  const [sandboxInteractionLocked, setSandboxInteractionLocked] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const capabilityType = getCapabilityType(agent);
  const isMediaAgent = isMediaCapability(capabilityType);
  const isSandboxAgent = isSandboxCapability(capabilityType);
  const windowInteractionLocked = isSandboxAgent && sandboxInteractionLocked;
  const renderedMessages = useMemo(() => {
    const activeIds = new Set(agent.messages.map((message) => message.id));
    const historical = (historicalPage?.items ?? [])
      .filter((record) => !activeIds.has(record.message.id))
      .sort((left, right) =>
        left.message.createdAt.localeCompare(right.message.createdAt),
      )
      .map((record) => record.message);

    return [...historical, ...agent.messages];
  }, [agent.messages, historicalPage?.items]);

  useEffect(() => {
    bodyRef.current?.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [agent.messages]);

  const onDragStop: RndDragCallback = (_event, data) => {
    onUpdateLayout(agent.id, { x: data.x, y: data.y });
  };

  const onResizeStop: RndResizeCallback = (_event, _direction, ref, _delta, position) => {
    onUpdateLayout(agent.id, {
      width: ref.offsetWidth,
      height: ref.offsetHeight,
      x: position.x,
      y: position.y,
    });
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isSandboxAgent) {
      return;
    }

    const value = draft;

    if (!value.trim() || isSubmitting) {
      return;
    }

    setDraft("");
    setIsSubmitting(true);

    try {
      await (isMediaAgent ? onGenerateMedia(agent.id, value) : onSend(agent.id, value));
    } catch {
      setDraft(value);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const fillPrompt = (value: string) => {
    setDraft(value);
    composerRef.current?.focus();
  };

  const startNewReply = () => {
    setDraft("");
    composerRef.current?.focus();
  };
  const agentGlowColor = `color-mix(in srgb, ${agent.accent} var(--agent-glow-intensity), transparent)`;

  return (
    <Rnd
      bounds="parent"
      className="absolute"
      disableDragging={agent.maximized || windowInteractionLocked}
      dragHandleClassName="nexus-drag-handle"
      enableResizing={!agent.maximized && !windowInteractionLocked}
      minHeight={360}
      minWidth={390}
      onDragStart={() => {
        if (!windowInteractionLocked) {
          onFocus(agent.id);
        }
      }}
      onDragStop={onDragStop}
      onMouseDown={() => {
        if (!windowInteractionLocked) {
          onFocus(agent.id);
        }
      }}
      onResizeStart={() => {
        if (!windowInteractionLocked) {
          onFocus(agent.id);
        }
      }}
      onResizeStop={onResizeStop}
      position={{ x: agent.layout.x, y: agent.layout.y }}
      size={{ width: agent.layout.width, height: agent.layout.height }}
      style={{ zIndex: agent.layout.zIndex }}
    >
      <motion.section
        animate={{ opacity: 1, scale: 1 }}
        className={cx(
          "nexus-agent-window relative flex h-full min-h-0 flex-col overflow-visible bg-slate-950/88 shadow-[0_22px_70px_rgba(0,0,0,0.45)]",
          isSandboxAgent ? "border-0" : "border-2",
        )}
        exit={{ opacity: 0, scale: 0.96 }}
        initial={{ opacity: 0, scale: 0.96 }}
        style={{
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          backdropFilter: "blur(var(--glass-blur))",
          background: isSandboxAgent
            ? "color-mix(in srgb, var(--bg-elevated) 72%, transparent)"
            : "color-mix(in srgb, var(--bg-elevated) var(--chat-panel-opacity), transparent)",
          borderRadius: "var(--surface-radius)",
          borderColor: isSandboxAgent
            ? "transparent"
            : selected
              ? `${agent.accent}f2`
              : `${agent.accent}99`,
          boxShadow: isSandboxAgent
            ? "0 20px 60px rgba(0,0,0,0.32)"
            : selected
              ? `0 0 42px ${agentGlowColor}, 0 22px 70px rgba(0,0,0,0.45)`
              : `0 0 24px ${agentGlowColor}, 0 22px 70px rgba(0,0,0,0.38)`,
        }}
        transition={{ duration: 0.18 }}
      >
        <div
          aria-label={`${agent.callsign} drag handle`}
          className="nexus-drag-handle h-2 shrink-0 cursor-move"
          style={{
            background: "transparent",
            borderTopLeftRadius: "var(--surface-radius)",
            borderTopRightRadius: "var(--surface-radius)",
          }}
        />

        <AgentActionToolbar
          agent={agent}
          isMediaAgent={isMediaAgent}
          isSandboxAgent={isSandboxAgent}
          onClear={() => onClear(agent.id)}
          onClose={() => onClose(agent.id)}
          onDuplicate={() => onDuplicate(agent.id)}
          onFillPrompt={fillPrompt}
          onGeneratePredictiveIntel={() => onGeneratePredictiveIntel(agent.id)}
          onMinimize={() => onMinimize(agent.id)}
          onNewReply={startNewReply}
          onOpenBranchInterface={() => onOpenBranchInterface(agent.id)}
          onOpenVaultManager={onOpenVaultManager}
          onSaveSandboxArtifact={
            isSandboxAgent
              ? () => onSaveArtifact(agent.id, agent.sandboxCode ?? DEFAULT_SANDBOX_CODE)
              : undefined
          }
          onToggleSandboxEditor={
            isSandboxAgent
              ? () => setSandboxEditorCollapsed((current) => !current)
              : undefined
          }
          sandboxEditorCollapsed={sandboxEditorCollapsed}
          sandboxInteractionLocked={sandboxInteractionLocked}
          onToggleSandboxInteractionLock={
            isSandboxAgent
              ? () => setSandboxInteractionLocked((current) => !current)
              : undefined
          }
          onStop={() => onStop(agent.id)}
          onToggleMaximize={() => onToggleMaximize(agent.id)}
          promptsCache={promptsCache}
          workspaceId={workspaceId}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pr-7">
          {isSandboxAgent ? (
            <SandboxCanvas
              agent={agent}
              editorCollapsed={sandboxEditorCollapsed}
              interactionLocked={sandboxInteractionLocked}
              onUpdateSandboxCode={onUpdateSandboxCode}
              onUpdateSandboxUrl={onUpdateSandboxUrl}
            />
          ) : (
            <>
              {isMediaAgent ? (
                <MediaCanvas agent={agent} />
              ) : (
                <div
                  ref={bodyRef}
                  className="cyber-scroll min-h-0 flex-1 overflow-y-auto p-3"
                >
                  <div className="grid gap-3">
                    {(historicalPage?.hasMore ?? true) ? (
                      <div className="flex justify-center">
                        <button
                          className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:opacity-45"
                          disabled={Boolean(historicalPage?.loading)}
                          onClick={() => void onLoadHistory(agent.id)}
                          type="button"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          {historicalPage?.loading ? "Loading" : "Load history"}
                        </button>
                      </div>
                    ) : null}
                    {historicalPage?.error ? (
                      <div className="border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                        {historicalPage.error}
                      </div>
                    ) : null}
                    {renderedMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        reasoningDetail={agent.modelSettings?.reasoningDetail}
                      />
                    ))}
                  </div>
                </div>
              )}
              <form className="border-t border-white/10 p-3" onSubmit={submit}>
                <div className="flex gap-2">
                  <textarea
                    ref={composerRef}
                    className="min-h-16 flex-1 resize-none border border-white/10 bg-black/30 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
                    disabled={
                      isSubmitting ||
                      agent.status === "streaming" ||
                      agent.status === "thinking"
                    }
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder={
                      isMediaAgent
                        ? `Describe ${capabilityType} generation`
                        : "Transmit mission packet"
                    }
                    value={draft}
                  />
                  <button
                    aria-label="Send message"
                    className="grid w-12 place-items-center border border-cyan-300/40 bg-cyan-300/12 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                    disabled={
                      isSubmitting ||
                      agent.status === "streaming" ||
                      agent.status === "thinking" ||
                      !draft.trim()
                    }
                    type="submit"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.section>
    </Rnd>
  );
}

function SandboxCanvas({
  agent,
  editorCollapsed,
  interactionLocked,
  onUpdateSandboxCode,
  onUpdateSandboxUrl,
}: {
  agent: NexusAgent;
  editorCollapsed: boolean;
  interactionLocked: boolean;
  onUpdateSandboxCode: (agentId: string, sandboxCode: string) => void;
  onUpdateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
}) {
  const code = agent.sandboxCode ?? DEFAULT_SANDBOX_CODE;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sandboxUrlInputRef = useRef<HTMLInputElement | null>(null);
  const [splitPercent, setSplitPercent] = useState(42);
  const [resizing, setResizing] = useState(false);
  const [sandboxUrlDraft, setSandboxUrlDraft] = useState(agent.sandboxUrl ?? "");
  const [sandboxUrlError, setSandboxUrlError] = useState<string | undefined>();
  const externalPreviewUrl = normalizeSandboxUrl(agent.sandboxUrl ?? "");
  const embeddablePreviewUrl = externalPreviewUrl
    ? getEmbeddableUrl(externalPreviewUrl)
    : "";
  const iframeBlockReason = externalPreviewUrl
    ? getIframeBlockReason(externalPreviewUrl)
    : null;
  const openExternalPreview = useCallback(() => {
    if (!externalPreviewUrl) {
      return;
    }

    window.open(externalPreviewUrl, "_blank", "noopener,noreferrer");
  }, [externalPreviewUrl]);

  const commitSandboxUrl = useCallback((event?: FormEvent) => {
    event?.preventDefault();
    const draftValue = sandboxUrlInputRef.current?.value ?? sandboxUrlDraft;
    const normalized = normalizeSandboxUrl(draftValue);

    if (!draftValue.trim()) {
      setSandboxUrlError(undefined);
      setSandboxUrlDraft("");
      onUpdateSandboxUrl(agent.id, "");
      return;
    }

    if (!normalized) {
      setSandboxUrlError("Enter a valid http(s) URL.");
      return;
    }

    setSandboxUrlError(undefined);
    setSandboxUrlDraft(normalized);
    onUpdateSandboxUrl(agent.id, normalized);
  }, [agent.id, onUpdateSandboxUrl, sandboxUrlDraft]);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();

    if (!bounds?.width) {
      return;
    }

    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100;
    setSplitPercent(
      clampNumber(nextPercent, SANDBOX_MIN_SPLIT, SANDBOX_MAX_SPLIT),
    );
  }, []);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      updateSplitFromClientX(event.clientX);
    };
    const onPointerUp = () => {
      setResizing(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [resizing, updateSplitFromClientX]);

  const codePaneStyle = { flex: `0 0 ${splitPercent}%` };
  const previewPaneStyle = { flex: "1 1 0" };

  return (
    <div
      ref={containerRef}
      className={cx(
        "relative flex min-h-0 flex-1 gap-0 bg-transparent",
        resizing && "cursor-col-resize select-none",
      )}
    >
      {!editorCollapsed ? (
        <section
          className="flex min-h-0 min-w-[220px] flex-col overflow-hidden bg-black/24"
          style={codePaneStyle}
        >
          <form
            className="shrink-0 px-3 pb-2 pt-3"
            onSubmit={commitSandboxUrl}
          >
            <div
              className={cx(
                "flex h-9 items-center gap-2 bg-white/[0.045] px-3 outline outline-1 transition focus-within:bg-white/[0.07]",
                sandboxUrlError
                  ? "outline-rose-300/40"
                  : "outline-white/[0.055] focus-within:outline-white/20",
              )}
            >
              <RadioTower className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                aria-label={`${agent.callsign} sandbox preview URL`}
                autoCapitalize="none"
                className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-slate-100 outline-none placeholder:text-slate-600"
                inputMode="url"
                disabled={interactionLocked}
                onBlur={() => commitSandboxUrl()}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  setSandboxUrlDraft(nextValue);
                  setSandboxUrlError(undefined);

                  if (!nextValue.trim()) {
                    onUpdateSandboxUrl(agent.id, "");
                  }
                }}
                placeholder="URL or blank for HTML / CSS / JS"
                ref={sandboxUrlInputRef}
                spellCheck={false}
                type="text"
                value={sandboxUrlDraft}
              />
            </div>
            {sandboxUrlError ? (
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-rose-200">
                {sandboxUrlError}
              </div>
            ) : null}
          </form>
          <textarea
            aria-label={`${agent.callsign} sandbox code`}
            className="cyber-scroll min-h-0 flex-1 resize-none border-0 bg-transparent px-4 pb-4 pt-2 font-mono text-xs leading-5 text-slate-100 outline-none placeholder:text-slate-600 focus:bg-white/[0.02]"
            disabled={interactionLocked}
            onChange={(event) => onUpdateSandboxCode(agent.id, event.target.value)}
            spellCheck={false}
            value={code}
          />
        </section>
      ) : null}

      {!editorCollapsed ? (
        <div
          aria-label="Resize sandbox panes"
          aria-orientation="vertical"
          className="group relative z-20 grid w-2 shrink-0 cursor-col-resize place-items-center"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSplitPercent((current) =>
                clampNumber(current - 4, SANDBOX_MIN_SPLIT, SANDBOX_MAX_SPLIT),
              );
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              setSplitPercent((current) =>
                clampNumber(current + 4, SANDBOX_MIN_SPLIT, SANDBOX_MAX_SPLIT),
              );
            }
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            updateSplitFromClientX(event.clientX);
            setResizing(true);
          }}
          role="separator"
          tabIndex={0}
        >
          <div
            className={cx(
              "h-full w-px bg-white/8 transition group-hover:bg-white/25",
              resizing && "bg-white/40",
            )}
          />
        </div>
      ) : null}

      <section
        className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-white"
        style={previewPaneStyle}
      >
        {iframeBlockReason ? (
          <div className="grid min-h-0 flex-1 place-items-center bg-slate-950 p-6">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 grid h-11 w-11 place-items-center bg-white/[0.06] text-amber-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-100">
                External-Only Surface
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                {iframeBlockReason}
              </p>
              <button
                aria-label="Open preview URL in browser"
                className="mt-5 inline-grid h-9 w-9 place-items-center bg-white/[0.08] text-amber-100 transition hover:bg-white/[0.14]"
                onClick={openExternalPreview}
                title="Open site"
                type="button"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            key={embeddablePreviewUrl || "srcdoc"}
            className="min-h-0 flex-1 border-0 bg-white"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
            src={embeddablePreviewUrl || undefined}
            srcDoc={embeddablePreviewUrl ? undefined : code}
            style={{ pointerEvents: resizing || interactionLocked ? "none" : "auto" }}
            title={
              externalPreviewUrl
                ? `${agent.callsign} external sandbox preview`
                : `${agent.callsign} live UI sandbox preview`
            }
          />
        )}
      </section>

      {interactionLocked ? (
        <div
          aria-label={`${agent.callsign} sandbox interactions locked`}
          className="nexus-sandbox-lock-overlay absolute inset-0 z-30 flex items-end justify-end bg-black/[0.01] p-3"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <div className="pointer-events-none grid h-8 w-8 place-items-center border border-cyan-300/24 bg-slate-950/58 text-cyan-100/75 shadow-[0_10px_24px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <Lock className="h-3.5 w-3.5" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AgentActionToolbar({
  agent,
  isMediaAgent,
  isSandboxAgent,
  onClear,
  onClose,
  onDuplicate,
  onFillPrompt,
  onGeneratePredictiveIntel,
  onOpenBranchInterface,
  onMinimize,
  onNewReply,
  onOpenVaultManager,
  onSaveSandboxArtifact,
  onToggleSandboxEditor,
  sandboxEditorCollapsed,
  sandboxInteractionLocked,
  onToggleSandboxInteractionLock,
  onStop,
  onToggleMaximize,
  promptsCache,
  workspaceId,
}: {
  agent: NexusAgent;
  isMediaAgent: boolean;
  isSandboxAgent: boolean;
  onClear: () => void;
  onClose: () => void;
  onDuplicate: () => void;
  onFillPrompt: (value: string) => void;
  onGeneratePredictiveIntel: () => Promise<string[]>;
  onOpenBranchInterface: () => void;
  onMinimize: () => void;
  onNewReply: () => void;
  onOpenVaultManager: () => void;
  onSaveSandboxArtifact?: () => void;
  onToggleSandboxEditor?: () => void;
  sandboxEditorCollapsed?: boolean;
  sandboxInteractionLocked?: boolean;
  onToggleSandboxInteractionLock?: () => void;
  onStop: () => void;
  onToggleMaximize: () => void;
  promptsCache: PromptRecord[];
  workspaceId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const busy = agent.status === "thinking" || agent.status === "streaming";
  const latestResponse = useMemo(
    () =>
      [...agent.messages]
        .reverse()
        .find((message) => message.role === "assistant" || message.role === "tool")
        ?.content.trim() ?? "",
    [agent.messages],
  );
  const [intelItems, setIntelItems] = useState<string[]>(() =>
    buildMockPredictiveIntelSuggestions({
      agent,
      lastAssistantMessage: "",
    }),
  );
  const [intelLoading, setIntelLoading] = useState(false);
  const workspacePrompts = useMemo(
    () => promptsCache.filter((prompt) => prompt.workspace_id === workspaceId),
    [promptsCache, workspaceId],
  );

  useEffect(() => {
    if (intelOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIntelItems(
        buildMockPredictiveIntelSuggestions({
          agent,
          lastAssistantMessage: latestResponse,
        }),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [agent, intelOpen, latestResponse]);

  const refreshPredictiveIntel = useCallback(() => {
    setIntelLoading(true);
    void onGeneratePredictiveIntel()
      .then((suggestions) => {
        setIntelItems(
          suggestions.length === 3
            ? suggestions
            : buildMockPredictiveIntelSuggestions({
                agent,
                lastAssistantMessage: latestResponse,
              }),
        );
      })
      .catch(() => {
        setIntelItems(
          buildMockPredictiveIntelSuggestions({
            agent,
            lastAssistantMessage: latestResponse,
          }),
        );
      })
      .finally(() => setIntelLoading(false));
  }, [agent, latestResponse, onGeneratePredictiveIntel]);

  const fillPrompt = (value: string) => {
    onFillPrompt(value);
    setVaultOpen(false);
    setIntelOpen(false);
  };

  const copyLastResponse = () => {
    if (!latestResponse || typeof navigator === "undefined") {
      return;
    }

    void navigator.clipboard?.writeText(latestResponse).catch(() => undefined);
  };
  const railUnlockActive =
    isSandboxAgent && Boolean(sandboxInteractionLocked && onToggleSandboxInteractionLock);

  return (
    <div
      className="nodrag absolute right-1 top-4 z-40"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!vaultOpen && !intelOpen) {
          setExpanded(false);
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        aria-expanded={expanded || vaultOpen || intelOpen}
        aria-label={
          railUnlockActive ? "Unlock sandbox interactions" : "Expand agent action toolbar"
        }
        className={cx(
          "relative z-50 grid h-12 place-items-center border bg-black/70 backdrop-blur transition hover:border-cyan-300/40 hover:text-cyan-100",
          railUnlockActive ? "w-7" : "w-3",
          railUnlockActive
            ? "border-cyan-300/45 text-cyan-100"
            : "border-white/10 text-slate-400",
        )}
        onClick={() => {
          if (railUnlockActive) {
            onToggleSandboxInteractionLock?.();
            setExpanded(false);
            setVaultOpen(false);
            setIntelOpen(false);
            return;
          }

          setExpanded((current) => !current);
        }}
        type="button"
      >
        {railUnlockActive ? (
          <Unlock className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      <AnimatePresence>
        {(expanded || vaultOpen || intelOpen) && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className={cx(
              "absolute top-0 z-40 flex flex-col gap-1 border border-white/10 bg-slate-950/92 p-1 shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur-xl",
              railUnlockActive ? "right-8" : "right-0",
            )}
            exit={{ opacity: 0, x: 8 }}
            initial={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
          >
            <ToolbarIconButton label="Maximize" onClick={onToggleMaximize}>
              <Maximize2 className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Collapse" onClick={onMinimize}>
              <Minimize2 className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            {isSandboxAgent && onToggleSandboxEditor ? (
              <ToolbarIconButton
                active={sandboxEditorCollapsed}
                label={
                  sandboxEditorCollapsed
                    ? "Expand left editor"
                    : "Collapse left editor"
                }
                onClick={onToggleSandboxEditor}
              >
                {sandboxEditorCollapsed ? (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                )}
              </ToolbarIconButton>
            ) : null}
            {isSandboxAgent && onToggleSandboxInteractionLock ? (
              <ToolbarIconButton
                active={sandboxInteractionLocked}
                label={
                  sandboxInteractionLocked
                    ? "Unlock sandbox interactions"
                    : "Lock sandbox interactions"
                }
                onClick={onToggleSandboxInteractionLock}
              >
                {sandboxInteractionLocked ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
              </ToolbarIconButton>
            ) : null}
            {isSandboxAgent && onSaveSandboxArtifact ? (
              <ToolbarIconButton label="Save artifact" onClick={onSaveSandboxArtifact}>
                <Save className="h-3.5 w-3.5" />
              </ToolbarIconButton>
            ) : null}
            <ToolbarIconButton label="Duplicate" onClick={onDuplicate}>
              <Layers3 className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Branch agent" onClick={onOpenBranchInterface}>
              <GitBranch className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Delete" onClick={onClose} tone="danger">
              <X className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <div className="my-1 h-px bg-white/10" />
            <ToolbarIconButton
              disabled={!latestResponse}
              label="Copy last response"
              onClick={copyLastResponse}
            >
              <Copy className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton
              disabled={isSandboxAgent}
              label="New reply"
              onClick={onNewReply}
            >
              <SendHorizontal className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton
              active={vaultOpen}
              label="Prompt Vault"
              onClick={() => {
                setVaultOpen((current) => !current);
                setIntelOpen(false);
              }}
            >
              <Database className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton
              active={intelOpen}
              disabled={isSandboxAgent}
              label="Predictive Intel"
              onClick={() => {
                setIntelOpen((current) => {
                  const nextOpen = !current;

                  if (nextOpen) {
                    refreshPredictiveIntel();
                  }

                  return nextOpen;
                });
                setVaultOpen(false);
              }}
            >
              <BrainCircuit className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Clear transcript" onClick={onClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            {busy && !isMediaAgent ? (
              <ToolbarIconButton label="Stop stream" onClick={onStop} tone="danger">
                <Square className="h-3.5 w-3.5" />
              </ToolbarIconButton>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {vaultOpen && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-12 top-0 z-30 w-72 border border-fuchsia-300/25 bg-slate-950/95 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur"
            exit={{ opacity: 0, x: 8 }}
            initial={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
          >
            <div className="cyber-scroll max-h-60 overflow-y-auto">
              {workspacePrompts.length ? (
                workspacePrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    className="block w-full border border-transparent px-3 py-2 text-left transition hover:border-fuchsia-300/30 hover:bg-fuchsia-300/10"
                    onClick={() => fillPrompt(prompt.content)}
                    type="button"
                  >
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fuchsia-100">
                      {prompt.title}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-slate-400">
                      {prompt.content}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Vault Empty
                </div>
              )}
            </div>
            <div className="sticky bottom-0 grid grid-cols-2 gap-1 border-t border-fuchsia-300/20 bg-slate-950/98 p-1">
              <button
                className="inline-flex h-8 items-center justify-center border border-fuchsia-300/20 bg-transparent px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-fuchsia-100 transition hover:border-fuchsia-300/50 hover:bg-fuchsia-300/10"
                onClick={() => {
                  console.log("Creating new prompt placeholder");
                }}
                type="button"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Prompt
              </button>
              <button
                className="inline-flex h-8 items-center justify-center border border-cyan-300/20 bg-transparent px-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
                onClick={() => {
                  setVaultOpen(false);
                  onOpenVaultManager();
                }}
                type="button"
              >
                <Home className="mr-2 h-4 w-4" />
                Vault Manager
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intelOpen && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-12 top-20 z-30 w-64 border border-emerald-300/25 bg-slate-950/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur"
            exit={{ opacity: 0, x: 8 }}
            initial={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-emerald-300/15 pb-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                Predictive Intel
              </span>
              {intelLoading ? (
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300/70">
                  Thinking
                </span>
              ) : null}
            </div>
            {(intelItems.length ? intelItems : buildMockPredictiveIntelSuggestions({ agent, lastAssistantMessage: latestResponse })).map((prompt) => (
              <button
                key={prompt}
                className="block w-full border border-transparent px-3 py-2 text-left text-xs leading-5 text-slate-300 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-100"
                onClick={() => fillPrompt(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarIconButton({
  active,
  children,
  disabled,
  label,
  onClick,
  tone = "default",
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "grid h-7 w-7 place-items-center border text-slate-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35",
        active && "border-cyan-300/50 bg-cyan-300/12 text-cyan-100",
        !active &&
          tone === "default" &&
          "border-white/10 bg-black/35 hover:border-cyan-300/35 hover:text-cyan-100",
        !active &&
          tone === "danger" &&
          "border-rose-300/20 bg-rose-300/5 text-rose-100 hover:border-rose-300/45",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function MediaCanvas({ agent }: { agent: NexusAgent }) {
  const capabilityType = getCapabilityType(agent);
  const artifact = getLatestMediaArtifact(agent);
  const generating = agent.status === "thinking" || agent.status === "streaming";
  const recent = agent.messages
    .filter((message) => message.role === "user" || message.media)
    .slice(-4);

  return (
    <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto p-3">
      <div className="grid gap-3">
        <div className="border border-white/10 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {capabilityType} generation canvas
            </div>
            <span
              className="border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
              style={{
                borderColor: `${agent.accent}66`,
                color: agent.accent,
                backgroundColor: `${agent.accent}14`,
              }}
            >
              {agent.model}
            </span>
          </div>

          <div className="relative grid aspect-video place-items-center overflow-hidden border border-white/10 bg-slate-950">
            {artifact ? (
              <MediaArtifactPreview artifact={artifact} />
            ) : (
              <div className="px-6 text-center">
                <div
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center border font-mono text-sm"
                  style={{
                    borderColor: `${agent.accent}88`,
                    color: agent.accent,
                    backgroundColor: `${agent.accent}14`,
                  }}
                >
                  {capabilityType === "image" ? "IMG" : "VID"}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
                  No media artifact yet
                </div>
              </div>
            )}

            {generating && (
              <div className="absolute inset-x-4 bottom-4 border border-cyan-300/30 bg-black/70 p-3 backdrop-blur">
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                  <span>Generating</span>
                  <span>{capabilityType}</span>
                </div>
                <div className="h-1.5 overflow-hidden bg-white/10">
                  <div
                    className="h-full animate-pulse"
                    style={{
                      width: agent.status === "thinking" ? "38%" : "74%",
                      backgroundColor: agent.accent,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          {recent.map((message) => (
            <div key={message.id} className="border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <span>{message.media ? "artifact" : "prompt"}</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-slate-300">
                {message.media?.prompt ?? message.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaArtifactPreview({ artifact }: { artifact: AgentMediaArtifact }) {
  return (
    <div className="relative h-full w-full">
      <div
        aria-label={`${artifact.type} preview for ${artifact.prompt}`}
        className="h-full w-full bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${artifact.url}")` }}
      />
      {artifact.type === "video" && (
        <div className="absolute inset-0 grid place-items-center bg-black/18">
          <div className="grid h-16 w-16 place-items-center border border-white/35 bg-black/55 text-white backdrop-blur">
            <span className="ml-1 h-0 w-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-white" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/68 p-3 backdrop-blur">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
          {artifact.type} preview
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-slate-300">{artifact.prompt}</p>
      </div>
    </div>
  );
}

function getReasoningPreview(content: string, detail: NexusReasoningDetail | undefined) {
  if (detail === "low") {
    return content.length > 480 ? `${content.slice(0, 480)}...` : content;
  }

  if (detail === "medium") {
    return content.length > 1200 ? `${content.slice(0, 1200)}...` : content;
  }

  return content;
}

function MessageBubble({
  message,
  reasoningDetail,
}: {
  message: AgentMessage;
  reasoningDetail?: NexusReasoningDetail;
}) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const reasoningPreview = message.reasoningContent
    ? getReasoningPreview(message.reasoningContent, reasoningDetail)
    : "";

  return (
    <article
      className={cx(
        "nexus-message-bubble border p-3",
        isUser
          ? "ml-8 border-fuchsia-300/30 bg-fuchsia-300/10"
          : isTool
            ? "mr-8 border-emerald-300/25 bg-emerald-300/[0.07]"
            : "mr-8 border-cyan-300/25 bg-cyan-300/[0.07]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
          {isUser ? "operator" : isTool ? "tool" : "agent"}
        </span>
        <span className="font-mono text-[10px] text-slate-600">
          {formatTime(message.createdAt)}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
        {message.content}
        {message.streaming && (
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-cyan-200 align-middle" />
        )}
        {message.interrupted && (
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200">
            interrupted
          </span>
        )}
      </p>
      {message.reasoningContent ? (
        <details className="mt-3 border border-cyan-300/20 bg-black/22 p-2">
          <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100">
            Provider reasoning
          </summary>
          <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-400">
            {reasoningPreview}
          </p>
        </details>
      ) : null}
      {message.media && (
        <div className="mt-3 aspect-video overflow-hidden border border-white/10 bg-black/25">
          <MediaArtifactPreview artifact={message.media} />
        </div>
      )}
    </article>
  );
}

function MinimizedRail({
  agents,
  onRestore,
}: {
  agents: NexusAgent[];
  onRestore: (agentId: string) => void;
}) {
  if (!agents.length) {
    return null;
  }

  return (
    <div className="absolute bottom-3 left-3 right-3 z-[50] flex gap-2 overflow-x-auto">
      {agents.map((agent) => (
        <button
          key={agent.id}
          className="flex min-w-44 items-center gap-2 border border-white/10 bg-black/70 px-3 py-2 text-left shadow-xl backdrop-blur transition hover:border-cyan-300/50"
          onClick={() => onRestore(agent.id)}
          type="button"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: agent.accent }}
          />
          <span className="min-w-0">
            <span className="block truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
              {agent.callsign}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {getCapabilityType(agent)} / {agent.model}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function RightIntel({
  agent,
  agents,
  activeAgent,
  selectedAgentId,
  onSelectAgent,
  onSetAgentProfileLocked,
  onUpdateAgentCallsign,
  onUpdateAgentProfile,
  onUpdateMission,
  onUpdateMemory,
  onRunTool,
}: {
  agent?: NexusAgent;
  agents: NexusAgent[];
  activeAgent?: NexusAgent;
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onSetAgentProfileLocked: (agentId: string, locked: boolean) => void;
  onUpdateAgentCallsign: (agentId: string, callsign: string) => void;
  onUpdateAgentProfile: (agentId: string, profile: AgentProfileUpdate) => void;
  onUpdateMission: (agentId: string, mission: string) => void;
  onUpdateMemory: (agentId: string, memoryId: string, content: string) => void;
  onRunTool: (agentId: string, toolId: string) => Promise<void>;
}) {
  const [profilePanelAgentId, setProfilePanelAgentId] = useState<string | null>(null);

  return (
    <aside className="nexus-panel hidden h-full min-h-0 flex-col overflow-hidden xl:flex">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-slate-300">
            Ops Matrix
          </h2>
          <PanelRight className="h-4 w-4 text-fuchsia-200" />
        </div>
        <div className="mt-4 border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white">
              Selected Agent
            </span>
          </div>
          <p className="text-sm text-slate-300">
            {agent ? `${agent.callsign} / ${agent.title}` : "No agent selected"}
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          {agents.map((candidate) => {
            const selected = selectedAgentId === candidate.id;
            const open = profilePanelAgentId === candidate.id;
            const locked = Boolean(candidate.profileLocked);

            return (
              <article
                key={candidate.id}
                className={cx(
                  "border bg-black/24 transition",
                  selected ? "border-cyan-300/35" : "border-white/10",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-2">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectAgent(candidate.id)}
                    type="button"
                  >
                    <span className="block min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white">
                          {candidate.callsign}
                        </span>
                        {locked ? (
                          <Lock className="h-3 w-3 shrink-0 text-emerald-200" />
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {candidate.model}
                      </span>
                    </span>
                  </button>
                  <button
                    aria-expanded={open}
                    aria-label={`${candidate.callsign} custom settings`}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center border text-slate-500 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100",
                      open &&
                        "border-cyan-300/55 bg-cyan-300/15 text-cyan-100",
                    )}
                    onClick={() => {
                      onSelectAgent(candidate.id);
                      setProfilePanelAgentId((current) =>
                        current === candidate.id ? null : candidate.id,
                      );
                    }}
                    title={`${candidate.callsign} custom settings`}
                    type="button"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open ? (
                  <div className="grid gap-2 border-t border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Custom Agent
                      </span>
                      <button
                        aria-pressed={locked}
                        className={cx(
                          "grid h-7 w-7 place-items-center border transition",
                          locked
                            ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.035] text-slate-500 hover:border-cyan-300/45 hover:text-cyan-100",
                        )}
                        onClick={() => onSetAgentProfileLocked(candidate.id, !locked)}
                        title={locked ? "Unlock custom agent" : "Lock custom agent"}
                        type="button"
                      >
                        {locked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Name
                      </span>
                      <input
                        className="w-full border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentCallsign(candidate.id, event.currentTarget.value)
                        }
                        value={candidate.callsign}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Role
                      </span>
                      <input
                        className="w-full border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentProfile(candidate.id, {
                            identity: event.currentTarget.value,
                          })
                        }
                        value={candidate.identity}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Task
                      </span>
                      <textarea
                        className="min-h-20 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateMission(candidate.id, event.currentTarget.value)
                        }
                        value={candidate.mission}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Execution
                      </span>
                      <textarea
                        className="min-h-24 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60 disabled:opacity-45"
                        disabled={locked}
                        onChange={(event) =>
                          onUpdateAgentProfile(candidate.id, {
                            executionPrompt: event.currentTarget.value,
                          })
                        }
                        value={candidate.executionPrompt}
                      />
                    </label>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className="cyber-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Collaboration Graph
            </h3>
            <Workflow className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="relative h-48 border border-white/10 bg-black/28">
            <GraphNode
              accent="#22d3ee"
              label={activeAgent?.callsign ?? "ACTIVE"}
              x="18%"
              y="22%"
            />
            <GraphNode
              accent="#f472b6"
              label={agent?.callsign ?? "SELECT"}
              x="58%"
              y="42%"
            />
            <GraphNode accent="#34d399" label="TOOLS" x="28%" y="70%" />
            <GraphNode accent="#f59e0b" label="MEMORY" x="70%" y="72%" />
            <div className="absolute left-[28%] top-[31%] h-px w-[34%] rotate-[18deg] bg-cyan-200/30" />
            <div className="absolute left-[38%] top-[67%] h-px w-[32%] -rotate-[24deg] bg-emerald-200/30" />
            <div className="absolute left-[63%] top-[52%] h-px w-[20%] rotate-[56deg] bg-amber-200/30" />
          </div>
        </section>

        {agent && (
          <>
            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <GitBranch className="h-4 w-4 text-cyan-200" />
                Context Stack
              </div>
              <div className="grid gap-2">
                {agent.contextNotes.map((item) => (
                  <div key={item.id} className="border border-white/10 bg-white/[0.035] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                      {item.source}
                    </div>
                    <div className="mt-1 text-sm text-slate-200">{item.title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <SlidersHorizontal className="h-4 w-4 text-fuchsia-200" />
                Tool Ports
              </div>
              <div className="grid gap-2">
                {agent.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="grid gap-2 border border-white/10 bg-white/[0.035] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-slate-200">
                          {tool.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {tool.scope}
                        </span>
                      </span>
                      <span
                        className={cx(
                          "shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                          tool.status === "available" || tool.status === "done"
                            ? "border-emerald-300/35 text-emerald-100"
                            : tool.status === "running"
                              ? "border-cyan-300/35 text-cyan-100"
                              : "border-amber-300/35 text-amber-100",
                        )}
                      >
                        {hasToolExecutor(tool) ? tool.status : "planned"}
                      </span>
                    </div>
                    {hasToolExecutor(tool) && (
                      <button
                        className="border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                        disabled={tool.status === "running"}
                        onClick={() => {
                          void onRunTool(agent.id, tool.id);
                        }}
                        type="button"
                      >
                        Run executor
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <Database className="h-4 w-4 text-emerald-200" />
                Memory Edit
              </div>
              <div className="grid gap-2">
                {agent.memory.map((memory) => (
                  <label
                    key={memory.id}
                    className="grid gap-2 border border-white/10 bg-white/[0.035] p-3"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                      {memory.label}
                    </span>
                    <textarea
                      className="min-h-20 resize-none border border-white/10 bg-black/30 p-2 text-xs leading-5 text-slate-200 outline-none transition focus:border-emerald-300/50"
                      onChange={(event) =>
                        onUpdateMemory(agent.id, memory.id, event.target.value)
                      }
                      value={memory.content}
                    />
                  </label>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

function GraphNode({
  label,
  accent,
  x,
  y,
}: {
  label: string;
  accent: string;
  x: string;
  y: string;
}) {
  return (
    <div
      className="absolute grid h-14 w-24 place-items-center border bg-black/68 px-2 text-center font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{
        borderColor: `${accent}80`,
        color: accent,
        left: x,
        top: y,
      }}
    >
      {label}
    </div>
  );
}

function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const close = () => {
    setQuery("");
    onClose();
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return commands;
    }

    return commands.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[999] grid place-items-start bg-black/62 px-4 pt-24 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={close}
        >
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="nexus-panel mx-auto w-full max-w-2xl overflow-hidden"
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            onMouseDown={(event) => event.stopPropagation()}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="h-5 w-5 text-cyan-200" />
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search command fabric"
                value={query}
              />
              <button
                aria-label="Close command palette"
                className="grid h-8 w-8 place-items-center border border-white/10 text-slate-400 transition hover:text-white"
                onClick={close}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="cyber-scroll max-h-[420px] overflow-y-auto p-2">
              {filtered.map((command) => (
                <button
                  key={command.id}
                  className="flex w-full items-center gap-3 border border-transparent p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                  onClick={command.run}
                  type="button"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-white/10 bg-white/[0.045] text-cyan-100">
                    {command.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {command.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {command.detail}
                    </span>
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No matching command.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
