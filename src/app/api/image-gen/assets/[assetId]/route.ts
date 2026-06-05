import { getGeneratedImageAsset } from "@/lib/backend/image-generation/generated-image-asset-cache";
import { downloadGeneratedImageAssetFromStorage } from "@/lib/backend/image-generation/generated-image-asset-storage";
import { getSupabaseRequestAccessToken } from "@/lib/backend/security/auth-session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const url = new URL(request.url);
  const asset = getGeneratedImageAsset(assetId);

  if (asset) {
    return createGeneratedImageResponse({
      assetId: asset.id,
      bytes: asset.bytes,
      cacheControl: "private, max-age=3600",
      disposition: "inline",
      mimeType: asset.mimeType,
    });
  }

  const stored = await downloadGeneratedImageAssetFromStorage({
    accessToken: getSupabaseRequestAccessToken(request),
    assetId,
    workspaceId:
      url.searchParams.get("workspaceId") ??
      request.headers.get("X-Workspace-Id"),
  });

  if (!stored) {
    return Response.json({ error: "Generated image asset was not found." }, { status: 404 });
  }

  return createGeneratedImageResponse({
    assetId,
    bytes: stored.bytes,
    cacheControl: "private, max-age=60",
    disposition: "inline",
    mimeType: stored.mimeType,
  });
}

function createGeneratedImageResponse(input: {
  assetId: string;
  bytes: Uint8Array;
  cacheControl: string;
  disposition: "attachment" | "inline";
  mimeType: string;
}) {
  const body = new ArrayBuffer(input.bytes.byteLength);

  new Uint8Array(body).set(input.bytes);

  return new Response(body, {
    headers: {
      "Cache-Control": input.cacheControl,
      "Content-Disposition": `${input.disposition}; filename="${createGeneratedImageFilename(input.assetId, input.mimeType)}"`,
      "Content-Type": input.mimeType,
      "X-Content-Type-Options": "nosniff",
      "X-Nexus-Generated-Asset-Byte-Length": String(input.bytes.byteLength),
      "X-Nexus-Generated-Asset-Id": input.assetId,
    },
  });
}

function createGeneratedImageFilename(assetId: string, mimeType: string) {
  return `${sanitizeFilenameSegment(assetId)}.${extensionForMimeType(mimeType)}`;
}

function sanitizeFilenameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 96) || "generated-image";
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/png":
    default:
      return "png";
  }
}
