import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus workspace chat composer shell", () => {
  const source = readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
  const agentWindowFileSource = readFileSync(
    new URL("nexus-agent-window.tsx", import.meta.url),
    "utf8",
  );
  const settingsSidebarSource = readFileSync(
    new URL("nexus-agent-settings-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const composerSource = extractFunctionSource(
    source,
    "WorkspaceChatComposerShell",
    "",
  );
  const agentWindowSource = extractFunctionSource(
    agentWindowFileSource,
    "AgentWindow",
    "",
  );
  const attachmentActionsSource = readFileSync(
    new URL("../../lib/attachments/attachment-input-actions.ts", import.meta.url),
    "utf8",
  );
  const attachmentCompilerSource = readFileSync(
    new URL("../../lib/attachments/attachment-compiler-registry.ts", import.meta.url),
    "utf8",
  );
  const composerActionsSource = readFileSync(
    new URL("../../lib/composer/composer-actions.ts", import.meta.url),
    "utf8",
  );
  const stateSyncSource = readFileSync(
    new URL("../../lib/state-sync.ts", import.meta.url),
    "utf8",
  );

  it("floats the composer as a viewport-pinned layer below the workspace stage", () => {
    expect(source).toContain("nexus-workspace-stage-stack");
    expect(source).toContain("<WorkspaceChatComposerShell");
    expect(source).toContain('data-testid="workspace-chat-composer-shell"');
    expect(source).toContain('data-testid="nexus-workspace-primary-page"');
    expect(composerSource).toContain("Ask for follow-up changes");
    expect(composerSource).toContain("nexus-workspace-floating-composer");
    expect(composerSource).toContain("fixed bottom-3 left-1/2");
    expect(composerSource).toContain("z-[130]");
    expect(composerSource).toContain("w-[min(720px,calc(100vw-24px))]");
    expect(composerSource).toContain("-translate-x-1/2");
    expect(composerSource).not.toContain("flex shrink-0");
    expect(composerSource).not.toContain("Latest thread");
    expect(composerSource).not.toContain("latestMessagePreview");
    expect(composerSource).not.toContain("targetLabel");
    expect(composerSource).not.toContain('data-testid="workspace-chat-thread-card"');
    expect(composerSource).not.toContain("min-h-[118px]");
    expect(composerSource).toContain('data-testid="workspace-chat-input-card"');
    expect(composerSource).toContain('data-testid="workspace-chat-composer-input"');
    expect(composerSource).toContain('data-testid="workspace-chat-composer-action"');
    expect(composerSource).toContain('data-testid="workspace-composer-mode-control"');
    expect(composerSource).toContain('data-testid="workspace-chat-reasoning-select"');
  });

  it("places the attachment trigger on the left before the text input", () => {
    expect(composerSource).toContain('data-testid="workspace-attachment-menu-trigger"');
    expect(
      composerSource.indexOf('data-testid="workspace-attachment-menu-trigger"'),
    ).toBeLessThan(
      composerSource.indexOf('data-testid="workspace-chat-composer-input"'),
    );
    expect(composerSource).toContain("bottom-12 left-0");
    expect(composerSource).not.toContain("bottom-12 right-0");
  });

  it("does not render extra decorative arrows inside the chat composer controls", () => {
    const formIndex = composerSource.indexOf(
      '<form aria-label="Workspace message composer"',
    );
    const reasoningSelectIndex = composerSource.indexOf(
      'data-testid="workspace-chat-reasoning-select"',
    );
    const sendButtonIndex = composerSource.indexOf(
      'data-testid="workspace-chat-composer-action"',
    );
    const reasoningControlSource = composerSource.slice(
      reasoningSelectIndex,
      sendButtonIndex,
    );

    expect(formIndex).toBeGreaterThan(-1);
    expect(reasoningSelectIndex).toBeGreaterThan(-1);
    expect(sendButtonIndex).toBeGreaterThan(reasoningSelectIndex);
    expect(reasoningControlSource).not.toContain("ChevronDown");
  });

  it("routes composer sends through parent callbacks and selected chatroom reasoning", () => {
    expect(source).toContain("onSend={handleSend}");
    expect(source).toContain("onGenerateMedia={handleMediaGenerate}");
    expect(source).toContain("onGenerateImage={handleComposerImageGenerate}");
    expect(source).toContain("onUpdateAgentModelSettings={updateAgentModelSettings}");
    expect(source).toContain("composerModeByAgentId");
    expect(source).toContain("selectedComposerMode");
    expect(source).toContain("onComposerModeChange");
    expect(composerSource).toContain("event.preventDefault()");
    expect(composerSource).toContain("onFocusAgent(agent.id)");
    expect(composerSource).toContain("onSend(agent.id, value)");
    expect(composerSource).toContain("onGenerateMedia(agent.id, value)");
    expect(composerSource).toContain("onGenerateImage(agent.id, value, imageSettings)");
    expect(composerSource).toContain("getModelCapabilityProfile(agent?.model)");
    expect(composerSource).toContain("modelCapability?.thinking.supportedReasoningEfforts");
    expect(composerSource).toContain("onUpdateAgentModelSettings(agent.id, { reasoningEffort })");
    expect(composerSource).not.toContain("onOpenModelSettings");
    expect(composerSource).not.toContain('setActiveRightPanel("models")');
  });

  it("removes duplicate send and history controls from agent windows", () => {
    expect(agentWindowSource).not.toContain("Load history");
    expect(agentWindowSource).not.toContain("Transmit mission packet");
    expect(agentWindowSource).not.toContain('aria-label="Send message"');
    expect(agentWindowSource).not.toContain("onLoadHistory");
    expect(agentWindowSource).not.toContain("onNewReply");
    expect(agentWindowSource).not.toContain("onFillPrompt");
  });

  it("adds backend-recorded local file attachment through the no-op compiler lane", () => {
    expect(composerSource).toContain('data-testid="workspace-attachment-file-input"');
    expect(composerSource).toContain('data-testid="workspace-attachment-menu"');
    expect(composerSource).toContain('data-testid="workspace-attachment-chip-list"');
    expect(composerSource).toContain('data-testid="workspace-attachment-chip"');
    expect(composerSource).toContain('className="relative border"');
    expect(composerSource).not.toContain('className="overflow-hidden border"');
    expect(composerSource).toContain("Select a chatroom before attaching a file.");
    expect(composerSource).toContain("attachLocalFile");
    expect(composerSource).toContain("resolveAttachmentCompilerLane");
    expect(composerSource).toContain('"/api/v1/artifacts"');
    expect(composerSource).toContain("createNoopAttachmentCompilerMetadata");
    expect(composerSource).toContain("createWorkspaceAttachmentMessagePayload");
    expect(composerSource).toContain("readFileAsDataUrl");
    expect(composerSource).toContain("contentKind");
    expect(composerSource).toContain("contentUrl");
    expect(composerSource).toContain("workspace-attachment-pending://compiler");
    expect(composerSource).toContain("artifact.id");
    expect(composerSource).toContain("compiledArtifactId: artifact.id");
    expect(attachmentCompilerSource).toContain("nexus-attachment-noop-compiler-v1");
    expect(attachmentCompilerSource).toContain("NEXUS_ATTACHMENT_COMPILER_LANES");
    expect(attachmentCompilerSource).toContain("createAttachmentCompilerManifest");
    expect(attachmentCompilerSource).toContain("resolveAttachmentCompilerLane");
    expect(attachmentCompilerSource).toContain('mode: "noop"');
    expect(attachmentCompilerSource).toContain("passthrough-reference");
    expect(attachmentCompilerSource).toContain("attachmentCompilerLane");
    expect(attachmentCompilerSource).toContain("targetCapabilities");
  });

  it("keeps image generation as composer mode action outside attachment actions", () => {
    expect(source).toContain("executeImageAdapterForAgent");
    expect(source).toContain("normalizeWorkspaceComposerImageSettings");
    expect(source).toContain("WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS");
    expect(source).toContain("WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS");
    expect(source).toContain("WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS");
    expect(source).toContain("Composer Image Mode generated an image");
    expect(source).toContain("artifactRecordError");
    expect(source).toContain("Artifact record: unavailable");
    expect(source).toContain("...result.media");
    expect(source).toContain('type: "generated-image"');
    expect(source).toContain("sourceMessageId: assistantMessageId");
    expect(source).toContain("artifactId");
    expect(source).toContain('composerMode: "image"');
    expect(source).toContain("getGeneratedImageMimeType");
    expect(source).toContain("getGeneratedImageUrlKind");
    expect(attachmentActionsSource).toContain('id: "local-file-upload"');
    expect(attachmentActionsSource).toContain('status: "implemented"');
    expect(attachmentActionsSource).toContain('id: "artifact-vault-reference"');
    expect(attachmentActionsSource).toContain('id: "notebook-context"');
    expect(attachmentActionsSource).toContain('id: "sandbox-output"');
    expect(attachmentActionsSource).not.toContain("image-generation");
    expect(composerActionsSource).toContain('id: "toggle-image-generation"');
    expect(composerActionsSource).toContain("Image generation");
    expect(composerActionsSource).toContain("Language model");
    expect(composerSource).toContain("workspace-composer-action-");
    expect(composerSource).toContain("workspace-image-settings-controls");
    expect(composerSource).toContain("workspace-image-model-select");
    expect(composerSource).toContain("workspace-image-quality-select");
    expect(composerSource).toContain("workspace-image-ratio-select");
    expect(composerSource).toContain("Describe the image to generate");
    expect(composerSource).toContain("Image mode attachment compiler is not connected yet.");
    expect(composerSource).not.toContain("generateImageFromDraft");
    expect(attachmentActionsSource.match(/status: "placeholder"/g)).toHaveLength(3);
  });

  it("adds downloadable generated asset records to the right dock", () => {
    expect(source).toContain('| "generations"');
    expect(source).toContain('label: "生成紀錄"');
    expect(source).toContain("Generated file asset records");
    expect(source).toContain("isGeneratedArtifactRecord");
    expect(source).toContain("generatedArtifacts");
    expect(source).toContain("onDownloadArtifact");
    expect(source).toContain("createArtifactDownloadFilename");
    expect(source).toContain("Generated asset download started");
    expect(source).toContain('/api/v1/artifacts/${encodeURIComponent(artifact.id)}/asset');
    expect(source).toContain("downloadMediaArtifact");
    expect(settingsSidebarSource).toContain("onClick={() => onDownloadArtifact(artifact)}");
    expect(settingsSidebarSource).toContain('<Download className="h-3 w-3" />');
    expect(settingsSidebarSource).toContain("Download");
    expect(source).toContain("isMockGeneratedMediaUrl");
  });

  it("binds authenticated recovery to the server-approved workspace session", () => {
    expect(source).toContain("ensureWorkspaceSession");
    expect(source).toContain("bindActiveWorkspaceToCloudSession");
    expect(stateSyncSource).toContain('"/api/v1/workspaces/session"');
    expect(stateSyncSource).toContain("WorkspaceSessionEnsureResponse");
    expect(source).not.toContain('userId={authVault.user?.id ?? "local-owner"}');
  });

  it("uses shared workspace material variables", () => {
    expect(source).toContain("const workspaceBodyMaterialStyle");
    expect(composerSource).toContain("...workspaceBodyMaterialStyle");
    expect(composerSource).toContain("var(--nexus-layout-panel-muted-bg");
    expect(composerSource).toContain("var(--nexus-layout-panel-border");
    expect(composerSource).toContain("var(--nexus-workspace-radius");
    expect(composerSource).toContain("var(--theme-primary");
    expect(composerSource).not.toContain("bg-[#");
    expect(composerSource).not.toContain("text-[#");
  });
});

function extractFunctionSource(
  source: string,
  functionName: string,
  nextFunctionName: string,
) {
  const start = source.indexOf(`function ${functionName}`);
  const end = nextFunctionName
    ? source.indexOf(`function ${nextFunctionName}`, start + 1)
    : source.length;

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}
