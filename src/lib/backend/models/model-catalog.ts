import { ApiError } from "@/lib/backend/api/api-errors";
import type {
  PublicModelModality,
  PublicModelCatalogEntry,
  PublicModelProviderFamily,
  PublicUserPlan,
} from "@/lib/models/model-catalog-types";

export type UserPlan = PublicUserPlan;
export type ModelProviderFamily = PublicModelProviderFamily;
export type ModelModality = PublicModelModality;

export type ProductModelCatalogEntry = {
  id: string;
  label: string;
  modality: ModelModality;
  provider_family: ModelProviderFamily;
  new_api_model: string;
  description: string;
  best_for: string[];
  min_plan: UserPlan;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_long_context?: boolean;
  default_max_tokens: number;
  max_output_tokens: number;
  enabled: boolean;
};

const PLAN_RANK: Record<UserPlan, number> = {
  Free: 0,
  Basic: 1,
  Pro: 2,
  Team: 3,
};

export const SAFE_DEFAULT_MODEL_ID = "gpt-4o-mini";

export const SERVER_MODEL_CATALOG: ProductModelCatalogEntry[] = [
  // === ENABLED CHAT MODELS ===
  {
    best_for: ["chat", "classification", "light coding"],
    default_max_tokens: 2048,
    description: "Fast, low-cost general model for everyday operator work.",
    enabled: true,
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    max_output_tokens: 4096,
    min_plan: "Free",
    modality: "chat",
    new_api_model: "gpt-4o-mini",
    provider_family: "OpenAI",
    supports_reasoning: false,
    supports_tools: true,
    supports_vision: true,
  },
  {
    best_for: ["reasoning", "coding", "analysis", "heavy operator work"],
    default_max_tokens: 4096,
    description: "DeepSeek V4 Pro flagship reasoning model.",
    enabled: true,
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    max_output_tokens: 8192,
    min_plan: "Pro",
    modality: "chat",
    new_api_model: "deepseek-v4-pro",
    provider_family: "DeepSeek",
    supports_reasoning: true,
    supports_tools: true,
    supports_vision: false,
  },
  {
    best_for: ["fast reasoning", "light coding", "quick analysis"],
    default_max_tokens: 2048,
    description: "DeepSeek V4 Flash — fast, low-cost reasoning model.",
    enabled: true,
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    max_output_tokens: 4096,
    min_plan: "Basic",
    modality: "chat",
    new_api_model: "deepseek-v4-flash",
    provider_family: "DeepSeek",
    supports_reasoning: true,
    supports_tools: false,
    supports_vision: false,
  },
  {
    best_for: ["chat", "low-cost tasks"],
    default_max_tokens: 2048,
    description: "Cost-effective general chat model.",
    enabled: true,
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    max_output_tokens: 4096,
    min_plan: "Free",
    modality: "chat",
    new_api_model: "deepseek-chat",
    provider_family: "DeepSeek",
    supports_reasoning: false,
    supports_tools: false,
    supports_vision: false,
  },
  // === DISABLED — not in enabled New API channels ===
  // gpt-4o, gemini-2.5-flash, gemini-2.5-pro, claude-sonnet-4-20250514
  // Re-enable when provider channels are provisioned.
  {
    best_for: ["reasoning", "coding", "analysis"],
    default_max_tokens: 4096,
    description: "Balanced reasoning model for heavier operator tasks.",
    enabled: false,
    id: "gpt-4o",
    label: "GPT-4o",
    max_output_tokens: 8192,
    min_plan: "Basic",
    modality: "chat",
    new_api_model: "gpt-4o",
    provider_family: "OpenAI",
    supports_reasoning: true,
    supports_tools: true,
    supports_vision: true,
  },
  {
    best_for: ["chat", "multimodal", "fast research"],
    default_max_tokens: 4096,
    description: "Fast Gemini model for affordable multimodal operator work.",
    enabled: false,
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    max_output_tokens: 8192,
    min_plan: "Basic",
    modality: "chat",
    new_api_model: "gemini-2.5-flash",
    provider_family: "Gemini",
    supports_reasoning: false,
    supports_tools: true,
    supports_vision: true,
  },
  {
    best_for: ["writing", "analysis", "coding"],
    default_max_tokens: 4096,
    description: "High-quality writing, analysis, and coding model.",
    enabled: false,
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    max_output_tokens: 8192,
    min_plan: "Pro",
    modality: "chat",
    new_api_model: "claude-sonnet-4-20250514",
    provider_family: "Claude",
    supports_long_context: true,
    supports_reasoning: true,
    supports_tools: true,
    supports_vision: true,
  },
  {
    best_for: ["multimodal", "long context", "research"],
    default_max_tokens: 4096,
    description: "Gemini family model for multimodal and long-context work.",
    enabled: false,
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    max_output_tokens: 8192,
    min_plan: "Pro",
    modality: "chat",
    new_api_model: "gemini-2.5-pro",
    provider_family: "Gemini",
    supports_long_context: true,
    supports_reasoning: true,
    supports_tools: true,
    supports_vision: true,
  },
  // === ENABLED IMAGE MODELS (mapped to provider IDs) ===
  // img2 → gpt-image-2, riverflow-v2.5-fast → sourceful/riverflow-v2.5-fast
  {
    best_for: ["image generation", "workflow media", "visual concepts"],
    default_max_tokens: 0,
    description: "Server-routed image generation model for workflow image nodes.",
    enabled: true,
    id: "img2",
    label: "GPT Image 2",
    max_output_tokens: 0,
    min_plan: "Basic",
    modality: "image",
    new_api_model: "gpt-image-2",
    provider_family: "OpenAI",
    supports_reasoning: false,
    supports_tools: false,
    supports_vision: true,
  },
  {
    best_for: ["image generation", "fast visual concepts", "social media"],
    default_max_tokens: 0,
    description: "Sourceful Riverflow v2.5 Fast image generation model.",
    enabled: true,
    id: "riverflow-v2.5-fast",
    label: "Riverflow v2.5 Fast",
    max_output_tokens: 0,
    min_plan: "Free",
    modality: "image",
    new_api_model: "sourceful/riverflow-v2.5-fast",
    provider_family: "Gemini",
    supports_reasoning: false,
    supports_tools: false,
    supports_vision: true,
  },
];

