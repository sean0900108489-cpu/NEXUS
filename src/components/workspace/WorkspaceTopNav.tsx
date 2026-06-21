type WorkspaceTopNavProps = {
  workspaceName?: string;
  activeTab?: 'chat' | 'artifacts' | 'workflows' | 'tools' | 'settings';
};

const tabs = [
  { id: 'chat', label: 'Chat' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'tools', label: 'Tools' },
  { id: 'settings', label: 'Settings' },
] as const;

export function WorkspaceTopNav({ workspaceName = 'Workspace', activeTab = 'chat' }: WorkspaceTopNavProps) {
  return (
    <header className="nexus-workspace-topnav">
      <a href="/" className="nexus-workspace-back">← Home</a>
      <div className="nexus-workspace-title">
        <span>Workspace</span>
        <strong>{workspaceName}</strong>
      </div>
      <nav aria-label="Workspace sections">
        {tabs.map((tab) => (
          <a key={tab.id} href={`#${tab.id}`} data-active={tab.id === activeTab}>
            {tab.label}
          </a>
        ))}
      </nav>
      <a href="/wallet" className="nexus-workspace-wallet">Credits</a>
    </header>
  );
}
