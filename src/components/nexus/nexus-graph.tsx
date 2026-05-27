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
import { BrainCircuit, Copy, FileText, Play, Type } from "lucide-react";
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
import type {
  NexusAgent,
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeNodeData,
  WorkflowRuntimeNodeType,
  WorkspaceGraph,
  WorkspaceGraphEdge,
} from "@/lib/nexus-types";
import { getWorkflowRuntimeNodeDefinition } from "@/lib/workflow-runtime-lite/registry";

type AgentNodeData = {
  agent: NexusAgent;
  onOpenAgent: (agentId: string) => void;
};
type RuntimeNodeData = {
  node: WorkflowNodeInstance;
  onCopyOutput: (nodeId: string) => void;
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

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const { agent, onOpenAgent } = data;
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
        "nexus-agent-node w-64 border-2 bg-black/35 p-3 text-slate-100 backdrop-blur-sm",
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
        className="!h-3 !w-3 !border !border-slate-950"
        id="input"
        position={Position.Left}
        style={{ backgroundColor: agent.accent }}
        type="target"
      />
      <Handle
        className="!h-3 !w-3 !border !border-slate-950"
        id="output"
        position={Position.Right}
        style={{ backgroundColor: agent.accent }}
        type="source"
      />

      <div className="min-h-28">
        <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
          <span>{capabilityLabel}</span>
          <span
            className={cx(
              active && "text-cyan-100",
              errored && "text-rose-100",
              !active && !errored && "text-emerald-100",
            )}
          >
            {agent.status}
          </span>
        </div>
        <p className="line-clamp-4 text-xs leading-5 text-slate-300">
          {preview}
        </p>
        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
          {previewLabel}
        </div>
      </div>

      <button
        aria-label={`Open ${agent.callsign}`}
        className="nodrag absolute right-2 top-2 grid h-6 w-6 place-items-center border border-white/10 bg-black/55 text-slate-400 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 hover:text-cyan-100"
        onClick={() => onOpenAgent(agent.id)}
        title={`${agent.callsign} // ${agent.title}`}
        type="button"
      >
        <span className="sr-only">Open agent</span>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.accent }} />
      </button>
    </section>
  );
}

function RuntimeNode({ data, selected }: NodeProps<RuntimeFlowNode>) {
  const { node, onCopyOutput, onUpdateNodeData } = data;
  const definition = getWorkflowRuntimeNodeDefinition(node.type);
  const packet = node.outputSnapshot ?? null;
  const statusClass = getRuntimeStatusClass(node.status);

  return (
    <section
      className={cx(
        "nexus-runtime-node w-72 border bg-slate-950/88 p-3 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-md",
        selected && "border-cyan-200/70 shadow-[0_0_28px_rgba(34,211,238,0.22)]",
        !selected && "border-white/12",
      )}
    >
      <RuntimeHandles node={node} />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
            {node.type === "input.text" ? (
              <Type className="h-4 w-4" />
            ) : node.type === "model.llm" ? (
              <BrainCircuit className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
              {definition.label}
            </div>
            <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
              {node.id}
            </div>
          </div>
        </div>
        <span
          className={cx(
            "shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
            statusClass,
          )}
        >
          {node.status}
        </span>
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

      {node.type === "output.text" ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Output
            </span>
            <button
              aria-label="Copy output"
              className="nodrag grid h-7 w-7 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
              disabled={!packet?.displayText && !packet?.rawText}
              onClick={() => onCopyOutput(node.id)}
              title="Copy output"
              type="button"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-h-28 max-h-44 overflow-y-auto whitespace-pre-wrap border border-white/10 bg-black/35 px-3 py-2 text-xs leading-5 text-slate-200">
            {packet?.displayText || packet?.rawText || (
              <span className="text-slate-600">Waiting for upstream context...</span>
            )}
          </div>
        </div>
      ) : null}

      {node.error ? (
        <div className="mt-3 border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-xs leading-5 text-rose-100">
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
          className="!h-3 !w-3 !border !border-slate-950"
          id={handle.id}
          position={handle.kind === "target" ? Position.Left : Position.Right}
          style={{ backgroundColor: handle.kind === "target" ? "#f0abfc" : "#22d3ee" }}
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
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
        Seed Text
      </span>
      <textarea
        className="nodrag min-h-28 resize-none border border-white/10 bg-black/35 px-3 py-2 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/55"
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
  return (
    <div className="grid gap-2">
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Prompt
        </span>
        <textarea
          className="nodrag min-h-24 resize-none border border-white/10 bg-black/35 px-3 py-2 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/55"
          onChange={(event) =>
            onUpdateNodeData(node.id, { prompt: event.currentTarget.value })
          }
          placeholder="Tell this LLM node what to do..."
          spellCheck={false}
          value={node.data.prompt}
        />
      </label>
      <label className="grid gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          Model
        </span>
        <select
          className="nodrag border border-white/10 bg-black/35 px-2.5 py-2 font-mono text-[11px] text-slate-100 outline-none transition focus:border-fuchsia-300/55"
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
    </div>
  );
}

function getRuntimeStatusClass(status: WorkflowNodeInstance["status"]) {
  if (status === "running" || status === "queued") {
    return "border-cyan-300/40 bg-cyan-300/10 text-cyan-100";
  }

  if (status === "success") {
    return "border-emerald-300/35 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "failed" || status === "failed_interrupted") {
    return "border-rose-300/35 bg-rose-300/10 text-rose-100";
  }

  return "border-white/10 bg-white/[0.045] text-slate-400";
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
  onRunWorkflow,
  onUpdateWorkflowNodeData,
  onUpdateWorkflowNodePosition,
  onUpdateNodePosition,
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
            color: edge.style?.stroke ?? "#22d3ee",
          },
          style: {
            stroke: edge.style?.stroke ?? "#22d3ee",
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
            color: "#f0abfc",
          },
          style: {
            stroke: "#f0abfc",
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
      if (
        !selectedEdgeIds.length ||
        (event.key !== "Backspace" && event.key !== "Delete")
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

    removedAgentIds.forEach(onRemoveAgent);

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
    <div className="h-full min-h-0 w-full">
      <ReactFlow
        colorMode="dark"
        defaultEdgeOptions={{
          animated: true,
          type: "blueprint",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#22d3ee",
          },
          style: {
            stroke: "#22d3ee",
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
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
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
        </div>
        <Background color="rgba(34, 211, 238, 0.22)" gap={28} size={1} />
        <MiniMap
          maskColor="rgba(2, 6, 23, 0.76)"
          nodeColor={(node) => agentById.get(node.id)?.accent ?? "#22d3ee"}
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
      className="pointer-events-auto inline-flex h-8 items-center gap-2 border border-white/10 bg-slate-950/82 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
