"use client";

import { type FormEvent, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Archive,
  BrainCircuit,
  FileUp,
  Layers3,
  PackageCheck,
  Pencil,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";

import { cx, formatFileSize, isTextLikeAttachmentFile } from "@/components/nexus/nexus-utils";
import { DEFAULT_SANDBOX_CODE, makeId } from "@/lib/nexus-defaults";
import type {
  AgentCapabilityType,
  AgentMessage,
  AgentModelSettings,
  MediaAgentCapabilityType,
  NexusReasoningEffort,
  NexusAgent,
} from "@/lib/nexus-types";
import {
  getModelCapabilityProfile,
} from "@/lib/nexus-registry";
import { nexusApiClient } from "@/lib/api/nexus-api-client";
import type {
  ArtifactCreateResponse,
  CreateArtifactRequest,
} from "@/lib/nexus-types";
import {
  createNoopAttachmentCompilerMetadata,
  resolveAttachmentCompilerLane,
} from "@/lib/attachments/attachment-compiler-registry";
import { WORKSPACE_ATTACHMENT_INPUT_ACTIONS } from "@/lib/attachments/attachment-input-actions";
import type {
  WorkspaceAttachmentInputActionId,
  WorkspaceComposerAttachment,
} from "@/lib/attachments/attachment-types";
import {
  getWorkspaceComposerActions,
  type WorkspaceComposerActionId,
} from "@/lib/composer/composer-actions";
import {
  getWorkspaceComposerMode,
  toggleWorkspaceComposerMode,
  type WorkspaceComposerMode,
} from "@/lib/composer/composer-mode-types";
import {
  WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS,
  WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS,
  type WorkspaceComposerImageSettings,
} from "@/lib/composer/image-generation-settings";

const WORKSPACE_ATTACHMENT_BINARY_INLINE_MAX_BYTES = 4 * 1024 * 1024;

function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
}

function isMediaCapability(
  capabilityType: AgentCapabilityType,
): capabilityType is MediaAgentCapabilityType {
  return capabilityType === "image" || capabilityType === "video";
}

function isSandboxCapability(capabilityType: AgentCapabilityType) {
  return capabilityType === "sandbox";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("File read did not return a data URL."));
    };
    reader.readAsDataURL(file);
  });
}

function createWorkspaceAttachmentMessagePayload(
  content: string,
  attachments: WorkspaceComposerAttachment[],
) {
  const trimmed = content.trim();
  const readyAttachments = attachments.filter(
    (attachment) => attachment.status === "ready",
  );

  if (!readyAttachments.length) {
    return { messageText: trimmed, attachmentRefs: [] };
  }

  // Build attachment references for multimodal support
  const attachmentRefs = readyAttachments.map((a) => ({
    id: a.id,
    kind: a.contentKind === "text" ? "text" as const
      : a.mimeType?.startsWith("image/") ? "image" as const
      : "document" as const,
    filename: a.name,
    mimeType: a.mimeType,
    storageKey: a.contentUrl ?? a.artifactId,
  }));

  // Build a compact attachment summary for the message (NOT full text content)
  const summaryParts = readyAttachments.map((a) => {
    if (a.mimeType?.startsWith("image/")) return `[Image: ${a.name}]`;
    if (a.contentKind === "text") return `[File: ${a.name}]`;
    return `[Attachment: ${a.name}]`;
  });

  return {
    messageText: [trimmed, ...summaryParts].filter(Boolean).join("\n"),
    attachmentRefs,
  };
}

const workspaceBodyMaterialStyle = {
  background: "var(--nexus-body-frame-bg, rgb(18 18 18))",
  borderColor:
    "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
  boxShadow:
    "inset 0 1px 0 rgb(255 255 255 / 0.04), var(--nexus-layout-panel-shadow, 0 18px 60px rgb(0 0 0 / 0.2))",
} satisfies CSSProperties;

