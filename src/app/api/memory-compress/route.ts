import {
  executeMemoryCompression,
  getBearerToken,
  getCompatibleBaseUrl,
  type MemoryCompressRequest,
} from "@/lib/backend/api/memory-compress-service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let requestPayload: MemoryCompressRequest = {};

  try {
    requestPayload = (await request.json()) as MemoryCompressRequest;
  } catch {
    return Response.json({ error: "invalid-json", mockFallback: true });
  }

  const result = await executeMemoryCompression({
    apiKey: getBearerToken(request.headers.get("authorization")),
    baseUrl: getCompatibleBaseUrl(
      request.headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL,
    ),
    requestPayload,
  });

  return Response.json(result);
}
