"use client";

import dynamic from "next/dynamic";
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
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RndDragCallback, RndResizeCallback } from "react-rnd";

import {
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
  ArtifactCreateResponse,
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
  CreateArtifactRequest,
  IAuthVault,
  NexusReasoningDetail,
  NexusReasoningEffort,
  NexusVerbosity,
  NexusAgent,
  NexusWorkspace,
  NotebookRecord,
  StreamMode,
  SystemEventListResponse,
  SystemEventRecord,
  WorkflowTemplateRecord,
  WorkflowRuntimeLiteState,
  WorkspaceBranchingSettings,
  WorkspaceRecoveryListItem,
  WorkspaceSessionEnsureResponse,
  WorkspaceSnapshot,
  WorkspaceThemeConfig,
  WorkspaceViewMode,
} from "@/lib/nexus-types";
import { nexusApiClient } from "@/lib/api/nexus-api-client";
import {
  createNotebookRecoveryMetadata,
  parseWorkspaceSnapshot,
} from "@/lib/workspace-kernel";
import {
  createImportedWorkspaceStyleReviewState,
  createDefaultWorkspaceThemeStyleControlsV1,
  createWorkspaceThemeStyleControlsPayloadV1,
  createWorkspaceThemeStylePreviewVariablesV1,
  createWorkspaceStylePayloadExportSnapshot,
  extractWorkspaceThemeStyleControlsV1,
  extractWorkspaceStylePayloadFromSnapshot,
  normalizeWorkspaceStylePayload,
  readImportedWorkspaceStyleReviewState,
  subscribeImportedWorkspaceStyleReviewState,
  writeImportedWorkspaceStyleReviewState,
  type ImportedWorkspaceStyleReviewState,
  type WorkspaceStylePayloadV1,
  type WorkspaceStylePayloadExportStatus,
  type WorkspaceStylePayloadImportStatus,
  type WorkspaceThemeStyleControlsV1,
} from "@/lib/style-engine/v2-workspace-style-payload";
import {
  createProductionPreviewApplyPlan,
  createProductionPreviewResidueCheck,
  createProductionPreviewRevertPlan,
  NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
  type ProductionPreviewApplyTransaction,
  type ProductionPreviewInlineValueSnapshot,
  type ProductionPreviewTargetFacts,
} from "@/lib/style-engine/v2-production-preview-transaction";
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
import { executeImageAdapterForAgent } from "@/lib/adapters/image-adapter";
import {
  getGeneratedImageMimeType,
  getGeneratedImageUrlKind,
} from "@/lib/media/generated-image-artifact";
import {
  createNoopAttachmentCompilerMetadata,
  resolveAttachmentCompilerLane,
} from "@/lib/attachments/attachment-compiler-registry";
import { WORKSPACE_ATTACHMENT_INPUT_ACTIONS } from "@/lib/attachments/attachment-input-actions";
import type {
  WorkspaceAttachmentInputActionId,
  WorkspaceComposerAttachment,
} from "@/lib/attachments/attachment-types";
import type {
  ModelCatalogResponse,
  PublicModelCatalogEntry,
} from "@/lib/models/model-catalog-types";
import {
  getWorkspaceComposerActions,
  type WorkspaceComposerActionId,
} from "@/lib/composer/composer-actions";
import {
  getWorkspaceComposerMode,
  toggleWorkspaceComposerMode,
  type WorkspaceComposerMode,
  type WorkspaceComposerModeByAgentId,
} from "@/lib/composer/composer-mode-types";
import {
  WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS,
  normalizeWorkspaceComposerImageSettings,
  type WorkspaceComposerImageSettings,
} from "@/lib/composer/image-generation-settings";
import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "@/lib/workflow-pro/capability-inventory";
import {
  createWorkflowProRuntimeEvidenceManifest,
  createWorkflowProRuntimeEvidenceReport,
  type WorkflowProRuntimeEvidenceReport,
} from "@/lib/workflow-pro/runtime-evidence";
import {
  createWorkflowProRunHistoryGroupsReport,
  type WorkflowProRunHistoryGroupsReport,
} from "@/lib/workflow-pro/run-history-groups";
import { createWorkflowProRunGroupInspectorReport } from "@/lib/workflow-pro/run-group-inspector";
import { createWorkflowProDurableGroupRecordReport } from "@/lib/workflow-pro/durable-group-records";
import { createWorkflowRuntimeTraceCorrelationReport } from "@/lib/workflow-pro/runtime-trace-correlation";
import { createWorkflowBrainContextPack } from "@/lib/workflow-pro/brain-context";
import { createWorkflowProFileNodeContract } from "@/lib/workflow-pro/file-node-contract";
import { createWorkflowProHandoffPackage } from "@/lib/workflow-pro/handoff-package";
import { createWorkflowProRuntimeBridge } from "@/lib/workflow-pro/runtime-bridge";
import { createWorkflowProApplyPlan } from "@/lib/workflow-pro/workflow-contract-apply-plan";
import {
  parseWorkflowProContractImportText,
  type WorkflowProContractImportReview,
} from "@/lib/workflow-pro/workflow-contract-import";
import { createWorkflowProContractDraftFromRuntimeLite } from "@/lib/workflow-pro/workflow-contract";
import { validateWorkflowProContractDraft } from "@/lib/workflow-pro/workflow-contract-validator";
import { createWorkflowProProposalDiff } from "@/lib/workflow-pro/proposal-diff";
import {
  getModelOption,
  getModelCapabilityProfile,
  getModelOptionsForCapability,
  getProviderOption,
} from "@/lib/nexus-registry";
import {
  evaluateWorkflowHandoffs,
  queueWorkflowHandoffDispatches,
  type WorkflowDispatchDecision,
  type WorkflowAgentSnapshot,
} from "@/lib/workflow-engine";
import { useNexusStore } from "@/store/nexus-store";
import { AgentBranchModal } from "@/components/nexus/AgentBranchModal";
import { AuthScreen } from "@/components/nexus/auth-screen";
import { DatapadWindow } from "@/components/nexus/DatapadWindow";
import { NexusGraph } from "@/components/nexus/nexus-graph";
import { NexusOpsBodyFrame } from "@/components/nexus/nexus-ops-body-frame";
import { NexusOpsOuterShellFrame } from "@/components/nexus/nexus-ops-outer-shell-frame";
import { NexusOpsRightFloatingDockFrame } from "@/components/nexus/nexus-ops-right-floating-dock-frame";
import { NexusOpsTopBarFrame } from "@/components/nexus/nexus-ops-top-bar-frame";
import { PromptVaultManager } from "@/components/nexus/PromptVaultManager";
import { WorkflowProSurface } from "@/components/nexus/workflow-pro/workflow-pro-surface";

import {
  artifactPreview,
  clampNumber,
  cx,
  formatFileSize,
  formatTime,
  getCatalogModelLabel,
  getFileExtension,
  getModelLabel,
  getProviderLabel,
  GraphNode,
  IconButton,
  isGeneratedArtifactRecord,
  isTextLikeAttachmentFile,
  isTransientArtifactRecord,
  streamModeTone,
  SyncBadge,
  ToolbarIconButton,
  TopMenuAction,
  traceSeverityClass,
} from "@/components/nexus/nexus-utils";
import { CommandPalette, MinimizedRail, AgentActionToolbar, SidebarToggleButton, CollapsedSidebarRail } from "@/components/nexus/nexus-chrome";
import { AgentWindow } from "@/components/nexus/nexus-agent-window";
import { RightFloatingDock, TopBar, MacroComposerModal, RightIntel } from "@/components/nexus/nexus-panels";
import { AgentTemplateProfilePanel, LeftDock, ModelTuningSelect, AgentModelTuningPanel } from "@/components/nexus/nexus-settings-panels";
import { AgentSettingsSidebar, ModelInfoPanel } from "@/components/nexus/nexus-agent-settings-sidebar";

const Rnd = dynamic(() => import("react-rnd").then((module) => module.Rnd), {
  ssr: false,
});

const EMPTY_AGENTS: NexusAgent[] = [];
const EMPTY_GRAPH = { nodes: [], edges: [] };
const SANDBOX_MIN_SPLIT = 20;
const SANDBOX_MAX_SPLIT = 80;

type LegoThemeKey = keyof WorkspaceThemeConfig;
type WorkspaceSessionRole = WorkspaceSessionEnsureResponse["role"];

function isWorkspaceReadOnlyRole(role: WorkspaceSessionRole | null | undefined) {
  return role === "viewer";
}

function resolveWorkspaceApiScope({
  activeWorkspaceId,
  sessionByWorkspaceId,
  workspace,
}: {
  activeWorkspaceId: string;
  sessionByWorkspaceId: Record<string, WorkspaceSessionEnsureResponse>;
  workspace: NexusWorkspace | null | undefined;
}) {
  const localWorkspaceId = workspace?.id ?? activeWorkspaceId;
  const session = sessionByWorkspaceId[localWorkspaceId];

  return {
    localWorkspaceId,
    session: session ?? null,
    workspaceId: session?.workspaceId ?? localWorkspaceId,
  };
}
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

type WorkspaceThemeLivePreviewStatus =
  | "idle"
  | "active"
  | "saved"
  | "reverted"
  | "blocked";

type WorkspaceThemeLivePreviewTargetStatus = "ready" | "missing" | "blocked";

type WorkspaceThemeLivePreviewState = {
  applyDurationMs: number | null;
  checksum: string;
  error: string | null;
  remainingPreviewVariableCount: number | null;
  residueCheck: "not-run" | "pass" | "fail";
  revertDurationMs: number | null;
  status: WorkspaceThemeLivePreviewStatus;
  targetCount: number | null;
  targetStatus: WorkspaceThemeLivePreviewTargetStatus;
  transactionId: string;
  variableCount: number;
};

type WorkspaceThemeSeedApplyResult =
  | {
      checksum: string;
      status: "applied";
      targetCount: number;
      variableCount: number;
    }
  | {
      checksum: string | null;
      reason: string;
      status: "blocked";
      targetCount: number;
      variableCount: number;
    };

const workspaceThemeLivePreviewInitialState: WorkspaceThemeLivePreviewState = {
  applyDurationMs: null,
  checksum: "",
  error: null,
  remainingPreviewVariableCount: null,
  residueCheck: "not-run",
  revertDurationMs: null,
  status: "idle",
  targetCount: null,
  targetStatus: "missing",
  transactionId: "",
  variableCount: 0,
};

const workspaceThemeLivePreviewNetworkBaselineWindowId =
  "theme-panel-live-preview-local-scope";
const WORKSPACE_ATTACHMENT_BINARY_INLINE_MAX_BYTES = 4 * 1024 * 1024;
const WORKSPACE_ATTACHMENT_CONTEXT_MAX_CHARS = 12_000;
const WORKSPACE_SIZE_REMEASURE_INTERVAL_MS = 800;
type RightDockPanelId =
  | "intel"
  | "providers"
  | "models"
  | "theme"
  | "memory"
  | "artifacts"
  | "generations"
  | "workflows"
  | "account";

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

function createWorkspaceStylePayloadImportNotice(
  status: WorkspaceStylePayloadImportStatus,
) {
  if (status === "accepted") {
    return "Workspace snapshot imported; stylePack accepted for Style Lab review; not auto-applied";
  }

  if (status === "rejected-style-only") {
    return "Workspace snapshot imported; stylePack rejected style-only; workspace kept";
  }

  if (status === "unsupported-version") {
    return "Workspace snapshot imported; stylePack version unsupported; workspace kept";
  }

  return "Workspace snapshot imported; no stylePack found";
}

function createWorkspaceStylePayloadExportNotice(
  status: WorkspaceStylePayloadExportStatus,
) {
  if (status === "included") {
    return "Workspace snapshot exported with reviewed stylePack";
  }

  if (status === "omitted-invalid") {
    return "Workspace snapshot exported; invalid stylePack not retained";
  }

  return "Workspace snapshot exported; no stylePack retained";
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

function createWorkspaceThemeStylePayloadForExport(
  controls: WorkspaceThemeStyleControlsV1,
  existingPayload?: WorkspaceStylePayloadV1 | null,
): WorkspaceStylePayloadV1 | null {
  const controlsPayload = {
    ...(existingPayload?.controls ?? {}),
    ...createWorkspaceThemeStyleControlsPayloadV1(controls),
  };
  const candidate: WorkspaceStylePayloadV1 = {
    source: "surface-style-controls",
    version: "style-pack-v2",
    ...(existingPayload?.skinPack ? { skinPack: existingPayload.skinPack } : {}),
    ...(existingPayload?.bridgeSummary
      ? { bridgeSummary: existingPayload.bridgeSummary }
      : {}),
    controls: controlsPayload,
  };
  const decision = normalizeWorkspaceStylePayload(candidate);

  return decision.status === "accepted" ? decision.payload : null;
}

function getWorkspaceThemePreviewTargets() {
  if (typeof document === "undefined") {
    return [];
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    ),
  );
}

