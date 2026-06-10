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
import type {
  ArtifactCreateResponse,
  CreateArtifactRequest,
  IAuthVault,
  NexusAgent,
  NexusWorkspace,
} from "@/lib/nexus-types";

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
    const credential = resolveWorkflowRuntimeImageCredential();
    const result = await executeImageAdapterForAgent({
      agent: {
        accent: executionAgent.accent,
        callsign: executionAgent.callsign,
        model: imageSettings.modelId,
      },
      apiKey: credential.apiKey,
      baseUrl: credential.baseUrl,
      conversationId: runId,
      imageSettings,
      operatorId: executionAgent.id,
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
    const artifactVaultRecord = { ...artifactResponse.artifact };
    delete (artifactVaultRecord as { contentText?: unknown }).contentText;
    delete (artifactVaultRecord as { metadata?: unknown }).metadata;

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
}: {
  authVault?: IAuthVault;
  modelId?: string;
} = {}) {
  return {
    apiKey: "",
    baseUrl: undefined,
    providerId: "server-new-api",
  };
}
