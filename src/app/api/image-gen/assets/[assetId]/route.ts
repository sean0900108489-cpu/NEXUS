import { getGeneratedImageAsset } from "@/lib/backend/image-generation/generated-image-asset-cache";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = getGeneratedImageAsset(assetId);

  if (!asset) {
    return Response.json({ error: "Generated image asset was not found." }, { status: 404 });
  }

  const body = new ArrayBuffer(asset.bytes.byteLength);

  new Uint8Array(body).set(asset.bytes);

  return new Response(body, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": asset.mimeType,
    },
  });
}