function resolveWorkspaceThemeControlsForBoot(
  stylePayloadReview: ImportedWorkspaceStyleReviewState | null,
): WorkspaceThemeStyleControlsV1 {
  if (stylePayloadReview?.decision.status === "accepted") {
    const importedControls = extractWorkspaceThemeStyleControlsV1(
      stylePayloadReview.decision.payload?.controls,
    );

    if (importedControls.accepted) {
      return importedControls.controls;
    }
  }

  return createDefaultWorkspaceThemeStyleControlsV1();
}

function applyWorkspaceThemeControlsToProductionTarget(
  controls: WorkspaceThemeStyleControlsV1,
): WorkspaceThemeSeedApplyResult {
  const variableResult = createWorkspaceThemeStylePreviewVariablesV1(controls);

  if (!variableResult.accepted) {
    return {
      checksum: null,
      reason: variableResult.reasons.join(", "),
      status: "blocked",
      targetCount: 0,
      variableCount: 0,
    };
  }

  const targets = getWorkspaceThemePreviewTargets();
  const target = targets[0] ?? null;
  const targetFacts = createWorkspaceThemeTargetFacts(targets, target);
  const plan = createProductionPreviewApplyPlan({
    checksums: {
      bridgeChecksum: variableResult.checksum,
      budgetChecksum: variableResult.checksum,
      diagnosticsChecksum: variableResult.checksum,
    },
    createdAt: new Date().toISOString(),
    hasAuthenticatedEvidence: true,
    hasRollbackPlan: true,
    networkBaselineWindowId: workspaceThemeLivePreviewNetworkBaselineWindowId,
    preflightVerdict: "eligible",
    previousInlineValues: target
      ? snapshotWorkspaceThemeInlineValues(target, variableResult.variableNames)
      : {},
    safetyFlags: {
      mutatesDocumentRoot: false,
      touchesProductionBehavior: false,
      writesToBackend: false,
      writesToStorage: false,
      writesToStore: false,
    },
    sessionId: createWorkspaceThemePreviewId("session"),
    target: targetFacts,
    transactionId: createWorkspaceThemePreviewId("transaction"),
    variables: variableResult.variables,
  });

  if (!target || plan.verdict !== "ready" || !plan.transaction) {
    return {
      checksum: variableResult.checksum,
      reason:
        plan.reasons[0]?.message ??
        "Workspace theme seed apply failed closed.",
      status: "blocked",
      targetCount: targets.length,
      variableCount: variableResult.variableNames.length,
    };
  }

  for (const [name, value] of Object.entries(
    plan.transaction.appliedVariables,
  )) {
    target.style.setProperty(name, value);
  }

  return {
    checksum: variableResult.checksum,
    status: "applied",
    targetCount: targets.length,
    variableCount: variableResult.variableNames.length,
  };
}

function createWorkspaceThemeTargetFacts(
  targets: HTMLElement[],
  target: HTMLElement | null,
): ProductionPreviewTargetFacts {
  const tagName = target?.tagName.toLowerCase() ?? "";
  const rect = target?.getBoundingClientRect();

  return {
    classList: target ? Array.from(target.classList) : [],
    isBodyElement: tagName === "body",
    isDocumentRoot:
      typeof document !== "undefined" && target === document.documentElement,
    isHtmlElement: tagName === "html",
    selector: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    tagName,
    targetCount: targets.length,
    visible: rect ? rect.width > 0 && rect.height > 0 : false,
  };
}

function snapshotWorkspaceThemeInlineValues(
  target: HTMLElement,
  variableNames: string[],
): ProductionPreviewInlineValueSnapshot {
  return Object.fromEntries(
    variableNames.map((name) => {
      const value = target.style.getPropertyValue(name);

      return [name, value.length > 0 ? value : undefined];
    }),
  );
}

function createWorkspaceThemePreviewId(kind: "session" | "transaction") {
  return `nexus-workspace-style-controls:${kind}:${Date.now().toString(36)}`;
}

function getWorkspaceThemePreviewNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function roundWorkspaceThemePreviewDuration(value: number) {
  return Math.round(value * 100) / 100;
}

function compareWorkspaceThemeControls(
  left: WorkspaceThemeStyleControlsV1,
  right: WorkspaceThemeStyleControlsV1,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
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

function getAgentModelGroups(
  agent: NexusAgent,
  modelCatalog: PublicModelCatalogEntry[],
) {
  const capabilityType = getCapabilityType(agent);
  const currentModel = agent.model?.trim();
  const catalogModels =
    capabilityType === "chat"
      ? modelCatalog.map((model) => model.id)
      : getModelOptionsForCapability(capabilityType).map((model) => model.id);

  const models = uniqueModelIds([currentModel, ...catalogModels]);
  const grouped = models.reduce<Array<{ label: string; models: string[] }>>(
    (groups, modelId) => {
      const catalogModel = modelCatalog.find((model) => model.id === modelId);
      const option = getModelOption(modelId);
      const providerId = option?.provider ?? agent.provider;
      const label = catalogModel?.provider_family ?? getProviderLabel(providerId);
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

function getFallbackAllowedModelId(modelCatalog: PublicModelCatalogEntry[]) {
  return (
    modelCatalog.find((model) => model.id === "gpt-4o-mini")?.id ??
    modelCatalog[0]?.id ??
    "gpt-4o-mini"
  );
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

function resolveAgentsStreamMode(): StreamMode {
  return "live";
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("File read did not return a data URL."));
    };
    reader.readAsDataURL(file);
  });
}

function getMimeTypeFromDataUrl(url: string) {
  return /^data:([^;,]+)/.exec(url)?.[1] ?? "";
}

function inferDownloadExtension(input: {
  mimeType?: string | null;
  type?: MediaAgentCapabilityType | string;
  url?: string | null;
}) {
  const mimeType = input.mimeType || (input.url ? getMimeTypeFromDataUrl(input.url) : "");

  if (mimeType.includes("svg")) {
    return "svg";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }

  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  if (mimeType.includes("json")) {
    return "json";
  }

  if (mimeType.startsWith("text/")) {
    return "txt";
  }

  return input.type === "video" ? "mp4" : input.type === "image" ? "png" : "txt";
}

function sanitizeDownloadFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "nexus-generated-asset"
  );
}

function appendDownloadExtension(fileName: string, extension: string) {
  return fileName.toLowerCase().endsWith(`.${extension}`)
    ? fileName
    : `${fileName}.${extension}`;
}

function createMediaDownloadFilename(artifact: AgentMediaArtifact) {
  const extension = inferDownloadExtension({
    type: artifact.type,
    url: artifact.url,
  });
  const baseName = sanitizeDownloadFileName(
    `${artifact.type}-${artifact.prompt.slice(0, 48)}`,
  );

  return appendDownloadExtension(baseName, extension);
}

function createArtifactDownloadFilename(artifact: ArtifactVaultRecord) {
  const extension = inferDownloadExtension({
    mimeType: artifact.mimeType,
    type: artifact.type,
    url: artifact.contentUrl,
  });
  const baseName = sanitizeDownloadFileName(
    artifact.title ?? `${artifact.type}-${artifact.id.slice(0, 8)}`,
  );

  return appendDownloadExtension(baseName, extension);
}

