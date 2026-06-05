import {
  DalleImageAdapter,
  MockImageAdapter,
  normalizeImageBaseUrl,
  type ImageAdapterResult,
} from "@/lib/adapters/image-adapter";
import { getRuntimeBearerToken } from "@/lib/backend/api/memory-compress-service";
import {
  createGeneratedImageAssetFromBytes,
  createGeneratedImageAssetUrl,
  parseBase64ImageDataUrl,
} from "@/lib/backend/image-generation/generated-image-asset-cache";
import { uploadGeneratedImageAssetToStorage } from "@/lib/backend/image-generation/generated-image-asset-storage";
import { normalizeGeneratedPngForAspectRatio } from "@/lib/backend/image-generation/generated-image-postprocess";
import {
  createSupabaseBearerAuthSessionVerifier,
  getBearerToken as getSupabaseBearerToken,
  getSupabaseRequestAccessToken,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import type { PermissionService } from "@/lib/backend/security/permission-service";
import { createWorkspaceStatePermissionService } from "@/lib/backend/workspace/workspace-permission";
import { normalizeWorkspaceComposerImageSettings } from "@/lib/composer/image-generation-settings";
import { normalizeImageApiKeyCandidate } from "@/lib/media/image-api-credential";

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
  workspaceId?: unknown;
};
type ImagePermissionService = Pick<PermissionService, "check">;
type ImagePermissionServiceFactoryInput = {
  accessToken: string | null;
  request: Request;
};
type ImagePermissionServiceFactory = (
  input: ImagePermissionServiceFactoryInput,
) => ImagePermissionService;

let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();
let permissionServiceOverride: ImagePermissionService | null = null;
let permissionServiceFactory: ImagePermissionServiceFactory =
  createRequestScopedImagePermissionService;

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getServerImageApiKey() {
  return normalizeImageApiKeyCandidate(process.env.OPENAI_API_KEY) ?? "";
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

  const accessFailure = await assertImageGenerationRouteAccess(request, payload);

  if (accessFailure) {
    return accessFailure;
  }

  const prompt = getString(payload.prompt, "");

  if (!prompt) {
    return Response.json({ error: "Image prompt is required." }, { status: 400 });
  }

  const apiKey = resolveImageGenerationApiKey(request.headers);
  const baseUrl = normalizeImageBaseUrl(
    request.headers.get("x-openai-base-url") ?? getServerImageBaseUrl(),
  );
  const agent = {
    accent: getString(payload.agent?.accent, "#a78bfa"),
    callsign: getString(payload.agent?.callsign, "IMAGE"),
    model: getString(payload.model, process.env.OPENAI_IMAGE_MODEL ?? "img2"),
  };
  const imageSettings = normalizeWorkspaceComposerImageSettings(
    isRecord(payload.imageSettings) ? payload.imageSettings : undefined,
  );
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

    return Response.json(
      await materializeImageResultForBrowser(result, imageSettings, {
        accessToken: getSupabaseRequestAccessToken(request),
        workspaceId:
          getString(payload.workspaceId, "") ||
          getString(request.headers.get("x-workspace-id"), ""),
      }),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Image generation failed.";

    return Response.json({ error: detail }, { status: 502 });
  }
}

export function resolveImageGenerationApiKey(headers: Headers) {
  return (
    normalizeImageApiKeyCandidate(
      headers.get("X-Nexus-Runtime-Authorization"),
    ) ??
    normalizeImageApiKeyCandidate(getRuntimeBearerToken(headers)) ??
    getServerImageApiKey()
  );
}

export function setImageGenerationRouteDependenciesForTests(dependencies: {
  authVerifier?: AuthSessionVerifier;
  permission?: ImagePermissionService;
  permissionFactory?: ImagePermissionServiceFactory;
}) {
  if (dependencies.authVerifier) {
    authSessionVerifier = dependencies.authVerifier;
  }

  if (dependencies.permission) {
    permissionServiceOverride = dependencies.permission;
  }

  if (dependencies.permissionFactory) {
    permissionServiceFactory = dependencies.permissionFactory;
  }
}

