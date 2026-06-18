import { DEFAULT_BASE_URL } from "@/lib/nexus-defaults";
import type { AgentMediaArtifact, IToolExecutor, NexusAgent } from "@/lib/nexus-types";
import type { WorkspaceComposerImageSettings } from "@/lib/composer/image-generation-settings";
import { buildOpenAiCompatibleImageGenerationPayload } from "@/lib/media/image-generation-adapter-map";

/** Models that produce images via /v1/chat/completions instead of /v1/images/generations */
const CHAT_COMPLETIONS_IMAGE_MODEL_PREFIXES = ["sourceful/"];

/** Models that need explicit modalities: ["image", "text"] in chat/completions */
const MODELS_WITH_MODALITIES = ["google/"];

export type ImageAdapterMode = "mock" | "dall-e" | "chat-completions";

export type ImageAdapterAgent = Pick<
  NexusAgent,
  "accent" | "callsign" | "model"
>;

export type ImageAdapterRequest = {
  agent: ImageAdapterAgent;
  apiKey?: string;
  baseUrl?: string;
  imageSettings?: Partial<WorkspaceComposerImageSettings>;
  conversationId?: string;
  operatorId?: string;
  prompt: string;
  toolName: string;
  userId?: string;
  workspaceId?: string;
};

export type DalleImageAdapterRequest = ImageAdapterRequest & {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ImageAdapterResult = {
  content: string;
  generatedAsset?: {
    assetId: string;
    bucket?: string;
    durable: boolean;
    mimeType: string;
    path?: string;
    provider: "memory" | "supabase-storage";
    sizeBytes: number;
    url: string;
  };
  media: AgentMediaArtifact;
  mode: ImageAdapterMode;
  revisedPrompt?: string;
};

type OpenAIChatCompletionImageResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      images?: Array<{
        image_url?: {
          url?: string;
        };
        b64_json?: string;
      }>;
    };
  }>;
};

type OpenAIImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
    url?: string;
  }>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeImageBaseUrl(value: string | undefined) {
  const candidate = value?.trim() || DEFAULT_BASE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_BASE_URL;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function createMockImageUrl({
  accent,
  label,
  prompt,
}: {
  accent: string;
  label: string;
  prompt: string;
}) {
  const safePrompt = escapeSvgText(prompt.slice(0, 118));
  const safeLabel = escapeSvgText(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#111111"/>
          <stop offset="0.5" stop-color="#171717"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect width="1280" height="720" fill="url(#grid)" opacity="0.45"/>
      <rect x="72" y="74" width="1136" height="572" fill="rgba(2,6,23,0.64)" stroke="${accent}" stroke-width="2"/>
      <text x="104" y="138" fill="${accent}" font-family="monospace" font-size="28" letter-spacing="6">${safeLabel}</text>
      <text x="104" y="212" fill="#e2e8f0" font-family="monospace" font-size="46" font-weight="700">MOCK IMAGE ARTIFACT</text>
      <text x="104" y="286" fill="#94a3b8" font-family="monospace" font-size="24">${safePrompt}</text>
      <circle cx="1088" cy="520" r="78" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="2"/>
      <path d="M1062 480 L1062 560 L1130 520 Z" fill="${accent}" opacity="0.88"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class MockImageAdapter implements IToolExecutor {
  id = "mock-image-gen";
  type = "rest-api" as const;

  constructor(private readonly request: ImageAdapterRequest) {}

  async execute(): Promise<ImageAdapterResult> {
    const prompt =
      this.request.prompt.trim() || "Futuristic AI operations command center.";

    await sleep(900);

    const media: AgentMediaArtifact = {
      type: "image",
      prompt,
      createdAt: new Date().toISOString(),
      url: createMockImageUrl({
        accent: this.request.agent.accent,
        label: `${this.request.agent.callsign} / ${this.request.toolName}`,
        prompt,
      }),
    };

    return {
      content: [
        `${this.request.toolName} completed a mock image generation pass for ${this.request.agent.callsign}.`,
        `Prompt: ${prompt}`,
        `Placeholder image URL: ${media.url}`,
      ].join("\n"),
      media,
      mode: "mock",
    };
  }
}

export class DalleImageAdapter implements IToolExecutor {
  id = "real-image-gen";
  type = "rest-api" as const;

  constructor(private readonly request: DalleImageAdapterRequest) {}

  async execute(): Promise<ImageAdapterResult> {
    const prompt = this.request.prompt.trim();

    if (!prompt) {
      throw new Error("Image prompt is required.");
    }

    const model = this.request.model.trim() || "dall-e-3";

    const useChatCompletions = CHAT_COMPLETIONS_IMAGE_MODEL_PREFIXES.some(
      (prefix) => model.startsWith(prefix),
    );

    if (useChatCompletions) {
      return this.executeViaChatCompletions(model, prompt);
    }

    const requestBody: Record<string, unknown> = {
      ...buildOpenAiCompatibleImageGenerationPayload({
        model,
        prompt,
        settings: this.request.imageSettings,
      }),
    };

    if (model.startsWith("dall-e")) {
      requestBody.response_format = "url";
    }

    if (!model.startsWith("dall-e")) {
      delete requestBody.response_format;
    }

    const response = await fetch(
      `${normalizeImageBaseUrl(this.request.baseUrl)}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.request.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new Error(detail || `Image endpoint returned ${response.status}.`);
    }

    const payload = (await response.json()) as OpenAIImageGenerationResponse;
    const image = payload.data?.[0];
    const imageUrl =
      image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : "");
    const revisedPrompt = image?.revised_prompt;

    if (!imageUrl) {
      throw new Error("Image endpoint returned no image URL.");
    }

    const media: AgentMediaArtifact = {
      type: "image",
      prompt,
      createdAt: new Date().toISOString(),
      url: imageUrl,
    };

    return {
      content: [
        `${this.request.toolName} generated an image through ${model}.`,
        `Prompt: ${prompt}`,
        revisedPrompt ? `Revised prompt: ${revisedPrompt}` : "",
        `Image URL: ${imageUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      media,
      mode: "dall-e",
      revisedPrompt,
    };
  }

  private async executeViaChatCompletions(
    model: string,
    prompt: string,
  ): Promise<ImageAdapterResult> {
    const needsModalities = MODELS_WITH_MODALITIES.some(
      (prefix) => model.startsWith(prefix),
    );

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: "user" as const, content: prompt },
      ],
      max_tokens: 4096,
    };

    if (needsModalities) {
      requestBody.modalities = ["image", "text"];
    }

    // Pass aspect_ratio if available from imageSettings
    const aspectRatio = this.request.imageSettings?.aspectRatio;
    if (aspectRatio) {
      requestBody.image_config = { aspect_ratio: aspectRatio };
    }

    const response = await fetch(
      `${normalizeImageBaseUrl(this.request.baseUrl)}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.request.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new Error(detail || `Chat completions image endpoint returned ${response.status}.`);
    }

    const payload = (await response.json()) as OpenAIChatCompletionImageResponse;
    const message = payload.choices?.[0]?.message;
    const imageData = message?.images?.[0];
    const imageUrl =
      imageData?.image_url?.url ??
      (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : "");

    if (!imageUrl) {
      throw new Error("Chat completions image endpoint returned no image.");
    }

    const media: AgentMediaArtifact = {
      type: "image",
      prompt,
      createdAt: new Date().toISOString(),
      url: imageUrl,
    };

    return {
      content: [
        `${this.request.toolName} generated an image through ${model}.`,
        `Prompt: ${prompt}`,
        `Image URL: ${imageUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      media,
      mode: "chat-completions",
    };
  }
}

export async function executeImageAdapterForAgent(
  request: ImageAdapterRequest,
  options: { signal?: AbortSignal } = {},
): Promise<ImageAdapterResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = await resolveBrowserAccessToken();

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (request.workspaceId?.trim()) {
    headers["X-Workspace-Id"] = request.workspaceId.trim();
  }

  if (request.userId?.trim()) {
    headers["X-User-Id"] = request.userId.trim();
  }

  const response = await fetch("/api/image-gen", {
    method: "POST",
    headers,
    signal: options.signal,
    body: JSON.stringify({
      agent: {
        accent: request.agent.accent,
        callsign: request.agent.callsign,
      },
      imageSettings: request.imageSettings,
      model: request.agent.model || "dall-e-3",
      conversationId: request.conversationId,
      operatorId: request.operatorId,
      prompt: request.prompt,
      toolName: request.toolName,
      workspaceId: request.workspaceId,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(detail || `Image generation route returned ${response.status}.`);
  }

  return (await response.json()) as ImageAdapterResult;
}

async function resolveBrowserAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { getNexusSupabaseClient } = await import("@/lib/supabase/client");
    const { data } = await getNexusSupabaseClient().auth.getSession();

    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
