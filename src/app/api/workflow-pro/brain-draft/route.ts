import type {
  WorkflowGraphBrainModelSettings,
  WorkflowGraphBrainPlannerMessage,
  WorkflowGraphBrainPlannerResult,
} from "@/lib/workflow-pro/graph-brain-planner";
import {
  createWorkflowGraphBrainPlannerResult,
  createWorkflowGraphBrainPlannerResultFromModelProposal,
} from "@/lib/workflow-pro/graph-brain-planner";
import type { WorkflowBrainDraftTemplateId } from "@/lib/workflow-pro/brain-draft-templates";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";
import type { WorkflowProBrainReviewProposal } from "@/lib/workflow-pro/brain-review-proposal";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";
import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
import { normalizeNewApiBaseUrl } from "@/lib/backend/models/new-api-chat-service";

export const runtime = "nodejs";

type BrainDraftPayload = {
  conversation?: unknown;
  modelSettings?: unknown;
  operatorRequest?: unknown;
  request?: unknown;
  runtimeLite?: unknown;
  templateHint?: unknown;
  useModel?: unknown;
};

export async function POST(request: Request) {
  let payload: BrainDraftPayload;

  try {
    payload = (await request.json()) as BrainDraftPayload;
  } catch {
    return Response.json({ error: "Invalid Graph Brain payload." }, { status: 400 });
  }

  const operatorRequest = getString(payload.operatorRequest) || getString(payload.request);

  if (!operatorRequest) {
    return Response.json(
      { error: "operatorRequest is required." },
      { status: 400 },
    );
  }

  if (payload.useModel !== false) {
    const blocked = blockLegacyToolRouteInProduction();

    if (blocked) {
      return blocked;
    }
  }

  try {
    const deterministic = createWorkflowGraphBrainPlannerResult({
      modelSettings: normalizePayloadModelSettings(payload.modelSettings),
      operatorRequest,
      runtimeLite: isRecord(payload.runtimeLite)
        ? (payload.runtimeLite as WorkflowRuntimeLiteState)
        : null,
      templateHint: normalizeTemplateHint(payload.templateHint),
    });

    if (payload.useModel === false) {
      return Response.json(deterministic);
    }

    const modelResult = await createOpenAiWorkflowPlannerResult({
      conversation: normalizeConversation(payload.conversation),
      fallback: deterministic,
      operatorRequest,
      request,
    });

    return Response.json(modelResult);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Graph Brain draft generation failed.",
      },
      { status: 422 },
    );
  }
}

