import { NexusOps } from "@/components/nexus/nexus-ops";
import { NexusStyleRuntimeProvider } from "@/components/style-engine/nexus-style-runtime-provider";

export default function Home() {
  return (
    <NexusStyleRuntimeProvider>
      <NexusOps />
    </NexusStyleRuntimeProvider>
  );
}