export function WorkspaceChatComposerShell({
  agent,
  composerMode,
  imageSettings,
  onAttachmentSaved,
  onComposerModeChange,
  onFocusAgent,
  onGenerateImage,
  onGenerateMedia,
  onImageSettingsChange,
  onNotify,
  onOpenArtifacts,
  onSend,
  onUpdateAgentModelSettings,
  userId,
  workspaceId,
}: {
  agent?: NexusAgent;
  composerMode: WorkspaceComposerMode;
  imageSettings: WorkspaceComposerImageSettings;
  onAttachmentSaved: () => void;
  onComposerModeChange: (agentId: string, mode: WorkspaceComposerMode) => void;
  onFocusAgent: (agentId: string) => void;
  onGenerateImage: (
    agentId: string,
    content: string,
    imageSettings: WorkspaceComposerImageSettings,
  ) => Promise<void>;
  onGenerateMedia: (agentId: string, content: string) => Promise<void>;
  onImageSettingsChange: (
    agentId: string,
    settings: WorkspaceComposerImageSettings,
  ) => void;
  onNotify: (message: string) => void;
  onOpenArtifacts: () => void;
  onSend: (agentId: string, content: string) => Promise<void>;
  onUpdateAgentModelSettings: (
    agentId: string,
    settings: Partial<AgentModelSettings>,
  ) => void;
  userId: string;
  workspaceId: string;
}) {
  const [draft, setDraft] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<WorkspaceComposerAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const capabilityType = agent ? getCapabilityType(agent) : "chat";
  const modelCapability = getModelCapabilityProfile(agent?.model);
  const reasoningOptions = modelCapability?.thinking.supportedReasoningEfforts ?? [];
  const composerActions = getWorkspaceComposerActions(composerMode);
  const selectedReasoningEffort =
    agent?.modelSettings?.reasoningEffort &&
    reasoningOptions.includes(agent.modelSettings.reasoningEffort)
      ? agent.modelSettings.reasoningEffort
      : modelCapability?.thinking.defaultReasoningEffort ?? reasoningOptions[0];
  const imageModeActive = composerMode === "image";
  const isMediaAgent = isMediaCapability(capabilityType);
  const isSandboxAgent = isSandboxCapability(capabilityType);
  const agentBusy = agent?.status === "streaming" || agent?.status === "thinking";
  const hasReadyAttachments = attachments.some(
    (attachment) => attachment.status === "ready",
  );
  const hasPendingAttachments = attachments.some(
    (attachment) => attachment.status === "uploading",
  );
  const submitDisabled =
    !agent ||
    isSubmitting ||
    agentBusy ||
    isSandboxAgent ||
    hasPendingAttachments ||
    (!draft.trim() && !hasReadyAttachments);
  const reasoningDisabled = !agent || reasoningOptions.length === 0;

  const handleComposerAction = (actionId: WorkspaceComposerActionId) => {
    setAttachmentMenuOpen(false);

    if (!agent) {
      onNotify("Select a chatroom before switching composer mode.");
      return;
    }

    if (actionId === "toggle-image-generation") {
      const nextMode = toggleWorkspaceComposerMode(composerMode);

      onComposerModeChange(agent.id, nextMode);
      onNotify(
        nextMode === "image"
          ? `${agent.callsign} composer switched to image generation mode.`
          : `${agent.callsign} composer switched to language model mode.`,
      );
    }
  };

  const handleAttachmentAction = (actionId: WorkspaceAttachmentInputActionId) => {
    setAttachmentMenuOpen(false);

    if (actionId === "upload-image" || actionId === "upload-file") {
      if (!agent) {
        onNotify("Select a chatroom before attaching a file.");
        return;
      }

      if (isSubmitting || agentBusy) {
        onNotify(`${agent.callsign} is already processing.`);
        return;
      }

      fileInputRef.current?.click();
      return;
    }

    const action = WORKSPACE_ATTACHMENT_INPUT_ACTIONS.find(
      (candidate) => candidate.id === actionId,
    );

    if (actionId === "artifact-vault-reference") {
      onOpenArtifacts();
    }

    onNotify(`${action?.label ?? "Attachment"} slot is reserved for a V21 upgrade.`);
  };

  const attachLocalFile = async (file?: File) => {
    if (!file) {
      return;
    }

    if (!agent) {
      onNotify("Select a chatroom before attaching a file.");
      return;
    }

    const attachmentId = makeId("attachment");
    const mimeType = file.type || "text/plain";
    const contentKind = isTextLikeAttachmentFile(file) ? "text" : "binary";
    const compilerLane = resolveAttachmentCompilerLane({ contentKind, mimeType });
    const optimisticAttachment: WorkspaceComposerAttachment = {
      compilerId: compilerLane.defaultCompiler.id,
      compilerVersion: compilerLane.defaultCompiler.version,
      contentKind,
      id: attachmentId,
      mimeType,
      name: file.name,
      previewText: "Recording attachment...",
      sizeBytes: file.size,
      status: "uploading",
      targetCapabilities: [...compilerLane.targetCapabilities],
    };

    setAttachments((current) => [...current, optimisticAttachment]);

    try {
      const contentText = contentKind === "text" ? await file.text() : undefined;
      const contentUrl =
        contentKind === "binary"
          ? file.size <= WORKSPACE_ATTACHMENT_BINARY_INLINE_MAX_BYTES
            ? await readFileAsDataUrl(file)
            : `workspace-attachment-pending://compiler/${encodeURIComponent(attachmentId)}/${encodeURIComponent(file.name)}`
          : undefined;
      const artifactResponse = await nexusApiClient.post<
        ArtifactCreateResponse,
        CreateArtifactRequest
      >(
        "/api/v1/artifacts",
        {
          contentText,
          contentUrl,
          metadata: createNoopAttachmentCompilerMetadata({
            contentKind,
            fileName: file.name,
            lastModified: file.lastModified,
            mimeType,
            sizeBytes: file.size,
            source: "workspace-composer",
          }),
          mimeType,
          sourceAgentId: agent.id,
          title: file.name,
          type: "attachment",
          workspaceId,
        },
        {
          idempotencyKey: `attachment_${attachmentId}`,
          userId,
          workspaceId,
        },
      );
      const artifact = artifactResponse.artifact;
      const previewText =
        artifact.previewText ||
        contentText?.slice(0, 180) ||
        `${contentKind} attachment recorded.`;

      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                artifactId: artifact.id,
                compiledArtifactId: artifact.id,
                contentUrl,
                mimeType: artifact.mimeType ?? mimeType,
                previewText,
                rawArtifactId: artifact.id,
                sizeBytes: artifact.contentSizeBytes ?? file.size,
                status: "ready",
                textContent: contentText,
              }
            : attachment,
        ),
      );
      onAttachmentSaved();
      onNotify(`${file.name} attached with backend artifact record.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Attachment failed.";

      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                error: detail,
                previewText: "Attachment failed.",
                status: "error",
              }
            : attachment,
        ),
      );
      onNotify(`${file.name} could not be attached: ${detail}`);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agent) {
      onNotify("Select an agent before sending.");
      return;
    }

    if (isSandboxAgent) {
      onNotify(`${agent.callsign} uses the sandbox editor instead of chat input.`);
      return;
    }

    if (agentBusy || isSubmitting) {
      onNotify(`${agent.callsign} is already processing.`);
      return;
    }

    const readyAttachments = attachments.filter(
      (attachment) => attachment.status === "ready",
    );
    const { messageText, attachmentRefs } = createWorkspaceAttachmentMessagePayload(draft, readyAttachments);
    const value = imageModeActive ? draft.trim() : messageText;

    if (!value) {
      return;
    }

    if (imageModeActive && readyAttachments.length) {
      onNotify("Image mode attachment compiler is not connected yet.");
      return;
    }

    setDraft("");
    setIsSubmitting(true);
    onFocusAgent(agent.id);

    try {
      if (!imageModeActive && !isMediaAgent && attachmentRefs.length) {
        // Log attachment refs for debug
        console.log("[workspace] sending with attachments", attachmentRefs);
      }
      await (imageModeActive
        ? onGenerateImage(agent.id, value, imageSettings)
        : isMediaAgent
          ? onGenerateMedia(agent.id, value)
          : onSend(agent.id, value));
      setAttachments((current) =>
        current.filter((attachment) => attachment.status !== "ready"),
      );
    } catch {
      setDraft(draft);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="nexus-workspace-chat-composer-shell nexus-workspace-floating-composer fixed bottom-3 left-1/2 z-[130] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 border px-2 py-1.5"
      data-testid="workspace-chat-composer-shell"
      style={{
        ...workspaceBodyMaterialStyle,
        borderRadius:
          "var(--nexus-workspace-radius, var(--nexus-panel-radius, var(--surface-radius)))",
      }}
    >
      <div className="w-full">
        <form aria-label="Workspace message composer" onSubmit={submit}>
          <input
            ref={fileInputRef}
            className="hidden"
            data-testid="workspace-attachment-file-input"
            onChange={(event) => {
              void attachLocalFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <div
            className="relative border"
            data-testid="workspace-chat-input-card"
            style={{
              background:
                "var(--nexus-layout-panel-muted-bg, var(--nexus-panel-bg, rgb(255 255 255 / 0.045)))",
              borderColor:
                "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
              borderRadius:
                "calc(var(--nexus-panel-radius, var(--surface-radius)) + 10px)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
              <div className="relative shrink-0">
                <button
                  aria-expanded={attachmentMenuOpen}
                  aria-label="Add attachment"
                  className="grid h-9 w-9 place-items-center rounded-full border text-neutral-400 transition hover:text-neutral-100"
                  data-testid="workspace-attachment-menu-trigger"
                  onClick={() => setAttachmentMenuOpen((current) => !current)}
                  style={{
                    borderColor:
                      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {attachmentMenuOpen ? (
                  <div
                    className="absolute bottom-12 left-0 z-[120] w-64 overflow-hidden border bg-neutral-950/95 p-1 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    data-testid="workspace-attachment-menu"
                    style={{
                      borderColor:
                        "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                      borderRadius:
                        "var(--nexus-panel-radius, var(--surface-radius))",
                    }}
                  >
                    {composerActions.map((action) => (
                      <button
                        key={action.id}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-100 transition hover:bg-neutral-300/[0.08]"
                        data-composer-mode={composerMode}
                        data-testid={`workspace-composer-action-${action.id}`}
                        onClick={() => handleComposerAction(action.id)}
                        type="button"
                      >
                        {composerMode === "image" ? (
                          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-200/65">
                            {action.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                    <div className="my-1 h-px bg-white/10" />
                    {WORKSPACE_ATTACHMENT_INPUT_ACTIONS.filter((action) => action.status === "implemented").map((action) => (
                      <button
                        key={action.id}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-neutral-300 transition hover:bg-white/[0.06] hover:text-neutral-100"
                        data-testid={`workspace-attachment-action-${action.id}`}
                        onClick={() => handleAttachmentAction(action.id)}
                        type="button"
                      >
                        <FileUp className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em]">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-500">
                            {action.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
                data-testid="workspace-chat-composer-input"
                disabled={!agent || isSubmitting || agentBusy || isSandboxAgent}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder={
                  agent
                    ? isSandboxAgent
                      ? "Sandbox agents use the embedded editor"
                      : imageModeActive
                        ? "Describe the image to generate"
                        : isMediaAgent
                          ? `Describe ${capabilityType} generation`
                          : "Ask for follow-up changes"
                    : "Select an agent to start"
                }
                value={draft}
              />

              <label
                className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-300 transition sm:inline-flex"
                data-mode={composerMode}
                data-testid="workspace-composer-mode-control"
              >
                <span className="sr-only">Chatroom reasoning effort</span>
                {imageModeActive ? (
                  <div
                    className="flex items-center gap-1"
                    data-testid="workspace-image-settings-controls"
                  >
                    <select
                      aria-label="Image model"
                      className="max-w-[92px] bg-transparent uppercase outline-none"
                      data-testid="workspace-image-model-select"
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        onImageSettingsChange(agent.id, {
                          ...imageSettings,
                          modelId: event.currentTarget.value,
                        });
                      }}
                      value={imageSettings.modelId}
                    >
                      {WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {WORKSPACE_COMPOSER_IMAGE_MODEL_OPTIONS.find(
                      (option) => option.value === imageSettings.modelId,
                    )?.supportsQuality !== false ? (
                      <select
                        aria-label="Image quality"
                        className="max-w-[76px] bg-transparent uppercase outline-none"
                        data-testid="workspace-image-quality-select"
                        onChange={(event) => {
                          if (!agent) {
                            return;
                          }

                          onImageSettingsChange(agent.id, {
                            ...imageSettings,
                            quality: event.currentTarget
                              .value as WorkspaceComposerImageSettings["quality"],
                          });
                        }}
                        value={imageSettings.quality}
                      >
                        {WORKSPACE_COMPOSER_IMAGE_QUALITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <select
                      aria-label="Image aspect ratio"
                      className="max-w-[62px] bg-transparent uppercase outline-none"
                      data-testid="workspace-image-ratio-select"
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        onImageSettingsChange(agent.id, {
                          ...imageSettings,
                          aspectRatio: event.currentTarget
                            .value as WorkspaceComposerImageSettings["aspectRatio"],
                        });
                      }}
                      value={imageSettings.aspectRatio}
                    >
                      {WORKSPACE_COMPOSER_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <select
                      aria-label="Chatroom reasoning effort"
                      className="max-w-[116px] bg-transparent uppercase outline-none disabled:opacity-45"
                      data-testid="workspace-chat-reasoning-select"
                      disabled={reasoningDisabled}
                      onChange={(event) => {
                        if (!agent) {
                          return;
                        }

                        const reasoningEffort = event.currentTarget
                          .value as NexusReasoningEffort;

                        onUpdateAgentModelSettings(agent.id, { reasoningEffort });
                        onNotify(
                          `${agent.callsign} reasoning set to ${reasoningEffort}.`,
                        );
                      }}
                      value={selectedReasoningEffort ?? ""}
                    >
                      {reasoningOptions.length ? (
                        reasoningOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))
                      ) : (
                        <option value="">no reasoning</option>
                      )}
                    </select>
                  </>
                )}
              </label>

              <button
                aria-label="Send workspace message"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-950 transition hover:opacity-90 disabled:opacity-40"
                data-testid="workspace-chat-composer-action"
                disabled={submitDisabled}
                style={{
                  background:
                    "var(--theme-primary, var(--nexus-accent-primary, #e5e5e5))",
                }}
                type="submit"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>

            {attachments.length ? (
              <div
                className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2"
                data-testid="workspace-attachment-chip-list"
              >
                {attachments.map((attachment) => {
                  const handleInsertAsText = () => {
                    if (attachment.textContent) {
                      setDraft((current) => current + "\n\n" + attachment.textContent);
                    }
                  };
                  return (
                  <span
                    key={attachment.id}
                    className={cx(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em]",
                      attachment.status === "ready" &&
                        "border-neutral-300/30 bg-neutral-300/10 text-neutral-100",
                      attachment.status === "uploading" &&
                        "border-white/15 bg-white/[0.045] text-neutral-200",
                      attachment.status === "error" &&
                        "border-neutral-300/30 bg-neutral-300/10 text-neutral-100",
                    )}
                    data-testid="workspace-attachment-chip"
                    title={
                      attachment.error ??
                      `${attachment.name} - ${formatFileSize(attachment.sizeBytes)}`
                    }
                  >
                    <FileUp className="h-3 w-3 shrink-0" />
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <span className="text-neutral-500">
                      {attachment.status === "ready"
                        ? "recorded"
                        : attachment.status}
                    </span>
                    {attachment.status === "ready" &&
                    attachment.contentKind === "text" &&
                    attachment.textContent ? (
                      <button
                        aria-label={`Insert ${attachment.name} as text`}
                        className="grid h-4 w-4 place-items-center rounded-full text-neutral-400 transition hover:text-neutral-100"
                        onClick={handleInsertAsText}
                        type="button"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    ) : null}
                    <button
                      aria-label={`Remove ${attachment.name}`}
                      className="grid h-4 w-4 place-items-center rounded-full text-neutral-400 transition hover:text-neutral-100"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((candidate) => candidate.id !== attachment.id),
                        )
                      }
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
