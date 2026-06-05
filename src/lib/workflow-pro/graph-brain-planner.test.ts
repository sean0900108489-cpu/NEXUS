import { describe, expect, it } from "vitest";

import {
  createWorkflowGraphBrainPlannerResult,
  createWorkflowGraphBrainPlannerResultFromModelProposal,
  getWorkflowGraphBrainNodeTypeSummary,
} from "./graph-brain-planner";

describe("Workflow Graph Brain planner", () => {
  it("turns an image/file request into a two-LLM appendable workflow proposal", () => {
    const result = createWorkflowGraphBrainPlannerResult({
      operatorRequest:
        "我把圖填在 input 傳上之後，它可以連接兩個不同我已經設定好提示詞的 LLM 後給我最終答案。",
    });

    expect(result.schema).toBe("nexus.workflowPro.graphBrainPlannerResult.v1");
    expect(result.compiler.selectedTemplateId).toBe("image-file-two-llm-answer");
    expect(result.compiler.validation.ok).toBe(true);
    expect(result.proposal.optimizedWorkflow?.schema).toBe("nexus.workflow.v1");
    expect(result.compiler.appendMode).toBe("new-workflow-group");
    expect(result.messages.map((message) => message.role)).toEqual([
      "operator",
      "architect",
      "compiler",
    ]);
  });

  it("turns an audio reverse fan-out request into a multi-image workflow proposal", () => {
    const result = createWorkflowGraphBrainPlannerResult({
      operatorRequest:
        "我想傳一個語音提示詞之後生成圖像，再從那個圖像反推出提示詞，讓另外三個 LLM 更改風格後經過圖片模型生成最終答案。",
    });

    expect(result.compiler.selectedTemplateId).toBe(
      "audio-prompt-image-reverse-fanout",
    );
    expect(result.compiler.validation.ok).toBe(true);
    expect(result.architect.missingCapabilities).toContain(
      "compiler.audio.transcribe",
    );
    expect(result.architect.missingCapabilities).not.toContain(
      "workflow.parallel.native-execution",
    );
    expect(result.architect.missingCapabilities).toContain("node.parallel.join");

    const summary = getWorkflowGraphBrainNodeTypeSummary(
      result.proposal.optimizedWorkflow!,
    );

    expect(summary).toContainEqual({ count: 5, type: "model.llm" });
    expect(summary).toContainEqual({ count: 4, type: "model.image" });
  });

  it("keeps the Brain model defaults at gpt-5.5 xhigh high high", () => {
    const result = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "Input -> LLM -> Output",
    });

    expect(result.modelSettings).toEqual({
      modelId: "gpt-5.5",
      reasoningDetail: "high",
      reasoningEffort: "xhigh",
      verbosity: "high",
    });
    expect(result.proposal.source?.model).toBe("gpt-5.5/xhigh/high/high");
  });

  it("includes RuntimeLite execution policy in the architect handoff", () => {
    const result = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "Input -> LLM -> Output",
    });

    expect(result.architect.runtimeCapabilityReport).toMatchObject({
      executionPolicy: {
        mode: "ready-parallel",
        nativeParallelExecution: true,
        workflowTimeout: "none",
      },
      schema: "nexus.workflowPro.runtimeCapabilityReport.v1",
    });
    expect(result.proposal.analysis).toContain("workflowTimeout=none");
  });

  it("includes latest runtime evidence in the architect handoff", () => {
    const result = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "Input -> LLM -> Output",
      runtimeLite: {
        edges: [],
        lastError: null,
        lastRunId: "run-brain-evidence",
        nodes: [],
        runs: [
          {
            completedAt: "2026-06-04T00:00:02.000Z",
            error: null,
            nodeExecutions: [
              {
                completedAt: "2026-06-04T00:00:02.000Z",
                latencyMs: 2000,
                nodeId: "llm-1",
                outputSnapshot: {
                  createdAt: "2026-06-04T00:00:02.000Z",
                  displayText: "finished",
                  id: "packet-1",
                  metadata: {},
                  rawText: "finished",
                  runId: "run-brain-evidence",
                  sourceNodeId: "llm-1",
                },
                runId: "run-brain-evidence",
                startedAt: "2026-06-04T00:00:00.000Z",
                status: "success",
              },
            ],
            runId: "run-brain-evidence",
            startedAt: "2026-06-04T00:00:00.000Z",
            status: "success",
            workflowId: "workspace-test",
          },
        ],
        version: 1,
      },
    });

    expect(result.architect.runtimeEvidenceReport).toMatchObject({
      latestRun: {
        runId: "run-brain-evidence",
        status: "success",
      },
      schema: "nexus.workflowPro.runtimeEvidence.v1",
    });
    expect(result.proposal.analysis).toContain("run=run-brain-evidence");
  });

  it("wraps an LLM-generated workflow proposal as an appendable planner result", () => {
    const fallback = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "Input -> LLM -> Output",
    });
    const proposal = {
      ...fallback.proposal,
      analysis: "模型已自行規劃一組新的 workflow，並產出可 append 的 JSON。",
      missingCapabilities: ["workflow.brain.review.apply"],
      source: {
        createdAt: "2026-06-04T10:00:00.000Z",
        model: "gpt-5.5/xhigh/high/high",
      },
    };

    const result = createWorkflowGraphBrainPlannerResultFromModelProposal({
      fallback,
      model: "gpt-5.5",
      proposal,
    });

    expect(result.source).toBe("openai-workflow-planner");
    expect(result.scoreTarget).toMatchObject({
      appendableWorkflowJson: 10,
      brainUnderstanding: 10,
      screenTestReadiness: 10,
    });
    expect(result.compiler.contractJson).toContain('"schema": "nexus.workflow.v1"');
    expect(result.messages.map((message) => message.title)).toEqual([
      "Operator Request",
      "LLM Workflow Architect",
      "LLM JSON Contract Compiler",
    ]);
  });

  it("normalizes model-authored contract boilerplate without changing topology", () => {
    const fallback = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "產品概念 -> 新聞稿 -> 日文 Twitter -> Output",
    });
    const optimizedWorkflow = structuredClone(fallback.proposal.optimizedWorkflow!);
    const terminalOutputNodeId =
      optimizedWorkflow.nodes.find((node) => node.type === "output.text")?.id ??
      optimizedWorkflow.nodes.at(-1)!.id;

    optimizedWorkflow.metadata.workspaceId = "";
    optimizedWorkflow.capabilityInventory = {
      nodeTypes: ["input.text", "model.llm", "output.text"],
    } as unknown as (typeof optimizedWorkflow)["capabilityInventory"];
    optimizedWorkflow.edges = optimizedWorkflow.edges.map((edge) => {
      const copy = { ...edge } as Record<string, unknown>;
      delete copy.packetContract;
      delete copy.sourceHandle;
      delete copy.targetHandle;
      return copy as (typeof optimizedWorkflow.edges)[number];
    });
    optimizedWorkflow.outputs = [
      {
        id: "output-invalid",
        sourceNodeId: "missing-output-node",
        type: "text",
      },
      {
        id: "output-explicit-node",
        nodeId: terminalOutputNodeId,
        sourceNodeId: optimizedWorkflow.nodes[0].id,
        type: "text",
      } as (typeof optimizedWorkflow.outputs)[number],
    ];

    const result = createWorkflowGraphBrainPlannerResultFromModelProposal({
      fallback,
      model: "gpt-5.5",
      proposal: {
        ...fallback.proposal,
        analysis: "模型已推理出線性文字工作流，系統只補合約欄位。",
        optimizedWorkflow,
      },
    });

    expect(result.source).toBe("openai-workflow-planner");
    expect(result.compiler.validation.ok).toBe(true);
    expect(result.proposal.optimizedWorkflow?.edges).toHaveLength(
      optimizedWorkflow.edges.length,
    );
    expect(result.proposal.optimizedWorkflow?.edges[0].packetContract).toEqual({
      allowedMedia: ["text", "json"],
      input: "ContextPacket",
      output: "ContextPacket",
    });
    expect(
      result.proposal.optimizedWorkflow?.outputs[0].sourceNodeId,
    ).not.toBe("missing-output-node");
    expect(
      result.proposal.optimizedWorkflow?.outputs[1].sourceNodeId,
    ).toBe(terminalOutputNodeId);
  });

  it("labels model-authored LLM to image topology from the optimized workflow", () => {
    const fallback = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "請規劃一個零門檻圖片生成器。",
    });
    const llmToImage = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "短詞先擴寫 prompt 再生成圖片。",
      templateHint: "llm-to-image",
    });

    expect(fallback.compiler.selectedTemplateId).toBe(
      "image-file-two-llm-answer",
    );

    const result = createWorkflowGraphBrainPlannerResultFromModelProposal({
      fallback,
      model: "gpt-5.5",
      proposal: {
        ...fallback.proposal,
        analysis: "模型自行推導出短詞、提示詞擴寫、圖片生成、終端輸出的跨模態線性流程。",
        optimizedWorkflow: llmToImage.proposal.optimizedWorkflow,
      },
    });

    expect(result.compiler.selectedTemplateId).toBe("llm-to-image");
  });

  it("normalizes malformed model-authored fan-out execution groups", () => {
    const fallback = createWorkflowGraphBrainPlannerResult({
      operatorRequest: "IP 角色先生成標準圖，再反推畫面，並行產生三種風格圖片。",
      templateHint: "audio-prompt-image-reverse-fanout",
    });
    const optimizedWorkflow = structuredClone(fallback.proposal.optimizedWorkflow!);

    optimizedWorkflow.execution = ({
      mode: "topological",
      notes: ["model-authored fan-out plan"],
      parallelGroups: [
        {
          branches: [
            { nodeId: "brain-audio-llm-style-1" },
            { nodeId: "brain-audio-llm-style-2" },
            { nodeId: "brain-audio-llm-style-3" },
          ],
          id: "style-branches",
        },
      ],
    } as unknown) as (typeof optimizedWorkflow)["execution"];
    optimizedWorkflow.outputs = undefined as unknown as (typeof optimizedWorkflow)["outputs"];

    const result = createWorkflowGraphBrainPlannerResultFromModelProposal({
      fallback,
      model: "gpt-5.5",
      proposal: {
        ...fallback.proposal,
        analysis: "模型自行推導出標準圖、視覺反推、三路風格 LLM 與三路圖片生成。",
        missingCapabilities: [],
        optimizedWorkflow,
      },
    });

    const execution = result.proposal.optimizedWorkflow?.execution;

    expect(result.compiler.validation.ok).toBe(true);
    expect(result.compiler.selectedTemplateId).toBe("image-reverse-fanout");
    expect(result.architect.missingCapabilities).toContain(
      "model.vision.prompt-reverse",
    );
    expect(execution?.parallelGroups.some((group) => group.id === "style-branches")).toBe(
      true,
    );
    expect(
      execution?.parallelGroups.some(
        (group) => group.id === "parallel-final-image-generation",
      ),
    ).toBe(true);
    expect(result.proposal.optimizedWorkflow?.outputs.filter((output) => output.type === "image")).toHaveLength(3);
  });
});
