'use client';

import { useState } from 'react';
import { nexusHomeApi } from '@/lib/nexus-home/api';
import { WorkspaceShortcut } from '@/lib/nexus-home/types';

type NexusWorkspaceImportMenuProps = {
  conversationId: string;
  messageId: string;
  workspaces: WorkspaceShortcut[];
};

export function NexusWorkspaceImportMenu({ conversationId, messageId, workspaces }: NexusWorkspaceImportMenuProps) {
  const [open, setOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [workspaceUrl, setWorkspaceUrl] = useState<string | null>(null);

  async function handleImport() {
    if (!workspaceId) return;
    setStatus('saving');
    try {
      const result = await nexusHomeApi.importToWorkspace({
        workspaceId,
        sourceConversationId: conversationId,
        sourceMessageId: messageId,
        importType: 'artifact',
      });
      setWorkspaceUrl(result.workspaceUrl ?? `/workspace/${result.workspaceId}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <span className="nexus-import-menu">
      <button type="button" onClick={() => setOpen((current) => !current)}>
        Import to workspace
      </button>
      {open ? (
        <span className="nexus-import-popover" role="dialog" aria-label="Import to workspace">
          <label>
            Workspace
            <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleImport} disabled={status === 'saving'}>
            {status === 'saving' ? 'Importing…' : 'Import copy'}
          </button>
          {status === 'success' ? (
            <a href={workspaceUrl ?? `/workspace/${workspaceId}`}>Imported. Open workspace →</a>
          ) : null}
          {status === 'error' ? <span className="nexus-inline-error">Import failed. Retry or copy manually.</span> : null}
        </span>
      ) : null}
    </span>
  );
}
