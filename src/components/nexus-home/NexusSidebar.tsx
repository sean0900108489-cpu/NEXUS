import { GlobalConversation, WalletBalance, WorkspaceShortcut } from '@/lib/nexus-home/types';
import { NexusWalletBadge } from './NexusWalletBadge';

type NexusSidebarProps = {
  recentChats: GlobalConversation[];
  workspaces: WorkspaceShortcut[];
  wallet: WalletBalance;
};

export function NexusSidebar({ recentChats, workspaces, wallet }: NexusSidebarProps) {
  return (
    <aside className="nexus-sidebar">
      <div className="nexus-brand-row">
        <div className="nexus-mark">N</div>
        <span className="nexus-brand-text">NEXUS</span>
      </div>

      <nav className="nexus-nav-section" aria-label="Primary">
        <a className="nexus-nav-item active" href="/">＋ New Chat</a>
        <a className="nexus-nav-item" href="/search">⌕ Search Chats</a>
        <a className="nexus-nav-item" href="/workspaces">◇ Workspaces</a>
        <a className="nexus-nav-item" href="/artifacts">▣ Artifacts</a>
        <a className="nexus-nav-item" href="/workflows">↬ Workflows</a>
      </nav>

      <section className="nexus-nav-section">
        <h2 className="nexus-section-title">Workspaces</h2>
        {workspaces.slice(0, 4).map((workspace) => (
          <a key={workspace.id} className="nexus-nav-item" href={`/workspace/${workspace.id}`}>
            {workspace.name}
          </a>
        ))}
      </section>

      <section className="nexus-nav-section nexus-recent-section">
        <h2 className="nexus-section-title">Recent Chats</h2>
        {recentChats.slice(0, 8).map((chat) => (
          <a key={chat.id} className="nexus-recent-item" href={`/chat/${chat.id}`}>
            {chat.title || 'Untitled chat'}
          </a>
        ))}
      </section>

      <div className="nexus-sidebar-footer">
        <NexusWalletBadge wallet={wallet} />
        <button className="nexus-user-button" aria-label="User settings">
          <span className="nexus-avatar">S</span>
          <span>Sean</span>
          <span className="nexus-user-gear" aria-hidden>⚙</span>
        </button>
      </div>
    </aside>
  );
}
