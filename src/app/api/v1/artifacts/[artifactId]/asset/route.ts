import { REQUEST_ID_HEADER } from "@/lib/backend/contracts/idempotency";
import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { toApiError } from "@/lib/backend/api/api-errors";
import { createArtifactServiceForRequest } from "@/lib/backend/artifacts/artifact-route-service";
import { downloadGeneratedImageAssetFromStorage } from "@/lib/backend/image-generation/generated-image-asset-storage";
import { getSupabaseRequestAccessToken } from "@/lib/backend/security/auth-session";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ artifactId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? makeId("req");
  const traceId = request.headers.get("X-Trace-Id") ?? makeId("trace");
  const { artifactId } = await context.params;

  try {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get("workspaceId") ??
      request.headers.get("X-Workspace-Id") ??
      "";

    if (!workspaceId) {
      return jsonError("VALIDATION_FAILED", "workspaceId is required.", 400, {
        requestId,
        traceId,
      });
    }

    const { actorUserId } = await resolveApiActor(request, {
      declaredUserId: request.headers.get("X-User-Id"),
      required: true,
    });
    const permission = await createWorkspaceStatePermissionService({
      request,
    }).check({
      action: "workspace.read",
      resourceId: artifactId,
      resourceType: "artifact",
      userId: actorUserId ?? "",
      workspaceId,
    }, {
      requestId,
      traceId,
    });

    if (permission.decision !== "allow") {
      return jsonError("PERMISSION_DENIED", "Permission denied.", 403, {
        requestId,
        traceId,
      });
    }

    const { artifact } = await createArtifactServiceForRequest(request).getArtifact(
      artifactId,
      { workspaceId },
    );
    const generatedAsset = readGeneratedAssetMetadata(artifact.metadata);
    const assetId =
      generatedAsset.assetId ??
      readGeneratedImageAssetIdFromUrl(artifact.contentUrl ?? "");
    const stored = await downloadGeneratedImageAssetFromStorage({
      accessToken: getSupabaseRequestAccessToken(request),
      assetId,
      path: generatedAsset.path,
      workspaceId,
    });

    if (!stored) {
      return jsonError(
        "ARTIFACT_NOT_FOUND",
        "Artifact asset bytes were not found.",
        404,
        { requestId, traceId },
      );
    }

    return createBinaryResponse({
      bytes: stored.bytes,
      fileName: createArtifactAssetFilename({
        artifactId,
        mimeType: stored.mimeType || artifact.mimeType || "image/png",
        title: artifact.title,
      }),
      mimeType: stored.mimeType || artifact.mimeType || "image/png",
    });
  } catch (error) {
    const apiError = toApiError(error);

    return jsonError(apiError.code, apiError.message, apiError.statusCode, {
      requestId,
      traceId,
    });
  }
}

function createBinaryResponse(input: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}) {
  const body = new ArrayBuffer(input.bytes.byteLength);

  new Uint8Array(body).set(input.bytes);

  return new Response(body, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `attachment; filename="${input.fileName}"`,
      "Content-Type": input.mimeType,
      "X-Content-Type-Options": "nosniff",
      "X-Nexus-Artifact-Asset-Byte-Length": String(input.bytes.byteLength),
    },
  });
}

function jsonError(
  code: string,
  message: string,
  status: number,
  meta: { requestId: string; traceId: string },
) {
  return Response.json(
    {
      data: null,
      error: {
        code,
        message,
        retryable: false,
      },
      meta,
      ok: false,
    },
    { status },
  );
}

function readGeneratedAssetMetadata(metadata: Record<string, unknown>) {
  const generatedAsset = isRecord(metadata.generatedAsset)
    ? metadata.generatedAsset
    : {};

  return {
    assetId:
      typeof generatedAsset.assetId === "string"
        ? generatedAsset.assetId
        : null,
    path:
      typeof generatedAsset.path === "string"
        ? generatedAsset.path
        : null,
  };
}

function readGeneratedImageAssetIdFromUrl(value: string) {
  try {
    const url = new URL(value, "http://localhost");
    const match = /^\/api\/image-gen\/assets\/([^/]+)$/u.exec(url.pathname);

    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function createArtifactAssetFilename(input: {
  artifactId: string;
  mimeType: string;
  title?: string | null;
}) {
  const baseName = sanitizeFilenameSegment(
    input.title ?? `generated-image-${input.artifactId.slice(0, 8)}`,
  );

  return `${baseName}.${extensionForMimeType(input.mimeType)}`;
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

function makeId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