function downloadUrlPayload(url: string, fileName: string) {
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

function downloadTextPayload(text: string, fileName: string, mimeType?: string | null) {
  const blob = new Blob([text], { type: mimeType ?? "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    downloadUrlPayload(url, fileName);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function downloadAuthenticatedUrlPayload(
  url: string,
  fileName: string,
  options: {
    userId?: string | null;
    workspaceId?: string | null;
  } = {},
) {
  const headers = new Headers();

  if (options.workspaceId) {
    headers.set("X-Workspace-Id", options.workspaceId);
  }

  if (options.userId) {
    headers.set("X-User-Id", options.userId);
  }

  const accessToken = await resolveBrowserSupabaseAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    headers,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Download route returned ${response.status}.`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    downloadUrlPayload(objectUrl, fileName);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function resolveBrowserSupabaseAccessToken() {
  try {
    const { getNexusSupabaseClient } = await import("@/lib/supabase/client");
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function downloadMediaArtifact(artifact: AgentMediaArtifact) {
  downloadUrlPayload(artifact.url, createMediaDownloadFilename(artifact));
}

function isMockGeneratedMediaUrl(url: string | null | undefined) {
  return Boolean(
    url?.startsWith("data:image/svg+xml") &&
      (url.includes("MOCK%20IMAGE%20ARTIFACT") ||
        url.includes("MOCK%2520IMAGE%2520ARTIFACT")),
  );
}

function createWorkspaceAttachmentMessagePayload(
  content: string,
  attachments: WorkspaceComposerAttachment[],
) {
  const trimmed = content.trim();
  const readyAttachments = attachments.filter(
    (attachment) => attachment.status === "ready" && attachment.artifactId,
  );

  if (!readyAttachments.length) {
    return trimmed;
  }

  const attachmentBlock = readyAttachments
    .map((attachment, index) => {
      const source = attachment.textContent ?? attachment.previewText;
      const body =
        attachment.contentKind === "text"
          ? source.slice(0, WORKSPACE_ATTACHMENT_CONTEXT_MAX_CHARS).trim()
          : [
              `${attachment.contentKind} attachment is recorded in Artifact Vault.`,
              "Attach a compiler lane before direct model ingestion.",
            ].join(" ");
      const truncated = source.length > WORKSPACE_ATTACHMENT_CONTEXT_MAX_CHARS;

      return [
        `[attachment:${index + 1}] ${attachment.name}`,
        `artifactId: ${attachment.artifactId}`,
        `rawArtifactId: ${attachment.rawArtifactId ?? attachment.artifactId}`,
        `compiledArtifactId: ${attachment.compiledArtifactId ?? attachment.artifactId}`,
        `compiler: ${attachment.compilerId}@${attachment.compilerVersion}`,
        `contentKind: ${attachment.contentKind}`,
        `mimeType: ${attachment.mimeType}`,
        `size: ${attachment.sizeBytes} bytes`,
        "compiledContent:",
        body || attachment.previewText,
        truncated ? "[truncated for model context]" : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [trimmed, "[workspace attachments]", attachmentBlock].filter(Boolean).join("\n\n");
}

export function NexusOps() {
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
  const [workflowProImportReview, setWorkflowProImportReview] =
    useState<WorkflowProContractImportReview | null>(null);
  const [workspaceStylePayloadReview, setWorkspaceStylePayloadReview] =
    useState<ImportedWorkspaceStyleReviewState | null>(null);
  const [workspaceStyleReviewLoaded, setWorkspaceStyleReviewLoaded] =
    useState(false);
  const workspaceThemeBootAppliedRef = useRef<string | null>(null);
  const [macros, setMacros] = useState<WorkflowTemplateRecord[]>([]);
  const [macrosLoading, setMacrosLoading] = useState(false);
  const [macroError, setMacroError] = useState<string | undefined>();
  const [macroRefreshToken, setMacroRefreshToken] = useState(0);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactError, setArtifactError] = useState<string | undefined>();
  const [artifactRefreshToken, setArtifactRefreshToken] = useState(0);
  const [composerModeByAgentId, setComposerModeByAgentId] =
    useState<WorkspaceComposerModeByAgentId>({});
  const [composerImageSettingsByAgentId, setComposerImageSettingsByAgentId] =
    useState<Record<string, WorkspaceComposerImageSettings>>({});
  const [macroComposerOpen, setMacroComposerOpen] = useState(false);
  const [macroName, setMacroName] = useState("");
  const [macroDescription, setMacroDescription] = useState("");
  const [branchAgentId, setBranchAgentId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [workspaceRecoveryItems, setWorkspaceRecoveryItems] = useState<
    WorkspaceRecoveryListItem[]
  >([]);
  const [workspaceRecoveryLoading, setWorkspaceRecoveryLoading] = useState(false);
  const [workspaceSessionByWorkspaceId, setWorkspaceSessionByWorkspaceId] =
    useState<Record<string, WorkspaceSessionEnsureResponse>>({});
  const [modelCatalog, setModelCatalog] = useState<PublicModelCatalogEntry[]>([]);
  const [modelCatalogPlan, setModelCatalogPlan] = useState<ModelCatalogResponse["plan"]>("Free");
  const artifactAutoHydrationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const syncImportedWorkspaceStyleReview = () => {
      setWorkspaceStylePayloadReview(readImportedWorkspaceStyleReviewState());
      setWorkspaceStyleReviewLoaded(true);
    };

    syncImportedWorkspaceStyleReview();

    return subscribeImportedWorkspaceStyleReviewState(
      syncImportedWorkspaceStyleReview,
    );
  }, []);

  const activeWorkspaceId = useNexusStore((state) => state.activeWorkspaceId);
  const workspaces = useNexusStore((state) => state.workspaces);
  const selectedAgentId = useNexusStore((state) => state.selectedAgentId);
  const viewMode = useNexusStore((state) => state.viewMode);
  const isVaultManagerOpen = useNexusStore((state) => state.isVaultManagerOpen);
  const authVault = useNexusStore((state) => state.authVault);
  const artifactVaultCache = useNexusStore((state) => state.artifactVault);
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
  const appendWorkflowRuntimeGroup = useNexusStore(
    (state) => state.appendWorkflowRuntimeGroup,
  );
  const removeWorkflowRuntimeNodes = useNexusStore(
    (state) => state.removeWorkflowRuntimeNodes,
  );
  const removeWorkflowRuntimeEdges = useNexusStore(
    (state) => state.removeWorkflowRuntimeEdges,
  );
  const replaceWorkflowRuntimeLite = useNexusStore(
    (state) => state.replaceWorkflowRuntimeLite,
  );
  const pauseWorkflowRuntimeLiteFlow = useNexusStore(
    (state) => state.pauseWorkflowRuntimeLiteFlow,
  );
  const runWorkflowRuntimeLiteFlow = useNexusStore(
    (state) => state.runWorkflowRuntimeLiteFlow,
  );
  const retryWorkflowRuntimeTraceSync = useNexusStore(
    (state) => state.retryWorkflowRuntimeTraceSync,
  );
  const runTool = useNexusStore((state) => state.runTool);
  const historicalMessages = useNexusStore((state) => state.historicalMessages);

  useEffect(() => {
    if (viewMode === "workflow-pro") {
      setViewMode("graph");
    }
  }, [setViewMode, viewMode]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const loadModels = async () => {
      const headers = new Headers();
      const accessToken = await resolveSupabaseAccessToken();

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      const response = await fetch("/api/models", {
        cache: "no-store",
        headers,
      });

      if (!response.ok) {
        throw new Error("Model catalog unavailable.");
      }

      return (await response.json()) as ModelCatalogResponse;
    };

    const fetchModels = () => {
      void loadModels()
        .then((payload) => {
          if (!cancelled) {
            setModelCatalog(payload.models);
            setModelCatalogPlan(payload.plan);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setModelCatalog([]);
            setModelCatalogPlan("Free");
            retryTimer = setTimeout(fetchModels, 3000);
          }
        });
    };

    fetchModels();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [authVault.user?.id]);

  const workspace =
    workspaces.find((candidate) => candidate.id === activeWorkspaceId) ?? workspaces[0];
  const workspaceName = workspace?.name ?? "NEXUS // AI OPS";
  const themeConfig = workspace?.themeConfig;
  const branchingSettings = workspace?.settings.branchingSettings;
  const activeAgentId = workspace?.activeAgentId;
  const agents = workspace?.agents ?? EMPTY_AGENTS;
  const activeWorkspaceSession = workspace
    ? workspaceSessionByWorkspaceId[workspace.id]
    : undefined;
  const activeWorkspaceRole = activeWorkspaceSession?.role ?? null;
  const activeWorkspaceReadOnly = isWorkspaceReadOnlyRole(activeWorkspaceRole);
  const activeWorkspaceReadOnlyMessage =
    "Viewer access is read-only. Create or switch to an editable workspace to run or change workflows.";
  const artifactVault = useMemo(
    () =>
      artifactVaultCache.ids
        .map((id) => artifactVaultCache.byId[id])
        .filter((artifact): artifact is ArtifactVaultRecord => Boolean(artifact)),
    [artifactVaultCache],
  );
  const effectiveStreamMode = useMemo(
    () => resolveAgentsStreamMode(),
    [],
  );

  const visibleAgents = agents.filter((agent) => !agent.minimized);
  const minimizedAgents = agents.filter((agent) => agent.minimized);
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const selectedComposerMode = getWorkspaceComposerMode(
    composerModeByAgentId,
    selectedAgent?.id,
  );
  const selectedComposerImageSettings = normalizeWorkspaceComposerImageSettings(
    selectedAgent ? composerImageSettingsByAgentId[selectedAgent.id] : undefined,
  );
  const activeAgent =
    agents.find((agent) => agent.id === activeAgentId) ?? selectedAgent;
  const workflowRunning = Boolean(
    workspace?.graph.runtimeLite?.runs.some((run) => run.status === "running"),
  );
  const workflowRuntimeLite = workspace?.graph.runtimeLite;

  useEffect(() => {
    if (!modelCatalog.length) {
      return;
    }

    const allowedModelIds = new Set(modelCatalog.map((model) => model.id));
    const fallbackModelId = getFallbackAllowedModelId(modelCatalog);

    for (const agent of agents) {
      if (getCapabilityType(agent) === "chat" && !allowedModelIds.has(agent.model)) {
        updateAgentModel(agent.id, fallbackModelId);
      }
    }
  }, [agents, modelCatalog, updateAgentModel]);
  const workflowProCapabilityInventory = useMemo(
    () => createWorkflowProCapabilityInventory(),
    [],
  );
  const workflowProFileNodeContract = useMemo(
    () => createWorkflowProFileNodeContract(),
    [],
  );
  const workflowProRuntimeSummary = useMemo(
    () => summarizeWorkflowProRuntime(workflowRuntimeLite),
    [workflowRuntimeLite],
  );
  const workflowProRuntimeEvidence = useMemo(
    () => createWorkflowProRuntimeEvidenceReport(workflowRuntimeLite),
    [workflowRuntimeLite],
  );
  const workflowProRunHistoryGroups = useMemo(
    () => createWorkflowProRunHistoryGroupsReport(workflowRuntimeLite),
    [workflowRuntimeLite],
  );
  const workflowProContractDraft = useMemo(
    () =>
      createWorkflowProContractDraftFromRuntimeLite({
        inventory: workflowProCapabilityInventory,
        runtimeLite: workflowRuntimeLite,
        workspaceId: activeWorkspaceId,
        workspaceName: workspace?.name ?? "NEXUS // AI OPS",
      }),
    [activeWorkspaceId, workflowProCapabilityInventory, workflowRuntimeLite, workspace?.name],
  );
  const workflowProActiveContract =
    workflowProImportReview?.status === "accepted"
      ? workflowProImportReview.contract
      : workflowProContractDraft;
  const workflowBrainContext = useMemo(
    () =>
      createWorkflowBrainContextPack({
        contract: workflowProActiveContract,
        runtimeSummary: workflowProRuntimeSummary,
      }),
    [workflowProActiveContract, workflowProRuntimeSummary],
  );
  const workflowProApplyPlan = useMemo(
    () =>
      createWorkflowProApplyPlan({
        contract: workflowProActiveContract,
        currentRuntimeLite: workflowRuntimeLite,
      }),
    [workflowProActiveContract, workflowRuntimeLite],
  );
  const workflowProProposalDiff = useMemo(
    () =>
      createWorkflowProProposalDiff({
        applyPlan: workflowProApplyPlan,
        currentRuntimeLite: workflowRuntimeLite,
      }),
    [workflowProApplyPlan, workflowRuntimeLite],
  );
  const handleWorkflowProContractExport = useCallback(() => {
    const validation = validateWorkflowProContractDraft(workflowProActiveContract);

    if (!validation.ok) {
      setNotice(
        `Workflow Pro contract invalid: ${validation.errors[0]?.message ?? "unknown validation error"}`,
      );
      return;
    }

    const handoffPackage = createWorkflowProHandoffPackage({
      brainContext: workflowBrainContext,
      contract: workflowProActiveContract,
      runtimeSummary: workflowProRuntimeSummary,
      sourceKind:
        workflowProImportReview?.status === "accepted"
          ? "imported-contract"
          : "current-runtime-draft",
      sourceName: `nexus-workflow-pro-handoff-${activeWorkspaceId}.json`,
    });

    downloadTextPayload(
      JSON.stringify(handoffPackage, null, 2),
      `nexus-workflow-pro-handoff-${activeWorkspaceId}-${Date.now()}.json`,
      "application/json;charset=utf-8",
    );
    setNotice(
      validation.warnings.length
        ? `Workflow Pro contract exported with ${validation.warnings.length} warnings`
        : "Workflow Pro handoff package exported",
    );
  }, [
    activeWorkspaceId,
    workflowBrainContext,
    workflowProActiveContract,
    workflowProImportReview,
    workflowProRuntimeSummary,
  ]);
  const handleWorkflowProContractImportText = useCallback(
    ({ sourceName, text }: { sourceName: string; text: string }) => {
      const review = parseWorkflowProContractImportText({
        sourceName,
        text,
      });

      setWorkflowProImportReview(review);
      setNotice(
        review.status === "accepted"
          ? `Workflow Pro contract accepted from ${review.sourceName}`
          : `Workflow Pro contract rejected: ${review.error}`,
      );
    },
    [],
  );
  const handleWorkflowProContractImportClear = useCallback(() => {
    setWorkflowProImportReview(null);
    setNotice("Workflow Pro imported contract cleared; using current Graph draft");
  }, []);
  const handleWorkflowProApplyPlan = useCallback(() => {
    const validation = validateWorkflowProContractDraft(workflowProActiveContract);

    if (!validation.ok) {
      setNotice(
        `Workflow Pro apply blocked: ${validation.errors[0]?.message ?? "contract invalid"}`,
      );
      return;
    }

    if (
      workflowProApplyPlan.status !== "ready" ||
      !workflowProApplyPlan.candidateRuntimeLite
    ) {
      setNotice(
        workflowProApplyPlan.reasons[0] ??
          "Workflow Pro apply blocked: apply plan is not ready",
      );
      return;
    }

    replaceWorkflowRuntimeLite(workflowProApplyPlan.candidateRuntimeLite);
    setWorkflowProImportReview(null);
    setViewMode("graph");
    setNotice("Workflow Pro apply completed; Graph updated from validated contract");
  }, [
    replaceWorkflowRuntimeLite,
    setViewMode,
    workflowProActiveContract,
    workflowProApplyPlan,
  ]);
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
  const [syncQueueStatus, setSyncQueueStatus] = useState<QueueStatusProjection>({
    conflicted: 0,
    failed: 0,
    pending: 0,
    syncing: 0,
  });

  const rememberWorkspaceSession = useCallback(
    (sessionWorkspace: WorkspaceSessionEnsureResponse) => {
      const readOnly = isWorkspaceReadOnlyRole(sessionWorkspace.role);

      void localSyncQueueAdapter.setWorkspaceReadOnly(
        sessionWorkspace.workspaceId,
        readOnly,
      );
      if (sessionWorkspace.preferredWorkspaceId) {
        void localSyncQueueAdapter.setWorkspaceReadOnly(
          sessionWorkspace.preferredWorkspaceId,
          readOnly,
        );
      }

      setWorkspaceSessionByWorkspaceId((current) => ({
        ...current,
        ...(sessionWorkspace.preferredWorkspaceId
          ? { [sessionWorkspace.preferredWorkspaceId]: sessionWorkspace }
          : {}),
        [sessionWorkspace.workspaceId]: sessionWorkspace,
      }));
    },
    [],
  );

  const recoverWorkspaceAfterLogin = useCallback((userId: string, accessToken?: string | null) => {
    const state = useNexusStore.getState();
    const localWorkspace =
      state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
      state.workspaces[0];

    setWorkspaceRecoveryLoading(true);
    void buildLocalWorkspaceRecoveryContext(localWorkspace)
      .then(async (localRecovery) => {
        let recoveryContext = localRecovery;
        const sessionWorkspace = await supabaseStateSyncManager.ensureWorkspaceSession({
          preferredWorkspaceId: localRecovery.localWorkspaceId,
          preferredWorkspaceName: localWorkspace?.name,
          userId,
        }, accessToken);

        if (sessionWorkspace) {
          rememberWorkspaceSession(sessionWorkspace);
        }

        if (
          sessionWorkspace &&
          sessionWorkspace.workspaceId !== localRecovery.localWorkspaceId
        ) {
          useNexusStore.getState().bindActiveWorkspaceToCloudSession({
            workspaceId: sessionWorkspace.workspaceId,
            workspaceName: sessionWorkspace.workspaceName,
          });

          const reboundWorkspace = useNexusStore
            .getState()
            .workspaces.find(
              (candidate) => candidate.id === sessionWorkspace.workspaceId,
            );
          recoveryContext = await buildLocalWorkspaceRecoveryContext(reboundWorkspace);
          setNotice(
            sessionWorkspace.created
              ? "Workspace cloud session created"
              : "Workspace cloud session linked",
          );
        }

        const [recovery, recoveryList] = await Promise.all([
          supabaseStateSyncManager.fetchLatestWorkspaceRecoveryState({
            ...recoveryContext,
            userId,
          }),
          supabaseStateSyncManager.fetchWorkspaceRecoveryList({
            localChecksum: recoveryContext.localChecksum,
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
  }, [applyWorkspaceRecoveryState, rememberWorkspaceSession]);

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

  const handleSessionUser = useCallback((user: IAuthVault["user"], accessToken?: string | null) => {
    syncSupabaseSessionUser(user);

    if (!user) {
      recoveredLoginUserRef.current = null;
      setWorkspaceSessionByWorkspaceId({});
      return;
    }

    const hasAccessToken = Boolean(accessToken?.trim());
    const tokenBackedRecoveryKey = `${user.id}:token`;

    if (
      recoveredLoginUserRef.current === tokenBackedRecoveryKey ||
      (recoveredLoginUserRef.current === user.id && !hasAccessToken)
    ) {
      return;
    }

    recoveredLoginUserRef.current = hasAccessToken ? tokenBackedRecoveryKey : user.id;
    recoverWorkspaceAfterLogin(user.id, accessToken);
  }, [recoverWorkspaceAfterLogin]);

  useEffect(() => {
    const userId = authVault.user?.id;

    if (
      !authChecked ||
      !userId ||
      !workspace?.id ||
      activeWorkspaceSession?.workspaceId === workspace.id
    ) {
      return;
    }

    let mounted = true;

    void supabaseStateSyncManager
      .ensureWorkspaceSession({
        preferredWorkspaceId: workspace.id,
        preferredWorkspaceName: workspace.name,
        userId,
      })
      .then((sessionWorkspace) => {
        if (mounted && sessionWorkspace) {
          rememberWorkspaceSession(sessionWorkspace);
          if (
            sessionWorkspace.workspaceId !== workspace.id &&
            useNexusStore.getState().activeWorkspaceId === workspace.id
          ) {
            useNexusStore.getState().bindActiveWorkspaceToCloudSession({
              workspaceId: sessionWorkspace.workspaceId,
              workspaceName: sessionWorkspace.workspaceName,
            });
            setNotice(
              sessionWorkspace.created
                ? "Workspace cloud session created"
                : "Workspace cloud session linked",
            );
          }
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [
    activeWorkspaceSession?.workspaceId,
    authChecked,
    authVault.user?.id,
    rememberWorkspaceSession,
    workspace?.id,
    workspace?.name,
  ]);

  useEffect(() => {
    materializeDefaultWorkspace();
  }, [materializeDefaultWorkspace]);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      void localSyncQueueAdapter.getStatus({ workspaceId: activeWorkspaceId }).then((status) => {
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
  }, [activeWorkspaceId]);

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
    applyLegoThemeConfigToDom(themeConfig);
  }, [themeConfig, workspace?.id]);

  useEffect(() => {
    const userId = authVault.user?.id;

    if (!authChecked || !userId || !workspaceStyleReviewLoaded) {
      return;
    }

    const controls = resolveWorkspaceThemeControlsForBoot(
      workspaceStylePayloadReview,
    );
    const variableResult = createWorkspaceThemeStylePreviewVariablesV1(controls);
    const applyKey = [
      userId,
      activeWorkspaceId ?? "workspace",
      workspaceStylePayloadReview?.decision.status ?? "theme-seed",
      variableResult.accepted ? variableResult.checksum : "blocked",
    ].join(":");

    if (workspaceThemeBootAppliedRef.current === applyKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const result = applyWorkspaceThemeControlsToProductionTarget(controls);

      if (result.status === "applied") {
        workspaceThemeBootAppliedRef.current = applyKey;
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeWorkspaceId,
    authChecked,
    authVault.user?.id,
    workspaceStylePayloadReview,
    workspaceStyleReviewLoaded,
  ]);

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
      setWorkspaceSize((current) => {
        const nextSize = { width: rect.width, height: rect.height };

        if (
          Math.abs(current.width - nextSize.width) < 0.5 &&
          Math.abs(current.height - nextSize.height) < 0.5
        ) {
          return current;
        }

        return nextSize;
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener("resize", updateSize);
    const workspaceSizeInterval = window.setInterval(
      updateSize,
      WORKSPACE_SIZE_REMEASURE_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener("resize", updateSize);
      window.clearInterval(workspaceSizeInterval);
      observer.disconnect();
    };
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

  const handleSaveWorkspaceThemeStyleControls = useCallback(
    (controls: WorkspaceThemeStyleControlsV1) => {
      const existingPayload =
        workspaceStylePayloadReview?.decision.status === "accepted"
          ? workspaceStylePayloadReview.decision.payload
          : null;
      const payload = createWorkspaceThemeStylePayloadForExport(
        controls,
        existingPayload,
      );

      if (!payload) {
        setNotice("Workspace style controls rejected style-only; workspace kept");
        return null;
      }

      const written = writeImportedWorkspaceStyleReviewState(
        createImportedWorkspaceStyleReviewState(
          {
            payload,
            reasons: [],
            status: "accepted",
          },
          new Date().toISOString(),
        ),
      );

      setWorkspaceStylePayloadReview(written);
      setNotice(
        "Workspace style controls saved to workspace export; not backend persisted",
      );
      return written;
    },
    [workspaceStylePayloadReview],
  );

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
          operation.workspaceId === activeWorkspaceId &&
          ["failed", "conflicted"].includes(operation.status),
        ),
      )
      .then((operation) => {
        if (!operation) {
          return undefined;
        }

        return localSyncQueueAdapter.recoverIssue(operation.clientMutationId);
      })
      .then((result) => {
        if (result === "compacted") {
          setNotice("Stale workspace snapshot issue compacted.");
          return;
        }

        if (result === "missing") {
          setNotice("No sync issue found.");
          return;
        }

        setNotice("Sync retry queued.");
      })
      .catch(() => {
        setNotice("Sync retry could not be queued.");
      });
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeRightPanel !== "workflows") {
      return;
    }

    window.setTimeout(() => {
      void refreshMacros();
    }, 0);
  }, [activeRightPanel, macroRefreshToken, refreshMacros]);

  useEffect(() => {
    if (activeRightPanel !== "artifacts" && activeRightPanel !== "generations") {
      return;
    }

    window.setTimeout(() => {
      void refreshArtifacts();
    }, 0);
  }, [activeRightPanel, artifactRefreshToken, refreshArtifacts]);

  useEffect(() => {
    const userId = authVault.user?.id;
    const workspaceId = workspace?.id;

    if (
      !authChecked ||
      !userId ||
      !workspaceId ||
      activeWorkspaceSession?.workspaceId !== workspaceId
    ) {
      return;
    }

    const hydrationKey = `${userId}:${workspaceId}:${activeWorkspaceSession.role}`;

    if (artifactAutoHydrationKeyRef.current === hydrationKey) {
      return;
    }

    artifactAutoHydrationKeyRef.current = hydrationKey;

    void fetchArtifactsFromCloud().catch(() => {
      if (artifactAutoHydrationKeyRef.current === hydrationKey) {
        artifactAutoHydrationKeyRef.current = null;
      }
    });
  }, [
    activeWorkspaceSession?.role,
    activeWorkspaceSession?.workspaceId,
    authChecked,
    authVault.user?.id,
    fetchArtifactsFromCloud,
    workspace?.id,
  ]);

  const handleExport = useCallback(() => {
    const downloadSnapshot = (snapshot: WorkspaceSnapshot) => {
      const exportDecision = createWorkspaceStylePayloadExportSnapshot(
        snapshot,
        workspaceStylePayloadReview?.decision.status === "accepted"
          ? workspaceStylePayloadReview.decision.payload
          : undefined,
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exportDecision.snapshot, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `nexus-ai-ops-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return exportDecision.status;
    };

    void localSyncQueueAdapter
      .getOperations()
      .then((operations) => {
        const exportStatus = downloadSnapshot(
          exportActiveWorkspace({
            notebookRecovery: createNotebookRecoveryMetadata(operations),
          }),
        );
        setNotice(createWorkspaceStylePayloadExportNotice(exportStatus));
      })
      .catch((error) => {
        console.error("[Workspace Export Sync Metadata Error]:", error);
        const exportStatus = downloadSnapshot(exportActiveWorkspace());
        setNotice(createWorkspaceStylePayloadExportNotice(exportStatus));
      });
  }, [exportActiveWorkspace, workspaceStylePayloadReview]);

  const handleImport = useCallback(async (file?: File) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = parseWorkspaceSnapshot(text);

      if (!result.ok) {
        throw new Error(result.error);
      }

      const snapshot = JSON.parse(text) as Partial<WorkspaceSnapshot> & {
        stylePack?: unknown;
      };
      const styleDecision = extractWorkspaceStylePayloadFromSnapshot(snapshot);

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
      const nextStylePayloadReview = createImportedWorkspaceStyleReviewState(
        styleDecision,
        new Date().toISOString(),
      );
      const writtenStylePayloadReview =
        writeImportedWorkspaceStyleReviewState(nextStylePayloadReview);

      setWorkspaceStylePayloadReview(writtenStylePayloadReview);
      setNotice(createWorkspaceStylePayloadImportNotice(styleDecision.status));
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

  const artifactRequestUserId = authVault.user?.id;
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

  const handleDownloadArtifact = useCallback((artifact: ArtifactVaultRecord) => {
    void (async () => {
      const localFileName = createArtifactDownloadFilename(artifact);

      try {
        if (isGeneratedArtifactRecord(artifact) && isTransientArtifactRecord(artifact)) {
          if (!artifact.contentUrl) {
            throw new Error("Transient generated asset has no downloadable URL.");
          }

          downloadUrlPayload(artifact.contentUrl, localFileName);
          setNotice("Generated asset download started");
          return;
        }

        if (isGeneratedArtifactRecord(artifact)) {
          try {
            await downloadAuthenticatedUrlPayload(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/asset?workspaceId=${encodeURIComponent(artifact.workspaceId)}`,
              localFileName,
              {
                userId: artifactRequestUserId,
                workspaceId: artifact.workspaceId,
              },
            );
          } catch (error) {
            if (!artifact.contentUrl) {
              throw error;
            }

            downloadUrlPayload(artifact.contentUrl, localFileName);
          }
          setNotice("Generated asset download started");
          return;
        }

        const response = await nexusApiClient.get<ArtifactGetResponse>(
          `/api/v1/artifacts/${encodeURIComponent(artifact.id)}?workspaceId=${encodeURIComponent(artifact.workspaceId)}`,
          {
            userId: artifactRequestUserId,
            workspaceId: artifact.workspaceId,
          },
        );
        const detail = response.artifact;
        const fileName = createArtifactDownloadFilename({
          ...artifact,
          mimeType: detail.mimeType ?? artifact.mimeType,
          title: detail.title ?? artifact.title,
        });

        if (detail.contentUrl) {
          downloadUrlPayload(detail.contentUrl, fileName);
          setNotice("Generated asset download started");
          return;
        }

        if (detail.contentText) {
          downloadTextPayload(detail.contentText, fileName, detail.mimeType);
          setNotice("Generated asset download started");
          return;
        }

        if (artifact.contentUrl) {
          downloadUrlPayload(artifact.contentUrl, fileName);
          setNotice("Generated asset download started");
          return;
        }

        throw new Error("Artifact has no downloadable payload.");
      } catch {
        setNotice("Generated asset download unavailable");
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
    const apiWorkspaceId = resolveWorkspaceApiScope({
      activeWorkspaceId: state.activeWorkspaceId,
      sessionByWorkspaceId: workspaceSessionByWorkspaceId,
      workspace,
    }).workspaceId;
    const agent = workspace?.agents.find((candidate) => candidate.id === agentId);
    const model =
      agent?.model?.trim() ||
      workspace?.settings.model?.trim() ||
      "gpt-4o-mini";
    const modelInfo = modelCatalog.find((candidate) => candidate.id === model);
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
          provider: modelInfo?.provider_family ?? agent.provider,
          taskType: "chat",
          workspaceId: apiWorkspaceId,
        },
        {
          idempotencyKey: `task_${userMessage.id}`,
          userId,
          workspaceId: apiWorkspaceId,
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
      workspaceId: apiWorkspaceId,
      agent: {
        identity: agent.identity,
        callsign: agent.callsign,
        title: agent.title,
        mission: agent.mission,
        executionPrompt: agent.executionPrompt,
        provider: modelInfo?.provider_family ?? agent.provider,
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
      `${agent.callsign} stream opened via ${modelInfo?.provider_family ?? "server model gateway"}`,
    );
    state.setStreamMode("live");

    let received = "";
    let firstTokenReceived = false;
    let streamFailed = false;
    let streamInterrupted = false;
    const controller = new AbortController();
    abortControllersRef.current.set(agentId, {
      controller,
      taskId: taskResponse.task.id,
      workspaceId: apiWorkspaceId,
    });

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
        "X-Workspace-Id": apiWorkspaceId,
      });

      if (userId) {
        headers.set("X-User-Id", userId);
      }

      const accessToken = await resolveSupabaseAccessToken();

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      headers.set("x-nexus-model-id", model);

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

      let reasoningBuffer = "";
      let reasoningFlushTimer: ReturnType<typeof setTimeout> | null = null;

      const flushReasoning = () => {
        if (!reasoningBuffer) return;
        const chunk = reasoningBuffer;
        reasoningBuffer = "";
        useNexusStore
          .getState()
          .appendReasoningToMessage(agentId, assistantMessage.id, chunk);
      };

      await readStreamEvents(response, (event) => {
        if (event.type === "token") {
          // Flush any pending reasoning before content tokens
          flushReasoning();
          if (reasoningFlushTimer) { clearTimeout(reasoningFlushTimer); reasoningFlushTimer = null; }

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

          reasoningBuffer += delta;

          // Batch reasoning updates every 50ms to avoid mass re-renders
          if (!reasoningFlushTimer) {
            reasoningFlushTimer = setTimeout(() => {
              flushReasoning();
              reasoningFlushTimer = null;
            }, 50);
          }
        }

        if (event.type === "meta") {
          setNotice(event.detail ?? `${agent.callsign} task ${event.taskId ?? taskResponse.task.id} streaming`);
          if (event.mode) {
            useNexusStore.getState().setStreamMode(event.mode === "openai" ? "live" : "mock");
          }
        }
      });

      // Flush remaining reasoning
      if (reasoningFlushTimer) { clearTimeout(reasoningFlushTimer); }
      flushReasoning();
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
  }, [modelCatalog, workspaceSessionByWorkspaceId]);

  const blockReadOnlyWorkspaceMutation = useCallback((action: string) => {
    if (!activeWorkspaceReadOnly) {
      return false;
    }

    setNotice(`${action} blocked: ${activeWorkspaceReadOnlyMessage}`);
    return true;
  }, [activeWorkspaceReadOnly, activeWorkspaceReadOnlyMessage]);

  const handleGraphBrainAppendWorkflowContractText = useCallback(
    ({ sourceName, text }: { sourceName: string; text: string }) => {
      if (blockReadOnlyWorkspaceMutation("Append Graph Brain workflow group")) {
        return {
          detail: activeWorkspaceReadOnlyMessage,
          status: "rejected" as const,
        };
      }

      const review = parseWorkflowProContractImportText({
        sourceName,
        text,
      });

      if (review.status !== "accepted" || !review.contract) {
        const detail =
          review.status === "rejected"
            ? review.error
            : "Workflow contract was not accepted.";

        setNotice(`Graph Brain append rejected: ${detail}`);

        return {
          detail,
          status: "rejected" as const,
        };
      }

      const bridge = createWorkflowProRuntimeBridge(review.contract);
      const appended = appendWorkflowRuntimeGroup(bridge.runtimeLite, {
        groupLabel: review.contract.name,
        groupSource: "brain",
      });

      setViewMode("graph");
      setNotice(
        `Graph Brain appended ${appended.nodeIds.length} nodes / ${appended.edgeIds.length} edges`,
      );

      return {
        detail: `Appended ${review.contract.name}`,
        edgeCount: appended.edgeIds.length,
        nodeCount: appended.nodeIds.length,
        status: "accepted" as const,
      };
    },
    [
      activeWorkspaceReadOnlyMessage,
      appendWorkflowRuntimeGroup,
      blockReadOnlyWorkspaceMutation,
      setViewMode,
    ],
  );

  const handleRunWorkflowRuntimeLite = useCallback(async (
    options?: { startNodeId?: string },
  ) => {
    if (blockReadOnlyWorkspaceMutation("Workflow Runtime Lite")) {
      return;
    }

    setNotice(
      options?.startNodeId
        ? "Workflow Runtime Lite input started"
        : "Workflow Runtime Lite started",
    );

    try {
      const run = await runWorkflowRuntimeLiteFlow(options);

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
  }, [blockReadOnlyWorkspaceMutation, runWorkflowRuntimeLiteFlow]);

  const handlePauseWorkflowRuntimeLite = useCallback(() => {
    if (blockReadOnlyWorkspaceMutation("Workflow Runtime Lite pause")) {
      return;
    }

    pauseWorkflowRuntimeLiteFlow();
    setNotice("Workflow Runtime Lite pause requested");
  }, [blockReadOnlyWorkspaceMutation, pauseWorkflowRuntimeLiteFlow]);

  const handleCopyWorkflowInput = useCallback(async (nodeId: string) => {
    const runtimeNode = useNexusStore
      .getState()
      .workspaces.find(
        (candidate) =>
          candidate.id === useNexusStore.getState().activeWorkspaceId,
      )
      ?.graph.runtimeLite?.nodes.find((node) => node.id === nodeId);
    const textCandidate = (runtimeNode?.data as { text?: unknown } | undefined)?.text;
    const text =
      runtimeNode?.type === "input.text" && typeof textCandidate === "string"
        ? textCandidate
        : "";

    if (!text.trim()) {
      setNotice("Input node is empty");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("Input copied");
    } catch {
      setNotice("Clipboard unavailable for input");
    }
  }, []);

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
    const imageProviderAvailable = capabilityType === "image";

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
      imageProviderAvailable
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
        imageProviderAvailable
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

  const handleComposerImageGenerate = useCallback(
    async (
      agentId: string,
      content: string,
      imageSettingsInput?: Partial<WorkspaceComposerImageSettings>,
    ) => {
      const prompt = content.trim();

      if (!prompt) {
        return;
      }

      const state = useNexusStore.getState();
      const workspace =
        state.workspaces.find((candidate) => candidate.id === state.activeWorkspaceId) ??
        state.workspaces[0];
      const apiWorkspaceId = resolveWorkspaceApiScope({
        activeWorkspaceId: state.activeWorkspaceId,
        sessionByWorkspaceId: workspaceSessionByWorkspaceId,
        workspace,
      }).workspaceId;
      const agent = workspace?.agents.find((candidate) => candidate.id === agentId);

      if (!agent || agent.status === "streaming" || agent.status === "thinking") {
        return;
      }

      const imageSettings =
        normalizeWorkspaceComposerImageSettings(imageSettingsInput);
      const userMessage: AgentMessage = {
        id: makeId("message"),
        role: "user",
        content: `Generate image: ${prompt}`,
        createdAt: new Date().toISOString(),
      };

      state.focusAgent(agentId);
      state.addMessage(agentId, userMessage);
      state.setAgentStatus(agentId, "thinking");
      setNotice(`${agent.callsign} composer image generation queued`);

      try {
        await wait(180);
        useNexusStore.getState().setAgentStatus(agentId, "streaming");

        const result = await executeImageAdapterForAgent({
          agent: {
            accent: agent.accent,
            callsign: agent.callsign,
            model: imageSettings.modelId,
          },
          apiKey: "",
          baseUrl: undefined,
          imageSettings,
          prompt,
          toolName: "Composer Image Mode",
          userId: state.authVault.user?.id,
          workspaceId: apiWorkspaceId,
        });
        const assistantMessageId = makeId("message");
        let artifactId: string | undefined;
        let artifactRecordError: string | null = null;

        try {
          const artifactResponse = await nexusApiClient.post<
            ArtifactCreateResponse,
            CreateArtifactRequest
          >(
            "/api/v1/artifacts",
            {
              contentUrl: result.media.url,
              metadata: {
                aspectRatio: imageSettings.aspectRatio,
                composerMode: "image",
                generatedAsset: result.generatedAsset ?? null,
                imageGenerationMode: result.mode,
                mediaUrlKind: getGeneratedImageUrlKind(result.media.url),
                modelId: imageSettings.modelId,
                prompt,
                quality: imageSettings.quality,
                revisedPrompt: result.revisedPrompt ?? null,
                source: "workspace-composer",
              },
              mimeType: getGeneratedImageMimeType(result.media.url),
              sourceAgentId: agent.id,
              sourceMessageId: assistantMessageId,
              title: `Generated image - ${prompt.slice(0, 48)}`,
              type: "generated-image",
              workspaceId: apiWorkspaceId,
            },
            {
              idempotencyKey: `generated_image_${assistantMessageId}`,
              userId: state.authVault.user?.id,
              workspaceId: apiWorkspaceId,
            },
          );

          artifactId = artifactResponse.artifact.id;
        } catch (error) {
          artifactRecordError =
            error instanceof Error ? error.message : "Artifact record unavailable.";
        }

        const assistantMessage: AgentMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: [
            `Composer Image Mode generated an image${result.mode === "mock" ? " (mock)" : ""}.`,
            `Prompt: ${prompt}`,
            `Model: ${imageSettings.modelId}`,
            `Quality: ${imageSettings.quality}`,
            `Aspect ratio: ${imageSettings.aspectRatio}`,
            artifactId
              ? `Artifact: ${artifactId}`
              : `Artifact record: unavailable${artifactRecordError ? ` (${artifactRecordError})` : ""}`,
            result.revisedPrompt ? `Revised prompt: ${result.revisedPrompt}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          createdAt: new Date().toISOString(),
          media: {
            ...result.media,
            artifactId,
          },
        };

        useNexusStore.getState().addMessage(agentId, assistantMessage);
        if (artifactId) {
          setArtifactRefreshToken((current) => current + 1);
        }
        useNexusStore.getState().updateAgentTelemetry(agentId, prompt.length + 640);
        setNotice(
          artifactId
            ? `${agent.callsign} composer image generated`
            : `${agent.callsign} composer image generated; artifact record unavailable`,
        );
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Composer image generation failed.";

        useNexusStore.getState().addMessage(agentId, {
          id: makeId("message"),
          role: "assistant",
          content: `[image fault] ${detail}`,
          createdAt: new Date().toISOString(),
        });
        useNexusStore.getState().setAgentStatus(agentId, "error");
      } finally {
        useNexusStore.getState().setAgentStatus(agentId, "idle");
      }
    },
    [workspaceSessionByWorkspaceId],
  );

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
          if (blockReadOnlyWorkspaceMutation("Spawn agent")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Arrange workspace")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Restore workspace cards")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Minimize workspace cards")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Save workspace snapshot")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Import workspace")) {
            setPaletteOpen(false);
            return;
          }

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
          if (blockReadOnlyWorkspaceMutation("Reset workspace")) {
            setPaletteOpen(false);
            return;
          }

          resetWorkspace();
          setPaletteOpen(false);
          setNotice("Workspace reset");
        },
      },
    ],
    [
      arrangeAgents,
      blockReadOnlyWorkspaceMutation,
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
    return <AuthScreen checked={authChecked} onAuthenticated={handleSessionUser} />;
  }

  return (
    <NexusOpsOuterShellFrame>
      <input
        ref={fileInputRef}
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          if (blockReadOnlyWorkspaceMutation("Import workspace")) {
            event.currentTarget.value = "";
            return;
          }

          void handleImport(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
        type="file"
      />

      <section
        className="flex min-h-dvh min-w-0 shrink-0 flex-col"
        data-testid="nexus-workspace-primary-page"
      >
        <TopBar
          activeWorkspaceId={activeWorkspaceId}
          notice={notice}
          onCreateWorkspace={() => {
            const nextWorkspace = createWorkspace();
            setNotice(`Workspace ${nextWorkspace.name} created and synced to cloud.`);
          }}
          onExport={handleExport}
          onImport={() => {
            if (blockReadOnlyWorkspaceMutation("Import workspace")) {
              return;
            }

            fileInputRef.current?.click();
          }}
          onOpenPalette={() => setPaletteOpen(true)}
          onRenameWorkspace={(name) => {
            if (blockReadOnlyWorkspaceMutation("Rename workspace")) {
              return;
            }

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
            if (blockReadOnlyWorkspaceMutation("Save workspace snapshot")) {
              return;
            }

            saveWorkspaceSnapshot();
            setNotice("Workspace snapshot saved");
          }}
          onSaveMacro={() => {
            if (blockReadOnlyWorkspaceMutation("Pack workspace macro")) {
              return;
            }

            openMacroComposer();
          }}
          onSpawn={() => {
            if (blockReadOnlyWorkspaceMutation("Spawn agent")) {
              return;
            }

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
          workspaceReadOnly={activeWorkspaceReadOnly}
          workspaceReadOnlyMessage={activeWorkspaceReadOnlyMessage}
          workspaceRole={activeWorkspaceRole ?? undefined}
          onSetViewMode={setViewMode}
          workspaceName={workspaceName}
          workspaces={workspaces}
        />

        <NexusOpsBodyFrame>
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
                    modelCatalog={modelCatalog}
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

        <div className="nexus-workspace-stage-stack nexus-workspace-extended-scroll-stage flex min-h-[120dvh] min-w-0 flex-1 flex-col gap-2 lg:min-h-[180dvh] 2xl:min-h-[200dvh]">
          <section
            ref={workspaceRef}
            className="nexus-workspace nexus-scanline relative z-0 isolate min-h-0 min-w-0 flex-1 overflow-hidden border"
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
                      onOpenVaultManager={openVaultManager}
                      onOpenBranchInterface={setBranchAgentId}
                      onStop={handleStop}
                      onToggleMaximize={(agentId) =>
                        toggleMaximizeAgent(agentId, workspaceSize)
                      }
                      onSaveArtifact={handleSaveSandboxArtifact}
                      onUpdateSandboxCode={updateSandboxCode}
                      onUpdateSandboxUrl={updateSandboxUrl}
                      onUpdateLayout={updateLayout}
                      workspaceBounds={workspaceSize}
                      historicalPage={
                        historicalMessages[`${activeWorkspaceId}::${agent.id}`]
                      }
                      selected={agent.id === selectedAgent?.id}
                    />
                  ))}
                </AnimatePresence>

                <MinimizedRail agents={minimizedAgents} onRestore={restoreAgent} />
              </>
            ) : viewMode === "graph" ? (
              <NexusGraph
                agents={agents}
                generatedArtifacts={artifactVault.filter(isGeneratedArtifactRecord)}
                graph={workspace?.graph ?? EMPTY_GRAPH}
                modelCatalog={modelCatalog}
                onAddWorkflowNode={(type, position) => {
                  if (blockReadOnlyWorkspaceMutation("Add workflow node")) {
                    return;
                  }

                  addWorkflowRuntimeNode(type, position ? { position } : undefined);
                  setNotice(`${type} node added`);
                }}
                onAppendWorkflowContractText={handleGraphBrainAppendWorkflowContractText}
                onConnectAgents={(edge) => {
                  if (blockReadOnlyWorkspaceMutation("Connect agents")) {
                    return;
                  }

                  connectGraphAgents(edge);
                }}
                onConnectWorkflowNodes={(edge) => {
                  if (blockReadOnlyWorkspaceMutation("Connect workflow nodes")) {
                    return;
                  }

                  connectWorkflowRuntimeNodes(edge);
                }}
                onCopyWorkflowInput={handleCopyWorkflowInput}
                onCopyWorkflowOutput={handleCopyWorkflowOutput}
                onDownloadArtifact={handleDownloadArtifact}
                onFocusAgent={selectAgent}
                onOpenAgent={(agentId) => {
                  setViewMode("panels");
                  focusAgent(agentId);
                }}
                onRemoveAgent={(agentId) => {
                  if (blockReadOnlyWorkspaceMutation("Delete agent")) {
                    return;
                  }

                  removeAgent(agentId);
                }}
                onRemoveEdges={(edgeIds) => {
                  if (blockReadOnlyWorkspaceMutation("Delete graph edge")) {
                    return;
                  }

                  removeGraphEdges(edgeIds);
                }}
                onRemoveWorkflowEdges={(edgeIds) => {
                  if (blockReadOnlyWorkspaceMutation("Delete workflow edge")) {
                    return;
                  }

                  removeWorkflowRuntimeEdges(edgeIds);
                }}
                onRemoveWorkflowNodes={(nodeIds) => {
                  if (blockReadOnlyWorkspaceMutation("Delete workflow node")) {
                    return;
                  }

                  removeWorkflowRuntimeNodes(nodeIds);
                }}
                onPauseWorkflow={handlePauseWorkflowRuntimeLite}
                onRunWorkflowFromInput={(nodeId) => {
                  void handleRunWorkflowRuntimeLite({ startNodeId: nodeId });
                }}
                onRunWorkflow={() => {
                  void handleRunWorkflowRuntimeLite();
                }}
                onUpdateWorkflowNodeData={(nodeId, data) => {
                  if (blockReadOnlyWorkspaceMutation("Edit workflow node")) {
                    return;
                  }

                  updateWorkflowRuntimeNodeData(nodeId, data);
                }}
                onUpdateWorkflowNodePosition={(nodeId, position) => {
                  if (blockReadOnlyWorkspaceMutation("Move workflow node")) {
                    return;
                  }

                  updateWorkflowRuntimeNodePosition(nodeId, position);
                }}
                onUpdateNodePosition={(agentId, position) => {
                  if (blockReadOnlyWorkspaceMutation("Move agent node")) {
                    return;
                  }

                  updateGraphNodePosition(agentId, position);
                }}
                readOnly={activeWorkspaceReadOnly}
                readOnlyMessage={activeWorkspaceReadOnlyMessage}
                workspaceRole={activeWorkspaceRole ?? undefined}
                workflowFeedback={workflowFeedback}
                workflowRunning={workflowRunning}
              />
            ) : (
              <WorkflowProSurface
                agentCount={agents.length}
                applyPlan={workflowProApplyPlan}
                brainContext={workflowBrainContext}
                contractDraft={workflowProActiveContract}
                fileNodeContract={workflowProFileNodeContract}
                generatedArtifactCount={
                  artifactVault.filter(isGeneratedArtifactRecord).length
                }
                inventory={workflowProCapabilityInventory}
                importReview={workflowProImportReview}
                onClearImportedContract={handleWorkflowProContractImportClear}
                onExportContract={handleWorkflowProContractExport}
                onImportContractText={handleWorkflowProContractImportText}
                onOpenGraph={() => setViewMode("graph")}
                onOpenPanels={() => setViewMode("panels")}
                onApplyPlan={handleWorkflowProApplyPlan}
                proposalDiff={workflowProProposalDiff}
                runtimeSummary={workflowProRuntimeSummary}
                runtimeEdgeCount={workflowRuntimeLite?.edges.length ?? 0}
                runtimeNodeCount={workflowRuntimeLite?.nodes.length ?? 0}
                workspaceName={workspace?.name}
              />
            )}

            <AnimatePresence>
              {openNotebookIds.map((notebookId) => (
                <DatapadWindow key={notebookId} notebookId={notebookId} />
              ))}
            </AnimatePresence>
          </section>

          <WorkspaceChatComposerShell
            agent={selectedAgent}
            composerMode={selectedComposerMode}
            imageSettings={selectedComposerImageSettings}
            onAttachmentSaved={() => setArtifactRefreshToken((current) => current + 1)}
            onComposerModeChange={(agentId, mode) =>
              setComposerModeByAgentId((current) => ({
                ...current,
                [agentId]: mode,
              }))
            }
            onImageSettingsChange={(agentId, settings) =>
              setComposerImageSettingsByAgentId((current) => ({
                ...current,
                [agentId]: normalizeWorkspaceComposerImageSettings(settings),
              }))
            }
            onFocusAgent={(agentId) => {
              setViewMode("panels");
              focusAgent(agentId);
            }}
            onGenerateImage={handleComposerImageGenerate}
            onGenerateMedia={handleMediaGenerate}
            onNotify={setNotice}
            onOpenArtifacts={() => setActiveRightPanel("artifacts")}
            onSend={handleSend}
            onUpdateAgentModelSettings={updateAgentModelSettings}
            userId={authVault.user?.id ?? ""}
            workspaceId={activeWorkspaceId}
          />
        </div>

        </NexusOpsBodyFrame>

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
          modelCatalog={modelCatalog}
          modelCatalogPlan={modelCatalogPlan}
          artifactError={artifactError}
          artifacts={artifactVault}
          artifactsLoading={artifactsLoading}
          workspaceId={workspace?.id ?? activeWorkspaceId}
          workspaceName={workspace?.name}
          workflowRunHistoryGroups={workflowProRunHistoryGroups}
          workflowRuntimeLite={workflowRuntimeLite}
          workflowRuntimeEvidence={workflowProRuntimeEvidence}
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
          onDownloadArtifact={handleDownloadArtifact}
          onRefreshArtifacts={refreshArtifacts}
          onRefreshMacros={refreshMacros}
          onRetryWorkflowRuntimeTraceSync={async (runId) => {
            if (blockReadOnlyWorkspaceMutation("Workflow trace resync")) {
              return;
            }

            setNotice(`Workflow trace resync started: ${runId}`);
            const run = await retryWorkflowRuntimeTraceSync(runId);

            if (!run) {
              setNotice(`Workflow trace resync failed: missing run ${runId}`);
              return;
            }

            setNotice(
              run.traceSync?.status === "synced"
                ? `Workflow trace resynced: ${runId}`
                : `Workflow trace resync ${run.traceSync?.status ?? "unknown"}: ${run.traceSync?.error ?? runId}`,
            );
          }}
          onSpawnMacro={handleSpawnMacro}
          onToggleNotebook={toggleNotebookOpen}
          onLogout={logout}
          onRunTool={runTool}
          onSelectAgent={selectAgent}
          onUpdateMemory={updateMemoryBlock}
          onUpdateAgentCallsign={updateAgentCallsign}
          onUpdateAgentProfile={updateAgentProfile}
          onSetAgentProfileLocked={setAgentProfileLocked}
          onUpdateMission={updateAgentMission}
          onSaveWorkspaceThemeStyleControls={handleSaveWorkspaceThemeStyleControls}
          onUpdateBranchingSettings={updateBranchingSettings}
          onUpdateAgentModel={updateAgentModel}
          open={Boolean(activeRightPanel)}
          streamMode={effectiveStreamMode}
          workspaceStylePayloadReview={workspaceStylePayloadReview}
        />
      </section>

    </NexusOpsOuterShellFrame>
  );
}

