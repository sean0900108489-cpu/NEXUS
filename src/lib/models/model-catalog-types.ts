export type PublicModelProviderFamily = "OpenAI" | "Claude" | "Gemini" | "DeepSeek" | "Grok";
export type PublicUserPlan = "Free" | "Basic" | "Pro" | "Team";
export type PublicModelModality = "chat" | "image";

export type PublicModelCatalogEntry = {
  id: string;
  label: string;
  modality: PublicModelModality;
  provider_family: PublicModelProviderFamily;
  description: string;
  best_for: string[];
  min_plan: PublicUserPlan;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_tools: boolean;
  supports_long_context?: boolean;
  supports_file_input?: boolean;
  supports_image_input?: boolean;
  default_max_tokens: number;
  max_output_tokens: number;
  enabled: boolean;
};

export type ModelCatalogResponse = {
  models: PublicModelCatalogEntry[];
  plan: PublicUserPlan;
};