export function resetImageGenerationRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  permissionServiceOverride = null;
  permissionServiceFactory = createRequestScopedImagePermissionService;
}

async function assertImageGenerationRouteAccess(
  request: Request,
  payload: ImageGenerationPayload,
) {
  if (!isProductionRuntime()) {
    return null;
  }

  const workspaceId =
    getString(payload.workspaceId, "") ||
    getString(request.headers.get("x-workspace-id"), "");

  if (!workspaceId) {
    return Response.json(
      { error: "workspaceId is required for image generation." },
      { status: 400 },
    );
  }

  try {
    const sessionUser = await authSessionVerifier.verifyRequest(request);
    const accessToken = getSupabaseBearerToken(
      request.headers.get("authorization"),
    );
    const declaredUserId = getString(request.headers.get("x-user-id"), "");

    if (declaredUserId && declaredUserId !== sessionUser.id) {
      return Response.json(
        { error: "X-User-Id does not match the authenticated session." },
        { status: 401 },
      );
    }

    const permissionService =
      permissionServiceOverride ??
      permissionServiceFactory({
        accessToken,
        request,
      });
    const decision = await permissionService.check({
      action: "workspace.update",
      resourceType: "workspace",
      userId: sessionUser.id,
      workspaceId,
    });

    if (decision.decision !== "allow") {
      return Response.json(
        {
          error: "Permission denied.",
          reasonCode: decision.reasonCode,
        },
        { status: 403 },
      );
    }
  } catch {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  return null;
}

function createRequestScopedImagePermissionService({
  accessToken,
  request,
}: ImagePermissionServiceFactoryInput) {
  return createWorkspaceStatePermissionService({
    accessToken,
    request,
  });
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

async function materializeImageResultForBrowser(
  result: ImageAdapterResult,
  imageSettings: ReturnType<typeof normalizeWorkspaceComposerImageSettings>,
  persistence: {
    accessToken?: string | null;
    workspaceId?: string | null;
  } = {},
): Promise<ImageAdapterResult> {
  const mediaUrl = result.media.url;

  if (!mediaUrl.startsWith("data:image/") || !mediaUrl.includes(";base64,")) {
    return result;
  }

  const parsed = parseBase64ImageDataUrl(mediaUrl);

  if (!parsed) {
    return result;
  }

  const normalized = await normalizeGeneratedPngForAspectRatio({
    aspectRatio: imageSettings.aspectRatio,
    bytes: Uint8Array.from(Buffer.from(parsed.base64, "base64")),
    mimeType: parsed.mimeType,
  });
  const transientAsset = createGeneratedImageAssetFromBytes({
    bytes: normalized.bytes,
    mimeType: normalized.mimeType,
  });
  const assetUrl = createGeneratedImageAssetUrl(
    transientAsset.id,
    persistence.workspaceId,
  );
  let generatedAsset: ImageAdapterResult["generatedAsset"] = {
    assetId: transientAsset.id,
    durable: false,
    mimeType: normalized.mimeType,
    provider: "memory",
    sizeBytes: normalized.bytes.byteLength,
    url: assetUrl,
  };

  try {
    const storageReference = await uploadGeneratedImageAssetToStorage({
      accessToken: persistence.accessToken,
      assetId: transientAsset.id,
      bytes: normalized.bytes,
      mimeType: normalized.mimeType,
      workspaceId: persistence.workspaceId,
    });

    if (storageReference) {
      generatedAsset = {
        assetId: storageReference.assetId,
        bucket: storageReference.bucket,
        durable: true,
        mimeType: storageReference.mimeType,
        path: storageReference.path,
        provider: storageReference.provider,
        sizeBytes: storageReference.sizeBytes,
        url: assetUrl,
      };
    }
  } catch {
    generatedAsset = {
      ...generatedAsset,
      durable: false,
      provider: "memory",
    };
  }

  if (assetUrl === mediaUrl) {
    return {
      ...result,
      generatedAsset,
    };
  }

  return {
    ...result,
    content: result.content.replaceAll(mediaUrl, assetUrl),
    generatedAsset,
    media: {
      ...result.media,
      url: assetUrl,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
