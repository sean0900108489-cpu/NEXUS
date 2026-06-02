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
} from "@xyflow/react";
import { BrainCircuit, Copy, FileText, Image as ImageIcon, Play, Type, X } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getDefaultGraphPosition } from "@/lib/nexus-defaults";
import {
  getModelOption,
  getModelOptionsForCapability,
} from "@/lib/nexus-registry";
import {
  WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS,
  type WorkspaceComposerImageAspectRatio,
  type WorkspaceComposerImageQuality,
} from "@/lib/composer/image-generation-settings";
import type {
  ContextPacket,
  NexusAgent,
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeNodeData,
  WorkflowRuntimeNodeType,
  WorkflowRuntimeRunStatus,
  WorkspaceGraph,
  WorkspaceGraphEdge,
} from "@/lib/nexus-types";
import { getWorkflowRuntimeNodeDefinition } from "@/lib/workflow-runtime-lite/registry";

type AgentNodeData = {
  agent: NexusAgent;
  onOpenAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
};
type RuntimeNodeData = {
  node: WorkflowNodeInstance;
  onCopyOutput: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
};
type AgentEdgeData = {
  label?: string;
  onRemoveEdge: (edgeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
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

  if (type === "model.llm") {
    return <BrainCircuit className="h-4 w-4" />;
  }

  if (type === "model.image") {
    return <ImageIcon className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
}

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const { agent, onOpenAgent, onRemoveAgent } = data;
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
          className="grid h-6 w-6 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:bg-neutral-400/10 hover:text-neutral-100 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.55))]"
          onClick={(event) => {
            event.stopPropagation();
            onRemoveAgent(agent.id);
          }}
          title={`Delete ${agent.callsign}`}
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}

function RuntimeNode({ data, selected }: NodeProps<RuntimeFlowNode>) {
  const { node, onCopyOutput, onRemoveNode, onUpdateNodeData } = data;
  const definition = getWorkflowRuntimeNodeDefinition(node.type);
  const packet = node.outputSnapshot ?? null;
  const outputText = packet?.rawText || packet?.displayText || "";
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
            className="nodrag nopan grid h-7 w-7 place-items-center border border-white/10 text-neutral-400 transition hover:border-neutral-300/45 hover:bg-neutral-400/10 hover:text-neutral-100"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveNode(node.id);
            }}
            title={`Delete ${definition.label}`}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {node.type === "input.text" ? (
        <InputTextRuntimeEditor
          node={node as WorkflowNodeInstance<"input.text">}
          onUpdateNodeData={onUpdateNodeData}
        />
      ) : null}

      {node.type === "model.llm" ? (
        <ModelRuntimeEditor
          node={node as WorkflowNodeInstance<"model.llm">}
          onUpdateNodeData={onUpdateNodeData}
        />
      ) : null}

      {node.type === "model.image" ? (
        <ModelImageRuntimeEditor
          imageUrl={imageUrl}
          node={node as WorkflowNodeInstance<"model.image">}
          onUpdateNodeData={onUpdateNodeData}
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
  onUpdateNodeData,
}: {
  node: WorkflowNodeInstance<"input.text">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
        Seed Text
      </span>
      <textarea
        className="nodrag min-h-28 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
        onChange={(event) =>
          onUpdateNodeData(node.id, { text: event.currentTarget.value })
        }
        placeholder="Write the workflow input..."
        spellCheck={false}
        value={node.data.text}
      />
    </label>
  );
}

function ModelRuntimeEditor({
  node,
  onUpdateNodeData,
}: {
  node: WorkflowNodeInstance<"model.llm">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
}) {
  const outputText = node.outputSnapshot?.rawText || node.outputSnapshot?.displayText || "";
  const showLiveOutput =
    Boolean(outputText) ||
    node.status === "running" ||
    node.status === "success" ||
    node.status === "failed_interrupted";

  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Prompt
        </span>
        <textarea
          className="nodrag min-h-24 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          onChange={(event) =>
            onUpdateNodeData(node.id, { prompt: event.currentTarget.value })
          }
          placeholder="Tell this LLM node what to do..."
          spellCheck={false}
          value={node.data.prompt}
        />
      </label>
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
          Model
        </span>
        <select
          className="nodrag border border-white/10 px-2.5 py-2 font-mono text-[11px] text-neutral-100 outline-none transition focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          onChange={(event) =>
            onUpdateNodeData(node.id, { model: event.currentTarget.value })
          }
          value={node.data.model}
        >
          {getModelOptionsForCapability("chat").map((model) => (
            <option key={model.id} value={model.id}>
              {getModelLabel(model.id)}
            </option>
          ))}
        </select>
      </label>
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

