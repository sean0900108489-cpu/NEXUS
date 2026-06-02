import {
  DalleImageAdapter,
  MockImageAdapter,
  normalizeImageBaseUrl,
} from "@/lib/adapters/image-adapter";
import { normalizeWorkspaceComposerImageSettings } from "@/lib/composer/image-generation-settings";

export const runtime = "nodejs";

type ImageGenerationPayload = {
  agent?: {
    accent?: unknown;
    callsign?: unknown;
  };
  imageSettings?: unknown;
  model?: unknown;
  prompt?: unknown;
  toolName?: unknown;
};

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer" ? token?.trim() ?? "" : "";
}

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getServerImageApiKey() {
  return process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";
}

function getServerImageBaseUrl() {
  return (
    process.env.OPENAI_IMAGE_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    undefined
  );
}

export async function POST(request: Request) {
  let payload: ImageGenerationPayload;

  try {
    payload = (await request.json()) as ImageGenerationPayload;
  } catch {
    return Response.json({ error: "Invalid image generation payload." }, { status: 400 });
  }

  const prompt = getString(payload.prompt, "");

  if (!prompt) {
    return Response.json({ error: "Image prompt is required." }, { status: 400 });
  }

  const apiKey =
    getBearerToken(request.headers.get("authorization")) || getServerImageApiKey();
  const baseUrl = normalizeImageBaseUrl(
    request.headers.get("x-openai-base-url") ?? getServerImageBaseUrl(),
  );
  const agent = {
    accent: getString(payload.agent?.accent, "#a78bfa"),
    callsign: getString(payload.agent?.callsign, "IMAGE"),
    model: getString(payload.model, process.env.OPENAI_IMAGE_MODEL ?? "img2"),
  };
  const imageSettings = isRecord(payload.imageSettings)
    ? normalizeWorkspaceComposerImageSettings(payload.imageSettings)
    : undefined;
  const toolName = getString(payload.toolName, "Image Adapter");

  try {
    const adapter = apiKey
      ? new DalleImageAdapter({
          agent,
          apiKey,
          baseUrl,
          imageSettings,
          model: agent.model,
          prompt,
          toolName,
        })
      : new MockImageAdapter({
          agent,
          imageSettings,
          prompt,
          toolName,
        });
    const result = await adapter.execute();

    return Response.json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Image generation failed.";

    return Response.json({ error: detail }, { status: 502 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
