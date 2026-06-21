'use client';

import { FormEvent, useState } from 'react';
import { NexusModel } from '@/lib/nexus-home/types';

type NexusPromptComposerProps = {
  disabled?: boolean;
  models: NexusModel[];
  selectedModelId: string;
  selectedModelEstimate: string;
  onModelChange: (modelId: string) => void;
  onSubmit: (content: string) => void | Promise<void>;
};

export function NexusPromptComposer({
  disabled,
  models,
  selectedModelId,
  selectedModelEstimate,
  onModelChange,
  onSubmit,
}: NexusPromptComposerProps) {
  const [content, setContent] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = content.trim();
    if (!next || disabled) return;
    try {
      await onSubmit(next);
      setContent('');
    } catch {
      // Keep the prompt intact on 402/errors so the user can choose a cheaper model or retry.
    }
  }

  return (
    <form className="nexus-composer" aria-label="NEXUS prompt composer" onSubmit={handleSubmit}>
      <button type="button" className="nexus-composer-icon" aria-label="Attach file">＋</button>
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
      <button type="submit" className="nexus-send-button" aria-label="Send message" disabled={disabled || !content.trim()}>
        {disabled ? '…' : '↗'}
      </button>
    </form>
  );
}
