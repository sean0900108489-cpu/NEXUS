import { executeImageAdapterForAgent } from "@/lib/adapters/image-adapter";
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
  return async ({ node, prompt, runId }) => {
    const imageSettings = normalizeWorkspaceComposerImageSettings({
      aspectRatio: node.data.aspectRatio,
      modelId: node.data.modelId,
      quality: node.data.quality,
    });
    const result = await executeImageAdapterForAgent({
      agent: {
        accent: executionAgent.accent,
        callsign: executionAgent.callsign,
        model: imageSettings.modelId,
      },
      apiKey: sanitizeHeaderValue(authVault.globalApiKey),
      imageSettings,
      prompt,
      toolName: "Workflow Image Model",
    });
    const sourceMessageId = `${runId}:${node.id}:image`;
    const artifactResponse = await nexusApiClient.post<
      ArtifactCreateResponse,
      CreateArtifactRequest
    >(
      "/api/v1/artifacts",
      {
        contentUrl: result.media.url,
        metadata: {
          aspectRatio: imageSettings.aspectRatio,
          imageGenerationMode: result.mode,
          mediaUrlKind: getGeneratedImageUrlKind(result.media.url),
          modelId: imageSettings.modelId,
          nodeId: node.id,
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
        workspaceId: workspace.id,
      },
      {
        idempotencyKey: `workflow_generated_image_${runId}_${node.id}`,
        userId: authVault.user?.id,
        workspaceId: workspace.id,
      },
    );
    const artifactId = artifactResponse.artifact.id;

    return {
      media: {
        ...result.media,
        artifactId,
      },
      metadata: {
        artifactId,
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
        `Artifact: ${artifactId}`,
        result.revisedPrompt ? `Revised prompt: ${result.revisedPrompt}` : "",
        `Image URL: ${result.media.url}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  };
}

function sanitizeHeaderValue(value: string | null | undefined) {
  return value?.replace(/[^\x20-\x7E]/g, "").trim() || undefined;
}
