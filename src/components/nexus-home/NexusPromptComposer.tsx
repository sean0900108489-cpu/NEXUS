'use client';

import { FormEvent, useRef, useState } from 'react';
import { NexusModel } from '@/lib/nexus-home/types';
import { AttachmentButton } from '@/features/composer-attachments/components/AttachmentButton';
import { AttachmentMenu, type AttachmentMenuAction } from '@/features/composer-attachments/components/AttachmentMenu';
import { AttachmentPreviewTray } from '@/features/composer-attachments/components/AttachmentPreviewTray';
import { useAttachmentQueue } from '@/features/composer-attachments/shared/useAttachmentQueue';
import type { ComposerAttachment } from '@/features/composer-attachments/shared/attachment-types';
import { buildGlobalChatAttachmentReferences } from '@/features/composer-attachments/adapters/global-chat-attachments';

type NexusPromptComposerProps = {
  disabled?: boolean;
  models: NexusModel[];
  selectedModelId: string;
  selectedModelEstimate: string;
  authenticated?: boolean;
  onModelChange: (modelId: string) => void;
  onSubmit: (content: string, attachments: ComposerAttachment[]) => void | Promise<void>;
  onNotify?: (message: string) => void;
};

export function NexusPromptComposer({
  disabled,
  models,
  selectedModelId,
  selectedModelEstimate,
  authenticated = true,
  onModelChange,
  onSubmit,
  onNotify,
}: NexusPromptComposerProps) {
  const [content, setContent] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    attachments,
    isUploading,
    addAttachment,
    removeAttachment,
    clearAttachments,
  } = useAttachmentQueue();

  const handlePlusClick = () => {
    if (!authenticated) {
      onNotify?.("Sign in to attach files.");
      return;
    }
    setMenuOpen((prev) => !prev);
  };

  const handleMenuAction = (action: AttachmentMenuAction) => {
    if (action === "upload-image" || action === "upload-file") {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";

    await addAttachment({
      file,
      scope: "global-chat",
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      window.location.href = '/sign-in';
      return;
    }
    const next = content.trim();
    if (!next || disabled) return;
    try {
      await onSubmit(next, attachments.filter(a => a.status === "ready"));
      setContent('');
      clearAttachments();
    } catch {
      // Keep the prompt intact on 402/errors so the user can choose a cheaper model or retry.
    }
  }

  const hasReadyAttachments = attachments.some(a => a.status === "ready");

  return (
    <form className="nexus-composer" aria-label="NEXUS prompt composer" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,.pdf,.txt,.md,.csv,.json,.xml,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
      />
      <div className="relative shrink-0">
        <AttachmentButton
          onClick={handlePlusClick}
          disabled={disabled || isUploading}
          menuOpen={menuOpen}
        />
        {menuOpen ? (
          <AttachmentMenu
            onAction={handleMenuAction}
            onClose={() => setMenuOpen(false)}
          />
        ) : null}
      </div>
      <input
        className="nexus-composer-input"
        placeholder="Ask NEXUS to reason, build, or move work into a workspace…"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <label className="nexus-model-selector" aria-label="Select model">
        <span className="nexus-model-name">Model</span>
        <select value={selectedModelId} onChange={(event) => onModelChange(event.target.value)}>
          {models.map((model) => (
            <option key={model.id} value={model.id} disabled={model.enabled === false}>
              {model.label}
            </option>
          ))}
        </select>
        <span className="nexus-credit-estimate">{selectedModelEstimate}</span>
      </label>
      <button type="submit" className="nexus-send-button" aria-label="Send message" disabled={disabled || (!content.trim() && !hasReadyAttachments)}>
        {disabled ? '…' : '↗'}
      </button>
      {attachments.length > 0 ? (
        <div className="nexus-composer-attachments">
          <AttachmentPreviewTray
            attachments={attachments}
            onRemove={removeAttachment}
            showInsertAsText={true}
          />
        </div>
      ) : null}
    </form>
  );
}
