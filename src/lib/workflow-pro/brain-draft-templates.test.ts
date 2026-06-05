import { describe, expect, it } from "vitest";

import type { WorkflowNodeInstance } from "@/lib/nexus-types";

import {
  WORKFLOW_BRAIN_DRAFT_TEMPLATES,
  inferWorkflowBrainDraftTemplateId,
  serializeWorkflowBrainDraftTemplate,
} from "./brain-draft-templates";
import { createWorkflowProRuntimeBridge } from "./runtime-bridge";
import { parseWorkflowProContractImportText } from "./workflow-contract-import";

describe("Workflow Brain draft templates", () => {
  it("serializes every Graph Brain template into a valid nexus.workflow.v1 contract", () => {
    for (const template of WORKFLOW_BRAIN_DRAFT_TEMPLATES) {
      const serialized = serializeWorkflowBrainDraftTemplate({
        description: "我想要生成一整組新的工作流節點",
        templateId: template.id,
      });
      const review = parseWorkflowProContractImportText({
        receivedAt: "2026-06-04T00:00:00.000Z",
        sourceName: `${template.id}.json`,
        text: serialized,
      });

      expect(review.status, template.id).toBe("accepted");
      expect(review.contract?.schema, template.id).toBe("nexus.workflow.v1");
      expect(review.contract?.nodes.length, template.id).toBeGreaterThan(0);
    }
  });

  it("infers custom templates from natural language workflow requests", () => {
    expect(
      inferWorkflowBrainDraftTemplateId(
        "我把圖填在input傳上之後連接兩個不同提示詞的llm給我答案",
      ),
    ).toBe("image-file-two-llm-answer");
    expect(
      inferWorkflowBrainDraftTemplateId(
        "我想傳一個語音提示詞之後生成圖像，再反推出prompt並分成三路",
      ),
    ).toBe("audio-prompt-image-reverse-fanout");
  });

  it("preserves Graph Brain LLM model settings through the runtime bridge", () => {
    const serialized = serializeWorkflowBrainDraftTemplate({
      description: "圖或檔案輸入後接兩個高推理 LLM。",
      templateId: "image-file-two-llm-answer",
    });
    const review = parseWorkflowProContractImportText({
      receivedAt: "2026-06-04T00:00:00.000Z",
      sourceName: "brain-template.json",
      text: serialized,
    });

    expect(review.status).toBe("accepted");

    if (review.status !== "accepted") {
      return;
    }

    const bridge = createWorkflowProRuntimeBridge(review.contract);
    const llmNodes = bridge.runtimeLite.nodes.filter(
      (node): node is WorkflowNodeInstance<"model.llm"> => node.type === "model.llm",
    );

    expect(llmNodes).toHaveLength(2);
    expect(llmNodes.every((node) => node.data.model === "gpt-5.5")).toBe(true);
    expect(llmNodes.map((node) => node.data.modelSettings)).toEqual([
      {
        reasoningDetail: "high",
        reasoningEffort: "xhigh",
        verbosity: "high",
      },
      {
        reasoningDetail: "high",
        reasoningEffort: "xhigh",
        verbosity: "high",
      },
    ]);
  });
});
