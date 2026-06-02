import {
  DEFAULT_CHAT_MODEL_IDS,
  normalizeAgentModelSettings,
} from "@/lib/nexus-registry";
import {
  DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS,
} from "@/lib/composer/image-generation-settings";
import type {
  InputTextNodeData,
  ModelImageNodeData,
  ModelLlmNodeData,
  OutputTextNodeData,
  WorkflowRuntimeNodeDataByType,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

export type WorkflowRuntimeHandle = {
  id: "input" | "output";
  kind: "source" | "target";
  label: string;
};

export type WorkflowRuntimeNodeDefinition<
  TType extends WorkflowRuntimeNodeType = WorkflowRuntimeNodeType,
> = {
  type: TType;
  label: string;
  description: string;
  handles: WorkflowRuntimeHandle[];
  defaultData: () => WorkflowRuntimeNodeDataByType[TType];
};

const defaultModel = DEFAULT_CHAT_MODEL_IDS.includes("gpt-4o-mini")
  ? "gpt-4o-mini"
  : DEFAULT_CHAT_MODEL_IDS[0];

export const WORKFLOW_RUNTIME_NODE_DEFINITIONS = {
  "input.text": {
    type: "input.text",
    label: "Input Text",
    description: "Creates the initial ContextPacket for a workflow run.",
    handles: [{ id: "output", kind: "source", label: "Text out" }],
    defaultData: () =>
      ({
        label: "Input",
        text: "",
      }) satisfies InputTextNodeData,
  },
  "model.llm": {
    type: "model.llm",
    label: "LLM",
    description: "Calls the existing model runtime boundary with upstream context.",
    handles: [
      { id: "input", kind: "target", label: "Context in" },
      { id: "output", kind: "source", label: "Text out" },
    ],
    defaultData: () =>
      ({
        label: "LLM",
        model: defaultModel,
        modelSettings: normalizeAgentModelSettings(defaultModel),
        prompt: "Use the upstream context and respond clearly.",
      }) satisfies ModelLlmNodeData,
  },
  "model.image": {
    type: "model.image",
    label: "Image Model",
    description: "Routes upstream context through the image generation boundary.",
    handles: [
      { id: "input", kind: "target", label: "Prompt in" },
      { id: "output", kind: "source", label: "Image out" },
    ],
    defaultData: () =>
      ({
        label: "Image Model",
        prompt: "",
        modelId: DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.modelId,
        quality: DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.quality,
        aspectRatio: DEFAULT_WORKSPACE_COMPOSER_IMAGE_SETTINGS.aspectRatio,
      }) satisfies ModelImageNodeData,
  },
  "output.text": {
    type: "output.text",
    label: "Output Text",
    description: "Displays and passes through the upstream ContextPacket.",
    handles: [
      { id: "input", kind: "target", label: "Context in" },
      { id: "output", kind: "source", label: "Pass through" },
    ],
    defaultData: () =>
      ({
        label: "Output",
        renderMode: "plain",
      }) satisfies OutputTextNodeData,
  },
} as const satisfies {
  [TType in WorkflowRuntimeNodeType]: WorkflowRuntimeNodeDefinition<TType>;
};

export const WORKFLOW_RUNTIME_NODE_TYPES = Object.keys(
  WORKFLOW_RUNTIME_NODE_DEFINITIONS,
) as WorkflowRuntimeNodeType[];

export function isWorkflowRuntimeNodeType(
  value: unknown,
): value is WorkflowRuntimeNodeType {
  return (
    typeof value === "string" &&
    WORKFLOW_RUNTIME_NODE_TYPES.includes(value as WorkflowRuntimeNodeType)
  );
}

export function getWorkflowRuntimeNodeDefinition<TType extends WorkflowRuntimeNodeType>(
  type: TType,
) {
  return WORKFLOW_RUNTIME_NODE_DEFINITIONS[type];
}

export function getWorkflowRuntimeHandleIds(
  type: WorkflowRuntimeNodeType,
  kind: WorkflowRuntimeHandle["kind"],
) {
  return WORKFLOW_RUNTIME_NODE_DEFINITIONS[type].handles
    .filter((handle) => handle.kind === kind)
    .map((handle) => handle.id);
}
