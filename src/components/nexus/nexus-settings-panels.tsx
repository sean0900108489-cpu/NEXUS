"use client";

import { cx, getCatalogModelLabel, getProviderLabel } from "@/components/nexus/nexus-utils";

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

const workspaceBodyMaterialStyle = {
  background: "var(--nexus-body-frame-bg, rgb(18 18 18))",
  borderColor: "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.04), var(--nexus-layout-panel-shadow, 0 18px 60px rgb(0 0 0 / 0.2))",
} as const;

export function ModelTuningSelect<TValue extends string>({
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
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      <select
        className="w-full border border-white/10 bg-black/45 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-100 outline-none transition focus:border-neutral-300/60"
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

export function AgentModelTuningPanel({
  agent,
  modelCatalog,
  onUpdateAgentModel,
  onUpdateAgentModelSettings,
}: {
  agent: NexusAgent;
  modelCatalog: PublicModelCatalogEntry[];
  onUpdateAgentModel: (agentId: string, model: string) => void;
  onUpdateAgentModelSettings: (
    agentId: string,
    settings: Partial<AgentModelSettings>,
  ) => void;
}) {
  const modelGroups = getAgentModelGroups(agent, modelCatalog);
  const capability = getModelCapabilityProfile(agent.model);
  const settings = agent.modelSettings ?? {};

  return (
    <div className="mx-3 mb-3 grid gap-3 border border-neutral-300/20 bg-black/25 p-3">
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Model
        </span>
        <select
          className="w-full border border-white/10 bg-black/45 px-2 py-1.5 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/60"
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

      <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
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

export function AgentTemplateProfilePanel({
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
    <div className="mx-3 mb-3 grid gap-2 border border-neutral-300/20 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Custom Agent
        </span>
        <div className="flex items-center gap-1.5">
          <button
            aria-label={`${profile.callsign} launch custom agent`}
            className="grid h-7 w-7 place-items-center border border-neutral-300/35 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20"
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
                ? "border-neutral-300/45 bg-neutral-300/10 text-neutral-100"
                : "border-white/10 bg-white/[0.035] text-neutral-500 hover:border-neutral-300/45 hover:text-neutral-100",
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
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Name
        </span>
        <input
          className="w-full border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[11px] text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { callsign: event.currentTarget.value })
          }
          value={profile.callsign}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Role
        </span>
        <input
          className="w-full border border-white/10 bg-black/35 px-2 py-1.5 text-xs text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { identity: event.currentTarget.value })
          }
          value={profile.identity}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Task
        </span>
        <textarea
          className="min-h-16 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
          disabled={locked}
          onChange={(event) =>
            onUpdate(template.id, { mission: event.currentTarget.value })
          }
          value={profile.mission}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Execution
        </span>
        <textarea
          className="min-h-20 w-full resize-none border border-white/10 bg-black/35 p-2 text-xs leading-5 text-neutral-100 outline-none transition focus:border-neutral-300/60 disabled:opacity-45"
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

export function LeftDock({
  agents,
  agentTemplateProfiles,
  modelCatalog,
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
  modelCatalog: PublicModelCatalogEntry[];
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
    <div
      className="nexus-panel flex min-h-0 flex-col overflow-hidden"
      style={workspaceBodyMaterialStyle}
    >
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-300">
            Agent Bay
          </h2>
          <BrainCircuit className="h-4 w-4 text-neutral-200" />
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
                className="border border-white/10 transition hover:border-neutral-300/30 [background:var(--nexus-layout-panel-muted-bg,rgba(255,255,255,0.035))]"
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
                            <Lock className="h-3 w-3 shrink-0 text-neutral-200" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-neutral-400">
                          {profile.title}
                        </span>
                      </span>
                    </div>
                  </button>
                  <button
                    aria-expanded={open}
                    aria-label={`${profile.callsign} custom agent settings`}
                    className={cx(
                      "grid h-7 w-7 shrink-0 place-items-center border text-neutral-500 transition hover:border-neutral-300/45 hover:text-neutral-100 hover:[background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.1))]",
                      open &&
                        "border-neutral-300/55 text-neutral-100 [background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.15))]",
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

      <div className="system-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-300">
            Operators
          </h2>
          <span className="font-mono text-[10px] text-neutral-500">{agents.length}</span>
        </div>
        <div className="grid gap-2">
          {agents.map((agent) => (
            <article
              key={agent.id}
              className={cx(
                "border transition",
                selectedAgentId === agent.id
                  ? "border-neutral-300/45 [background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.1))]"
                  : "border-white/10 hover:border-white/25 [background:var(--nexus-layout-panel-muted-bg,rgba(255,255,255,0.035))]",
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
                          <Zap className="h-3.5 w-3.5 shrink-0 text-neutral-200" />
                        )}
                      </span>
                      <span className="mt-1 block truncate text-xs text-neutral-400">
                        {getCapabilityType(agent)} / {agent.model}
                      </span>
                    </span>
                  </div>
                </button>
                <button
                  aria-expanded={expandedAgentId === agent.id}
                  aria-label={`${agent.callsign} model settings`}
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center border text-neutral-500 transition hover:border-neutral-300/45 hover:text-neutral-100 hover:[background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.1))]",
                    expandedAgentId === agent.id &&
                      "border-neutral-300/55 text-neutral-100 [background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.15))]",
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
                    modelCatalog={modelCatalog}
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



function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
}
// Local helpers from nexus-ops.tsx
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