function ModelImageRuntimeEditor({
  imageUrl,
  node,
  onUpdateNodeData,
}: {
  imageUrl: string;
  node: WorkflowNodeInstance<"model.image">;
  onUpdateNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
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
          className="nodrag min-h-20 resize-none border border-white/10 px-3 py-2 text-xs leading-5 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
          onChange={(event) =>
            onUpdateNodeData(node.id, { prompt: event.currentTarget.value })
          }
          placeholder="Optional style or production notes..."
          spellCheck={false}
          value={node.data.prompt}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            Model
          </span>
          <select
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            onChange={(event) =>
              onUpdateNodeData(node.id, { modelId: event.currentTarget.value })
            }
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
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            onChange={(event) =>
              onUpdateNodeData(node.id, {
                quality: event.currentTarget.value as WorkspaceComposerImageQuality,
              })
            }
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
            className="nodrag min-w-0 border border-white/10 px-2 py-2 font-mono text-[10px] text-neutral-100 outline-none transition focus:border-neutral-300/55 [background:var(--nexus-layout-panel-muted-bg,rgba(0,0,0,0.35))]"
            onChange={(event) =>
              onUpdateNodeData(node.id, {
                aspectRatio: event.currentTarget.value as WorkspaceComposerImageAspectRatio,
              })
            }
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
    </g>
  );
}

const nodeTypes = {
  agent: AgentNode,
  "input.text": RuntimeNode,
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
  onAddWorkflowNode,
  onConnectAgents,
  onConnectWorkflowNodes,
  onCopyWorkflowOutput,
  onFocusAgent,
  onOpenAgent,
  onRemoveAgent,
  onRemoveEdges,
  onRemoveWorkflowEdges,
  onRemoveWorkflowNodes,
  onRunWorkflow,
  onUpdateWorkflowNodeData,
  onUpdateWorkflowNodePosition,
  onUpdateNodePosition,
  workflowFeedback,
  workflowRunning,
}: {
  agents: NexusAgent[];
  graph: WorkspaceGraph;
  onAddWorkflowNode: (type: WorkflowRuntimeNodeType) => void;
  onConnectAgents: (edge: WorkspaceGraphEdge) => void;
  onConnectWorkflowNodes: (edge: WorkflowRuntimeEdge) => void;
  onCopyWorkflowOutput: (nodeId: string) => void;
  onFocusAgent: (agentId: string) => void;
  onOpenAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onRemoveEdges: (edgeIds: string[]) => void;
  onRemoveWorkflowEdges: (edgeIds: string[]) => void;
  onRemoveWorkflowNodes: (nodeIds: string[]) => void;
  onRunWorkflow: () => void;
  onUpdateWorkflowNodeData: (
    nodeId: string,
    data: Partial<WorkflowRuntimeNodeData>,
  ) => void;
  onUpdateWorkflowNodePosition: (
    nodeId: string,
    position: { x: number; y: number },
  ) => void;
  onUpdateNodePosition: (agentId: string, position: { x: number; y: number }) => void;
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
          },
        };
      });
      const runtimeNodes: RuntimeFlowNode[] = (runtimeLite?.nodes ?? []).map(
        (node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            node,
            onCopyOutput: onCopyWorkflowOutput,
            onRemoveNode: (nodeId: string) => onRemoveWorkflowNodes([nodeId]),
            onUpdateNodeData: onUpdateWorkflowNodeData,
          },
        }),
      );

      return [...agentNodes, ...runtimeNodes];
    },
    [
      agents,
      graphNodeByAgentId,
      onCopyWorkflowOutput,
      onOpenAgent,
      onRemoveAgent,
      onRemoveWorkflowNodes,
      onUpdateWorkflowNodeData,
      runtimeLite?.nodes,
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

      event.preventDefault();
      removeEdgesByIds(selectedEdgeIds);
      setSelectedEdgeIds([]);
    }

    window.addEventListener("keydown", deleteSelectedEdges);

    return () => {
      window.removeEventListener("keydown", deleteSelectedEdges);
    };
  }, [removeEdgesByIds, selectedEdgeIds]);

  const onNodesChange = (changes: NodeChange<AgentFlowNode | RuntimeFlowNode>[]) => {
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

  return (
    <div className="h-full min-h-0 w-full bg-transparent [&_.react-flow]:!bg-transparent [&_.react-flow__pane]:!bg-transparent">
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
        deleteKeyCode={["Backspace", "Delete"]}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        maxZoom={1.6}
        minZoom={0.25}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesDraggable
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
        proOptions={{ hideAttribution: true }}
      >
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-start gap-2">
          <WorkflowGraphAction
            icon={<Type className="h-3.5 w-3.5" />}
            label="Add Input"
            onClick={() => onAddWorkflowNode("input.text")}
          />
          <WorkflowGraphAction
            icon={<BrainCircuit className="h-3.5 w-3.5" />}
            label="Add LLM"
            onClick={() => onAddWorkflowNode("model.llm")}
          />
          <WorkflowGraphAction
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            label="Add Image"
            onClick={() => onAddWorkflowNode("model.image")}
          />
          <WorkflowGraphAction
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Add Output"
            onClick={() => onAddWorkflowNode("output.text")}
          />
          <WorkflowGraphAction
            disabled={workflowRunning}
            icon={<Play className="h-3.5 w-3.5" />}
            label={workflowRunning ? "Running" : "Start Flow"}
            onClick={onRunWorkflow}
          />
          <WorkflowGraphStatus feedback={workflowFeedback} />
        </div>
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
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="pointer-events-auto inline-flex h-8 items-center gap-2 border border-white/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-neutral-300/40 hover:text-neutral-100 disabled:opacity-45 [background:var(--nexus-layout-panel-bg,rgba(2,6,23,0.82))] hover:[background:var(--nexus-layout-panel-muted-bg,rgba(34,211,238,0.1))]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
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