async function createOpenAiWorkflowPlannerResult({
  conversation,
  fallback,
  operatorRequest,
  request,
}: {
  conversation: WorkflowGraphBrainPlannerMessage[];
  fallback: WorkflowGraphBrainPlannerResult;
  operatorRequest: string;
  request: Request;
}): Promise<WorkflowGraphBrainPlannerResult> {
  const actor = await resolveApiActor(request, { required: true });

  if (!actor.actorUserId) {
    throw new Error(
      "Authentication is required for Graph Brain THINK.",
    );
  }

  const userToken = await getUserNewApiToken({ userId: actor.actorUserId });

  const model =
    process.env.WORKFLOW_BRAIN_MODEL?.trim() ||
    process.env.REPORT_MODEL?.trim() ||
    fallback.modelSettings.modelId;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getModelTimeoutMs());
  const baseUrl = normalizeNewApiBaseUrl(process.env.NEW_API_BASE_URL);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: createWorkflowPlannerSystemPrompt(),
          role: "system",
        },
        {
          content: JSON.stringify({
            canvasRule:
              "The canvas can contain multiple workflow groups. Generate one new independent group; do not replace or mutate existing nodes.",
            currentCapabilityInventory:
              fallback.proposal.optimizedWorkflow?.capabilityInventory,
            modelSettings: fallback.modelSettings,
            operatorRequest,
            recentConversation: createLeanConversationContext(conversation),
            requiredJsonShape: {
              analysis: "Traditional Chinese technical explanation",
              missingCapabilities: ["string"],
              optimizedWorkflow:
                "complete nexus.workflow.v1 object, not a string",
              questionsForSean: ["string"],
              schema: "nexus.workflowPro.brainReviewProposal.v1",
              source: {
                createdAt: "ISO datetime",
                model,
              },
            },
            workflowContractRequiredFields: [
              "schema",
              "id",
              "name",
              "intent",
              "metadata",
              "brain",
              "capabilityInventory",
              "nodes",
              "edges",
              "outputs",
              "execution",
              "successCriteria",
            ],
            workflowRules: [
              "Infer the workflow topology from operatorRequest yourself.",
              "Do not copy a template path from the prompt; choose nodes, edges, parallelGroups, and outputs from the available capability inventory.",
              "Every edge must connect existing node ids and use sourceHandle output / targetHandle input unless the node contract states otherwise.",
              "Use output.text only as a terminal display node unless the operator explicitly requests an intermediate preview or checkpoint.",
              "metadata.source must be runtimeLite.",
              "For LLM nodes include data.prompt, data.model, data.provider, and data.modelSettings.",
              "For image nodes include data.prompt, data.model, data.provider, quality/aspectRatio settings, and downloadable generated-image artifactPolicy.",
              "If the request requires vision, audio, zip, video, conditionals, or native parallel behavior that is not available, represent the closest valid boundary and list the missing capability.",
            ],
            runtimeContext: createCompactRuntimeContext(fallback),
          }),
          role: "user",
        },
      ],
      max_tokens: getModelMaxOutputTokens(),
      model,
      response_format: { type: "json_object" },
    }),
    headers: {
      Authorization: `Bearer ${userToken.token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const detail = await readResponseError(response);
    throw new Error(
      detail
        ? `Graph Brain LLM request failed: ${detail}`
        : `Graph Brain LLM request failed with status ${response.status}.`,
    );
  }

  const body = (await response.json()) as unknown;
  const text = extractResponseText(body);
  const proposal = parseBrainReviewProposal(text);

  return createWorkflowGraphBrainPlannerResultFromModelProposal({
    fallback,
    model,
    proposal,
  });
}

function getModelTimeoutMs() {
  const raw = Number.parseInt(
    process.env.WORKFLOW_BRAIN_MODEL_TIMEOUT_MS ?? "",
    10,
  );

  if (Number.isFinite(raw) && raw >= 1000) {
    return raw;
  }

  return 300000;
}

function getModelMaxOutputTokens() {
  const raw = Number.parseInt(
    process.env.WORKFLOW_BRAIN_MAX_OUTPUT_TOKENS ?? "",
    10,
  );

  if (Number.isFinite(raw) && raw >= 2000) {
    return raw;
  }

  return 16000;
}

function createCompactRuntimeContext(fallback: WorkflowGraphBrainPlannerResult) {
  return {
    capabilityRecommendations:
      fallback.architect.runtimeCapabilityReport.recommendations.slice(0, 6),
    edgeCount: fallback.architect.runtimeRead.edgeCount,
    executionPolicy: fallback.architect.runtimeCapabilityReport.executionPolicy,
    latestRun: fallback.architect.runtimeEvidenceReport.latestRun
      ? {
          artifactCount:
            fallback.architect.runtimeEvidenceReport.latestRun.artifactCount,
          runId: fallback.architect.runtimeEvidenceReport.latestRun.runId,
          status: fallback.architect.runtimeEvidenceReport.latestRun.status,
        }
      : null,
    nodeCount: fallback.architect.runtimeRead.nodeCount,
    runCount: fallback.architect.runtimeRead.runCount,
  };
}

function createWorkflowPlannerSystemPrompt() {
  return [
    "You are the NEXUS Workflow Brain, a senior workflow architect and JSON contract compiler.",
    "Return only one compact JSON object. Do not use markdown fences.",
    "The JSON must match schema nexus.workflowPro.brainReviewProposal.v1.",
    "optimizedWorkflow must be a complete nexus.workflow.v1 object, not prose and not a partial patch.",
    "Use only supported node types and edge contracts found in the fallbackWorkflowJson/capabilityInventory.",
    "A file node is the compiler boundary for future image, zip, audio, video, or document transforms.",
    "The canvas can contain multiple workflow groups; this answer must create one new independent appendable workflow group.",
    "If a requested capability is not available, still design the best valid workflow with current nodes and list the missing capability explicitly.",
    "Write analysis, node rationale, and questions in Traditional Chinese. Keep technical identifiers in English.",
    "Keep the response complete and compact: analysis <= 900 Traditional Chinese characters, each node prompt <= 500 characters, each node rationale <= 180 characters, and questions <= 3 items.",
    "Do not include long reports, tutorials, transcripts, or repeated schema commentary inside the JSON.",
    "Do not claim screen execution, API success, image generation, or future compiler support that is not present in the provided runtime evidence.",
  ].join(" ");
}

function createLeanConversationContext(
  conversation: WorkflowGraphBrainPlannerMessage[],
) {
  return conversation
    .filter((message) => {
      const title = message.title.toLowerCase();
      const content = message.content.toLowerCase();

      return (
        !title.includes("error") &&
        !content.includes("graph brain llm returned") &&
        !content.includes("graph brain request failed")
      );
    })
    .slice(-3)
    .map((message) => ({
      content: message.content.slice(0, 600),
      role: message.role,
      title: message.title.slice(0, 80),
    }));
}

function normalizeOpenAiReasoningEffort(value: string) {
  if (
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }

  if (value === "none") {
    return "minimal";
  }

  return "high";
}

async function readResponseError(response: Response) {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as unknown;

    if (isRecord(parsed) && isRecord(parsed.error)) {
      return getString(parsed.error.message) || text.slice(0, 500);
    }

    return text.slice(0, 500);
  } catch {
    return "";
  }
}

function extractResponseText(body: unknown): string {
  if (isRecord(body) && typeof body.output_text === "string") {
  // chat/completions format (New API, DeepSeek, etc.)
  if (isRecord(body) && Array.isArray((body as any).choices)) {
    const firstChoice = (body as any).choices[0];
    if (firstChoice?.message?.content) {
      return String(firstChoice.message.content);
    }
  }

  // OpenAI responses API format (legacy)
    return body.output_text;
  }

  if (!isRecord(body) || !Array.isArray(body.output)) {
    return "";
  }

  return body.output
    .flatMap((item) => {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content.map((content) => {
        if (!isRecord(content)) {
          return "";
        }

        if (typeof content.text === "string") {
          return content.text;
        }

        if (typeof content.output_text === "string") {
          return content.output_text;
        }

        return "";
      });
    })
    .join("\n")
    .trim();
}

function parseBrainReviewProposal(text: string): WorkflowProBrainReviewProposal {
  if (!text.trim()) {
    throw new Error("Graph Brain LLM returned an empty response.");
  }

  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    throw new Error(
      `Graph Brain LLM did not return a JSON object. Preview: ${text.slice(0, 260)}`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error(
      `Graph Brain LLM returned malformed JSON. Preview: ${jsonText.slice(0, 260)}`,
    );
  }

  if (!isRecord(parsed)) {
    throw new Error("Parsed Graph Brain response is not an object.");
  }

  return parsed as WorkflowProBrainReviewProposal;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    return "";
  }

  return trimmed.slice(first, last + 1);
}

function normalizeTemplateHint(
  value: unknown,
): WorkflowBrainDraftTemplateId | "auto" {
  if (
    value === "image-file-two-llm-answer" ||
    value === "audio-prompt-image-reverse-fanout" ||
    value === "baseline-linear" ||
    value === "llm-to-image" ||
    value === "image-reverse-fanout"
  ) {
    return value;
  }

  return "auto";
}

function normalizeConversation(value: unknown): WorkflowGraphBrainPlannerMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-8)
    .map((item): WorkflowGraphBrainPlannerMessage | null => {
      if (!isRecord(item)) {
        return null;
      }

      const content = getString(item.content);
      const title = getString(item.title) || "Previous Brain Message";
      const role = normalizePlannerMessageRole(item.role);

      if (!content) {
        return null;
      }

      return {
        content: content.slice(0, 1800),
        role,
        title: title.slice(0, 120),
      };
    })
    .filter((item): item is WorkflowGraphBrainPlannerMessage => Boolean(item));
}

function normalizePayloadModelSettings(
  value: unknown,
): Partial<WorkflowGraphBrainModelSettings> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    modelId: getString(value.modelId),
    reasoningDetail: normalizeReasoningDetail(value.reasoningDetail),
    reasoningEffort: normalizeReasoningEffort(value.reasoningEffort),
    verbosity: normalizeVerbosity(value.verbosity),
  };
}

function normalizePlannerMessageRole(
  value: unknown,
): WorkflowGraphBrainPlannerMessage["role"] {
  return value === "operator" ||
    value === "architect" ||
    value === "compiler" ||
    value === "system"
    ? value
    : "system";
}

function normalizeReasoningDetail(
  value: unknown,
): WorkflowGraphBrainModelSettings["reasoningDetail"] | undefined {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : undefined;
}

function normalizeReasoningEffort(
  value: unknown,
): WorkflowGraphBrainModelSettings["reasoningEffort"] | undefined {
  return value === "none" ||
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
    ? value
    : undefined;
}

function normalizeVerbosity(
  value: unknown,
): WorkflowGraphBrainModelSettings["verbosity"] | undefined {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : undefined;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
