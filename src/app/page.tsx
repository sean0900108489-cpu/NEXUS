import { NexusOps } from "@/components/nexus/nexus-ops";
import { NexusProductionPageShellBoundary } from "@/components/nexus/nexus-production-page-shell-boundary";
import { NexusStyleRuntimeProvider } from "@/components/style-engine/nexus-style-runtime-provider";

export default function Home() {
  return (
    <NexusStyleRuntimeProvider>
      <NexusProductionPageShellBoundary shellId="workspace">
        <NexusOps />
      </NexusProductionPageShellBoundary>
    </NexusStyleRuntimeProvider>
  );
}
