import { WorkspaceTopNav } from "@/components/workspace/WorkspaceTopNav";
import { NexusOps } from "@/components/nexus/nexus-ops";

type WorkspacePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * NEXUS Workspace OS — preserved at /workspace/[id].
 *
 * NexusOps is NOT deleted. It lives here as the workspace surface.
 * S-10 navigation simplification adds WorkspaceTopNav wrapper.
 */
export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;

  return (
    <main className="nexus-workspace-shell">
      <WorkspaceTopNav workspaceName={id} />
      <section className="nexus-workspace-body">
        <NexusOps />
      </section>
    </main>
  );
}
