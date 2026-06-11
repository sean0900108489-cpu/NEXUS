"use client";

import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  getSmoothStepPath,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  BrainCircuit,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Pause,
  Play,
  Type,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getDefaultGraphPosition } from "@/lib/nexus-defaults";
import {
  WORKFLOW_BRAIN_DRAFT_TEMPLATES,
  inferWorkflowBrainDraftTemplateId,
  serializeWorkflowBrainDraftTemplate,
  type WorkflowBrainDraftTemplateId,
} from "@/lib/workflow-pro/brain-draft-templates";
import type { WorkflowGraphBrainPlannerResult } from "@/lib/workflow-pro/graph-brain-planner";
import { createWorkflowProRuntimeEvidenceReport } from "@/lib/workflow-pro/runtime-evidence";
import {
  getModelCapabilityProfile,
  getModelOption,
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";
import { getNexusSupabaseClient } from "@/lib/supabase/client";
import {
  WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS,
  type WorkspaceComposerImageAspectRatio,
  type WorkspaceComposerImageQuality,
} from "@/lib/composer/image-generation-settings";
import type {
  ContextPacket,
  ArtifactVaultRecord,
  NexusAgent,
  NexusReasoningDetail,
  NexusReasoningEffort,
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeNodeData,
  WorkflowRuntimeNodeType,
  WorkflowRuntimeRunStatus,
  WorkspaceGraph,
  WorkspaceGraphEdge,
} from "@/lib/nexus-types";
import type { PublicModelCatalogEntry } from "@/lib/models/model-catalog-types";
import {
  getWorkflowRuntimeNodeDefinition,
  isWorkflowRuntimeNodeType,
} from "@/lib/workflow-runtime-lite/registry";

type AgentNodeData = {
  agent: NexusAgent;
  onOpenAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
};
type RuntimeNodeData = {
  modelCatalog: PublicModelCatalogEntry[];
  node: WorkflowNodeInstance;
  onCopyInput: (nodeId: string) => void;
  onCopyOutput: (nodeId: string) => void;
  onPauseWorkflow: () => void;
  onRemoveNode: (nodeId: string) => void;
  onRunFromInput: (nodeId: string) => void;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
  workflowRunning: boolean;
};
type AgentEdgeData = {
  label?: string;
  onRemoveEdge: (edgeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  readOnly?: boolean;
  selected: boolean;
  sourceAgentId: string;
  targetAgentId: string;
};

type AgentFlowNode = Node<AgentNodeData, "agent">;
type RuntimeFlowNode = Node<RuntimeNodeData, WorkflowRuntimeNodeType>;
type AgentFlowEdge = Edge<AgentEdgeData, "blueprint">;
type GraphNodeState = {
  signature: string;
  nodes: Array<AgentFlowNode | RuntimeFlowNode>;
};
type WorkflowGraphFeedback = {
  detail?: string | null;
  status: WorkflowRuntimeRunStatus;
  title: string;
};
type WorkflowBrainAppendResult = {
  detail: string;
  edgeCount?: number;
  nodeCount?: number;
  status: "accepted" | "rejected";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function getModelLabel(modelId: string) {
  return getModelOption(modelId)?.label ?? modelId;
}

function getWorkflowPacketImageUrl(packet: ContextPacket | null | undefined) {
  if (!packet) {
    return "";
  }

  const rawUrl = /^Image URL:\s*(\S+)/m.exec(packet.rawText)?.[1];

  if (rawUrl) {
    return rawUrl;
  }

  const metadataUrl = packet.metadata.imageUrl;

  return typeof metadataUrl === "string" ? metadataUrl : "";
}

function getRuntimeNodeIcon(type: WorkflowRuntimeNodeType) {
  if (type === "input.text") {
    return <Type className="h-4 w-4" />;
  }

  if (type === "node.file") {
    return <Paperclip className="h-4 w-4" />;
  }

  if (type === "model.llm") {
    return <BrainCircuit className="h-4 w-4" />;
  }

  if (type === "model.image") {
    return <ImageIcon className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
}

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const { agent, onOpenAgent, onRemoveAgent, readOnly, readOnlyMessage } = data;
  const active = agent.status === "thinking" || agent.status === "streaming";
  const errored = agent.status === "error";
  const capabilityType = agent.capabilities?.type ?? "chat";
  const capabilityLabel =
    capabilityType === "sandbox" ? "UI SANDBOX" : capabilityType;
  const latestMessage = agent.messages.at(-1);
  const latestMedia = [...agent.messages].reverse().find((message) => message.media)?.media;
  const sandboxPreview = capabilityType === "sandbox" ? agent.sandboxCode : undefined;
  const preview = truncateText(
    sandboxPreview || latestMedia?.prompt || latestMessage?.content || agent.mission,
    132,
  );
  const previewLabel =
    capabilityType === "sandbox"
      ? "sandbox code"
      : latestMedia
        ? `${latestMedia.type} artifact`
        : latestMessage
          ? latestMessage.role
          : "mission";
  return (
    <section
      data-active={active}
      className={cx(
        "nexus-agent-node w-64 border-2 p-3 text-neutral-100 backdrop-blur-sm [background:var(--nexus-layout-panel-muted-bg,var(--nexus-panel-bg,rgba(0,0,0,0.35)))]",
        active && "nexus-agent-node-active",
        selected && "shadow-[0_0_28px_var(--agent-accent)]",
      )}
      style={{
        "--agent-accent": agent.accent,
        borderColor: agent.accent,
        boxShadow: active
          ? `0 0 22px ${agent.accent}44`
          : `0 0 15px ${agent.accent}24`,
      } as CSSProperties}
    >
      <Handle
        className="!h-3 !w-3 !border !border-neutral-950"
        id="input"
        position={Position.Left}
        style={{ backgroundColor: agent.accent }}
        type="target"
      />
      <Handle
        className="!h-3 !w-3 !border !border-neutral-950"
        id="output"
        position={Position.Right}
        style={{ backgroundColor: agent.accent }}
        type="source"
      />

      <div className="min-h-28">
        <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-500">
          <span>{capabilityLabel}</span>
          <span
            className={cx(
              active && "text-neutral-100",
              errored && "text-neutral-100",
              !active && !errored && "text-neutral-100",
            )}
          >
            {agent.status}
          </span>
        </div>
        <p className="line-clamp-4 text-xs leading-5 text-neutral-300">
          {preview}
        </p>
        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-600">
          {previewLabel}
        </div>
      </div>

      <div className="nodrag absolute right-2 top-2 flex items-center gap-1">
        <button
          aria-label={`Open ${agent.callsign}`}
          className="grid h-6 w-6 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:text-neutral-100 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.55))] hover:[background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.1))]"
          onClick={(event) => {
            event.stopPropagation();
            onOpenAgent(agent.id);
          }}
          title={`${agent.callsign} // ${agent.title}`}
          type="button"
        >
          <span className="sr-only">Open agent</span>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: agent.accent }}
          />
        </button>
        <button
          aria-label={`Delete ${agent.callsign}`}
          className="grid h-6 w-6 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:bg-neutral-400/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-45 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.55))]"
          disabled={readOnly}
          onClick={(event) => {
            event.stopPropagation();
            if (readOnly) {
              return;
            }
            onRemoveAgent(agent.id);
          }}
          title={readOnly ? readOnlyMessage : `Delete ${agent.callsign}`}
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}

function RuntimeNode({ data, selected }: NodeProps<RuntimeFlowNode>) {
  const {
    node,
    onCopyInput,
    onCopyOutput,
    onPauseWorkflow,
    onRemoveNode,
    onRunFromInput,
    onUpdateNodeData,
    modelCatalog,
    readOnly,
    readOnlyMessage,
    workflowRunning,
  } = data;
  const definition = getWorkflowRuntimeNodeDefinition(node.type);
  const packet = node.outputSnapshot ?? null;
  const outputText = packet?.displayText || packet?.rawText || "";
  const imageUrl = getWorkflowPacketImageUrl(packet);
  const statusClass = getRuntimeStatusClass(node.status);

  return (
    <section
      className={cx(
        "nexus-runtime-node w-72 border p-3 text-neutral-100 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-md [background:var(--nexus-layout-panel-bg,var(--nexus-panel-bg,rgba(2,6,23,0.88)))]",
        selected && "border-neutral-200/70 shadow-[0_0_28px_rgba(34,211,238,0.22)]",
        !selected && "border-white/12",
      )}
    >
      <RuntimeHandles node={node} />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center border border-neutral-300/30 text-neutral-100 [background:var(--nexus-layout-panel-muted-bg,rgba(34,211,238,0.1))]">
            {getRuntimeNodeIcon(node.type)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100">
              {definition.label}
            </div>
            <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
              {node.id}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cx(
              "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
              statusClass,
            )}
          >
            {node.status}
          </span>
          <button
            aria-label={`Delete ${definition.label}`}
            className="nodrag nopan grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:bg-neutral-400/10 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={readOnly}
            onClick={(event) => {
              event.stopPropagation();
              if (readOnly) {
                return;
              }
              onRemoveNode(node.id);
            }}
            title={readOnly ? readOnlyMessage : `Delete ${definition.label}`}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {node.type === "input.text" ? (
        <InputTextRuntimeEditor
          node={node as WorkflowNodeInstance<"input.text">}
          onCopyInput={onCopyInput}
          onPauseWorkflow={onPauseWorkflow}
          onRunFromInput={onRunFromInput}
          onUpdateNodeData={onUpdateNodeData}
          readOnly={readOnly}
          readOnlyMessage={readOnlyMessage}
          workflowRunning={workflowRunning}
        />
      ) : null}

      {node.type === "model.llm" ? (
        <ModelRuntimeEditor
          modelCatalog={modelCatalog}
          node={node as WorkflowNodeInstance<"model.llm">}
          onUpdateNodeData={onUpdateNodeData}
          readOnly={readOnly}
          readOnlyMessage={readOnlyMessage}
        />
      ) : null}

      {node.type === "node.file" ? (
        <FileRuntimeEditor
          node={node as WorkflowNodeInstance<"node.file">}
          onUpdateNodeData={onUpdateNodeData}
          readOnly={readOnly}
          readOnlyMessage={readOnlyMessage}
        />
      ) : null}

      {node.type === "model.image" ? (
        <ModelImageRuntimeEditor
          imageUrl={imageUrl}
          node={node as WorkflowNodeInstance<"model.image">}
          onUpdateNodeData={onUpdateNodeData}
          readOnly={readOnly}
          readOnlyMessage={readOnlyMessage}
        />
      ) : null}

      {node.type === "output.text" ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
              Output
            </span>
            <button
              aria-label="Copy output"
              className="nodrag grid h-7 w-7 place-items-center border border-neutral-300/30 bg-neutral-300/10 text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-40"
              disabled={!outputText}
              onClick={() => onCopyOutput(node.id)}
              title="Copy output"
              type="button"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-28 max-h-44 overflow-y-auto whitespace-pre-wrap border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-200 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]">
            {outputText || (
              <span className="text-neutral-600">Waiting for upstream context...</span>
            )}
          </div>
          {imageUrl ? (
            <div className="overflow-hidden border border-white/10 bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- workflow-generated data URLs and provider URLs render directly on the graph. */}
              <img
                alt="Workflow generated image"
                className="block aspect-video w-full object-contain"
                draggable={false}
                src={imageUrl}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {node.error ? (
        <div className="mt-3 border border-neutral-300/25 bg-neutral-300/10 px-3 py-2 text-xs leading-5 text-neutral-100">
          {node.error}
        </div>
      ) : null}
    </section>
  );
}

function RuntimeHandles({ node }: { node: WorkflowNodeInstance }) {
  const definition = getWorkflowRuntimeNodeDefinition(node.type);

  return (
    <>
      {definition.handles.map((handle) => (
        <Handle
          key={`${node.id}-${handle.id}-${handle.kind}`}
          className="!h-3 !w-3 !border !border-neutral-950"
          id={handle.id}
          position={handle.kind === "target" ? Position.Left : Position.Right}
          style={{ backgroundColor: handle.kind === "target" ? "#d4d4d4" : "#d4d4d4" }}
          type={handle.kind}
        />
      ))}
    </>
  );
}

function InputTextRuntimeEditor({
  node,
  onCopyInput,
  onPauseWorkflow,
  onRunFromInput,
  onUpdateNodeData,
  readOnly,
  readOnlyMessage,
  workflowRunning,
}: {
  node: WorkflowNodeInstance<"input.text">;
  onCopyInput: (nodeId: string) => void;
  onPauseWorkflow: () => void;
  onRunFromInput: (nodeId: string) => void;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
  workflowRunning: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Seed Text
        </span>
        <textarea
          className="nodrag min-h-36 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          disabled={readOnly}
          onChange={(event) =>
            onUpdateNodeData(node.id, { text: event.currentTarget.value })
          }
          placeholder="Write the workflow input..."
          spellCheck={false}
          title={readOnly ? readOnlyMessage : "Workflow input text"}
          value={node.data.text}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          className="nodrag inline-flex h-8 items-center justify-center gap-1.5 border border-neutral-300/35 bg-neutral-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-40"
          disabled={readOnly || workflowRunning}
          onClick={() => onRunFromInput(node.id)}
          title={readOnly ? readOnlyMessage : "Start this workflow input"}
          type="button"
        >
          <Play className="h-3 w-3" />
          Start
        </button>
        <button
          className="nodrag inline-flex h-8 items-center justify-center gap-1.5 border border-white/12 bg-white/[0.045] px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-neutral-300/35 hover:text-neutral-100 disabled:opacity-40"
          disabled={readOnly || !workflowRunning}
          onClick={onPauseWorkflow}
          title={readOnly ? readOnlyMessage : "Pause workflow"}
          type="button"
        >
          <Pause className="h-3 w-3" />
          Pause
        </button>
        <button
          className="nodrag inline-flex h-8 items-center justify-center gap-1.5 border border-white/12 bg-white/[0.045] px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-neutral-300/35 hover:text-neutral-100 disabled:opacity-40"
          disabled={!node.data.text.trim()}
          onClick={() => onCopyInput(node.id)}
          type="button"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
    </div>
  );
}

function ModelRuntimeEditor({
  modelCatalog,
  node,
  onUpdateNodeData,
  readOnly,
  readOnlyMessage,
}: {
  modelCatalog: PublicModelCatalogEntry[];
  node: WorkflowNodeInstance<"model.llm">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
}) {
  const outputText = node.outputSnapshot?.displayText || node.outputSnapshot?.rawText || "";
  const showLiveOutput =
    Boolean(outputText) ||
    node.status === "running" ||
    node.status === "success" ||
    node.status === "failed_interrupted";
  const capability = getModelCapabilityProfile(node.data.model);
  const settings = normalizeAgentModelSettings(
    node.data.model,
    node.data.modelSettings,
  );
  const reasoningEffortOptions =
    capability?.thinking.supportedReasoningEfforts ?? [];
  const reasoningDetailOptions =
    capability?.reasoningDetail.supportedDetails ?? [];
  const selectableModels = modelCatalog.length
    ? modelCatalog
    : [
        {
          id: node.data.model,
          label: getModelLabel(node.data.model),
        } as PublicModelCatalogEntry,
      ];

  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Prompt
        </span>
        <textarea
          className="nodrag min-h-24 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          disabled={readOnly}
          onChange={(event) =>
            onUpdateNodeData(node.id, { prompt: event.currentTarget.value })
          }
          placeholder="Tell this LLM node what to do..."
          spellCheck={false}
          title={readOnly ? readOnlyMessage : "LLM node prompt"}
          value={node.data.prompt}
        />
      </label>
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Model
        </span>
        <select
          className="nodrag border border-white/10 px-2.5 py-2 font-mono text-[11px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          disabled={readOnly}
          onChange={(event) => {
            const model = event.currentTarget.value;

            onUpdateNodeData(node.id, {
              model,
              modelSettings: normalizeAgentModelSettings(
                model,
                node.data.modelSettings,
              ),
            });
          }}
          title={readOnly ? readOnlyMessage : "LLM node model"}
          value={node.data.model}
        >
          {selectableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      {reasoningEffortOptions.length || reasoningDetailOptions.length ? (
        <div className="grid grid-cols-2 gap-2">
          {reasoningEffortOptions.length ? (
            <label className="grid gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                Reasoning
              </span>
              <select
                className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
                disabled={readOnly}
                onChange={(event) =>
                  onUpdateNodeData(node.id, {
                    modelSettings: normalizeAgentModelSettings(node.data.model, {
                      ...settings,
                      reasoningEffort: event.currentTarget
                        .value as NexusReasoningEffort,
                    }),
                  })
                }
                title={readOnly ? readOnlyMessage : "LLM reasoning effort"}
                value={settings.reasoningEffort}
              >
                {reasoningEffortOptions.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {reasoningDetailOptions.length ? (
            <label className="grid gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                Detail
              </span>
              <select
                className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
                disabled={readOnly}
                onChange={(event) =>
                  onUpdateNodeData(node.id, {
                    modelSettings: normalizeAgentModelSettings(node.data.model, {
                      ...settings,
                      reasoningDetail: event.currentTarget
                        .value as NexusReasoningDetail,
                    }),
                  })
                }
                title={readOnly ? readOnlyMessage : "LLM reasoning detail"}
                value={settings.reasoningDetail}
              >
                {reasoningDetailOptions.map((detail) => (
                  <option key={detail} value={detail}>
                    {detail}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {showLiveOutput ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
              Live output
            </span>
            {node.outputSnapshot?.tokenEstimate ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100/80">
                {node.outputSnapshot.tokenEstimate} tok
              </span>
            ) : null}
          </div>
          <div
            className={cx(
              "nodrag min-h-20 max-h-40 overflow-y-auto whitespace-pre-wrap border px-3 py-2 text-xs leading-5 text-neutral-200",
              node.status === "running"
                ? "border-neutral-300/30 [background:var(--nexus-layout-panel-bg,rgba(34,211,238,0.05))]"
                : "border-white/10 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]",
            )}
          >
            {outputText || (
              <span className="text-neutral-600">Waiting for first token...</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FileRuntimeEditor({
  node,
  onUpdateNodeData,
  readOnly,
  readOnlyMessage,
}: {
  node: WorkflowNodeInstance<"node.file">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          File note
        </span>
        <textarea
          className="nodrag min-h-20 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          disabled={readOnly}
          onChange={(event) =>
            onUpdateNodeData(node.id, { note: event.currentTarget.value })
          }
          placeholder="Optional instructions for the file compiler lane..."
          spellCheck={false}
          title={readOnly ? readOnlyMessage : "File compiler note"}
          value={node.data.note}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-white/10 bg-white/[0.035] p-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Compiler
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-neutral-200">
            {node.data.compilerId}@{node.data.compilerVersion}
          </div>
        </div>
        <div className="border border-white/10 bg-white/[0.035] p-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Attachments
          </div>
          <div className="mt-1 font-mono text-[10px] text-neutral-200">
            {node.data.attachments.length}
          </div>
        </div>
      </div>
      <div className="border border-white/10 bg-white/[0.025] px-3 py-2 text-xs leading-5 text-neutral-500">
        Text ContextPackets pass through this node. File references are carried in
        packet metadata until advanced compilers are connected.
      </div>
    </div>
  );
}

function ModelImageRuntimeEditor({
  imageUrl,
  node,
  onUpdateNodeData,
  readOnly,
  readOnlyMessage,
}: {
  imageUrl: string;
  node: WorkflowNodeInstance<"model.image">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
}) {
  const outputText = node.outputSnapshot?.displayText || node.outputSnapshot?.rawText || "";
  const showLiveOutput =
    Boolean(outputText) ||
    node.status === "running" ||
    node.status === "success" ||
    node.status === "failed_interrupted";

  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Prompt add-on
        </span>
        <textarea
          className="nodrag min-h-20 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          disabled={readOnly}
          onChange={(event) =>
            onUpdateNodeData(node.id, { prompt: event.currentTarget.value })
          }
          placeholder="Optional style or production notes..."
          spellCheck={false}
          title={readOnly ? readOnlyMessage : "Image node prompt add-on"}
          value={node.data.prompt}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Model
          </span>
          <select
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            disabled={readOnly}
            onChange={(event) =>
              onUpdateNodeData(node.id, { modelId: event.currentTarget.value })
            }
            title={readOnly ? readOnlyMessage : "Image model"}
            value={node.data.modelId}
          >
            {WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Quality
          </span>
          <select
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            disabled={readOnly}
            onChange={(event) =>
              onUpdateNodeData(node.id, {
                quality: event.currentTarget.value as WorkspaceComposerImageQuality,
              })
            }
            title={readOnly ? readOnlyMessage : "Image quality"}
            value={node.data.quality}
          >
            {WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Ratio
          </span>
          <select
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 disabled:cursor-not-allowed disabled:opacity-65 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            disabled={readOnly}
            onChange={(event) =>
              onUpdateNodeData(node.id, {
                aspectRatio: event.currentTarget.value as WorkspaceComposerImageAspectRatio,
              })
            }
            title={readOnly ? readOnlyMessage : "Image aspect ratio"}
            value={node.data.aspectRatio}
          >
            {WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {imageUrl ? (
        <div className="overflow-hidden border border-neutral-300/25 bg-black/35">
          {/* eslint-disable-next-line @next/next/no-img-element -- workflow-generated data URLs and provider URLs render directly on the graph. */}
          <img
            alt="Workflow image model output"
            className="block aspect-video w-full object-contain"
            draggable={false}
            src={imageUrl}
          />
        </div>
      ) : showLiveOutput ? (
        <div className="min-h-20 max-h-32 overflow-y-auto whitespace-pre-wrap border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-200 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]">
          {outputText || <span className="text-neutral-600">Waiting for image...</span>}
        </div>
      ) : null}
    </div>
  );
}

function getRuntimeStatusClass(status: WorkflowNodeInstance["status"]) {
  if (status === "running" || status === "queued") {
    return "border-neutral-300/40 bg-neutral-300/10 text-neutral-100";
  }

  if (status === "success") {
    return "border-neutral-300/35 bg-neutral-300/10 text-neutral-100";
  }

  if (status === "failed" || status === "failed_interrupted") {
    return "border-neutral-300/35 bg-neutral-300/10 text-neutral-100";
  }

  return "border-white/10 bg-white/[0.045] text-neutral-400";
}

function BlueprintEdge({
  data,
  id,
  markerEnd,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<AgentFlowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  const selectEdge = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    data?.onSelectEdge(id);
  };

  return (
    <g>
      <BaseEdge
        className={cx(
          "nexus-flow-edge",
          (selected || data?.selected) && "nexus-flow-edge-selected",
        )}
        id={id}
        interactionWidth={32}
        markerEnd={markerEnd}
        path={edgePath}
        style={style}
      />
      <path
        aria-hidden="true"
        className="nexus-flow-edge-hit"
        d={edgePath}
        fill="none"
        onClick={selectEdge}
        onPointerDown={selectEdge}
        stroke="transparent"
        strokeWidth={36}
      />
      {data?.label ? (
        <g
          aria-hidden="true"
          className="nexus-edge-label"
          pointerEvents="none"
          transform={`translate(${labelX}, ${labelY - 22})`}
        >
          <rect
            fill="rgba(2,6,23,0.82)"
            height="18"
            rx="0"
            stroke="rgba(34,211,238,0.22)"
            width={Math.max(86, data.label.length * 7.4)}
            x={-Math.max(86, data.label.length * 7.4) / 2}
            y="-11"
          />
          <text
            dy="2"
            style={{
              fill: "var(--text-main)",
              fontFamily: "monospace",
              fontSize: 9,
              letterSpacing: "0.14em",
            }}
            textAnchor="middle"
          >
            {data.label}
          </text>
        </g>
      ) : null}
      {data?.readOnly ? null : (
        <g
          aria-label="Delete edge"
          className="nexus-edge-delete nodrag nopan"
          onClick={(event) => {
            event.stopPropagation();
            data?.onRemoveEdge(id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              data?.onRemoveEdge(id);
            }
          }}
          role="button"
          tabIndex={0}
          transform={`translate(${labelX}, ${labelY})`}
        >
          <circle r="11" />
          <text dy="3.5" textAnchor="middle">
            X
          </text>
        </g>
      )}
    </g>
  );
}

const nodeTypes = {
  agent: AgentNode,
  "input.text": RuntimeNode,
  "node.file": RuntimeNode,
  "model.llm": RuntimeNode,
  "model.image": RuntimeNode,
  "output.text": RuntimeNode,
};
const edgeTypes = {
  blueprint: BlueprintEdge,
};

export function NexusGraph({
  agents,
  graph,
  modelCatalog,
  onAddWorkflowNode,
  onAppendWorkflowContractText,
  onConnectAgents,
  onConnectWorkflowNodes,
  onCopyWorkflowInput,
  onCopyWorkflowOutput,
  onDownloadArtifact,
  onFocusAgent,
  onOpenAgent,
  onPauseWorkflow,
  onRemoveAgent,
  onRemoveEdges,
  onRemoveWorkflowEdges,
  onRemoveWorkflowNodes,
  onRunWorkflow,
  onRunWorkflowFromInput,
  onUpdateWorkflowNodeData,
  onUpdateWorkflowNodePosition,
  onUpdateNodePosition,
  readOnly,
  readOnlyMessage,
  workspaceRole,
  workflowFeedback,
  workflowRunning,
  generatedArtifacts,
}: {
  agents: NexusAgent[];
  generatedArtifacts?: ArtifactVaultRecord[];
  graph: WorkspaceGraph;
  modelCatalog: PublicModelCatalogEntry[];
  onAddWorkflowNode: (
    type: WorkflowRuntimeNodeType,
    position?: { x: number; y: number },
  ) => void;
  onAppendWorkflowContractText: (input: {
    sourceName: string;
    text: string;
  }) => WorkflowBrainAppendResult;
  onConnectAgents: (edge: WorkspaceGraphEdge) => void;
  onConnectWorkflowNodes: (edge: WorkflowRuntimeEdge) => void;
  onCopyWorkflowInput: (nodeId: string) => void;
  onCopyWorkflowOutput: (nodeId: string) => void;
  onDownloadArtifact: (artifact: ArtifactVaultRecord) => void;
  onFocusAgent: (agentId: string) => void;
  onOpenAgent: (agentId: string) => void;
  onPauseWorkflow: () => void;
  onRemoveAgent: (agentId: string) => void;
  onRemoveEdges: (edgeIds: string[]) => void;
  onRemoveWorkflowEdges: (edgeIds: string[]) => void;
  onRemoveWorkflowNodes: (nodeIds: string[]) => void;
  onRunWorkflow: () => void;
  onRunWorkflowFromInput: (nodeId: string) => void;
  onUpdateWorkflowNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  onUpdateWorkflowNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void;
  onUpdateNodePosition: (agentId: string, position: { x: number; y: number }) => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
  workspaceRole?: string;
  workflowFeedback?: WorkflowGraphFeedback | null;
  workflowRunning?: boolean;
}) {
  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );
  const graphNodeByAgentId = useMemo(
    () => new Map(graph.nodes.map((node) => [node.agentId, node])),
    [graph.nodes],
  );
  const runtimeLite = graph.runtimeLite;
  const runtimeNodeById = useMemo(
    () => new Map((runtimeLite?.nodes ?? []).map((node) => [node.id, node])),
    [runtimeLite?.nodes],
  );
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [workflowBrainOpen, setWorkflowBrainOpen] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<
    AgentFlowNode | RuntimeFlowNode,
    AgentFlowEdge
  > | null>(null);

  const derivedNodes = useMemo<Array<AgentFlowNode | RuntimeFlowNode>>(
    () => {
      const agentNodes: AgentFlowNode[] = agents.map((agent, index) => {
        const graphNode = graphNodeByAgentId.get(agent.id);
        const position = graphNode ?? getDefaultGraphPosition(index);

        return {
          id: agent.id,
          type: "agent",
          position: {
            x: position.x,
            y: position.y,
          },
          data: {
            agent,
            onOpenAgent,
            onRemoveAgent,
            readOnly,
            readOnlyMessage,
          },
        };
      });
      const runtimeNodes: RuntimeFlowNode[] = (runtimeLite?.nodes ?? []).map(
        (node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            modelCatalog,
            node,
            onCopyInput: onCopyWorkflowInput,
            onCopyOutput: onCopyWorkflowOutput,
            onPauseWorkflow,
            onRemoveNode: (nodeId: string) => onRemoveWorkflowNodes([nodeId]),
            onRunFromInput: onRunWorkflowFromInput,
            onUpdateNodeData: onUpdateWorkflowNodeData,
            readOnly,
            readOnlyMessage,
            workflowRunning: Boolean(workflowRunning),
          },
        }),
      );

      return [...agentNodes, ...runtimeNodes];
    },
    [
      agents,
      graphNodeByAgentId,
      modelCatalog,
      onCopyWorkflowInput,
      onCopyWorkflowOutput,
      onOpenAgent,
      onPauseWorkflow,
      onRemoveAgent,
      onRemoveWorkflowNodes,
      onRunWorkflowFromInput,
      onUpdateWorkflowNodeData,
      readOnly,
      readOnlyMessage,
      runtimeLite?.nodes,
      workflowRunning,
    ],
  );

  const derivedEdges = useMemo<AgentFlowEdge[]>(
    () => {
      const agentEdges = graph.edges
        .filter(
          (edge) => agentById.has(edge.sourceAgentId) && agentById.has(edge.targetAgentId),
        )
        .map((edge) => ({
          id: edge.id,
          source: edge.sourceAgentId,
          target: edge.targetAgentId,
          sourceHandle: "output",
          targetHandle: "input",
          type: "blueprint" as const,
          animated: edge.animated ?? true,
          label: edge.label,
          selected: selectedEdgeIds.includes(edge.id),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.style?.stroke ?? "#d4d4d4",
          },
          style: {
            stroke: edge.style?.stroke ?? "#d4d4d4",
            strokeDasharray: edge.style?.strokeDasharray,
            strokeWidth: edge.style?.strokeWidth ?? 1.8,
            opacity: edge.style?.opacity,
          },
          interactionWidth: 32,
          data: {
            label: edge.label,
            onRemoveEdge: (edgeId: string) => onRemoveEdges([edgeId]),
            onSelectEdge: (edgeId: string) => setSelectedEdgeIds([edgeId]),
            readOnly,
            selected: selectedEdgeIds.includes(edge.id),
            sourceAgentId: edge.sourceAgentId,
            targetAgentId: edge.targetAgentId,
          },
        }));
      const runtimeEdges = (runtimeLite?.edges ?? [])
        .filter((edge) => runtimeNodeById.has(edge.source) && runtimeNodeById.has(edge.target))
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: "blueprint" as const,
          animated: edge.animated ?? true,
          label: edge.label,
          selected: selectedEdgeIds.includes(edge.id),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#d4d4d4",
          },
          style: {
            stroke: "#d4d4d4",
            strokeWidth: 1.8,
          },
          interactionWidth: 32,
          data: {
            label: edge.label,
            onRemoveEdge: (edgeId: string) => onRemoveWorkflowEdges([edgeId]),
            onSelectEdge: (edgeId: string) => setSelectedEdgeIds([edgeId]),
            readOnly,
            selected: selectedEdgeIds.includes(edge.id),
            sourceAgentId: edge.source,
            targetAgentId: edge.target,
          },
        }));

      return [...agentEdges, ...runtimeEdges];
    },
    [
      agentById,
      graph.edges,
      onRemoveEdges,
      onRemoveWorkflowEdges,
      readOnly,
      runtimeLite?.edges,
      runtimeNodeById,
      selectedEdgeIds,
    ],
  );

  const nodeSignature = useMemo(
    () =>
      JSON.stringify({
        agents: agents.map((agent) => ({
          accent: agent.accent,
          avatar: agent.avatar,
          callsign: agent.callsign,
          graphNode: graphNodeByAgentId.get(agent.id),
          id: agent.id,
          status: agent.status,
          title: agent.title,
          updatedAt: agent.updatedAt,
        })),
        runtimeNodes: runtimeLite?.nodes ?? [],
      }),
    [agents, graphNodeByAgentId, runtimeLite?.nodes],
  );
  const [nodeState, setNodeState] = useState<GraphNodeState>({
    signature: nodeSignature,
    nodes: derivedNodes,
  });

  if (nodeState.signature !== nodeSignature) {
    setNodeState({ signature: nodeSignature, nodes: derivedNodes });
  }

  const nodes = nodeState.signature === nodeSignature ? nodeState.nodes : derivedNodes;
  const edges = derivedEdges;
  const runtimeEdgeIds = useMemo(
    () => new Set((runtimeLite?.edges ?? []).map((edge) => edge.id)),
    [runtimeLite?.edges],
  );
  const removeEdgesByIds = useCallback((edgeIds: string[]) => {
    const runtimeIds = edgeIds.filter((edgeId) => runtimeEdgeIds.has(edgeId));
    const agentIds = edgeIds.filter((edgeId) => !runtimeEdgeIds.has(edgeId));

    if (agentIds.length) {
      onRemoveEdges(agentIds);
    }

    if (runtimeIds.length) {
      onRemoveWorkflowEdges(runtimeIds);
    }
  }, [onRemoveEdges, onRemoveWorkflowEdges, runtimeEdgeIds]);

  useEffect(() => {
    function deleteSelectedEdges(event: KeyboardEvent) {
      const key = typeof event.key === "string" ? event.key : "";

      if (
        !selectedEdgeIds.length ||
        (key !== "Backspace" && key !== "Delete")
      ) {
        return;
      }

      if (readOnly) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      removeEdgesByIds(selectedEdgeIds);
      setSelectedEdgeIds([]);
    }

    window.addEventListener("keydown", deleteSelectedEdges);

    return () => {
      window.removeEventListener("keydown", deleteSelectedEdges);
    };
  }, [readOnly, removeEdgesByIds, selectedEdgeIds]);

  const onNodesChange = (changes: NodeChange<AgentFlowNode | RuntimeFlowNode>[]) => {
    if (readOnly && changes.some((change) => change.type === "remove")) {
      return;
    }

    const removedAgentIds = changes
      .filter((change) => change.type === "remove")
      .filter((change) => agentById.has(change.id))
      .map((change) => change.id);
    const removedRuntimeIds = changes
      .filter((change) => change.type === "remove")
      .filter((change) => runtimeNodeById.has(change.id))
      .map((change) => change.id);

    removedAgentIds.forEach(onRemoveAgent);

    if (removedRuntimeIds.length) {
      onRemoveWorkflowNodes(removedRuntimeIds);
    }

    setNodeState((current) => ({
      ...current,
      nodes: applyNodeChanges(changes, current.nodes),
    }));
  };

  const onEdgesChange = (changes: EdgeChange<AgentFlowEdge>[]) => {
    if (readOnly && changes.some((change) => change.type === "remove")) {
      return;
    }

    const removedIds = changes
      .filter((change) => change.type === "remove")
      .map((change) => change.id);

    if (removedIds.length) {
      removeEdgesByIds(removedIds);
      setSelectedEdgeIds((current) =>
        current.filter((edgeId) => !removedIds.includes(edgeId)),
      );
    }
  };

  const onConnect = (connection: Connection) => {
    if (readOnly) {
      return;
    }

    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const sourceIsAgent = agentById.has(connection.source);
    const targetIsAgent = agentById.has(connection.target);
    const sourceIsRuntime = runtimeNodeById.has(connection.source);
    const targetIsRuntime = runtimeNodeById.has(connection.target);

    if (sourceIsAgent && targetIsAgent) {
      onConnectAgents({
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        sourceAgentId: connection.source,
        targetAgentId: connection.target,
      });
      return;
    }

    if (sourceIsRuntime && targetIsRuntime) {
      onConnectWorkflowNodes({
        id: `wf_edge_${connection.source}_${connection.target}_${Date.now()}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? "",
        target: connection.target,
        targetHandle: connection.targetHandle ?? "",
      });
    }
  };

  const toWorkflowPosition = useCallback((point: { x: number; y: number }) => {
    return flowInstance?.screenToFlowPosition(point);
  }, [flowInstance]);

  const addWorkflowNodeAtCenter = useCallback((type: WorkflowRuntimeNodeType) => {
    if (readOnly) {
      return;
    }

    const bounds = graphContainerRef.current?.getBoundingClientRect();
    const position = bounds
      ? toWorkflowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        })
      : undefined;

    onAddWorkflowNode(type, position);
  }, [onAddWorkflowNode, readOnly, toWorkflowPosition]);

  const handleWorkflowNodeDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (readOnly) {
      return;
    }

    const type = event.dataTransfer.getData("application/x-nexus-workflow-node");

    if (!isWorkflowRuntimeNodeType(type)) {
      return;
    }

    event.preventDefault();
    onAddWorkflowNode(
      type,
      toWorkflowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }, [onAddWorkflowNode, readOnly, toWorkflowPosition]);

  const handleWorkflowNodeDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (readOnly) {
        event.dataTransfer.dropEffect = "none";
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [readOnly],
  );

  return (
    <div
      className="h-full min-h-0 w-full bg-transparent [&_.react-flow]:!bg-transparent [&_.react-flow__pane]:!bg-transparent"
      onDragOver={handleWorkflowNodeDragOver}
      onDrop={handleWorkflowNodeDrop}
      ref={graphContainerRef}
    >
      <ReactFlow
        colorMode="dark"
        defaultEdgeOptions={{
          animated: true,
          type: "blueprint",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#d4d4d4",
          },
          style: {
            stroke: "#d4d4d4",
            strokeWidth: 1.8,
          },
        }}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        maxZoom={1.6}
        minZoom={0.25}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={!readOnly}
        nodesDraggable={!readOnly}
        onConnect={onConnect}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          setSelectedEdgeIds([edge.id]);
        }}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_event, node) => {
          if (agentById.has(node.id)) {
            onFocusAgent(node.id);
          }
        }}
        onNodeDragStop={(_event, node) => {
          if (agentById.has(node.id)) {
            onUpdateNodePosition(node.id, node.position);
            return;
          }

          if (runtimeNodeById.has(node.id)) {
            onUpdateWorkflowNodePosition(node.id, node.position);
          }
        }}
        onNodesChange={onNodesChange}
        onPaneClick={() => setSelectedEdgeIds([])}
        onInit={setFlowInstance}
        proOptions={{ hideAttribution: true }}
      >
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-start gap-2">
          {readOnly ? (
            <div
              className="pointer-events-auto inline-flex h-8 items-center gap-2 border border-neutral-300/35 bg-neutral-300/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-100 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md"
              title={readOnlyMessage}
            >
              <span>{workspaceRole ?? "viewer"} read only</span>
            </div>
          ) : null}
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<Type className="h-3.5 w-3.5" />}
            label="Add Input"
            nodeType="input.text"
            onClick={() => addWorkflowNodeAtCenter("input.text")}
          />
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<BrainCircuit className="h-3.5 w-3.5" />}
            label="Add LLM"
            nodeType="model.llm"
            onClick={() => addWorkflowNodeAtCenter("model.llm")}
          />
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<Paperclip className="h-3.5 w-3.5" />}
            label="Add File"
            nodeType="node.file"
            onClick={() => addWorkflowNodeAtCenter("node.file")}
          />
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            label="Add Image"
            nodeType="model.image"
            onClick={() => addWorkflowNodeAtCenter("model.image")}
          />
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Add Output"
            nodeType="output.text"
            onClick={() => addWorkflowNodeAtCenter("output.text")}
          />
          <WorkflowGraphAction
            disabled={readOnly || workflowRunning}
            disabledReason={readOnly ? readOnlyMessage : undefined}
            icon={<Play className="h-3.5 w-3.5" />}
            label={workflowRunning ? "Running" : "Start All"}
            onClick={onRunWorkflow}
          />
          <WorkflowGeneratedAssetMenu
            artifacts={generatedArtifacts ?? []}
            onDownloadArtifact={onDownloadArtifact}
          />
          <WorkflowGraphAction
            disabled={readOnly}
            disabledReason={readOnlyMessage}
            icon={<BrainCircuit className="h-3.5 w-3.5" />}
            label="Brain"
            onClick={() => setWorkflowBrainOpen((current) => !current)}
          />
          <WorkflowGraphStatus feedback={workflowFeedback} />
        </div>
        {workflowBrainOpen ? (
          <WorkflowGraphBrainPanel
            onAppendWorkflowContractText={onAppendWorkflowContractText}
            onClose={() => setWorkflowBrainOpen(false)}
            readOnly={readOnly}
            readOnlyMessage={readOnlyMessage}
            runtimeLite={runtimeLite}
          />
        ) : null}
        <Background
          bgColor="transparent"
          color="var(--nexus-workspace-grid-primary, rgba(34, 211, 238, 0.22))"
          gap={28}
          size={1}
        />
        <MiniMap
          maskColor="var(--nexus-workspace-minimap-mask, rgba(2, 6, 23, 0.76))"
          nodeColor={(node) => agentById.get(node.id)?.accent ?? "#d4d4d4"}
          nodeStrokeWidth={3}
          pannable
          zoomable
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function WorkflowGraphAction({
  disabled,
  disabledReason,
  icon,
  label,
  nodeType,
  onClick,
}: {
  disabled?: boolean;
  disabledReason?: string;
  icon: ReactNode;
  label: string;
  nodeType?: WorkflowRuntimeNodeType;
  onClick: () => void;
}) {
  return (
    <button
      className="pointer-events-auto inline-flex h-8 items-center gap-2 border border-white/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-neutral-300/40 hover:text-neutral-100 disabled:opacity-45 [background:var(--nexus-layout-panel-bg,rgba(2,6,23,0.82))] hover:[background:var(--nexus-layout-panel-muted-bg,rgba(34,211,238,0.1))]"
      disabled={disabled}
      draggable={Boolean(nodeType) && !disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        onClick();
      }}
      onDragStart={(event) => {
        if (!nodeType) {
          return;
        }

        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-nexus-workflow-node", nodeType);
      }}
      title={disabled ? disabledReason : label}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

type WorkflowGraphBrainThreadEntry = {
  content: string;
  id: string;
  role: "operator" | "architect" | "compiler" | "system";
  status: "accepted" | "rejected";
  title: string;
};

function createGraphBrainThreadEntry({
  content,
  role,
  status,
  title,
}: Omit<WorkflowGraphBrainThreadEntry, "id">): WorkflowGraphBrainThreadEntry {
  return {
    content,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    status,
    title,
  };
}

function WorkflowGraphBrainPanel({
  onAppendWorkflowContractText,
  onClose,
  readOnly,
  readOnlyMessage,
  runtimeLite,
}: {
  onAppendWorkflowContractText: (input: {
    sourceName: string;
    text: string;
  }) => WorkflowBrainAppendResult;
  onClose: () => void;
  readOnly?: boolean;
  readOnlyMessage?: string;
  runtimeLite?: WorkspaceGraph["runtimeLite"];
}) {
  const [brainThread, setBrainThread] = useState<
    WorkflowGraphBrainThreadEntry[]
  >([]);
  const [description, setDescription] = useState(
    "我把圖填在 input 傳上之後，連接兩個不同且已經設定好提示詞的 LLM，最後給我答案。",
  );
  const [brainResult, setBrainResult] =
    useState<WorkflowGraphBrainPlannerResult | null>(null);
  const [brainThinking, setBrainThinking] = useState(false);
  const [templateId, setTemplateId] = useState<WorkflowBrainDraftTemplateId>(
    "image-file-two-llm-answer",
  );
  const [brainModel, setBrainModel] = useState("deepseek-v4-pro");
  const [contractText, setContractText] = useState(() =>
    serializeWorkflowBrainDraftTemplate({
      description:
        "我把圖填在 input 傳上之後，連接兩個不同且已經設定好提示詞的 LLM，最後給我答案。",
      templateId: "image-file-two-llm-answer",
    }),
  );
  const [status, setStatus] = useState<WorkflowBrainAppendResult | null>(null);
  const [brainError, setBrainError] = useState("");
  const selectedTemplate =
    WORKFLOW_BRAIN_DRAFT_TEMPLATES.find((template) => template.id === templateId) ??
    WORKFLOW_BRAIN_DRAFT_TEMPLATES[0];
  const runtimeEvidenceReport = useMemo(
    () => createWorkflowProRuntimeEvidenceReport(runtimeLite),
    [runtimeLite],
  );

  const writeDraft = useCallback(
    (nextTemplateId: WorkflowBrainDraftTemplateId) => {
      setTemplateId(nextTemplateId);
      setContractText(
        serializeWorkflowBrainDraftTemplate({
          description,
          templateId: nextTemplateId,
        }),
      );
      setBrainResult(null);
      setBrainError("");
      setStatus({
        detail: `Draft ready: ${nextTemplateId}`,
        status: "accepted",
      });
    },
    [description],
  );

  const inferDraft = useCallback(() => {
    writeDraft(inferWorkflowBrainDraftTemplateId(description));
  }, [description, writeDraft]);

  const requestBrainDraft = useCallback(async () => {
    setBrainThinking(true);
    setBrainError("");
    setStatus(null);

    try {
      const { data: { session } } = await getNexusSupabaseClient().auth.getSession();
      const accessToken = session?.access_token;
      const response = await fetch("/api/workflow-pro/brain-draft", {
        body: JSON.stringify({
          conversation: brainThread.slice(-8).map((entry) => ({
            content: entry.content,
            role: entry.role,
            title: entry.title,
          })),
          modelSettings: {
            modelId: brainModel,
            reasoningDetail: "high",
            reasoningEffort: "xhigh",
            verbosity: "high",
          },
          operatorRequest: description,
          runtimeLite: runtimeLite ?? null,
          templateHint: "auto",
        }),
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as
        | WorkflowGraphBrainPlannerResult
        | { error?: string };

      if (!response.ok) {
        const detail = isWorkflowBrainErrorPayload(payload)
          ? payload.error
          : "Graph Brain request failed.";

        throw new Error(detail ?? "Graph Brain request failed.");
      }

      if (isWorkflowBrainErrorPayload(payload)) {
        throw new Error(payload.error ?? "Graph Brain request failed.");
      }

      setBrainResult(payload);
      setTemplateId(payload.compiler.selectedTemplateId);
      setContractText(payload.compiler.contractJson);
      setBrainThread((current) =>
        [
          ...current,
          ...payload.messages.map((message) =>
            createGraphBrainThreadEntry({
              content: message.content,
              role: message.role,
              status: "accepted",
              title: message.title,
            }),
          ),
          createGraphBrainThreadEntry({
            content: `Ready to append as a new workflow group: ${payload.proposal.optimizedWorkflow?.nodes.length ?? 0} nodes / ${payload.proposal.optimizedWorkflow?.edges.length ?? 0} edges.`,
            role: "system",
            status: payload.compiler.validation.ok ? "accepted" : "rejected",
            title: "Screen Apply Gate",
          }),
        ].slice(-28),
      );
      setStatus({
        detail: `Brain planned ${payload.compiler.selectedTemplateId}`,
        edgeCount: payload.proposal.optimizedWorkflow?.edges.length,
        nodeCount: payload.proposal.optimizedWorkflow?.nodes.length,
        status: payload.compiler.validation.ok ? "accepted" : "rejected",
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Graph Brain request failed.";

      setBrainError(detail);
      setBrainThread((current) =>
        [
          ...current,
          createGraphBrainThreadEntry({
            content: description,
            role: "operator",
            status: "rejected",
            title: "Operator Request",
          }),
          createGraphBrainThreadEntry({
            content: detail,
            role: "system",
            status: "rejected",
            title: "Graph Brain Error",
          }),
        ].slice(-28),
      );
      setStatus({
        detail,
        status: "rejected",
      });
    } finally {
      setBrainThinking(false);
    }
  }, [brainThread, description, runtimeLite]);

  const appendDraft = useCallback(() => {
    if (readOnly) {
      setStatus({
        detail: readOnlyMessage ?? "Workspace is read-only.",
        status: "rejected",
      });
      return;
    }

    const result = onAppendWorkflowContractText({
      sourceName: `graph-brain-${templateId}.json`,
      text: contractText,
    });
    setStatus(result);
  }, [
    contractText,
    onAppendWorkflowContractText,
    readOnly,
    readOnlyMessage,
    templateId,
  ]);

  return (
    <aside className="pointer-events-auto absolute right-4 top-16 z-20 grid max-h-[calc(100vh-96px)] w-[min(520px,calc(100vw-32px))] gap-3 overflow-y-auto border border-white/10 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl [background:var(--nexus-layout-panel-bg,rgba(2,6,23,0.94))]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-100">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Graph Brain</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-500">
            <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              {brainModel}
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              effort xhigh
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              verbosity high
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              detail high
            </span>
            <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              append group
            </span>
            {brainResult ? (
              <span className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
                {brainResult.source}
              </span>
            ) : null}
          </div>
        </div>
        <button
          aria-label="Close Graph Brain"
          className="inline-flex h-7 w-7 items-center justify-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/35 hover:text-neutral-100"
          onClick={onClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Request
        </span>
        <textarea
          className="min-h-24 resize-y border border-white/10 bg-black/35 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/35"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Template
          </span>
          <select
            className="h-9 border border-white/10 bg-black/35 px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-100 outline-none focus:border-neutral-300/35"
            onChange={(event) =>
              writeDraft(event.target.value as WorkflowBrainDraftTemplateId)
            }
            value={templateId}
          >
            {WORKFLOW_BRAIN_DRAFT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Model
        </span>
        <select
          className="h-9 border border-white/10 bg-black/35 px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-100 outline-none focus:border-neutral-300/35"
          onChange={(event) => setBrainModel(event.target.value)}
          value={brainModel}
        >
          <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
          <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
          <option value="gpt-5.5">GPT-5.5</option>
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Model
        </span>
        <select
          className="h-9 border border-white/10 bg-black/35 px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-100 outline-none focus:border-neutral-300/35"
          onChange={(event) => setBrainModel(event.target.value)}
          value={brainModel}
        >
          <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
          <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
          <option value="gpt-5.5">GPT-5.5</option>
        </select>
      </label>
        </label>
        <div className="flex items-end gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 border border-white/10 px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-200 transition hover:border-neutral-300/40 hover:text-neutral-100"
            onClick={inferDraft}
            type="button"
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Local
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 border border-white/10 px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-200 transition hover:border-neutral-300/40 hover:text-neutral-100 disabled:opacity-45"
            disabled={brainThinking}
            onClick={requestBrainDraft}
            type="button"
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            {brainThinking ? "Thinking" : "Think"}
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 border border-neutral-300/35 bg-neutral-300/10 px-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-40"
            disabled={readOnly || brainThinking}
            onClick={appendDraft}
            title={readOnly ? readOnlyMessage : "Append group"}
            type="button"
          >
            <Play className="h-3.5 w-3.5" />
            Append
          </button>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs leading-5 text-neutral-400">
        {selectedTemplate?.description}
      </div>

      <section className="grid gap-2 border border-white/10 bg-black/25 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Runtime Evidence
          </div>
          <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
            local snapshot
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-white/10 bg-white/[0.03] p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              Runs
            </div>
            <div className="mt-1 font-mono text-lg text-neutral-100">
              {runtimeEvidenceReport.runCount}
            </div>
          </div>
          <div className="border border-white/10 bg-white/[0.03] p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              Latest
            </div>
            <div className="mt-1 truncate font-mono text-[11px] uppercase text-neutral-100">
              {runtimeEvidenceReport.latestRun?.status ?? "none"}
            </div>
          </div>
          <div className="border border-white/10 bg-white/[0.03] p-2">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              Artifacts
            </div>
            <div className="mt-1 font-mono text-lg text-neutral-100">
              {runtimeEvidenceReport.latestRun?.artifactCount ?? 0}
            </div>
          </div>
        </div>
        {runtimeEvidenceReport.latestRun ? (
          <div className="border border-white/10 bg-white/[0.025] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              <span>{runtimeEvidenceReport.latestRun.runId}</span>
              {runtimeEvidenceReport.latestRun.durationMs !== null ? (
                <span>{runtimeEvidenceReport.latestRun.durationMs}ms</span>
              ) : null}
              <span>{runtimeEvidenceReport.timeline.length} node records</span>
            </div>
            <div className="mt-2 grid max-h-36 gap-1 overflow-y-auto pr-1">
              {runtimeEvidenceReport.timeline.slice(0, 5).map((item) => (
                <div
                  className="grid gap-1 border border-white/10 bg-black/20 px-2 py-1.5"
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
                  <p className="line-clamp-2 text-[10px] leading-4 text-neutral-500">
                    {item.error ?? item.outputPreview ?? item.inputPreview ?? "No preview"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {runtimeEvidenceReport.warnings.length ? (
          <div className="border border-yellow-200/20 bg-yellow-200/5 px-3 py-2 text-xs leading-5 text-yellow-50/80">
            {runtimeEvidenceReport.warnings[0]}
          </div>
        ) : null}
      </section>

      {brainThread.length || brainThinking ? (
        <section className="grid gap-2 border border-white/10 bg-black/25 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
              Brain Thread
            </div>
            {brainThread.length ? (
              <button
                className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500 transition hover:text-neutral-200"
                onClick={() => setBrainThread([])}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
            {brainThread.map((entry) => (
              <article
                className={cx(
                  "border px-3 py-2",
                  entry.status === "rejected"
                    ? "border-red-300/25 bg-red-500/10"
                    : "border-white/10 bg-white/[0.025]",
                )}
                key={entry.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                    {entry.title}
                  </div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-600">
                    {entry.role}
                  </div>
                </div>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-5 text-neutral-300">
                  {entry.content}
                </p>
              </article>
            ))}
            {brainThinking ? (
              <article className="border border-white/10 bg-white/[0.025] px-3 py-2">
                <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                  Thinking
                </div>
                <p className="mt-1 text-[11px] leading-5 text-neutral-300">
                  Reading the current canvas and preparing an appendable workflow
                  contract.
                </p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {brainResult ? (
        <div className="grid gap-2 border border-white/10 bg-black/25 p-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-white/10 bg-white/[0.03] p-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                Understand
              </div>
              <div className="mt-1 font-mono text-lg text-neutral-100">
                {brainResult.scoreTarget.brainUnderstanding}/10
              </div>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                JSON
              </div>
              <div className="mt-1 font-mono text-lg text-neutral-100">
                {brainResult.scoreTarget.appendableWorkflowJson}/10
              </div>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                Screen
              </div>
              <div className="mt-1 font-mono text-lg text-neutral-100">
                {brainResult.scoreTarget.screenTestReadiness}/10
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {brainResult.messages.map((message, index) => (
              <article
                className="border border-white/10 bg-white/[0.025] px-3 py-2"
                key={`${message.role}-${index}`}
              >
                <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                  {message.title}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-200">
                  {message.content}
                </p>
              </article>
            ))}
          </div>
          {brainResult.architect.missingCapabilities.length ? (
            <div className="border border-yellow-200/20 bg-yellow-200/5 px-3 py-2">
              <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-yellow-100/80">
                Missing capabilities
              </div>
              <p className="mt-1 text-xs leading-5 text-yellow-50/80">
                {brainResult.architect.missingCapabilities.join(", ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {brainError ? (
        <div className="border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
          {brainError}
        </div>
      ) : null}

      <label className="grid gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          JSON
        </span>
        <textarea
          spellCheck={false}
          className="h-56 resize-y border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] leading-4 text-neutral-200 outline-none transition placeholder:text-neutral-700 focus:border-neutral-300/35"
          onChange={(event) => {
            setContractText(event.target.value);
            setStatus(null);
          }}
          value={contractText}
        />
      </label>

      {status ? (
        <div
          className={cx(
            "border px-3 py-2 text-xs leading-5",
            status.status === "accepted"
              ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
              : "border-red-300/35 bg-red-500/10 text-red-100",
          )}
        >
          {status.detail}
          {status.status === "accepted" && status.nodeCount !== undefined ? (
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
              {status.nodeCount} nodes / {status.edgeCount ?? 0} edges
            </span>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function isWorkflowBrainErrorPayload(
  value: WorkflowGraphBrainPlannerResult | { error?: string },
): value is { error?: string } {
  return "error" in value;
}

function WorkflowGeneratedAssetMenu({
  artifacts,
  onDownloadArtifact,
}: {
  artifacts: ArtifactVaultRecord[];
  onDownloadArtifact: (artifact: ArtifactVaultRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const latestArtifacts = artifacts.slice(0, 8);

  return (
    <div className="pointer-events-auto relative">
      <button
        className="inline-flex h-8 items-center gap-2 border border-white/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-neutral-300/40 hover:text-neutral-100 [background:var(--nexus-layout-panel-bg,rgba(2,6,23,0.82))] hover:[background:var(--nexus-layout-panel-muted-bg,rgba(34,211,238,0.1))]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Generated</span>
        <span className="text-neutral-500">{artifacts.length}</span>
        <ChevronDown className={cx("h-3 w-3 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-80 border border-white/10 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl [background:var(--nexus-layout-panel-bg,rgba(2,6,23,0.94))]">
          <div className="mb-2 flex items-center justify-between gap-3 px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            <span>History</span>
            <span>{artifacts.length} assets</span>
          </div>
          {latestArtifacts.length ? (
            <div className="grid max-h-80 gap-1 overflow-y-auto pr-1">
              {latestArtifacts.map((artifact) => (
                <article
                  className="grid gap-2 border border-white/10 bg-black/24 p-2"
                  key={artifact.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="border border-neutral-300/25 bg-neutral-300/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-neutral-200">
                        {artifact.type}
                      </span>
                      <span className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-neutral-600">
                        v{artifact.version}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-300">
                      {artifact.title ??
                        artifact.previewText ??
                        artifact.contentUrl ??
                        artifact.id}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-7 items-center justify-center gap-1.5 border border-neutral-300/35 bg-neutral-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-100 transition hover:bg-neutral-300/20"
                    onClick={() => onDownloadArtifact(artifact)}
                    type="button"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-white/10 px-3 py-4 text-xs leading-5 text-neutral-500">
              No generated assets yet.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowGraphStatus({
  feedback,
}: {
  feedback?: WorkflowGraphFeedback | null;
}) {
  if (!feedback) {
    return null;
  }

  const tone =
    feedback.status === "success"
      ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
      : feedback.status === "running" || feedback.status === "queued"
        ? "border-neutral-300/35 bg-neutral-300/10 text-neutral-100"
        : "border-neutral-300/35 bg-neutral-300/10 text-neutral-100";
  const statusLabel =
    feedback.status === "failed_interrupted"
      ? "interrupted"
      : feedback.status;

  return (
    <div
      aria-live="polite"
      className={cx(
        "pointer-events-auto max-w-[min(520px,calc(100vw-32px))] border px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md",
        tone,
      )}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase">
        <span>{statusLabel}</span>
        <span className="text-neutral-100">{feedback.title}</span>
      </div>
      {feedback.detail ? (
        <p className="mt-1 max-w-full break-words text-xs leading-5 text-neutral-100/90">
          {feedback.detail}
        </p>
      ) : null}
    </div>
  );
}
