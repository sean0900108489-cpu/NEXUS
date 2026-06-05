import { DEFAULT_BASE_URL } from "@/lib/nexus-defaults";

export const runtime = "nodejs";

export async function GET() {
  const openAiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const baseUrlConfigured = Boolean(
    process.env.OPENAI_BASE_URL?.trim() ||
      process.env.OPENAI_IMAGE_BASE_URL?.trim(),
  );
  const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || null;

  return Response.json({
    ok: true,
    server: {
      openai: {
        apiKeyConfigured: openAiKeyConfigured,
        baseUrlConfigured,
        defaultBaseUrl: DEFAULT_BASE_URL,
        imageModel,
        imageModelConfigured: Boolean(imageModel),
      },
    },
  });
}
