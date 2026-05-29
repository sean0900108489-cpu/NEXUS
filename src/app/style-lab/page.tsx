import { NexusStyleLab } from "@/components/style-engine/nexus-style-lab";
import { NexusStyleRuntimeProvider } from "@/components/style-engine/nexus-style-runtime-provider";

export default function StyleLabPage() {
  return (
    <NexusStyleRuntimeProvider>
      <NexusStyleLab />
    </NexusStyleRuntimeProvider>
  );
}