export function normalizeUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") {
    return "Free";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "team" || normalized === "business" || normalized === "enterprise") {
    return "Team";
  }

  if (normalized === "basic" || normalized === "starter") {
    return "Basic";
  }

  if (normalized === "pro" || normalized === "plus") {
    return "Pro";
  }

  return "Free";
}

export function canPlanUseModel(plan: UserPlan, model: ProductModelCatalogEntry) {
  return model.enabled && PLAN_RANK[plan] >= PLAN_RANK[model.min_plan];
}

export function getAllowedModelCatalogForPlan(plan: UserPlan) {
  return getAllowedModelCatalogForPlanAndModality(plan, "chat");
}

export function getAllowedModelCatalogForPlanAndModality(
  plan: UserPlan,
  modality: ModelModality,
) {
  return SERVER_MODEL_CATALOG.filter(
    (model) => model.modality === modality && canPlanUseModel(plan, model),
  );
}

export function toPublicModelCatalogEntry(model: ProductModelCatalogEntry): PublicModelCatalogEntry {
  return {
    best_for: model.best_for,
    default_max_tokens: model.default_max_tokens,
    description: model.description,
    enabled: model.enabled,
    id: model.id,
    label: model.label,
    max_output_tokens: model.max_output_tokens,
    min_plan: model.min_plan,
    modality: model.modality,
    provider_family: model.provider_family,
    supports_long_context: model.supports_long_context,
    supports_reasoning: model.supports_reasoning,
    supports_tools: model.supports_tools,
    supports_vision: model.supports_vision,
  };
}

export function getPublicModelCatalogForPlan(plan: UserPlan) {
  return getAllowedModelCatalogForPlan(plan).map(toPublicModelCatalogEntry);
}

export function getCatalogModel(modelId: string | undefined) {
  const normalized = modelId?.trim();

  return normalized
    ? SERVER_MODEL_CATALOG.find((model) => model.id === normalized)
    : undefined;
}

export function assertModelAllowedForPlan(modelId: string, plan: UserPlan) {
  const model = getCatalogModel(modelId);

  if (!model) {
    throw new ApiError("VALIDATION_FAILED", "Model id is not in the server-side catalog.", 400, {
      issues: [
        {
          code: "model_not_in_catalog",
          message: "Model id is not in the server-side catalog.",
          path: ["modelId"],
        },
      ],
    });
  }

  if (!model.enabled) {
    throw new ApiError("VALIDATION_FAILED", "Model is disabled.", 400, {
      issues: [{ code: "model_disabled", message: "Model is disabled.", path: ["modelId"] }],
    });
  }

  if (!canPlanUseModel(plan, model)) {
    throw new ApiError("PERMISSION_DENIED", "Requested model is not allowed for this plan.", 403, {
      modelId,
      minPlan: model.min_plan,
      plan,
    });
  }

  return model;
}

export function resolveAllowedModelId(modelId: string | undefined, plan: UserPlan) {
  const requested = modelId?.trim();

  if (requested) {
    const model = getCatalogModel(requested);

    if (model && canPlanUseModel(plan, model)) {
      return model.id;
    }
  }

  const safeDefault = getCatalogModel(SAFE_DEFAULT_MODEL_ID);

  if (safeDefault && canPlanUseModel(plan, safeDefault)) {
    return safeDefault.id;
  }

  return getAllowedModelCatalogForPlan(plan)[0]?.id ?? SAFE_DEFAULT_MODEL_ID;
}

export function assertRequestedFeaturesAllowed(input: {
  model: ProductModelCatalogEntry;
  requestedFeatures?: {
    reasoning?: boolean;
    tools?: boolean;
    vision?: boolean;
    longContext?: boolean;
  };
}) {
  const features = input.requestedFeatures;

  if (!features) {
    return;
  }

  const denied = [
    features.reasoning && !input.model.supports_reasoning ? "reasoning" : null,
    features.tools && !input.model.supports_tools ? "tools" : null,
    features.vision && !input.model.supports_vision ? "vision" : null,
    features.longContext && !input.model.supports_long_context ? "long_context" : null,
  ].filter(Boolean);

  if (denied.length) {
    throw new ApiError("PERMISSION_DENIED", "Requested feature is not allowed for this model.", 403, {
      denied,
      modelId: input.model.id,
    });
  }
}
