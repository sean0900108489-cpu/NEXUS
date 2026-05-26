import type { StreamMode } from "@/lib/nexus-types";

export const runtime = "nodejs";

export async function GET() {
  const streamMode: StreamMode = "mock";

  return Response.json({
    streamMode,
    openAICompatible: false,
    keySource: "ui",
  });
}
