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
import { getCatalogModel } from "@/lib/backend/models/model-catalog";
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
    const blocked = blockLegacyToolRouteInProduction("brain-draft");

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

  const rawModel =
    process.env.WORKFLOW_BRAIN_MODEL?.trim() ||
    process.env.REPORT_MODEL?.trim() ||
    fallback.modelSettings.modelId;

  // --- Product gate: plan + catalog ---
  const { assertModelAllowedForPlan } = await import(
    "@/lib/backend/models/model-catalog"
  );
  const { getUserPlan, isModelAllowedByPlan } = await import(
    "@/lib/backend/models/plan-config"
  );
  const { createUsageLedgerRepository } = await import(
    "@/lib/backend/models/usage-ledger"
  );
  const { createWalletRepository } = await import(
    "@/lib/backend/models/wallet-repository"
  );

  const plan = getUserPlan({ request, userId: actor.actorUserId });
  const catalogModel = getCatalogModel(rawModel);
  const resolvedModelId = catalogModel?.id ?? rawModel;
  const model = catalogModel?.new_api_model ?? rawModel;

  // Validate model is allowed for this plan
  const validModel = assertModelAllowedForPlan(resolvedModelId, plan);
  if (!isModelAllowedByPlan(validModel.id, plan)) {
    throw new Error(
      `Model ${validModel.id} is not available on your ${plan} plan.`,
    );
  }

  const userToken = await getUserNewApiToken({ userId: actor.actorUserId });

  const controller = new AbortController();
  const startTime = Date.now();
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

  const elapsedMs = Date.now() - startTime;

  if (!response.ok) {
    const detail = await readResponseError(response);

    // Record failure in usage ledger
    const ledger = createUsageLedgerRepository();
    ledger.insert({
      credits: 0,
      errorCode: response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_TIMEOUT",
      inputTokens: 0,
      modelId: validModel.id,
      newApiModel: model,
      operatorId: "brain-draft",
      outputTokens: 0,
      providerFamily: validModel.provider_family,
      requestId: response.headers.get("x-request-id") ?? "brain-draft",
      sourceType: "brain_draft",
      status: "failed",
      totalTokens: 0,
      userId: actor.actorUserId,
    }).catch(() => {});

    throw new Error(
      detail
        ? `Graph Brain LLM request failed: ${detail}`
        : `Graph Brain LLM request failed with status ${response.status}.`,
    );
  }

  const body = (await response.json()) as unknown;
  const text = extractResponseText(body);
  const proposal = parseBrainReviewProposal(text);

  // Record success in usage ledger
  const rawUsage = (body as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage;
  const inpTokens = rawUsage?.prompt_tokens ?? 0;
  const outTokens = rawUsage?.completion_tokens ?? 0;
  const totTokens = rawUsage?.total_tokens ?? inpTokens + outTokens;

  const ledgerRepo = createUsageLedgerRepository();
  ledgerRepo.insert({
    credits: 1,
    errorCode: null,
    inputTokens: inpTokens,
    modelId: validModel.id,
    newApiModel: model,
    operatorId: "brain-draft",
    outputTokens: outTokens,
    providerFamily: validModel.provider_family,
    requestId: "brain-draft",
    sourceType: "brain_draft",
    status: "succeeded",
    totalTokens: totTokens,
    userId: actor.actorUserId,
  }).catch(() => {});

  // Wallet deduction
  createWalletRepository().createTransaction({
    amount: -1,
    metadata: {
      estimatedCredits: 1,
      modelId: validModel.id,
      operationType: "chat_completion",
    },
    requestId: "brain-draft",
    source: "chat_completion",
    type: "deduction",
    userId: actor.actorUserId,
  }).catch((err) => {
    console.warn("[wallet] deduction write failed", { error: (err as Error).message, source: "brain-draft", userId: actor.actorUserId });
  });

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
    "You are the NEXUS Workflow Brain. Your job is simple: read the user\'s request, understand what tools are available, design the smallest possible workflow, and output valid JSON.",
    "Return a single JSON object matching schema nexus.workflowPro.brainReviewProposal.v1.",
    "ALWAYS include an optimizedWorkflow that is a complete nexus.workflow.v1 object — NOT prose, NOT a partial patch.",
    "Step 1 — Understand the request: What does the user want to accomplish?",
    "Step 2 — Check available tools: Only use node types from the capabilityInventory. Do not invent node types.",
    "Step 3 — Design the MVP: Use the FEWEST nodes possible to satisfy the request. Start simple, not complex.",
    "Step 4 — Fill in details: Each node needs type, id, position (x,y), label, purpose, data. Each edge needs source, target, sourceHandle, targetHandle.",
    "Step 5 — Output the JSON: optimizedWorkflow must have schema, id, name, intent, metadata, capabilityInventory, nodes, edges, execution, successCriteria.",
    "Rules:",
    "- Every model.llm node MUST have data.prompt (the instruction for that LLM).",
    "- Every model.llm node MUST have data.model set from the available model catalog.",
    "- Every model.llm node SHOULD have data.modelSettings with reasoningEffort and verbosity.",
    "- Use output.text as terminal display nodes.",
    "- Every edge must connect real node ids with sourceHandle 'output' and targetHandle 'input'.",
    "- If the request needs a capability that does not exist, list it in missingCapabilities and build the closest possible workflow.",
    "- Keep prompts short and specific. One node = one clear job.",
    "- Write analysis in Traditional Chinese. Keep technical identifiers in English.",
    "- Do not use markdown fences around the JSON.",
    "ALWAYS include analysis (Traditional Chinese, 1-3 sentences) and questionsForSean (1-3 questions about the workflow) in your response.",
    "ALWAYS include missingCapabilities as an array of strings (can be empty if nothing is missing).",
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
  // chat/completions format (New API, DeepSeek, etc.) — check FIRST
  if (isRecord(body) && Array.isArray(body.choices)) {
    const firstChoice = body.choices[0];
    if (isRecord(firstChoice) && isRecord(firstChoice.message)) {
      const content = firstChoice.message.content;
      if (content) {
        return String(content);
      }
    }
  }

  // OpenAI responses API format (legacy)
  if (isRecord(body) && typeof body.output_text === "string") {
    return body.output_text;
  }

  if (isRecord(body) && Array.isArray(body.output)) {
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

  return "";
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

  // Repair: ensure schema fields are present
  const repaired = repairBrainReviewProposal(parsed as Record<string, unknown>);

  return repaired as WorkflowProBrainReviewProposal;
}

function repairBrainReviewProposal(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const repaired = { ...parsed };

  // Fix schema if missing or wrong
  if (!repaired.schema || repaired.schema !== "nexus.workflowPro.brainReviewProposal.v1") {
    repaired.schema = "nexus.workflowPro.brainReviewProposal.v1";
  }

  // Fix workflow schema
  const wf = repaired.optimizedWorkflow as Record<string, unknown> | null | undefined;
  if (wf && typeof wf === "object" && !Array.isArray(wf)) {
    if (!wf.schema || wf.schema !== "nexus.workflow.v1") {
      wf.schema = "nexus.workflow.v1";
    }
    // Ensure outputs have ids
    const outputs = wf.outputs as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(outputs)) {
      for (let i = 0; i < outputs.length; i++) {
        if (!outputs[i].id) {
          outputs[i].id = `output-${i + 1}`;
        }
      }
    }
    // Ensure nodes have ids
    const nodes = wf.nodes as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(nodes)) {
      for (let i = 0; i < nodes.length; i++) {
        if (!nodes[i].id) {
          nodes[i].id = `node-${i + 1}`;
        }
      }
    }
    // Ensure edges have source/target
    const edges = wf.edges as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(edges)) {
      for (let i = 0; i < edges.length; i++) {
        if (!edges[i].id) {
          edges[i].id = `edge-${i + 1}`;
        }
      }
    }
  }

  return repaired;
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
    value === "image-reverse-fanout" ||
    value === "none"
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
