import { describe, expect, it, vi } from "vitest";

import type {
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import { WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS } from "./constants";
import { executeOutputText } from "./executors";
import { runWorkflowRuntimeLite } from "./runner";
import {
  createContextPacket,
  createWorkflowRuntimeNode,
  normalizeWorkflowRuntimeLiteState,
} from "./state";
import {
  inferLinearWorkflowRuntimeLiteEdges,
  validateWorkflowRuntimeLiteTopology,
} from "./topology";

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

  it("runs fan-out and fan-in workflows in topological order", async () => {
    const input = node("input.text", "input");
    const llmA = node("model.llm", "llm-a");
    const llmB = node("model.llm", "llm-b");
    const merge = node("model.llm", "merge");
    const output = node("output.text", "output");
    const runtime = runtimeLite(
      [input, llmA, llmB, merge, output],
      [
        edge(input, llmA),
        edge(input, llmB),
        edge(llmA, merge),
        edge(llmB, merge),
        edge(merge, output),
      ],
    );
    const state = patchableNodes(runtime.nodes);
    const upstreamSeen: string[] = [];

    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async ({ node, upstream }) => {
        upstreamSeen.push(`${node.id}:${upstream.rawText}`);
        return {
          text: `${node.id}<-${upstream.rawText}`,
        };
      }),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("success");
    expect(upstreamSeen[0]).toBe("llm-a:");
    expect(upstreamSeen[1]).toBe("llm-b:");
    expect(upstreamSeen[2]).toContain("merge:[Upstream 1]");
    expect(upstreamSeen[2]).toContain("llm-a<-");
    expect(upstreamSeen[2]).toContain("llm-b<-");
    expect(state.get("output")?.outputSnapshot?.rawText).toContain("merge<-");
  });

  it("streams partial LLM output into the running node", async () => {
    const input = node("input.text", "input", { text: "Alpha" });
    const llm = node("model.llm", "llm", { prompt: "A" });
    const output = node("output.text", "output");
    const runtime = runtimeLite(
      [input, llm, output],
      [edge(input, llm), edge(llm, output)],
    );
    const state = patchableNodes(runtime.nodes);
    const livePatches: string[] = [];

    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async ({ onToken }) => {
        onToken?.("partial", "partial");
        onToken?.(" final", "partial final");

        return {
          text: "partial final",
        };
      }),
      onNodePatch: (nodeId, patch) => {
        state.patch(nodeId, patch);

        if (nodeId === "llm" && patch.outputSnapshot?.rawText) {
          livePatches.push(patch.outputSnapshot.rawText);
        }
      },
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("success");
    expect(livePatches).toContain("partial");
    expect(livePatches).toContain("partial final");
    expect(state.get("output")?.outputSnapshot?.rawText).toBe("partial final");
  });

  it("runs Input -> Image Model and preserves generated media metadata", async () => {
    const input = node("input.text", "input", { text: "Y2K fashion board" });
    const image = node("model.image", "image", {
      aspectRatio: "16:9",
      modelId: "img2",
      quality: "standard",
    });
    const runtime = runtimeLite([input, image], [edge(input, image)]);
    const state = patchableNodes(runtime.nodes);
    const callImage = vi.fn(async ({ prompt }) => ({
      media: {
        artifactId: "artifact-image",
        createdAt: new Date().toISOString(),
        prompt,
        type: "image" as const,
        url: "data:image/png;base64,abc",
      },
      metadata: {
        artifactId: "artifact-image",
        modelId: "img2",
      },
      text: `Image URL: data:image/png;base64,abc`,
    }));

    const run = await runWorkflowRuntimeLite({
      callImage,
      callLlm: vi.fn(),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(run.status).toBe("success");
    expect(callImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Y2K fashion board",
      }),
    );
    expect(state.get("image")?.outputSnapshot?.metadata).toMatchObject({
      artifactId: "artifact-image",
      aspectRatio: "16:9",
      mediaType: "image",
      modelId: "img2",
      quality: "standard",
    });
    expect(state.get("image")?.outputSnapshot?.rawText).toContain("Image URL:");
  });

  it("waits for long-running image nodes instead of imposing a workflow timeout", async () => {
    vi.useFakeTimers();

    try {
      const input = node("input.text", "input", { text: "Y2K fashion board" });
      const image = node("model.image", "image", {
        aspectRatio: "16:9",
        modelId: "img2",
        quality: "standard",
      });
      const output = node("output.text", "output");
      const runtime = runtimeLite(
        [input, image, output],
        [edge(input, image), edge(image, output)],
      );
      const state = patchableNodes(runtime.nodes);
      const callImage = vi.fn(
        ({ prompt, signal }) =>
          new Promise<{
            media: {
              artifactId: string;
              createdAt: string;
              prompt: string;
              type: "image";
              url: string;
            };
            text: string;
          }>((resolve, reject) => {
            signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
            setTimeout(() => {
              resolve({
                media: {
                  artifactId: "artifact-long-image",
                  createdAt: new Date().toISOString(),
                  prompt,
                  type: "image",
                  url: "https://example.test/long-image.png",
                },
                text: "Image URL: https://example.test/long-image.png",
              });
            }, 180_000);
          }),
      );

      const runPromise = runWorkflowRuntimeLite({
        callImage,
        callLlm: vi.fn(),
        onNodePatch: state.patch,
        runtimeLite: runtime,
        workflowId: "workspace-test",
      });

      await vi.advanceTimersByTimeAsync(120_000);
      expect(state.get("image")?.status).toBe("running");

      await vi.advanceTimersByTimeAsync(60_000);

      const run = await runPromise;

      expect(run.status).toBe("success");
      expect(state.get("image")?.status).toBe("success");
      expect(state.get("output")?.status).toBe("success");
      expect(state.get("output")?.outputSnapshot?.rawText).toContain("Image URL:");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects disconnected nodes before execution", () => {
    const input = node("input.text", "input");
    const llmA = node("model.llm", "llm-a");
    const llmB = node("model.llm", "llm-b");
    const outputB = node("output.text", "output-b");
    const result = validateWorkflowRuntimeLiteTopology({
      edges: [edge(input, llmA), edge(llmB, outputB)],
      nodes: [input, llmA, llmB, outputB],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("沒有上游輸入");
  });

  it("ignores isolated draft nodes outside the connected runtime path", () => {
    const input = node("input.text", "input");
    const llm = node("model.llm", "llm");
    const output = node("output.text", "output");
    const draftInput = node("input.text", "draft-input");
    const draftLlm = node("model.llm", "draft-llm");
    const result = validateWorkflowRuntimeLiteTopology({
      edges: [edge(input, llm), edge(llm, output)],
      nodes: [input, llm, output, draftInput, draftLlm],
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.path.map((candidate) => candidate.id) : []).toEqual([
      "input",
      "llm",
      "output",
    ]);
  });

  it("runs the populated input path when blank draft inputs are still connected", async () => {
    const input = node("input.text", "input", { text: "Primary brief" });
    const llm = node("model.llm", "llm", { prompt: "Main" });
    const output = node("output.text", "output");
    const draftInput = node("input.text", "draft-input");
    const runtime = runtimeLite(
      [input, llm, output, draftInput],
      [edge(input, llm), edge(llm, output), edge(draftInput, output)],
    );
    const state = patchableNodes(runtime.nodes);

    const validation = validateWorkflowRuntimeLiteTopology(runtime);
    const run = await runWorkflowRuntimeLite({
      callLlm: vi.fn(async ({ prompt, upstream }) => ({
        text: `${prompt}: ${upstream.rawText}`,
      })),
      onNodePatch: state.patch,
      runtimeLite: runtime,
      workflowId: "workspace-test",
    });

    expect(validation.ok).toBe(true);
    expect(validation.ok ? validation.edges.map((candidate) => candidate.source) : []).toEqual([
      "input",
      "llm",
    ]);
    expect(run.status).toBe("success");
    expect(state.get("output")?.outputSnapshot?.rawText).toBe(
      "Main: Primary brief",
    );
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

  it("can infer a linear runtime path from disconnected nodes in visual order", () => {
    const input = { ...node("input.text", "input"), position: { x: 100, y: 0 } };
    const llm = { ...node("model.llm", "llm"), position: { x: 300, y: 0 } };
    const output = { ...node("output.text", "output"), position: { x: 500, y: 0 } };
    const inferredEdges = inferLinearWorkflowRuntimeLiteEdges({
      edges: [],
      nodes: [output, input, llm],
    });
    const result = validateWorkflowRuntimeLiteTopology({
      edges: inferredEdges,
      nodes: [output, input, llm],
    });

    expect(inferredEdges.map((candidate) => [candidate.source, candidate.target])).toEqual([
      ["input", "llm"],
      ["llm", "output"],
    ]);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.path.map((candidate) => candidate.id) : []).toEqual([
      "input",
      "llm",
      "output",
    ]);
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
    expect(state.get("output")?.status).toBe("failed");
    expect(state.get("output")?.error).toContain("upstream node llm failed");
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

  it("node.file passes text through while carrying attachment compiler metadata", async () => {
    const input = node("input.text", "input-file", { text: "Analyze this package." });
    const file = node("node.file", "file-node", {
      attachments: [
        {
          artifactId: "artifact-raw",
          compilerId: "nexus-attachment-noop-compiler-v1",
          compilerVersion: "v1",
          contentKind: "binary",
          mimeType: "application/zip",
          name: "source.zip",
          rawArtifactId: "artifact-raw",
          sizeBytes: 1234,
        },
      ],
    });
    const output = node("output.text", "output-file");
    const run = await runWorkflowRuntimeLite({
      callLlm: async () => ({ text: "unused" }),
      runtimeLite: runtimeLite(
        [input, file, output],
        [edge(input, file), edge(file, output)],
      ),
      workflowId: "workflow-file-node",
    });

    const fileExecution = run.nodeExecutions.find(
      (execution) => execution.nodeId === file.id,
    );
    const outputExecution = run.nodeExecutions.find(
      (execution) => execution.nodeId === output.id,
    );

    expect(fileExecution?.outputSnapshot?.rawText).toBe("Analyze this package.");
    expect(fileExecution?.outputSnapshot?.metadata).toMatchObject({
      attachmentCompiler: {
        compilerId: "nexus-attachment-noop-compiler-v1",
        compilerVersion: "v1",
        mode: "noop",
      },
      attachments: [
        expect.objectContaining({
          mimeType: "application/zip",
          name: "source.zip",
        }),
      ],
      nodeType: "node.file",
    });
    expect(outputExecution?.outputSnapshot?.metadata.nodeType).toBe("node.file");
  });

  it("keeps complete raw packet text while compacting display text", () => {
    const longText = "x".repeat(WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS + 1200);
    const packet = createContextPacket({
      rawText: longText,
      runId: "run-a",
      sourceNodeId: "llm-a",
    });

    expect(packet.rawText).toBe(longText);
    expect(packet.displayText).toHaveLength(WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS);
    expect(packet.truncated).toBe(true);
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
