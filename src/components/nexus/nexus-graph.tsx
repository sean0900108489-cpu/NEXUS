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
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { getDefaultGraphPosition } from "@/lib/nexus-defaults";
import type {
  NexusAgent,
  WorkspaceGraph,
  WorkspaceGraphEdge,
} from "@/lib/nexus-types";

type AgentNodeData = {
  agent: NexusAgent;
  onOpenAgent: (agentId: string) => void;
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
type AgentFlowEdge = Edge<AgentEdgeData, "blueprint">;
type GraphNodeState = {
  signature: string;
  nodes: AgentFlowNode[];
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
};
const edgeTypes = {
  blueprint: BlueprintEdge,
};

export function NexusGraph({
  agents,
  graph,
  onConnectAgents,
  onFocusAgent,
  onOpenAgent,
  onRemoveAgent,
  onRemoveEdges,
  onUpdateNodePosition,
}: {
  agents: NexusAgent[];
  graph: WorkspaceGraph;
  onConnectAgents: (edge: WorkspaceGraphEdge) => void;
  onFocusAgent: (agentId: string) => void;
  onOpenAgent: (agentId: string) => void;
  onRemoveAgent: (agentId: string) => void;
  onRemoveEdges: (edgeIds: string[]) => void;
  onUpdateNodePosition: (agentId: string, position: { x: number; y: number }) => void;
}) {
  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );
  const graphNodeByAgentId = useMemo(
    () => new Map(graph.nodes.map((node) => [node.agentId, node])),
    [graph.nodes],
  );
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const derivedNodes = useMemo<AgentFlowNode[]>(
    () =>
      agents.map((agent, index) => {
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
      }),
    [agents, graphNodeByAgentId, onOpenAgent],
  );

  const derivedEdges = useMemo<AgentFlowEdge[]>(
    () =>
      graph.edges
        .filter(
          (edge) => agentById.has(edge.sourceAgentId) && agentById.has(edge.targetAgentId),
        )
        .map((edge) => ({
          id: edge.id,
          source: edge.sourceAgentId,
          target: edge.targetAgentId,
          sourceHandle: "output",
          targetHandle: "input",
          type: "blueprint",
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
        })),
    [agentById, graph.edges, onRemoveEdges, selectedEdgeIds],
  );

  const nodeSignature = useMemo(
    () =>
      JSON.stringify(
        agents.map((agent) => ({
          id: agent.id,
          callsign: agent.callsign,
          title: agent.title,
          status: agent.status,
          accent: agent.accent,
          avatar: agent.avatar,
          updatedAt: agent.updatedAt,
          graphNode: graphNodeByAgentId.get(agent.id),
        })),
      ),
    [agents, graphNodeByAgentId],
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

  useEffect(() => {
    function deleteSelectedEdges(event: KeyboardEvent) {
      if (
        !selectedEdgeIds.length ||
        (event.key !== "Backspace" && event.key !== "Delete")
      ) {
        return;
      }

      event.preventDefault();
      onRemoveEdges(selectedEdgeIds);
      setSelectedEdgeIds([]);
    }

    window.addEventListener("keydown", deleteSelectedEdges);

    return () => {
      window.removeEventListener("keydown", deleteSelectedEdges);
    };
  }, [onRemoveEdges, selectedEdgeIds]);

  const onNodesChange = (changes: NodeChange<AgentFlowNode>[]) => {
    const removedAgentIds = changes
      .filter((change) => change.type === "remove")
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
      onRemoveEdges(removedIds);
      setSelectedEdgeIds((current) =>
        current.filter((edgeId) => !removedIds.includes(edgeId)),
      );
    }
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    onConnectAgents({
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      sourceAgentId: connection.source,
      targetAgentId: connection.target,
    });
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
        onNodeClick={(_event, node) => onFocusAgent(node.id)}
        onNodeDragStop={(_event, node) => {
          onUpdateNodePosition(node.id, node.position);
        }}
        onNodesChange={onNodesChange}
        onPaneClick={() => setSelectedEdgeIds([])}
        proOptions={{ hideAttribution: true }}
      >
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