const workspaceBodyMaterialStyle = {
  background: "var(--nexus-body-frame-bg, rgb(18 18 18))",
  borderColor:
    "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
  boxShadow:
    "inset 0 1px 0 rgb(255 255 255 / 0.04), var(--nexus-layout-panel-shadow, 0 18px 60px rgb(0 0 0 / 0.2))",
} satisfies CSSProperties;

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
    detail: "Workspace style controls",
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
    id: "generations",
    label: "生成紀錄",
    detail: "Generated file asset records",
    icon: <PackageCheck className="h-4 w-4" />,
  },
  {
    id: "workflows",
    label: "Workflows",
    detail: "Macro blueprint vault",
    icon: <Workflow className="h-4 w-4" />,
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

type WorkspaceStylePresetDefinition = {
  id: string;
  label: string;
  description: string;
  controls: Omit<WorkspaceThemeStyleControlsV1, "version">;
};

const workspaceStylePresetDefinitions = [
  {
    controls: {
      accent: "custom",
      accentColor: "#e5e7eb",
      blur: 16,
      glass: 54,
      radius: 18,
      shadow: 34,
      warmth: 48,
      workspaceWash: 42,
    },
    description: "Neutral surface",
    id: "neutral",
    label: "Neutral",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#8bd3ff",
      blur: 8,
      glass: 38,
      radius: 14,
      shadow: 20,
      warmth: 36,
      workspaceWash: 30,
    },
    description: "Low haze",
    id: "clear",
    label: "Clear",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#f5f5f4",
      blur: 24,
      glass: 70,
      radius: 24,
      shadow: 48,
      warmth: 52,
      workspaceWash: 52,
    },
    description: "Soft panels",
    id: "soft",
    label: "Soft",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#eeeeee",
      blur: 14,
      glass: 50,
      radius: 16,
      shadow: 58,
      warmth: 44,
      workspaceWash: 24,
    },
    description: "High signal",
    id: "signal",
    label: "Signal",
  },
] as const satisfies readonly WorkspaceStylePresetDefinition[];

