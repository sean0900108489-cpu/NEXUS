import {
  executeImageAdapterForAgent,
  type ImageAdapterResult,
} from "@/lib/adapters/image-adapter";
import { nexusApiClient } from "@/lib/api/nexus-api-client";
import { normalizeWorkspaceComposerImageSettings } from "@/lib/composer/image-generation-settings";
import {
  getGeneratedImageMimeType,
  getGeneratedImageUrlKind,
} from "@/lib/media/generated-image-artifact";
import {
  normalizeCredentialText,
  normalizeImageApiKeyCandidate,
} from "@/lib/media/image-api-credential";
import type {
  ArtifactCreateResponse,
  CreateArtifactRequest,
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
} from "@/lib/nexus-types";
import {
  getProviderIdForModel,
  getProviderOption,
} from "@/lib/nexus-registry";
import { DEFAULT_BASE_URL } from "@/lib/nexus-defaults";

import type { WorkflowRuntimeImageCall } from "./executors";

export function createWorkflowRuntimeImageCall({
  authVault,
  executionAgent,
  workspace,
}: {
  authVault: IAuthVault;
  executionAgent: NexusAgent;
  workspace: NexusWorkspace;
}): WorkflowRuntimeImageCall {
  return async ({ node, prompt, runId, signal }) => {
    const imageSettings = normalizeWorkspaceComposerImageSettings({
      aspectRatio: node.data.aspectRatio,
      modelId: node.data.modelId,
      quality: node.data.quality,
    });
    const credential = resolveWorkflowRuntimeImageCredential({
      authVault,
      modelId: imageSettings.modelId,
    });
    const result = await executeImageAdapterForAgent({
      agent: {
        accent: executionAgent.accent,
        callsign: executionAgent.callsign,
        model: imageSettings.modelId,
      },
      apiKey: credential.apiKey,
      baseUrl: credential.baseUrl,
      imageSettings,
      prompt,
      toolName: "Workflow Image Model",
      userId: authVault.user?.id,
      workspaceId: workspace.id,
    }, { signal });
    const sourceMessageId = `${runId}:${node.id}:image`;
    const artifactPersistence = await persistWorkflowImageArtifact({
      executionAgent,
      imageSettings,
      nodeId: node.id,
      prompt,
      result,
      runId,
      sourceMessageId,
      userId: authVault.user?.id,
      workspaceId: workspace.id,
    });
    const artifactId =
      artifactPersistence.status === "persisted"
        ? artifactPersistence.artifactId
        : undefined;

    return {
      media: {
        ...result.media,
        ...(artifactId ? { artifactId } : {}),
      },
      metadata: {
        artifactId: artifactId ?? null,
        artifactPersistence,
        generatedAsset: result.generatedAsset ?? null,
        imageGenerationMode: result.mode,
        mediaUrlKind: getGeneratedImageUrlKind(result.media.url),
        modelId: imageSettings.modelId,
      },
      revisedPrompt: result.revisedPrompt,
      text: [
        `Workflow Image Model generated an image${result.mode === "mock" ? " (mock)" : ""}.`,
        `Prompt: ${prompt}`,
        `Model: ${imageSettings.modelId}`,
        `Quality: ${imageSettings.quality}`,
        `Aspect ratio: ${imageSettings.aspectRatio}`,
        artifactId ? `Artifact: ${artifactId}` : "",
        artifactPersistence.status === "failed"
          ? `Artifact persistence: failed (${artifactPersistence.error})`
          : "",
        result.revisedPrompt ? `Revised prompt: ${result.revisedPrompt}` : "",
        `Image URL: ${result.media.url}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  };
}

async function persistWorkflowImageArtifact({
  executionAgent,
  imageSettings,
  nodeId,
  prompt,
  result,
  runId,
  sourceMessageId,
  userId,
  workspaceId,
}: {
  executionAgent: NexusAgent;
  imageSettings: ReturnType<typeof normalizeWorkspaceComposerImageSettings>;
  nodeId: string;
  prompt: string;
  result: ImageAdapterResult;
  runId: string;
  sourceMessageId: string;
  userId?: string;
  workspaceId: string;
}) {
  try {
    const artifactResponse = await nexusApiClient.post<
      ArtifactCreateResponse,
      CreateArtifactRequest
    >(
      "/api/v1/artifacts",
      {
        contentUrl: result.media.url,
        metadata: {
          aspectRatio: imageSettings.aspectRatio,
          generatedAsset: result.generatedAsset ?? null,
          imageGenerationMode: result.mode,
          mediaUrlKind: getGeneratedImageUrlKind(result.media.url),
          modelId: imageSettings.modelId,
          nodeId,
          prompt,
          quality: imageSettings.quality,
          revisedPrompt: result.revisedPrompt ?? null,
          runId,
          source: "workflow-runtime-lite",
        },
        mimeType: getGeneratedImageMimeType(result.media.url),
        sourceAgentId: executionAgent.id,
        sourceMessageId,
        title: `Workflow image - ${prompt.slice(0, 48)}`,
        type: "generated-image",
        workspaceId,
      },
      {
        idempotencyKey: `workflow_generated_image_${runId}_${nodeId}`,
        userId,
        workspaceId,
      },
    );
    const {
      contentText: _contentText,
      metadata: _artifactMetadata,
      ...artifactVaultRecord
    } = artifactResponse.artifact;

    return {
      artifactId: artifactResponse.artifact.id,
      artifactVaultRecord,
      status: "persisted" as const,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Artifact persistence failed.",
      status: "failed" as const,
    };
  }
}

export function resolveWorkflowRuntimeImageCredential({
  authVault,
  modelId,
}: {
  authVault: IAuthVault;
  modelId: string;
}) {
  const providerIds = uniqueStrings([
    getProviderIdForModel(modelId, "openai-compatible"),
    "openai",
    "openai-compatible",
    "custom-openai-compatible",
  ]);
  const providerIdWithKey = providerIds.find((providerId) =>
    normalizeSecretValue(authVault.providerCredentials?.[providerId]?.apiKey),
  );
  const providerId = providerIdWithKey ?? providerIds[0] ?? "openai-compatible";
  const providerOption = getProviderOption(providerId);
  const providerCredential = authVault.providerCredentials?.[providerId];
  const apiKey =
    normalizeSecretValue(providerCredential?.apiKey) ??
    normalizeSecretValue(authVault.globalApiKey);
  const baseUrl =
    normalizeHeaderValue(providerCredential?.baseUrl) ??
    normalizeHeaderValue(authVault.globalBaseUrl) ??
    providerOption?.defaultBaseUrl ??
    DEFAULT_BASE_URL;

  return {
    apiKey,
    baseUrl,
    providerId,
  };
}

function uniqueStrings(values: Array<string | undefined>) {
  return values.reduce<string[]>((items, value) => {
    const normalized = normalizeCredentialText(value);

    if (normalized && !items.includes(normalized)) {
      items.push(normalized);
    }

    return items;
  }, []);
}

function normalizeHeaderValue(value: unknown) {
  return normalizeCredentialText(value);
}

function normalizeSecretValue(value: unknown): string | undefined {
  return normalizeImageApiKeyCandidate(value);
}
