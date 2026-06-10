import {
  executeMemoryCompression,
  getCompatibleBaseUrl,
  type MemoryCompressRequest,
} from "@/lib/backend/api/memory-compress-service";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  let requestPayload: MemoryCompressRequest = {};

  try {
    requestPayload = (await request.json()) as MemoryCompressRequest;
  } catch {
    return Response.json({ error: "invalid-json", mockFallback: true });
  }

  const result = await executeMemoryCompression({
    apiKey:
      process.env.NEW_API_KEY?.replace(/[^\x20-\x7E]/g, "").trim() ||
      process.env.OPENAI_API_KEY?.replace(/[^\x20-\x7E]/g, "").trim() ||
      "",
    baseUrl: getCompatibleBaseUrl(
      process.env.NEW_API_BASE_URL || process.env.OPENAI_BASE_URL,
    ),
    requestPayload,
  });

  return Response.json(result);
}