function createWorkspaceStylePresetControls(
  baseControls: WorkspaceThemeStyleControlsV1,
  preset: WorkspaceStylePresetDefinition,
): WorkspaceThemeStyleControlsV1 {
  return {
    ...baseControls,
    ...preset.controls,
    version: baseControls.version,
  };
}

export function WorkspaceStyleControlsPanel({
  onSaveWorkspaceThemeStyleControls,
  stylePayloadReview,
}: {
  onSaveWorkspaceThemeStyleControls: (
    controls: WorkspaceThemeStyleControlsV1,
  ) => ImportedWorkspaceStyleReviewState | null;
  stylePayloadReview: ImportedWorkspaceStyleReviewState | null;
}) {
  const importedControls = useMemo(() => {
    if (stylePayloadReview?.decision.status !== "accepted") {
      return null;
    }

    const result = extractWorkspaceThemeStyleControlsV1(
      stylePayloadReview.decision.payload?.controls,
    );

    return result.accepted ? result.controls : null;
  }, [stylePayloadReview]);
  const baseThemeControls = useMemo(
    () => createDefaultWorkspaceThemeStyleControlsV1(),
    [],
  );
  const [controls, setControls] = useState<WorkspaceThemeStyleControlsV1>(
    () => importedControls ?? baseThemeControls,
  );
  const [savedControls, setSavedControls] =
    useState<WorkspaceThemeStyleControlsV1 | null>(importedControls);
  const [previewState, setPreviewState] =
    useState<WorkspaceThemeLivePreviewState>(
      workspaceThemeLivePreviewInitialState,
    );
  const activeTransactionRef = useRef<ProductionPreviewApplyTransaction | null>(
    null,
  );
  const sessionIdRef = useRef(createWorkspaceThemePreviewId("session"));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!stylePayloadReview) {
        return;
      }

      if (!importedControls) {
        setControls(baseThemeControls);
        setSavedControls(null);
        return;
      }

      setControls(importedControls);
      setSavedControls(importedControls);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseThemeControls, importedControls, stylePayloadReview]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (
        importedControls ||
        savedControls ||
        activeTransactionRef.current ||
        previewState.status === "active" ||
        previewState.status === "saved" ||
        previewState.status === "blocked"
      ) {
        return;
      }

      setControls(baseThemeControls);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseThemeControls, importedControls, previewState.status, savedControls]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const targets = getWorkspaceThemePreviewTargets();
      const target = targets[0] ?? null;
      const facts = createWorkspaceThemeTargetFacts(targets, target);
      const nextTargetStatus =
        targets.length === 1 &&
        facts.tagName !== "html" &&
        facts.tagName !== "body" &&
        !facts.isDocumentRoot
          ? "ready"
          : targets.length === 0
            ? "missing"
            : "blocked";

      setPreviewState((current) => ({
        ...current,
        targetCount: targets.length,
        targetStatus: nextTargetStatus,
      }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeAccent = controls.accentColor;
  const controlRadius = `${controls.radius}px`;
  const panelMaterialStyle = {
    background:
      "var(--nexus-layout-panel-bg, linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.02))), var(--nexus-panel-bg, rgb(16 16 16 / 0.95))",
    borderColor:
      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.12)))",
    borderRadius: controlRadius,
    boxShadow:
      "var(--nexus-layout-panel-shadow, var(--nexus-panel-shadow, 0 0 0 transparent))",
  } satisfies CSSProperties;
  const panelMutedMaterialStyle = {
    background:
      "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(16 16 16 / 0.82))",
    borderColor:
      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
    borderRadius: controlRadius,
  } satisfies CSSProperties;

  const applyPreview = useCallback(
    (nextControls: WorkspaceThemeStyleControlsV1) => {
      const variableResult =
        createWorkspaceThemeStylePreviewVariablesV1(nextControls);

      if (!variableResult.accepted) {
        setPreviewState((current) => ({
          ...current,
          error: variableResult.reasons.join(", "),
          status: "blocked",
          targetStatus: "blocked",
        }));
        return;
      }

      const targets = getWorkspaceThemePreviewTargets();
      const target = targets[0] ?? null;
      const targetFacts = createWorkspaceThemeTargetFacts(targets, target);
      const previousInlineValues =
        activeTransactionRef.current?.previousInlineValues ??
        (target
          ? snapshotWorkspaceThemeInlineValues(
              target,
              variableResult.variableNames,
            )
          : {});
      const transactionId = createWorkspaceThemePreviewId("transaction");
      const startedAt = getWorkspaceThemePreviewNow();
      const plan = createProductionPreviewApplyPlan({
        checksums: {
          bridgeChecksum: variableResult.checksum,
          budgetChecksum: variableResult.checksum,
          diagnosticsChecksum: variableResult.checksum,
        },
        createdAt: new Date().toISOString(),
        hasAuthenticatedEvidence: true,
        hasRollbackPlan: true,
        networkBaselineWindowId: workspaceThemeLivePreviewNetworkBaselineWindowId,
        preflightVerdict: "eligible",
        previousInlineValues,
        safetyFlags: {
          mutatesDocumentRoot: false,
          touchesProductionBehavior: false,
          writesToBackend: false,
          writesToStorage: false,
          writesToStore: false,
        },
        sessionId: sessionIdRef.current,
        target: targetFacts,
        transactionId,
        variables: variableResult.variables,
      });

      if (!target || plan.verdict !== "ready" || !plan.transaction) {
        setPreviewState({
          ...workspaceThemeLivePreviewInitialState,
          checksum: variableResult.checksum,
          error:
            plan.reasons[0]?.message ??
            "Workspace style preview failed closed.",
          status: "blocked",
          targetCount: targets.length,
          targetStatus: targets.length === 0 ? "missing" : "blocked",
          transactionId,
          variableCount: variableResult.variableNames.length,
        });
        return;
      }

      for (const [name, value] of Object.entries(
        plan.transaction.appliedVariables,
      )) {
        target.style.setProperty(name, value);
      }

      activeTransactionRef.current = plan.transaction;
      setPreviewState({
        applyDurationMs: roundWorkspaceThemePreviewDuration(
          getWorkspaceThemePreviewNow() - startedAt,
        ),
        checksum: variableResult.checksum,
        error: null,
        remainingPreviewVariableCount: null,
        residueCheck: "not-run",
        revertDurationMs: null,
        status: "active",
        targetCount: targets.length,
        targetStatus: "ready",
        transactionId,
        variableCount: variableResult.variableNames.length,
      });
    },
    [],
  );

  const updateControls = useCallback(
    (nextControls: WorkspaceThemeStyleControlsV1) => {
      setControls(nextControls);
      applyPreview(nextControls);
    },
    [applyPreview],
  );

  const revertPreview = useCallback(() => {
    const transaction = activeTransactionRef.current;
    const targets = getWorkspaceThemePreviewTargets();
    const target = targets[0] ?? null;
    const targetFacts = createWorkspaceThemeTargetFacts(targets, target);
    const startedAt = getWorkspaceThemePreviewNow();
    const revertPlan = createProductionPreviewRevertPlan({
      expectedBridgeChecksum: transaction?.checksums.bridgeChecksum,
      expectedSessionId: transaction?.sessionId,
      target: targetFacts,
      transaction,
    });

    if (!target || !transaction || revertPlan.verdict !== "ready") {
      setPreviewState((current) => ({
        ...current,
        error:
          revertPlan.reasons[0]?.message ??
          "Workspace style revert failed closed.",
        status: "blocked",
        targetCount: targets.length,
        targetStatus: targets.length === 0 ? "missing" : "blocked",
      }));
      return;
    }

    for (const operation of revertPlan.operations) {
      if (operation.kind === "remove") {
        target.style.removeProperty(operation.name);
      } else {
        target.style.setProperty(operation.name, operation.value);
      }
    }

    const residue = createProductionPreviewResidueCheck({
      currentInlineValues: snapshotWorkspaceThemeInlineValues(
        target,
        transaction.variableNames,
      ),
      transaction,
    });
    const revertDurationMs = roundWorkspaceThemePreviewDuration(
      getWorkspaceThemePreviewNow() - startedAt,
    );

    if (residue.result === "pass") {
      activeTransactionRef.current = null;
    }

    setPreviewState({
      applyDurationMs: previewState.applyDurationMs,
      checksum: transaction.checksums.bridgeChecksum,
      error:
        residue.result === "pass"
          ? null
          : `Residue check failed for ${residue.mismatchedVariableNames.length} variables.`,
      remainingPreviewVariableCount: residue.remainingPreviewVariableCount,
      residueCheck: residue.result,
      revertDurationMs,
      status: residue.result === "pass" ? "reverted" : "blocked",
      targetCount: targets.length,
      targetStatus: "ready",
      transactionId: transaction.transactionId,
      variableCount: transaction.variableCount,
    });
  }, [previewState.applyDurationMs]);

  const saveControls = useCallback(() => {
    const written = onSaveWorkspaceThemeStyleControls(controls);

    if (!written || written.decision.status !== "accepted") {
      setPreviewState((current) => ({
        ...current,
        error: "Workspace style controls were rejected style-only.",
        status: "blocked",
      }));
      return;
    }

    setSavedControls(controls);
    setPreviewState((current) => ({
      ...current,
      error: null,
      status: current.status === "active" ? "saved" : current.status,
    }));
  }, [controls, onSaveWorkspaceThemeStyleControls]);

  const resetControls = useCallback(() => {
    const nextControls =
      savedControls ?? baseThemeControls;

    updateControls(nextControls);
  }, [baseThemeControls, savedControls, updateControls]);

  const applyWorkspaceStylePreset = useCallback(
    (preset: WorkspaceStylePresetDefinition) => {
      updateControls(
        createWorkspaceStylePresetControls(baseThemeControls, preset),
      );
    },
    [baseThemeControls, updateControls],
  );

  const rangeControl = ({
    key,
    label,
    max,
    min = 0,
  }: {
    key: Exclude<
      keyof WorkspaceThemeStyleControlsV1,
      "accent" | "accentColor" | "version"
    >;
    label: string;
    max: number;
    min?: number;
  }) => (
    <label
      className="block border bg-black/20 p-3"
      data-testid={`workspace-style-control-${key}`}
      style={{
        ...panelMutedMaterialStyle,
      }}
    >
      <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-100">{controls[key]}</span>
      </span>
      <input
        className="mt-3 w-full"
        max={max}
        min={min}
        onInput={(event) =>
          updateControls({
            ...controls,
            [key]: Number(event.currentTarget.value),
          })
        }
        style={{ accentColor: activeAccent }}
        type="range"
        value={controls[key]}
      />
    </label>
  );

  return (
    <section
      className="mb-4 border p-3"
      data-testid="workspace-style-controls-panel"
      style={{
        ...panelMaterialStyle,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
            <SlidersHorizontal className="h-4 w-4" />
            Workspace Style Controls
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Base theme seed plus scoped workspace override
          </div>
        </div>
        {previewState.error ? (
          <div
            className="mt-3 border p-3 text-xs text-neutral-100"
            data-testid="workspace-style-error"
            style={{
              ...panelMutedMaterialStyle,
            }}
          >
            {previewState.error}
          </div>
        ) : null}
      </div>

      <div
        className="mb-3 border p-3"
        data-testid="workspace-style-presets"
        style={{
          ...panelMutedMaterialStyle,
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
          <span>Workspace Style Presets</span>
          <span className="text-neutral-100">Layer 4</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {workspaceStylePresetDefinitions.map((preset) => {
            const presetControls = createWorkspaceStylePresetControls(
              baseThemeControls,
              preset,
            );
            const isActivePreset = compareWorkspaceThemeControls(
              controls,
              presetControls,
            );

            return (
              <button
                aria-pressed={isActivePreset}
                className="min-h-14 border px-3 py-2 text-left font-mono uppercase tracking-[0.1em] text-neutral-100 transition hover:bg-white/[0.06]"
                data-testid={`workspace-style-preset-${preset.id}`}
                key={preset.id}
                onClick={() => applyWorkspaceStylePreset(preset)}
                style={{
                  background:
                    "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.2))",
                  borderColor: isActivePreset
                    ? `${activeAccent}99`
                    : "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                  borderRadius: controlRadius,
                }}
                type="button"
              >
                <span className="block text-[10px]">{preset.label}</span>
                <span className="mt-1 block text-[8px] text-neutral-500">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        {rangeControl({
          key: "warmth",
          label: "Warmth",
          max: 100,
        })}
        {rangeControl({
          key: "glass",
          label: "Glass",
          max: 100,
        })}
        {rangeControl({
          key: "blur",
          label: "Blur",
          max: 40,
        })}
        {rangeControl({
          key: "radius",
          label: "Radius",
          max: 32,
        })}
        {rangeControl({
          key: "shadow",
          label: "Shadow",
          max: 100,
        })}
        {rangeControl({
          key: "workspaceWash",
          label: "Surface Lightness",
          max: 100,
        })}

      </div>

      <footer className="mt-3 grid grid-cols-3 gap-2">
        <button
          className="border px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-100 transition hover:bg-white/10"
          data-testid="workspace-style-save"
          onClick={saveControls}
          style={{
            background:
              "var(--nexus-layout-panel-bg, linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.02))), var(--nexus-panel-bg, rgb(255 255 255 / 0.04))",
            borderColor: `${activeAccent}59`,
            borderRadius: controlRadius,
          }}
          title="Save to workspace style"
          type="button"
        >
          Save
        </button>
        <button
          className="border bg-black/25 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-200 transition hover:bg-white/10"
          data-testid="workspace-style-revert"
          onClick={revertPreview}
          style={{
            background:
              "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.25))",
            borderColor: `${activeAccent}40`,
            borderRadius: controlRadius,
          }}
          title="Revert preview"
          type="button"
        >
          Revert
        </button>
        <button
          className="border bg-black/25 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-200 transition hover:bg-white/10"
          data-testid="workspace-style-reset"
          onClick={resetControls}
          style={{
            background:
              "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.25))",
            borderColor: `${activeAccent}40`,
            borderRadius: controlRadius,
          }}
          title="Reset controls"
          type="button"
        >
          Reset
        </button>
      </footer>
    </section>
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

function WorkspaceChatComposerShell({
  agent,
  composerMode,
  imageSettings,
  onAttachmentSaved,
  onComposerModeChange,
  onFocusAgent,
  onGenerateImage,
  onGenerateMedia,
  onImageSettingsChange,
  onNotify,
  onOpenArtifacts,
  onSend,
  onUpdateAgentModelSettings,
  userId,
  workspaceId,
}: {
  agent?: NexusAgent;
  composerMode: WorkspaceComposerMode;
  imageSettings: WorkspaceComposerImageSettings;
  onAttachmentSaved: () => void;
  onComposerModeChange: (agentId: string, mode: WorkspaceComposerMode) => void;
  onFocusAgent: (agentId: string) => void;
  onGenerateImage: (
    agentId: string,
    content: string,
    imageSettings: WorkspaceComposerImageSettings,
  ) => Promise<void>;
  onGenerateMedia: (agentId: string, content: string) => Promise<void>;
  onImageSettingsChange: (
    agentId: string,
    settings: WorkspaceComposerImageSettings,
  ) => void;
  onNotify: (message: string) => void;
  onOpenArtifacts: () => void;
  onSend: (agentId: string, content: string) => Promise<void>;
  onUpdateAgentModelSettings: (
    agentId: string,
    settings: Partial<AgentModelSettings>,
  ) => void;
  userId: string;
  workspaceId: string;
}) {
  const [draft, setDraft] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<WorkspaceComposerAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const capabilityType = agent ? getCapabilityType(agent) : "chat";
  const modelCapability = getModelCapabilityProfile(agent?.model);
  const reasoningOptions = modelCapability?.thinking.supportedReasoningEfforts ?? [];
  const composerActions = getWorkspaceComposerActions(composerMode);
  const selectedReasoningEffort =
    agent?.modelSettings?.reasoningEffort &&
    reasoningOptions.includes(agent.modelSettings.reasoningEffort)
      ? agent.modelSettings.reasoningEffort
      : modelCapability?.thinking.defaultReasoningEffort ?? reasoningOptions[0];
  const imageModeActive = composerMode === "image";
  const isMediaAgent = isMediaCapability(capabilityType);
  const isSandboxAgent = isSandboxCapability(capabilityType);
  const agentBusy = agent?.status === "streaming" || agent?.status === "thinking";
  const hasReadyAttachments = attachments.some(
    (attachment) => attachment.status === "ready",
  );
  const hasPendingAttachments = attachments.some(
    (attachment) => attachment.status === "uploading",
  );
  const submitDisabled =
    !agent ||
    isSubmitting ||
    agentBusy ||
    isSandboxAgent ||
    hasPendingAttachments ||
    (!draft.trim() && !hasReadyAttachments);
  const reasoningDisabled = !agent || reasoningOptions.length === 0;

  const handleComposerAction = (actionId: WorkspaceComposerActionId) => {
    setAttachmentMenuOpen(false);

    if (!agent) {
      onNotify("Select a chatroom before switching composer mode.");
      return;
    }

    if (actionId === "toggle-image-generation") {
      const nextMode = toggleWorkspaceComposerMode(composerMode);

      onComposerModeChange(agent.id, nextMode);
      onNotify(
        nextMode === "image"
          ? `${agent.callsign} composer switched to image generation mode.`
          : `${agent.callsign} composer switched to language model mode.`,
      );
    }
  };

  const handleAttachmentAction = (actionId: WorkspaceAttachmentInputActionId) => {
    setAttachmentMenuOpen(false);

    if (actionId === "local-file-upload") {
      if (!agent) {
        onNotify("Select a chatroom before attaching a file.");
        return;
      }

      if (isSubmitting || agentBusy) {
        onNotify(`${agent.callsign} is already processing.`);
        return;
      }

      fileInputRef.current?.click();
      return;
    }

    const action = WORKSPACE_ATTACHMENT_INPUT_ACTIONS.find(
      (candidate) => candidate.id === actionId,
    );

    if (actionId === "artifact-vault-reference") {
      onOpenArtifacts();
    }

    onNotify(`${action?.label ?? "Attachment"} slot is reserved for a V21 upgrade.`);
  };

  const attachLocalFile = async (file?: File) => {
    if (!file) {
      return;
    }

    if (!agent) {
      onNotify("Select a chatroom before attaching a file.");
      return;
    }

    const attachmentId = makeId("attachment");
    const mimeType = file.type || "text/plain";
    const contentKind = isTextLikeAttachmentFile(file) ? "text" : "binary";
    const compilerLane = resolveAttachmentCompilerLane({ contentKind, mimeType });
    const optimisticAttachment: WorkspaceComposerAttachment = {
      compilerId: compilerLane.defaultCompiler.id,
      compilerVersion: compilerLane.defaultCompiler.version,
      contentKind,
      id: attachmentId,
      mimeType,
      name: file.name,
      previewText: "Recording attachment...",
      sizeBytes: file.size,
      status: "uploading",
      targetCapabilities: [...compilerLane.targetCapabilities],
    };

    setAttachments((current) => [...current, optimisticAttachment]);

    try {
      const contentText = contentKind === "text" ? await file.text() : undefined;
      const contentUrl =
        contentKind === "binary"
          ? file.size <= WORKSPACE_ATTACHMENT_BINARY_INLINE_MAX_BYTES
            ? await readFileAsDataUrl(file)
            : `workspace-attachment-pending://compiler/${encodeURIComponent(attachmentId)}/${encodeURIComponent(file.name)}`
          : undefined;
      const artifactResponse = await nexusApiClient.post<
        ArtifactCreateResponse,
        CreateArtifactRequest
      >(
        "/api/v1/artifacts",
        {
          contentText,
          contentUrl,
          metadata: createNoopAttachmentCompilerMetadata({
            contentKind,
            fileName: file.name,
            lastModified: file.lastModified,
            mimeType,
            sizeBytes: file.size,
            source: "workspace-composer",
          }),
          mimeType,
          sourceAgentId: agent.id,
          title: file.name,
          type: "attachment",
          workspaceId,
        },
        {
          idempotencyKey: `attachment_${attachmentId}`,
          userId,
          workspaceId,
        },
      );
      const artifact = artifactResponse.artifact;
      const previewText =
        artifact.previewText ||
        contentText?.slice(0, 180) ||
        `${contentKind} attachment recorded.`;

      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                artifactId: artifact.id,
                compiledArtifactId: artifact.id,
                contentUrl,
                mimeType: artifact.mimeType ?? mimeType,
                previewText,
                rawArtifactId: artifact.id,
                sizeBytes: artifact.contentSizeBytes ?? file.size,
                status: "ready",
                textContent: contentText,
              }
            : attachment,
        ),
      );
      onAttachmentSaved();
      onNotify(`${file.name} attached with backend artifact record.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Attachment failed.";

      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                error: detail,
                previewText: "Attachment failed.",
                status: "error",
              }
            : attachment,
        ),
      );
      onNotify(`${file.name} could not be attached: ${detail}`);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agent) {
      onNotify("Select an agent before sending.");
      return;
    }

    if (isSandboxAgent) {
      onNotify(`${agent.callsign} uses the sandbox editor instead of chat input.`);
      return;
    }

    if (agentBusy || isSubmitting) {
      onNotify(`${agent.callsign} is already processing.`);
      return;
    }

    const readyAttachments = attachments.filter(
      (attachment) => attachment.status === "ready",
    );
    const value = imageModeActive
      ? draft.trim()
      : createWorkspaceAttachmentMessagePayload(draft, readyAttachments);

    if (!value) {
      return;
    }

    if (imageModeActive && readyAttachments.length) {
      onNotify("Image mode attachment compiler is not connected yet.");
      return;
    }

    setDraft("");
    setIsSubmitting(true);
    onFocusAgent(agent.id);

    try {
      await (imageModeActive
        ? onGenerateImage(agent.id, value, imageSettings)
        : isMediaAgent
          ? onGenerateMedia(agent.id, value)
          : onSend(agent.id, value));
      setAttachments((current) =>
        current.filter((attachment) => attachment.status !== "ready"),
      );
    } catch {
      setDraft(draft);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="nexus-workspace-chat-composer-shell nexus-workspace-floating-composer fixed bottom-3 left-1/2 z-[130] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 border px-2 py-1.5"
      data-testid="workspace-chat-composer-shell"
      style={{
        ...workspaceBodyMaterialStyle,
        borderRadius:
          "var(--nexus-workspace-radius, var(--nexus-panel-radius, var(--surface-radius)))",
      }}
    >
      <div className="w-full">
        <form aria-label="Workspace message composer" onSubmit={submit}>
          <input
            ref={fileInputRef}
            className="hidden"
            data-testid="workspace-attachment-file-input"
            onChange={(event) => {
              void attachLocalFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <div
            className="relative border"
            data-testid="workspace-chat-input-card"
            style={{
              background:
                "var(--nexus-layout-panel-muted-bg, var(--nexus-panel-bg, rgb(255 255 255 / 0.045)))",
              borderColor:
                "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
              borderRadius:
                "calc(var(--nexus-panel-radius, var(--surface-radius)) + 10px)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
              <div className="relative shrink-0">
                <button
                  aria-expanded={attachmentMenuOpen}
                  aria-label="Add attachment"
                  className="grid h-9 w-9 place-items-center rounded-full border text-neutral-400 transition hover:text-neutral-100"
                  data-testid="workspace-attachment-menu-trigger"
                  onClick={() => setAttachmentMenuOpen((current) => !current)}
                  style={{
                    borderColor:
                      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {attachmentMenuOpen ? (
                  <div
                    className="absolute bottom-12 left-0 z-[120] w-64 overflow-hidden border bg-neutral-950/95 p-1 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    data-testid="workspace-attachment-menu"
                    style={{
                      borderColor:
                        "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                      borderRadius:
                        "var(--nexus-panel-radius, var(--surface-radius))",
                    }}
                  >
                    {composerActions.map((action) => (
                      <button
                        key={action.id}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-100 transition hover:bg-neutral-300/[0.08]"
                        data-composer-mode={composerMode}
                        data-testid={`workspace-composer-action-${action.id}`}
                        onClick={() => handleComposerAction(action.id)}
                        type="button"
                      >
                        {composerMode === "image" ? (
                          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-200/65">
                            {action.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                    <div className="my-1 h-px bg-white/10" />
                    {WORKSPACE_ATTACHMENT_INPUT_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-300 transition hover:bg-white/[0.06] hover:text-neutral-100"
                        data-placeholder={action.status === "placeholder"}
                        data-testid={`workspace-attachment-action-${action.id}`}
                        onClick={() => handleAttachmentAction(action.id)}
                        type="button"
                      >
                        {action.id === "local-file-upload" ? (
                          <FileUp className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : action.id === "artifact-vault-reference" ? (
                          <Archive className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : action.id === "notebook-context" ? (
                          <Pencil className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-500">
                            {action.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
                data-testid="workspace-chat-composer-input"
                disabled={!agent || isSubmitting || agentBusy || isSandboxAgent}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder={
                  agent
                    ? isSandboxAgent
                      ? "Sandbox agents use the embedded editor"
                      : imageModeActive
                        ? "Describe the image to generate"
                        : isMediaAgent
                          ? `Describe ${capabilityType} generation`
                          : "Ask for follow-up changes"
                    : "Select an agent to start"
                }
                value={draft}
              />

              <label
                className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-300 transition sm:inline-flex"
                data-mode={composerMode}
                data-testid="workspace-composer-mode-control"
              >
                <span className="sr-only">Chatroom reasoning effort</span>
                {imageModeActive ? (
                  <div
                    className="flex items-center gap-1"
                    data-testid="workspace-image-settings-controls"
                  >
                    <select
                      aria-label="Image model"
                      className="max-w-[92px] bg-transparent uppercase outline-none"
                      data-testid="workspace-image-model-select"
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        onImageSettingsChange(agent.id, {
                          ...imageSettings,
                          modelId: event.currentTarget.value,
                        });
                      }}
                      value={imageSettings.modelId}
                    >
                      {WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Image quality"
                      className="max-w-[76px] bg-transparent uppercase outline-none"
                      data-testid="workspace-image-quality-select"
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        onImageSettingsChange(agent.id, {
                          ...imageSettings,
                          quality: event.currentTarget
                            .value as WorkspaceComposerImageSettings["quality"],
                        });
                      }}
                      value={imageSettings.quality}
                    >
                      {WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Image aspect ratio"
                      className="max-w-[62px] bg-transparent uppercase outline-none"
                      data-testid="workspace-image-ratio-select"
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        onImageSettingsChange(agent.id, {
                          ...imageSettings,
                          aspectRatio: event.currentTarget
                            .value as WorkspaceComposerImageSettings["aspectRatio"],
                        });
                      }}
                      value={imageSettings.aspectRatio}
                    >
                      {WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <select
                      aria-label="Chatroom reasoning effort"
                      className="max-w-[116px] bg-transparent uppercase outline-none disabled:opacity-45"
                      data-testid="workspace-chat-reasoning-select"
                      disabled={reasoningDisabled}
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        const reasoningEffort = event.currentTarget
                          .value as NexusReasoningEffort;

                        onUpdateAgentModelSettings(agent.id, { reasoningEffort });
                        onNotify(
                          `${agent.callsign} reasoning set to ${reasoningEffort}.`,
                        );
                      }}
                      value={selectedReasoningEffort ?? ""}
                    >
                      {reasoningOptions.length ? (
                        reasoningOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                      ) : (
                        <option value="">no reasoning</option>
                      )}
                    </select>
                  </>
                )}
              </label>

              <button
                aria-label="Send workspace message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-950 transition hover:opacity-90 disabled:opacity-40"
                data-testid="workspace-chat-composer-action"
                disabled={submitDisabled}
                style={{
                  background:
                    "var(--theme-primary, var(--nexus-accent-primary, #e5e5e5))",
                }}
                type="submit"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>

            {attachments.length ? (
              <div
                className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2"
                data-testid="workspace-attachment-chip-list"
              >
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className={cx(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em]",
                      attachment.status === "ready" &&
                        "border-neutral-300/30 bg-neutral-300/10 text-neutral-100",
                      attachment.status === "uploading" &&
                        "border-white/15 bg-white/[0.045] text-neutral-200",
                      attachment.status === "error" &&
                        "border-neutral-300/30 bg-neutral-300/10 text-neutral-100",
                    )}
                    data-testid="workspace-attachment-chip"
                    title={
                      attachment.error ??
                      `${attachment.name} - ${formatFileSize(attachment.sizeBytes)}`
                    }
                  >
                    <FileUp className="h-3 w-3 shrink-0" />
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <span className="text-neutral-500">
                      {attachment.status === "ready"
                        ? "recorded"
                        : attachment.status}
                    </span>
                    <button
                      aria-label={`Remove ${attachment.name}`}
                      className="grid h-4 w-4 place-items-center rounded-full text-neutral-400 transition hover:text-neutral-100"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((candidate) => candidate.id !== attachment.id),
                        )
                      }
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
