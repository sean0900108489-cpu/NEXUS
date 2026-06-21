import { GlobalConversation, WalletBalance, WorkspaceShortcut } from '@/lib/nexus-home/types';
import { NexusWalletBadge } from './NexusWalletBadge';

type NexusSidebarProps = {
  recentChats: GlobalConversation[];
  workspaces: WorkspaceShortcut[];
  wallet: WalletBalance;
  authenticated?: boolean;
};

export function NexusSidebar({ recentChats, workspaces, wallet, authenticated = false }: NexusSidebarProps) {
  const hasWorkspaces = workspaces.length > 0;
  const hasChats = recentChats.length > 0;

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
        {hasWorkspaces ? (
          workspaces.slice(0, 4).map((workspace) => (
            <a key={workspace.id} className="nexus-nav-item" href={`/workspace/${workspace.id}`}>
              {workspace.name}
            </a>
          ))
        ) : (
          <p className="nexus-muted nexus-nav-empty">
            {authenticated ? 'No workspaces yet.' : 'Sign in to see workspaces.'}
          </p>
        )}
      </section>

      <section className="nexus-nav-section nexus-recent-section">
        <h2 className="nexus-section-title">Recent Chats</h2>
        {hasChats ? (
          recentChats.slice(0, 8).map((chat) => (
            <a key={chat.id} className="nexus-recent-item" href={`/chat/${chat.id}`}>
              {chat.title || 'Untitled chat'}
            </a>
          ))
        ) : (
          <p className="nexus-muted nexus-nav-empty">
            {authenticated ? 'No conversations yet. Start a new chat above.' : 'Sign in to see conversations.'}
          </p>
        )}
      </section>

      <div className="nexus-sidebar-footer">
        <NexusWalletBadge wallet={wallet} />
        {authenticated ? (
          <button className="nexus-user-button" aria-label="User settings">
            <span className="nexus-avatar">U</span>
            <span>User</span>
            <span className="nexus-user-gear" aria-hidden>⚙</span>
          </button>
        ) : (
          <a href="/sign-in" className="nexus-user-button nexus-signin-sidebar" aria-label="Sign in">
            <span className="nexus-avatar">?</span>
            <span>Sign in</span>
          </a>
        )}
      </div>
    </aside>
  );
}
