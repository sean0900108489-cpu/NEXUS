import {
  DalleImageAdapter,
  MockImageAdapter,
  normalizeImageBaseUrl,
  type ImageAdapterResult,
} from "@/lib/adapters/image-adapter";
import { ApiError, getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";
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
import {
  assertModelAllowedForPlan,
  getCatalogModel,
  type ProductModelCatalogEntry,
} from "@/lib/backend/models/model-catalog";
import {
  estimateImageGenerationCredits,
  getUserPlan,
  isModelAllowedByPlan,
} from "@/lib/backend/models/plan-config";
import { assertSufficientCredits } from "@/lib/backend/models/quota-gate";
import { createUsageLedgerRepository } from "@/lib/backend/models/usage-ledger";
import { createWalletRepository } from "@/lib/backend/models/wallet-repository";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
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
  conversationId?: unknown;
  imageSettings?: unknown;
  model?: unknown;
  operatorId?: unknown;
  prompt?: unknown;
  toolName?: unknown;
  workspaceId?: unknown;
};
type ImageGenerationRouteAccess = {
  accessToken: string | null;
  userId: string;
  workspaceId: string;
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
  return (
    normalizeImageApiKeyCandidate(process.env.NEW_API_KEY) ??
    normalizeImageApiKeyCandidate(process.env.OPENAI_API_KEY) ??
    ""
  );
}

