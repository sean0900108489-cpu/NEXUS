"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type WorkspaceTopNavProps = {
  workspaceName?: string;
};

const tabs = [
  { id: "chat", label: "Chat" },
  { id: "artifacts", label: "Artifacts" },
  { id: "workflows", label: "Workflows" },
  { id: "tools", label: "Tools" },
  { id: "settings", label: "Settings" },
] as const;

/**
 * S-10 Workspace navigation bar.
 * Preserves NexusOps. Adds Back to Home, workspace identity,
 * section tabs, and credits summary.
 */
export function WorkspaceTopNav({ workspaceName = "Workspace" }: WorkspaceTopNavProps) {
  const pathname = usePathname() ?? "";
  const activeTab = tabs.find((t) => pathname.includes(`/${t.id}`))?.id ?? "chat";

  return (
    <header className="nexus-workspace-topnav" role="banner" aria-label="Workspace navigation">
      <Link href="/" className="nexus-workspace-back" aria-label="Back to Home">
        ← Home
      </Link>

      <div className="nexus-workspace-title">
        <span>Workspace</span>
        <strong>{workspaceName}</strong>
      </div>

      <nav aria-label="Workspace sections">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/workspace/${workspaceName}${tab.id === "chat" ? "" : `/${tab.id}`}`}
            data-active={tab.id === activeTab ? "true" : "false"}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Link href="/" className="nexus-workspace-wallet" aria-label="View credits balance">
        Credits
      </Link>
    </header>
  );
}
