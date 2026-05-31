import { NexusOps } from "@/components/nexus/nexus-ops";
import { NexusProductionPreviewController } from "@/components/nexus/nexus-production-preview-controller";
import { NexusProductionPageShellBoundary } from "@/components/nexus/nexus-production-page-shell-boundary";
import { NexusStyleRuntimeProvider } from "@/components/style-engine/nexus-style-runtime-provider";

type HomeProps = {
  searchParams: Promise<{
    nexusPreviewFirstCut?: string | string[] | undefined;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const productionPreviewFirstCutEnabled =
    getFirstSearchParamValue(params.nexusPreviewFirstCut) === "1";

  return (
    <NexusStyleRuntimeProvider>
      <NexusProductionPageShellBoundary shellId="workspace">
        <NexusProductionPreviewController
          enabled={productionPreviewFirstCutEnabled}
        />
        <NexusOps />
      </NexusProductionPageShellBoundary>
    </NexusStyleRuntimeProvider>
  );
}

function getFirstSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
