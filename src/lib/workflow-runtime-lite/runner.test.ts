import { describe, expect, it, vi } from "vitest";

import type {
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import { executeOutputText } from "./executors";
import { runWorkflowRuntimeLite } from "./runner";
import {
  createContextPacket,
  createWorkflowRuntimeNode,
  normalizeWorkflowRuntimeLiteState,
} from "./state";
import { validateWorkflowRuntimeLiteTopology } from "./topology";

describe("Workflow Runtime Spine Lite", () => {
  it("runs Input -> LLM -> Output as a linear flow", async () => {
    const input = node("input.text", "input", { text: "Initial brief" });
    const llm = node("model.llm", "llm", { prompt: "Summarize" });
    const output = node("output.text", "output");
    const runtime = runtimeLite(
      [input, llm, output],
      [edge(input, llm), edge(llm, output)],
    );
    const state = patchableNodes(runtime.nodes);

    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async ({ prompt, upstream }) => ({
        text: `${prompt}: ${upstream.rawText}`,
      })),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("success");
    expect(state.get("output")?.outputSnapshot?.rawText).toBe(
      "Summarize: Initial brief",
    );
  });

  it("passes LLM A output through Output A into LLM B and Output B", async () => {
    const input = node("input.text", "input", { text: "Alpha" });
    const llmA = node("model.llm", "llm-a", { prompt: "A" });
    const outputA = node("output.text", "output-a");
    const llmB = node("model.llm", "llm-b", { prompt: "B" });
    const outputB = node("output.text", "output-b");
    const runtime = runtimeLite(
      [input, llmA, outputA, llmB, outputB],
      [
        edge(input, llmA),
        edge(llmA, outputA),
        edge(outputA, llmB),
        edge(llmB, outputB),
      ],
    );
    const state = patchableNodes(runtime.nodes);
    const upstreamSeen: string[] = [];

    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async ({ node, upstream }) => {
        upstreamSeen.push(upstream.rawText);
        return {
          text: `${node.id}<-${upstream.rawText}`,
        };
      }),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("success");
    expect(upstreamSeen).toEqual(["Alpha", "llm-a<-Alpha"]);
    expect(state.get("output-a")?.outputSnapshot?.rawText).toBe("llm-a<-Alpha");
    expect(state.get("output-b")?.outputSnapshot?.rawText).toBe(
      "llm-b<-llm-a<-Alpha",
    );
  });

  it("rejects branches before execution", () => {
    const input = node("input.text", "input");
    const llmA = node("model.llm", "llm-a");
    const llmB = node("model.llm", "llm-b");
    const result = validateWorkflowRuntimeLiteTopology({
      edges: [edge(input, llmA), edge(input, llmB)],
      nodes: [input, llmA, llmB],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("分支");
  });

  it("rejects merges before execution", () => {
    const input = node("input.text", "input");
    const llmA = node("model.llm", "llm-a");
    const llmB = node("model.llm", "llm-b");
    const output = node("output.text", "output");
    const result = validateWorkflowRuntimeLiteTopology({
      edges: [edge(input, llmA), edge(llmA, output), edge(llmB, output)],
      nodes: [input, llmA, llmB, output],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("merge");
  });

  it("rejects cycles before execution", () => {
    const input = node("input.text", "input");
    const llm = node("model.llm", "llm");
    const output = node("output.text", "output");
    const result = validateWorkflowRuntimeLiteTopology({
      edges: [edge(input, llm), edge(llm, output), edge(output, llm)],
      nodes: [input, llm, output],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("迴圈");
  });

  it("stops downstream nodes after a failed LLM node", async () => {
    const input = node("input.text", "input", { text: "Break" });
    const llm = node("model.llm", "llm");
    const output = node("output.text", "output");
    const runtime = runtimeLite(
      [input, llm, output],
      [edge(input, llm), edge(llm, output)],
    );
    const state = patchableNodes(runtime.nodes);

    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async () => {
        throw new Error("provider unavailable");
      }),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("failed");
    expect(state.get("llm")?.status).toBe("failed");
    expect(state.get("output")?.status).toBe("idle");
  });

  it("resets running state to failed_interrupted during hydration", () => {
    const input = {
      ...node("input.text", "input"),
      status: "running" as const,
    };
    const normalized = normalizeWorkflowRuntimeLiteState({
      edges: [],
      lastRunId: "run-a",
      nodes: [input],
      runs: [
        {
          nodeExecutions: [
            {
              nodeId: "input",
              runId: "run-a",
              status: "running",
            },
          ],
          runId: "run-a",
          startedAt: new Date().toISOString(),
          status: "running",
          workflowId: "workspace-test",
        },
      ],
      version: 1,
    });

    expect(normalized.nodes[0].status).toBe("failed_interrupted");
    expect(normalized.runs[0].status).toBe("failed_interrupted");
    expect(normalized.runs[0].nodeExecutions[0].status).toBe(
      "failed_interrupted",
    );
  });

  it("output.text passes through the same ContextPacket without rewriting it", async () => {
    const packet = createContextPacket({
      rawText: "Do not mutate me",
      runId: "run-a",
      sourceNodeId: "llm-a",
    });
    const output = node("output.text", "output");
    const result = await executeOutputText({
      callLlm: vi.fn(),
      inputPacket: packet,
      node: output,
      runId: "run-a",
      workflowId: "workspace-test",
    });

    expect(result).toBe(packet);
  });
});

function node<TType extends WorkflowRuntimeNodeType>(
  type: TType,
  id: string,
  data?: Partial<WorkflowNodeInstance<TType>["data"]>,
) {
  const instance = createWorkflowRuntimeNode({
    id,
    position: { x: 0, y: 0 },
    type,
  });

  return {
    ...instance,
    data: {
      ...instance.data,
      ...(data ?? {}),
    },
  } as WorkflowNodeInstance<TType>;
}

function edge(source: WorkflowNodeInstance, target: WorkflowNodeInstance) {
  return {
    id: `edge-${source.id}-${target.id}`,
    source: source.id,
    sourceHandle: "output",
    target: target.id,
    targetHandle: "input",
  } satisfies WorkflowRuntimeEdge;
}

function runtimeLite(
  nodes: WorkflowNodeInstance[],
  edges: WorkflowRuntimeEdge[],
): WorkflowRuntimeLiteState {
  return {
    edges,
    lastError: null,
    lastRunId: null,
    nodes,
    runs: [],
    version: 1,
  };
}

function patchableNodes(nodes: WorkflowNodeInstance[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return {
    get(id: string) {
      return byId.get(id);
    },
    patch(id: string, patch: Partial<WorkflowNodeInstance>) {
      const current = byId.get(id);

      if (current) {
        byId.set(id, { ...current, ...patch } as WorkflowNodeInstance);
      }
    },
  };
}
