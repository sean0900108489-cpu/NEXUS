import { GlobalMessage, WorkspaceShortcut } from '@/lib/nexus-home/types';
import { NexusWorkspaceImportMenu } from './NexusWorkspaceImportMenu';

type NexusChatCanvasProps = {
  conversationId?: string;
  messages: GlobalMessage[];
  workspaces: WorkspaceShortcut[];
};

export function NexusChatCanvas({ conversationId, messages, workspaces }: NexusChatCanvasProps) {
  return (
    <section className="nexus-chat-canvas" aria-label="Global chat conversation">
      <div className="nexus-chat-header">
        <div>
          <p className="nexus-kicker">Global Chat</p>
          <h1>Conversation</h1>
        </div>
        <a className="nexus-topbar-link" href="/workspaces">Open workspaces</a>
      </div>

      <div className="nexus-message-list">
        {messages.map((message) => (
          <article key={message.id} className="nexus-message" data-role={message.role}>
            <div className="nexus-message-bubble">
              <p>{message.content}</p>
              {message.creditCost ? <span className="nexus-message-cost">{message.creditCost} credits</span> : null}
            </div>

            {message.role === 'assistant' && conversationId ? (
              <div className="nexus-message-actions">
                <button type="button">Copy</button>
                <button type="button">Create artifact</button>
                <NexusWorkspaceImportMenu
                  conversationId={conversationId}
                  messageId={message.id}
                  workspaces={workspaces}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