function getServerImageBaseUrl() {
  return (
    process.env.NEW_API_BASE_URL?.trim() ||
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

  const routeAccess = await assertImageGenerationRouteAccess(request, payload);

  if (routeAccess instanceof Response) {
    return routeAccess;
  }

  const prompt = getString(payload.prompt, "");

  if (!prompt) {
    return Response.json({ error: "Image prompt is required." }, { status: 400 });
  }

  const baseUrl = normalizeImageBaseUrl(getServerImageBaseUrl());
  const agent = {
    accent: getString(payload.agent?.accent, "#a78bfa"),
    callsign: getString(payload.agent?.callsign, "IMAGE"),
    model: getString(payload.model, process.env.OPENAI_IMAGE_MODEL ?? "img2"),
  };
  const imageSettings = normalizeWorkspaceComposerImageSettings(
    isRecord(payload.imageSettings) ? payload.imageSettings : undefined,
  );
  const productUserId =
    routeAccess?.userId ?? getString(request.headers.get("x-user-id"), "");
  const productGate = productUserId
    ? await assertImageGenerationProductGate({
        imageSettings,
        modelId: agent.model,
        payload,
        request,
        userId: productUserId,
      }).catch((error) => toImageGenerationErrorResponse(error))
    : null;

  if (productGate instanceof Response) {
    return productGate;
  }

  const apiKey = productGate
    ? await getImageGenerationNewApiToken({
        model: productGate.model,
        payload,
        request,
        userId: productUserId,
      })
        .then((token) => token.token)
        .catch((error) => toImageGenerationErrorResponse(error))
    : resolveImageGenerationApiKey();

  if (apiKey instanceof Response) {
    return apiKey;
  }

  const toolName = getString(payload.toolName, "Image Adapter");
  const adapterModel =
    productGate?.model?.new_api_model ?? agent.model;

  try {
    const adapter = apiKey
      ? new DalleImageAdapter({
          agent,
          apiKey,
          baseUrl,
          imageSettings,
          model: adapterModel,
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
    const materialized = await materializeImageResultForBrowser(result, imageSettings, {
      accessToken: getSupabaseRequestAccessToken(request),
      workspaceId:
        getString(payload.workspaceId, "") ||
        getString(request.headers.get("x-workspace-id"), ""),
    });

    if (productGate) {
      await recordImageGenerationUsage({
        credits: productGate.estimatedCredits,
        errorCode: null,
        model: productGate.model,
        payload,
        request,
        status: "succeeded",
        userId: productUserId,
      }).catch(() => undefined);
    }

    return Response.json(materialized);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Image generation failed.";

    if (productGate) {
      await recordImageGenerationUsage({
        credits: 0,
        errorCode: "PROVIDER_TIMEOUT",
        model: productGate.model,
        payload,
        request,
        status: "failed",
        userId: productUserId,
      }).catch(() => undefined);
    }

    return Response.json({ error: detail }, { status: 502 });
  }
}

async function getImageGenerationNewApiToken({
  model,
  payload,
  request,
  userId,
}: {
  model: ProductModelCatalogEntry;
  payload: ImageGenerationPayload;
  request: Request;
  userId: string;
}) {
  try {
    return await getUserNewApiToken({ userId });
  } catch (error) {
    const apiError = toApiError(error);

    await recordImageGenerationUsage({
      credits: 0,
      errorCode: apiError.code,
      model,
      payload,
      request,
      status: "failed",
      userId,
    }).catch(() => undefined);

    throw apiError;
  }
}

export function resolveImageGenerationApiKey() {
  return getServerImageApiKey();
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
): Promise<ImageGenerationRouteAccess | Response | null> {
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

    return {
      accessToken,
      userId: sessionUser.id,
      workspaceId,
    };
  } catch {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }
}

async function assertImageGenerationProductGate({
  imageSettings,
  modelId,
  payload,
  request,
  userId,
}: {
  imageSettings: ReturnType<typeof normalizeWorkspaceComposerImageSettings>;
  modelId: string;
  payload: ImageGenerationPayload;
  request: Request;
  userId: string;
}) {
  try {
    const plan = getUserPlan({ request, userId });
    const model = assertModelAllowedForPlan(modelId, plan);

    if (model.modality !== "image") {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Requested model is not available for image generation.",
        400,
        { modelId },
      );
    }

    if (!isModelAllowedByPlan(model.id, plan)) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "Requested model is not allowed for this plan.",
        403,
        { modelId: model.id, plan },
      );
    }

    const estimatedCredits = estimateImageGenerationCredits({
      modelId: model.id,
      quality: imageSettings.quality,
    });

    await assertSufficientCredits({
      estimatedCredits,
      modelId: model.id,
      plan,
      userId,
      walletRepo: createWalletRepository(),
    });

    return {
      estimatedCredits,
      model,
    };
  } catch (error) {
    const apiError = toApiError(error);
    const model = getCatalogModel(modelId);

    await recordImageGenerationUsage({
      credits: 0,
      errorCode: apiError.code,
      model,
      modelId,
      payload,
      request,
      status: "failed",
      userId,
    }).catch(() => undefined);

    throw apiError;
  }
}

function toImageGenerationErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  const descriptor = getApiErrorDescriptor(apiError.code);

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message || descriptor.message,
        retryable: descriptor.retryable,
      },
    },
    { status: apiError.statusCode },
  );
}

async function recordImageGenerationUsage({
  credits,
  errorCode,
  model,
  modelId,
  payload,
  request,
  status,
  userId,
}: {
  credits: number;
  errorCode: string | null;
  model?: ProductModelCatalogEntry;
  modelId?: string;
  payload: ImageGenerationPayload;
  request: Request;
  status: "failed" | "succeeded";
  userId: string;
}) {
  await createUsageLedgerRepository().insert({
    credits,
    conversationId: getString(payload.conversationId, "") || null,
    errorCode,
    inputTokens: 0,
    modelId: model?.id ?? modelId ?? "unknown-image-model",
    newApiModel: model?.new_api_model ?? modelId ?? "unknown-image-model",
    operatorId: getString(payload.operatorId, "image-workflow"),
    outputTokens: 0,
    providerFamily: model?.provider_family ?? "unknown",
    requestId: getString(request.headers.get("x-request-id"), crypto.randomUUID()),
    sourceType: "image_workflow",
    status,
    totalTokens: 0,
    userId,
  });
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
