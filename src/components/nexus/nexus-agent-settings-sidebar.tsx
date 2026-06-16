"use client";


import { cx, getCatalogModelLabel, getProviderLabel, isGeneratedArtifactRecord, IconButton, streamModeTone, formatTime, artifactPreview, traceSeverityClass } from "@/components/nexus/nexus-utils";
type RightDockPanelId = "intel" | "providers" | "models" | "theme" | "memory" | "artifacts" | "generations" | "workflows" | "trace" | "account";
import { WorkspaceStyleControlsPanel } from "@/components/nexus/nexus-ops";
import { RightIntel } from "@/components/nexus/nexus-panels";
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


const rightDockPanels: Array<{
  id: RightDockPanelId;
  label: string;
  detail: string;
  icon: ReactNode;
}> = [
  { id: "intel", label: "Intel", detail: "Selected agent mission, memory, tools, and telemetry", icon: <PanelRight className="h-4 w-4" /> },
  { id: "providers", label: "Providers", detail: "API provider status and verification", icon: <Lock className="h-4 w-4" /> },
  { id: "models", label: "Models", detail: "Model catalog and capability profiles", icon: <BrainCircuit className="h-4 w-4" /> },
  { id: "theme", label: "Theme", detail: "Workspace visual theme controls", icon: <Settings className="h-4 w-4" /> },
  { id: "memory", label: "Memory", detail: "Agent memory records", icon: <Database className="h-4 w-4" /> },
  { id: "artifacts", label: "Artifacts", detail: "Generated artifacts and media", icon: <Archive className="h-4 w-4" /> },
  { id: "generations", label: "Generations", detail: "Generation history", icon: <PackageCheck className="h-4 w-4" /> },
  { id: "workflows", label: "Workflows", detail: "Workflow templates and macros", icon: <Workflow className="h-4 w-4" /> },
  { id: "trace", label: "Trace", detail: "Runtime trace and diagnostics", icon: <RadioTower className="h-4 w-4" /> },
  { id: "account", label: "Account", detail: "Account settings", icon: <Home className="h-4 w-4" /> },
];

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
// Local helpers from nexus-ops.tsx
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

function uniqueModelIds(models: Array<string | undefined>) {
  return Array.from(
    new Set(
      models
        .map((model) => model?.trim())
        .filter((model): model is string => Boolean(model)),
    ),
  );
}

function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
}


export function ModelInfoPanel({
  modelCatalog,
  plan,
  selectedModelId,
}: {
  modelCatalog: PublicModelCatalogEntry[];
  plan: ModelCatalogResponse["plan"];
  selectedModelId?: string;
}) {
  const selectedModel = modelCatalog.find((model) => model.id === selectedModelId);
  const familyGroups = modelCatalog.reduce<Array<{ family: string; models: PublicModelCatalogEntry[] }>>(
    (groups, model) => {
      const group = groups.find((candidate) => candidate.family === model.provider_family);

      if (group) {
        group.models.push(model);
      } else {
        groups.push({ family: model.provider_family, models: [model] });
      }

      return groups;
    },
    [],
  );

  return (
    <section className="mb-4 border border-neutral-300/25 bg-neutral-300/[0.045] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
            Model Catalog
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Backend-filtered models for your current plan.
          </div>
        </div>
        <span className="border border-neutral-300/35 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100">
          {plan}
        </span>
      </div>

      {selectedModel ? (
        <article className="mb-3 border border-white/10 bg-black/25 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white">
            {selectedModel.label}
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            {selectedModel.description}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
            <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
              Family: {selectedModel.provider_family}
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
              Plan: {selectedModel.min_plan}
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
              Vision: {selectedModel.supports_vision ? "Yes" : "No"}
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
              Tools: {selectedModel.supports_tools ? "Yes" : "No"}
            </span>
          </div>
        </article>
      ) : null}

      <div className="grid gap-2">
        {familyGroups.map((group) => (
          <article key={group.family} className="border border-white/10 bg-black/25 p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white">
              {group.family}
            </div>
            <div className="grid gap-2">
              {group.models.map((model) => (
                <div key={model.id} className="border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-100">
                        {model.label}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
                        {model.best_for.join(" / ")}
                      </span>
                    </span>
                    <span className="shrink-0 border border-neutral-300/25 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-100">
                      {model.min_plan}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AgentSettingsSidebar({
  open,
  activeAgent,
  activePanel,
  agent,
  agents,
  authVault,
  modelCatalog,
  modelCatalogPlan,
  artifactError,
  artifacts,
  artifactsLoading,
  workspaceId,
  workspaceName,
  workflowRunHistoryGroups,
  workflowRuntimeLite,
  workflowRuntimeEvidence,
  macroError,
  macros,
  macrosLoading,
  notebooks,
  openNotebookIds,
  branchingSettings,
  streamMode,
  workspaceStylePayloadReview,
  onAddAgent,
  onClose,
  onCopyArtifact,
  onCreateNotebook,
  onDownloadArtifact,
  onLogout,
  onRefreshArtifacts,
  onRefreshMacros,
  onRetryWorkflowRuntimeTraceSync,
  onRunTool,
  onSelectAgent,
  onSetAgentProfileLocked,
  onSpawnMacro,
  onToggleNotebook,
  onUpdateBranchingSettings,
  onUpdateMemory,
  onUpdateAgentCallsign,
  onUpdateAgentProfile,
  onUpdateMission,
  onSaveWorkspaceThemeStyleControls,
  onUpdateAgentModel,
}: {
  open: boolean;
  activeAgent?: NexusAgent;
  activePanel: RightDockPanelId;
  agent?: NexusAgent;
  agents: NexusAgent[];
  authVault: IAuthVault;
  modelCatalog: PublicModelCatalogEntry[];
  modelCatalogPlan: ModelCatalogResponse["plan"];
  artifactError?: string;
  artifacts: ArtifactVaultRecord[];
  artifactsLoading: boolean;
  workspaceId: string;
  workspaceName?: string;
  workflowRunHistoryGroups: WorkflowProRunHistoryGroupsReport;
  workflowRuntimeLite?: WorkflowRuntimeLiteState;
  workflowRuntimeEvidence: WorkflowProRuntimeEvidenceReport;
  macroError?: string;
  macros: WorkflowTemplateRecord[];
  macrosLoading: boolean;
  notebooks: NotebookRecord[];
  openNotebookIds: string[];
  branchingSettings?: WorkspaceBranchingSettings;
  streamMode: StreamMode;
  workspaceStylePayloadReview: ImportedWorkspaceStyleReviewState | null;
  onAddAgent: (type: AgentCreationCapabilityType) => void;
  onClose: () => void;
  onCopyArtifact: (artifact: ArtifactVaultRecord) => void;
  onCreateNotebook: () => string;
  onDownloadArtifact: (artifact: ArtifactVaultRecord) => void;
  onLogout: () => void;
  onRefreshArtifacts: () => void;
  onRefreshMacros: () => void;
  onRetryWorkflowRuntimeTraceSync: (runId: string) => Promise<void>;
  onRunTool: (agentId: string, toolId: string) => Promise<void>;
  onSelectAgent: (agentId: string) => void;
  onSetAgentProfileLocked: (agentId: string, locked: boolean) => void;
  onSpawnMacro: (macro: WorkflowTemplateRecord) => void;
  onToggleNotebook: (id: string) => void;
  onUpdateBranchingSettings: (settings: Partial<WorkspaceBranchingSettings>) => void;
  onUpdateMemory: (agentId: string, memoryId: string, content: string) => void;
  onUpdateAgentCallsign: (agentId: string, callsign: string) => void;
  onUpdateAgentProfile: (agentId: string, profile: AgentProfileUpdate) => void;
  onUpdateMission: (agentId: string, mission: string) => void;
  onSaveWorkspaceThemeStyleControls: (
    controls: WorkspaceThemeStyleControlsV1,
  ) => ImportedWorkspaceStyleReviewState | null;
  onUpdateAgentModel: (agentId: string, model: string) => void;
}) {
  const [newAgentType, setNewAgentType] =
    useState<AgentCreationCapabilityType>("chat");
  const generatedArtifacts = useMemo(
    () => artifacts.filter(isGeneratedArtifactRecord),
    [artifacts],
  );
  const [traceEvents, setTraceEvents] = useState<SystemEventRecord[]>([]);
  const [traceEventsCursor, setTraceEventsCursor] = useState<string | null>(null);
  const [traceEventsHasMore, setTraceEventsHasMore] = useState(false);
  const [traceEventsLoaded, setTraceEventsLoaded] = useState(false);
  const [traceEventsLoading, setTraceEventsLoading] = useState(false);
  const [traceEventsError, setTraceEventsError] = useState<string | undefined>();
  const [runtimeTraceEvents, setRuntimeTraceEvents] = useState<SystemEventRecord[]>([]);
  const [runtimeTraceEventsTraceId, setRuntimeTraceEventsTraceId] = useState<string | null>(null);
  const [runtimeTraceEventsLoaded, setRuntimeTraceEventsLoaded] = useState(false);
  const [runtimeTraceEventsLoading, setRuntimeTraceEventsLoading] = useState(false);
  const [runtimeTraceEventsError, setRuntimeTraceEventsError] = useState<string | undefined>();
  const [selectedRunGroupId, setSelectedRunGroupId] = useState<string | null>(null);
  const [traceResyncingRunId, setTraceResyncingRunId] = useState<string | null>(null);
  const traceViewerUserId = authVault.user?.id ?? "local-owner";
  const latestRuntimeTraceId = workflowRuntimeEvidence.latestRun?.traceSync?.traceId ?? null;
  const runtimeTraceCorrelation = useMemo(
    () =>
      createWorkflowRuntimeTraceCorrelationReport({
        events: runtimeTraceEvents,
        latestRun: workflowRuntimeEvidence.latestRun,
        loaded:
          Boolean(latestRuntimeTraceId) &&
          runtimeTraceEventsLoaded &&
          runtimeTraceEventsTraceId === latestRuntimeTraceId,
      }),
    [
      latestRuntimeTraceId,
      runtimeTraceEvents,
      runtimeTraceEventsLoaded,
      runtimeTraceEventsTraceId,
      workflowRuntimeEvidence.latestRun,
    ],
  );
  const selectedRunGroupIsAvailable = workflowRunHistoryGroups.groups.some(
    (group) => group.groupId === selectedRunGroupId,
  );
  const effectiveRunGroupId =
    selectedRunGroupIsAvailable
      ? selectedRunGroupId
      : workflowRunHistoryGroups.groups[0]?.groupId ?? null;
  const workflowRunGroupInspector = useMemo(
    () =>
      createWorkflowProRunGroupInspectorReport({
        events: runtimeTraceEvents,
        eventsLoaded: runtimeTraceEventsLoaded,
        eventsTraceId: runtimeTraceEventsTraceId,
        groupId: effectiveRunGroupId,
        runtimeLite: workflowRuntimeLite,
      }),
    [
      effectiveRunGroupId,
      runtimeTraceEvents,
      runtimeTraceEventsLoaded,
      runtimeTraceEventsTraceId,
      workflowRuntimeLite,
    ],
  );
  const durableGroupRecordReport = useMemo(
    () =>
      createWorkflowProDurableGroupRecordReport({
        events: traceEvents,
        groupId: effectiveRunGroupId,
        loaded: traceEventsLoaded,
      }),
    [effectiveRunGroupId, traceEvents, traceEventsLoaded],
  );
  const runtimeTraceTargetTraceId =
    workflowRunGroupInspector.latestRun?.traceSync?.traceId ?? latestRuntimeTraceId;
  const panelMeta = getRightDockPanelMeta(activePanel);
  const handleRetrySelectedRunTraceSync = useCallback(async () => {
    const runId = workflowRunGroupInspector.latestRun?.runId;

    if (!runId) {
      return;
    }

    setTraceResyncingRunId(runId);

    try {
      await onRetryWorkflowRuntimeTraceSync(runId);
    } finally {
      setTraceResyncingRunId(null);
    }
  }, [onRetryWorkflowRuntimeTraceSync, workflowRunGroupInspector.latestRun?.runId]);
  const handleExportWorkflowRuntimeEvidence = useCallback(() => {
    const manifest = createWorkflowProRuntimeEvidenceManifest({
      evidence: workflowRuntimeEvidence,
      workspaceId,
      workspaceName,
    });

    downloadTextPayload(
      JSON.stringify(manifest, null, 2),
      `nexus-workflow-runtime-evidence-${sanitizeDownloadFileName(workspaceId)}-${Date.now()}.json`,
      "application/json;charset=utf-8",
    );
  }, [workflowRuntimeEvidence, workspaceId, workspaceName]);

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
      setTraceEventsLoaded(true);
    } catch (error) {
      setTraceEventsLoaded(true);
      setTraceEventsError(
        error instanceof Error ? error.message : "Trace events unavailable.",
      );
    } finally {
      setTraceEventsLoading(false);
    }
  }, [traceEventsCursor, traceViewerUserId, workspaceId]);
  const loadRuntimeTraceEvents = useCallback(async (traceId: string) => {
    setRuntimeTraceEventsLoading(true);
    setRuntimeTraceEventsError(undefined);
    setRuntimeTraceEventsTraceId(traceId);

    try {
      const params = new URLSearchParams({
        limit: "10",
        traceId,
        workspaceId,
      });
      const response = await nexusApiClient.get<SystemEventListResponse>(
        `/api/v1/observability/events?${params.toString()}`,
        {
          userId: traceViewerUserId,
          workspaceId,
        },
      );

      setRuntimeTraceEvents(response.events);
      setRuntimeTraceEventsLoaded(true);
    } catch (error) {
      setRuntimeTraceEvents([]);
      setRuntimeTraceEventsLoaded(true);
      setRuntimeTraceEventsTraceId(traceId);
      setRuntimeTraceEventsError(
        error instanceof Error ? error.message : "Runtime trace events unavailable.",
      );
    } finally {
      setRuntimeTraceEventsLoading(false);
    }
  }, [traceViewerUserId, workspaceId]);

  useEffect(() => {
    if (activePanel !== "trace") {
      return;
    }

    const traceId = runtimeTraceTargetTraceId;

    if (!traceId) {
      const timeoutId = window.setTimeout(() => {
        setRuntimeTraceEvents([]);
        setRuntimeTraceEventsTraceId(null);
        setRuntimeTraceEventsLoaded(false);
        setRuntimeTraceEventsError(undefined);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      void loadRuntimeTraceEvents(traceId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    activePanel,
    loadRuntimeTraceEvents,
    runtimeTraceTargetTraceId,
  ]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
	          className="fixed bottom-3 right-3 top-[88px] z-[120] flex w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden border shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl xl:right-16"
          exit={{ opacity: 0, x: 36 }}
          initial={{ opacity: 0, x: 48 }}
          style={{
            background:
              "var(--nexus-layout-panel-bg, linear-gradient(180deg, color-mix(in srgb, var(--theme-primary, #e5e5e5) 13%, rgba(15,23,42,0.92)), color-mix(in srgb, var(--theme-primary, #e5e5e5) 6%, rgba(2,6,23,0.95))))",
            borderColor:
              "var(--nexus-layout-panel-border, color-mix(in srgb, var(--theme-primary, #e5e5e5) 28%, transparent))",
            borderRadius:
              "var(--nexus-right-dock-radius, var(--nexus-panel-radius, var(--surface-radius)))",
            boxShadow:
              "var(--nexus-layout-panel-shadow, 0 24px 90px rgba(0,0,0,0.55), 0 0 44px color-mix(in srgb, var(--theme-primary, #e5e5e5) 14%, transparent))",
          }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
	          <header
              className="flex items-center justify-between border-b border-white/10 p-4"
              style={{
                background:
                  "var(--nexus-layout-panel-muted-bg, color-mix(in srgb, var(--theme-primary, #e5e5e5) 12%, transparent))",
              }}
            >
	            <div>
	              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-100">
	                {panelMeta.label}
	              </div>
	              <div className="mt-1 text-xs text-neutral-500">{panelMeta.detail}</div>
	            </div>
	            <IconButton aria-label="Close panel" onClick={onClose}>
	              <X className="h-4 w-4" />
	            </IconButton>
	          </header>

          <div
            className="system-scroll min-h-0 flex-1 overflow-y-auto p-4"
            style={{
              background:
                "var(--nexus-body-frame-bg, color-mix(in srgb, var(--theme-primary, #e5e5e5) 4%, transparent))",
            }}
          >
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
	              <ModelInfoPanel
	                modelCatalog={modelCatalog}
	                plan={modelCatalogPlan}
	                selectedModelId={agent?.model}
	              />
	            ) : null}

	            {activePanel === "theme" ? (
                <>
                  <WorkspaceStyleControlsPanel
                    onSaveWorkspaceThemeStyleControls={
                      onSaveWorkspaceThemeStyleControls
                    }
                    stylePayloadReview={workspaceStylePayloadReview}
                  />
                </>
	            ) : null}

	            <section
	              className={cx(
	                "mb-4 border border-neutral-300/25 bg-neutral-300/[0.045] p-3 shadow-[0_0_28px_rgba(217,70,239,0.08)]",
	                activePanel !== "memory" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    🧬 Branching & Memory Compression
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Global defaults for summary branch extraction
                  </div>
                </div>
                <span className="border border-neutral-300/30 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100">
                  {branchingSettings?.defaultRetentionRatio ??
                    DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio}
                  %
                </span>
              </div>

              <label className="grid gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  Default Summary Retention Ratio
                </span>
                <input
                  className="accent-neutral-300"
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
                <span className="text-xs leading-5 text-neutral-400">
                  New summary branches start by retaining the most important{" "}
                  {branchingSettings?.defaultRetentionRatio ??
                    DEFAULT_WORKSPACE_BRANCHING_SETTINGS.defaultRetentionRatio}
                  % of source memory.
                </span>
              </label>

              <div className="mt-3 border border-dashed border-neutral-300/20 bg-black/25 p-3 opacity-60">
                <div className="flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  Future Default Weights
                  <span className="border border-neutral-300/25 px-2 py-0.5 text-[8px] text-neutral-100">
                    Reserved
                  </span>
                </div>
                <div className="mt-2 grid gap-1.5 text-[11px] text-neutral-500">
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
	                "mb-4 border border-neutral-300/25 bg-neutral-300/[0.045] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]",
	                activePanel !== "account" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    Account Profile
                  </div>
                  <div className="mt-1 truncate text-xs text-neutral-400">
                    {authVault.user?.email ?? "Authenticated operator"}
                  </div>
                </div>
                <button
                  className="border border-neutral-300/30 bg-neutral-300/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 transition hover:bg-neutral-300/20"
                  onClick={onLogout}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-neutral-300/25 bg-neutral-300/[0.045] p-3 shadow-[0_0_28px_rgba(217,70,239,0.08)]",
	                activePanel !== "providers" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
	                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
	                    Server Model Gateway
	                  </div>
	                  <div className="mt-1 text-xs text-neutral-500">
	                    New API credentials are managed by the backend.
	                  </div>
                </div>
                <span
                  className={cx(
                    "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
	                    "border-neutral-300/35 bg-neutral-300/10 text-neutral-100",
	                  )}
	                >
	                  Server
	                </span>
              </div>
              <div className="grid gap-3">
                <div className="border border-white/10 bg-black/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300">
                  Server-managed New API gateway
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                  <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                    Plan: {modelCatalogPlan}
                  </span>
                  <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
                    Models: {modelCatalog.length}
                  </span>
                </div>
                <p className="text-xs leading-5 text-neutral-500">
                  Model access and provider credentials are enforced by the backend.
                </p>
              </div>
            </section>

	            <section
	              className={cx(
	                "mb-4 border border-neutral-300/25 bg-neutral-300/[0.035] p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)]",
	                activePanel !== "models" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-neutral-100" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    🧠 Agent Routing & Models
                  </div>
	                  <div className="mt-1 text-xs text-neutral-500">
	                    Per-agent model selection. Access is enforced by the backend.
	                  </div>
                </div>
              </div>
              <div className="grid gap-2">
		                {agents.map((agent) => {
		                  const modelGroups = getAgentModelGroups(agent, modelCatalog);
		                  const catalogModel = modelCatalog.find((model) => model.id === agent.model);
		                  const capability = getModelCapabilityProfile(agent.model);

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
                          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                            {getCapabilityType(agent)}
                          </div>
                        </div>
                        <span className="max-w-32 truncate border border-neutral-300/25 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-100">
	                          {getCatalogModelLabel(modelCatalog, agent.model)}
                        </span>
                      </div>
	                      <select
	                        className="w-full border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[11px] text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/60"
                        onChange={(event) =>
                          onUpdateAgentModel(agent.id, event.currentTarget.value)
                        }
                        value={agent.model}
                      >
                        {modelGroups.map((group) => (
                          <optgroup key={group.label} label={group.label.toUpperCase()}>
                            {group.models.map((model) => (
	                              <option key={model} value={model}>
	                                {getCatalogModelLabel(modelCatalog, model)}
	                              </option>
                            ))}
	                          </optgroup>
	                        ))}
	                      </select>
	                      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
	                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
		                          Family: {catalogModel?.provider_family ?? getProviderLabel(capability?.providerId ?? agent.provider)}
		                        </span>
	                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
	                          Thinking: {capability?.thinking.supported ? "Supported" : "No"}
	                        </span>
		                        <span className="border border-white/10 bg-white/[0.03] px-2 py-1">
		                          Plan: {catalogModel?.min_plan ?? "Allowed"}
		                        </span>
	                      </div>
	                      {capability?.thinking.supported ? (
	                        <div className="mt-2 border border-neutral-300/20 bg-neutral-300/[0.04] p-2 text-[11px] leading-5 text-neutral-400">
	                          <span className="font-mono uppercase tracking-[0.14em] text-neutral-100">
	                            Reasoning
	                          </span>
	                          <span className="ml-2">
	                            {capability.thinking.supportedReasoningEfforts.join(" / ")}
	                          </span>
	                          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
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
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    Add New Agent
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Chat, image, video, or sandbox workstation
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-neutral-300/35 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
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
                        ? "border-neutral-300/45 bg-neutral-300/10 text-neutral-100"
                        : "border-white/10 bg-black/20 text-neutral-400 hover:border-white/25",
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
	                "mb-4 border border-neutral-300/30 bg-neutral-300/[0.045] p-3 shadow-[0_0_28px_rgba(16,185,129,0.09)]",
	                activePanel !== "memory" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    📓 Global Datapads
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Cross-workspace notebooks for durable operator context
                  </div>
                </div>
                <button
                  className="border border-neutral-300/40 bg-neutral-300/10 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20"
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
                            ? "border-neutral-300/60 bg-neutral-300/12 shadow-[0_0_22px_rgba(16,185,129,0.14)]"
                            : "border-white/10 bg-black/25 hover:border-neutral-300/35 hover:bg-neutral-300/10",
                        )}
                        onClick={() => onToggleNotebook(notebook.id)}
                        type="button"
                      >
                        <span className="block line-clamp-2 font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-50">
                          {notebook.title || "Untitled Datapad"}
                        </span>
                        <span className="mt-2 block line-clamp-2 text-[11px] leading-4 text-neutral-500">
                          {notebook.content.trim() || "Empty global notebook"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-neutral-300/20 bg-black/20 px-3 py-4 text-xs leading-5 text-neutral-500">
                  No global datapads yet. Create one to keep notes available across
                  every workspace.
                </div>
              )}
            </section>

	            <section
	              className={cx(
	                "mt-5 border border-neutral-300/35 bg-neutral-300/[0.05] p-3 shadow-[0_0_34px_rgba(16,185,129,0.1)]",
	                activePanel !== "artifacts" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    🗃️ Artifact Vault
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Saved code payloads, URLs, and generated interface artifacts
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-neutral-300/35 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
                  onClick={onRefreshArtifacts}
                  title="Refresh artifact vault"
                  type="button"
                >
                  <RefreshCcw className={cx("h-4 w-4", artifactsLoading && "animate-spin")} />
                </button>
              </div>

              {artifactError ? (
                <div className="border border-neutral-300/30 bg-neutral-300/10 px-3 py-2 text-xs text-neutral-100">
                  {artifactError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {artifactsLoading && !artifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Loading artifacts
                  </div>
                ) : null}

                {!artifactsLoading && !artifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-neutral-500">
                    No artifacts saved yet. Use Save Artifact inside a Sandbox workstation.
                  </div>
                ) : null}

                {artifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="border border-white/10 bg-black/25 p-3 transition hover:border-neutral-300/35 hover:bg-neutral-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="border border-neutral-300/30 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100">
                            {artifact.type}
                          </span>
                          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                            {formatTime(artifact.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">
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
                        className="shrink-0 border border-neutral-300/45 bg-neutral-300/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/22"
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
	                "mt-5 border border-neutral-300/35 bg-neutral-300/[0.05] p-3 shadow-[0_0_34px_rgba(34,211,238,0.1)]",
	                activePanel !== "generations" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    生成紀錄
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Generated files from image and future media modes
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-neutral-300/35 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
                  onClick={onRefreshArtifacts}
                  title="Refresh generation records"
                  type="button"
                >
                  <RefreshCcw className={cx("h-4 w-4", artifactsLoading && "animate-spin")} />
                </button>
              </div>

              {artifactError ? (
                <div className="border border-neutral-300/30 bg-neutral-300/10 px-3 py-2 text-xs text-neutral-100">
                  {artifactError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {artifactsLoading && !generatedArtifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Loading generation records
                  </div>
                ) : null}

                {!artifactsLoading && !generatedArtifacts.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs leading-5 text-neutral-500">
                    No generated files yet. Switch the composer to image mode and
                    generate an asset to populate this ledger.
                  </div>
                ) : null}

                {generatedArtifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="border border-white/10 bg-black/25 p-3 transition hover:border-neutral-300/35 hover:bg-neutral-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="border border-neutral-300/30 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100">
                            {artifact.type}
                          </span>
                          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                            {formatTime(artifact.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-300">
                          {artifact.title ??
                            artifactPreview(
                              artifact.previewText ??
                                artifact.contentUrl ??
                                artifact.contentHash ??
                                artifact.id,
                            )}
                        </p>
                        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-600">
                          {artifact.mimeType ?? "downloadable asset"} / v
                          {artifact.version}
                        </p>
                      </div>
                      <div className="grid shrink-0 gap-1.5">
                        <button
                          className="inline-flex items-center justify-center gap-1.5 border border-neutral-300/45 bg-neutral-300/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/22"
                          onClick={() => onDownloadArtifact(artifact)}
                          type="button"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-1.5 border border-white/15 bg-white/[0.045] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-neutral-300/35 hover:text-neutral-100"
                          onClick={() => onCopyArtifact(artifact)}
                          type="button"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

	            <section
	              className={cx(
	                "mt-5 border border-neutral-300/25 bg-neutral-300/[0.045] p-3",
	                activePanel !== "trace" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    Trace Viewer
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    Latest workspace events
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    className="border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-neutral-300/35 hover:text-neutral-100"
                    onClick={handleExportWorkflowRuntimeEvidence}
                    type="button"
                  >
                    Export Evidence
                  </button>
                  <button
                    className="border border-neutral-300/35 bg-neutral-300/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-40"
                    disabled={traceEventsLoading}
                    onClick={() => void loadTraceEvents("reset")}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {traceEventsError ? (
                <div className="mb-2 border border-neutral-300/25 bg-neutral-300/10 px-3 py-2 text-[11px] text-neutral-100">
                  {traceEventsError}
                </div>
              ) : null}

              <div className="mb-3 border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-100">
                    Durable Trace Match
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
                    {runtimeTraceEventsLoading ? "loading" : runtimeTraceCorrelation.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Events
                    </div>
                    <div className="mt-1 font-mono text-lg text-neutral-100">
                      {runtimeTraceCorrelation.eventCount}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Run
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] uppercase text-neutral-100">
                      {runtimeTraceCorrelation.runId ?? "none"}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Trace
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] uppercase text-neutral-100">
                      {runtimeTraceCorrelation.traceId ?? "none"}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-neutral-500">
                  {runtimeTraceEventsError ?? runtimeTraceCorrelation.recommendation}
                </p>
                {runtimeTraceCorrelation.latestEventType ? (
                  <div className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-400">
                    {runtimeTraceCorrelation.latestEventType}
                  </div>
                ) : null}
              </div>

              <div className="mb-3 border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-100">
                    Local Workflow Evidence
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
                    {workflowRuntimeEvidence.persistence}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Runs
                    </div>
                    <div className="mt-1 font-mono text-lg text-neutral-100">
                      {workflowRuntimeEvidence.runCount}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Latest
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] uppercase text-neutral-100">
                      {workflowRuntimeEvidence.latestRun?.status ?? "none"}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Artifacts
                    </div>
                    <div className="mt-1 font-mono text-lg text-neutral-100">
                      {workflowRuntimeEvidence.latestRun?.artifactCount ?? 0}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                      Trace
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] uppercase text-neutral-100">
                      {workflowRuntimeEvidence.latestRun?.traceSync?.status ?? "local"}
                    </div>
                  </div>
                </div>
                {workflowRuntimeEvidence.latestRun ? (
                  <div className="mt-2 grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-500">
                      <span>{workflowRuntimeEvidence.latestRun.runId}</span>
                      <span>{workflowRuntimeEvidence.latestRun.nodeCount} nodes</span>
                      <span>
                        durable{" "}
                        {workflowRuntimeEvidence.latestRun.traceSync?.status ?? "local-only"}
                      </span>
                      {workflowRuntimeEvidence.latestRun.durationMs !== null ? (
                        <span>{workflowRuntimeEvidence.latestRun.durationMs}ms</span>
                      ) : null}
                    </div>
                    {workflowRuntimeEvidence.latestRun.traceSync?.status === "failed" ? (
                      <div className="border border-neutral-300/25 bg-neutral-300/10 px-2.5 py-2 text-[11px] leading-5 text-neutral-100">
                        {workflowRuntimeEvidence.latestRun.traceSync.error ??
                          "Durable trace sync failed."}
                      </div>
                    ) : null}
                    {workflowRuntimeEvidence.timeline.slice(0, 6).map((item) => (
                      <article
                        className="border border-white/10 bg-white/[0.025] px-2.5 py-2"
                        key={`${item.nodeId}-${item.startedAt ?? item.status}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-300">
                            {item.nodeId}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-500">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-neutral-500">
                          {item.error ?? item.outputPreview ?? item.inputPreview ?? "No preview"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-neutral-500">
                    {workflowRuntimeEvidence.warnings[0] ??
                      "No local workflow evidence is available yet."}
                  </div>
                )}
              </div>

              <div className="mb-3 border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-100">
                    Run Groups
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
                    {workflowRunHistoryGroups.groups.length} groups /{" "}
                    {workflowRunHistoryGroups.runCount} runs
                  </span>
                </div>
	                <div className="grid gap-1.5">
	                  {workflowRunHistoryGroups.groups.length ? (
	                    workflowRunHistoryGroups.groups.slice(0, 6).map((group) => (
	                      <button
	                        className={cx(
	                          "w-full border px-2.5 py-2 text-left transition",
	                          group.groupId === workflowRunGroupInspector.group?.groupId
	                            ? "border-neutral-300/45 bg-neutral-300/10"
	                            : "border-white/10 bg-white/[0.025] hover:border-neutral-300/30 hover:bg-white/[0.045]",
	                        )}
	                        key={group.groupId}
	                        onClick={() => setSelectedRunGroupId(group.groupId)}
	                        type="button"
	                      >
	                        <div className="flex items-center justify-between gap-2">
	                          <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-300">
	                            {group.label}
                          </span>
                          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-500">
                            {group.latestRunStatus ?? "not run"}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-600">
                          <span>{group.nodeCount} nodes</span>
                          <span>{group.runCount} runs</span>
	                          <span>{group.artifactCount} art</span>
	                          <span>{group.statusCounts.failed} fail</span>
	                        </div>
	                      </button>
	                    ))
	                  ) : (
	                    <div className="border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-neutral-500">
	                      No workflow groups are available in the current runtime graph.
                    </div>
	                  )}
	                </div>
	              </div>

	              <div className="mb-3 border border-white/10 bg-black/25 p-3">
	                <div className="mb-2 flex items-center justify-between gap-2">
	                  <div className="min-w-0">
	                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-100">
	                      Group Inspector
	                    </div>
	                    <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
	                      {workflowRunGroupInspector.group?.label ?? "No group selected"}
	                    </div>
	                  </div>
		                  <div className="flex shrink-0 items-center gap-1.5">
		                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
		                      {workflowRunGroupInspector.schema.replace("nexus.workflowPro.", "")}
		                    </span>
		                    <button
		                      className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-300 transition hover:border-neutral-300/35 hover:text-neutral-100 disabled:opacity-40"
		                      disabled={
		                        !workflowRunGroupInspector.latestRun ||
		                        traceResyncingRunId === workflowRunGroupInspector.latestRun.runId
		                      }
		                      onClick={() => void handleRetrySelectedRunTraceSync()}
		                      type="button"
		                    >
		                      {traceResyncingRunId === workflowRunGroupInspector.latestRun?.runId
		                        ? "Syncing"
		                        : "Resync Trace"}
		                    </button>
		                  </div>
		                </div>

	                {workflowRunGroupInspector.group ? (
	                  <>
	                    <div className="grid grid-cols-4 gap-2">
	                      <div className="border border-white/10 bg-white/[0.03] p-2">
	                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
	                          Nodes
	                        </div>
	                        <div className="mt-1 font-mono text-lg text-neutral-100">
	                          {workflowRunGroupInspector.group.nodeCount}
	                        </div>
	                      </div>
	                      <div className="border border-white/10 bg-white/[0.03] p-2">
	                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
	                          Runs
	                        </div>
	                        <div className="mt-1 font-mono text-lg text-neutral-100">
	                          {workflowRunGroupInspector.group.runCount}
	                        </div>
	                      </div>
	                      <div className="border border-white/10 bg-white/[0.03] p-2">
	                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
	                          Artifacts
	                        </div>
	                        <div className="mt-1 font-mono text-lg text-neutral-100">
	                          {workflowRunGroupInspector.artifactIds.length}
	                        </div>
	                      </div>
	                      <div className="border border-white/10 bg-white/[0.03] p-2">
	                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
	                          Trace
	                        </div>
	                        <div className="mt-1 truncate font-mono text-[10px] uppercase text-neutral-100">
	                          {workflowRunGroupInspector.traceCorrelation.status}
	                        </div>
	                      </div>
	                    </div>

	                    <p className="mt-2 text-[11px] leading-5 text-neutral-500">
	                      {workflowRunGroupInspector.recommendation}
	                    </p>

	                    <div className="mt-2 border border-white/10 bg-white/[0.025] px-2.5 py-2">
	                      <div className="mb-2 flex items-center justify-between gap-2">
	                        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-400">
	                          Durable Group Record
	                        </span>
	                        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-600">
	                          {durableGroupRecordReport.status}
	                        </span>
	                      </div>
	                      <div className="grid grid-cols-3 gap-1.5">
	                        <div className="border border-white/10 bg-black/25 p-1.5">
	                          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-neutral-600">
	                            Events
	                          </div>
	                          <div className="mt-1 font-mono text-sm text-neutral-100">
	                            {durableGroupRecordReport.eventCount}
	                          </div>
	                        </div>
	                        <div className="border border-white/10 bg-black/25 p-1.5">
	                          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-neutral-600">
	                            Nodes
	                          </div>
	                          <div className="mt-1 font-mono text-sm text-neutral-100">
	                            {durableGroupRecordReport.nodeCount ?? "-"}
	                          </div>
	                        </div>
	                        <div className="border border-white/10 bg-black/25 p-1.5">
	                          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-neutral-600">
	                            Edges
	                          </div>
	                          <div className="mt-1 font-mono text-sm text-neutral-100">
	                            {durableGroupRecordReport.edgeCount ?? "-"}
	                          </div>
	                        </div>
	                      </div>
	                      <p className="mt-2 text-[11px] leading-5 text-neutral-500">
	                        {durableGroupRecordReport.recommendation}
	                      </p>
	                      {durableGroupRecordReport.latestEventType ? (
	                        <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-500">
	                          {durableGroupRecordReport.latestEventType}
	                        </div>
	                      ) : null}
	                    </div>

	                    {workflowRunGroupInspector.latestRun ? (
	                      <div className="mt-2 border border-white/10 bg-white/[0.025] px-2.5 py-2">
	                        <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-500">
	                          <span>{workflowRunGroupInspector.latestRun.runId}</span>
	                          <span>{workflowRunGroupInspector.latestRun.status}</span>
	                          <span>
	                            durable{" "}
	                            {workflowRunGroupInspector.latestRun.traceSync?.status ?? "local-only"}
	                          </span>
	                          {workflowRunGroupInspector.latestRun.durationMs !== null ? (
	                            <span>{workflowRunGroupInspector.latestRun.durationMs}ms</span>
	                          ) : null}
	                        </div>

	                        <div className="mt-2 grid gap-1.5">
	                          {workflowRunGroupInspector.latestRun.executions.slice(0, 5).map(
	                            (execution) => (
	                              <div
	                                className="border border-white/10 bg-black/25 px-2 py-1.5"
	                                key={`${execution.nodeId}-${execution.startedAt ?? execution.status}`}
	                              >
	                                <div className="flex items-center justify-between gap-2">
	                                  <span className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-400">
	                                    {execution.nodeId}
	                                  </span>
	                                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-600">
	                                    {execution.status}
	                                  </span>
	                                </div>
	                                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-600">
	                                  <span>{execution.artifactIds.length} artifacts</span>
	                                  {execution.latencyMs !== null ? (
	                                    <span>{execution.latencyMs}ms</span>
	                                  ) : null}
	                                  {execution.error ? (
	                                    <span className="text-neutral-300">{execution.error}</span>
	                                  ) : null}
	                                </div>
	                              </div>
	                            ),
	                          )}
	                        </div>
	                      </div>
	                    ) : (
	                      <div className="mt-2 border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-neutral-500">
	                        This workflow group has no run evidence yet.
	                      </div>
	                    )}

	                    {workflowRunGroupInspector.artifactIds.length ? (
	                      <div className="mt-2 flex flex-wrap gap-1.5">
	                        {workflowRunGroupInspector.artifactIds.slice(0, 6).map((artifactId) => (
	                          <span
	                            className="max-w-full truncate border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-500"
	                            key={artifactId}
	                          >
	                            {artifactId}
	                          </span>
	                        ))}
	                      </div>
	                    ) : null}
	                  </>
	                ) : (
	                  <div className="border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-neutral-500">
	                    No workflow group is available in the current runtime graph.
	                  </div>
	                )}
	              </div>

	              <div className="grid gap-2">
                {!traceEvents.length && !traceEventsLoading ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-neutral-500">
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
                      <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                        {formatTime(event.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-neutral-300">
                      {event.source} / {event.eventType}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-neutral-500">
                      {event.message ?? event.resourceType ?? event.traceId}
                    </p>
                  </article>
                ))}
              </div>

              {traceEventsHasMore ? (
                <button
                  className="mt-3 w-full border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:border-neutral-300/35 hover:bg-neutral-300/10 disabled:opacity-40"
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
	                "mt-5 border border-neutral-300/35 bg-neutral-300/[0.055] p-3 shadow-[0_0_34px_rgba(217,70,239,0.12)]",
	                activePanel !== "workflows" && "hidden",
	              )}
	            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
                    📁 Macro Blueprint Vault
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Spawn saved cloud topologies into the active canvas
                  </div>
                </div>
                <button
                  className="grid h-9 w-9 place-items-center border border-neutral-300/35 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
                  onClick={onRefreshMacros}
                  title="Refresh macro vault"
                  type="button"
                >
                  <RefreshCcw className={cx("h-4 w-4", macrosLoading && "animate-spin")} />
                </button>
              </div>

              {macroError ? (
                <div className="border border-neutral-300/30 bg-neutral-300/10 px-3 py-2 text-xs text-neutral-100">
                  {macroError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {macrosLoading && !macros.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Loading blueprints
                  </div>
                ) : null}

                {!macrosLoading && !macros.length ? (
                  <div className="border border-white/10 bg-black/25 px-3 py-3 text-xs text-neutral-500">
                    No macros saved yet. Switch to Graph view and run Pack Workflow.
                  </div>
                ) : null}

                {macros.map((macro) => (
                  <article
                    key={macro.id}
                    className="border border-white/10 bg-black/25 p-3 transition hover:border-neutral-300/35 hover:bg-neutral-300/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white">
                          {macro.name}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                          {macro.description || "No description"}
                        </p>
                      </div>
                      <button
                        className="shrink-0 border border-neutral-300/45 bg-neutral-300/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/22"
                        onClick={() => onSpawnMacro(macro)}
                        type="button"
                      >
                        [ SPAWN ]
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-200/70">
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


function getRightDockPanelMeta(panel: RightDockPanelId) {
  return rightDockPanels.find((candidate) => candidate.id === panel) ?? rightDockPanels[1];
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


function sanitizeDownloadFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "nexus-generated-asset"
  );
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
