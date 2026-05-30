import type { ReactNode } from "react";

export const NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1 = "v1" as const;

export const NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1 = ["workspace"] as const;

export type NexusProductionPageShellIdV1 =
  (typeof NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1)[number];

export type NexusProductionPageShellBoundaryProps = {
  children: ReactNode;
  shellId: NexusProductionPageShellIdV1;
};

export function NexusProductionPageShellBoundary({
  children,
  shellId,
}: NexusProductionPageShellBoundaryProps) {
  return (
    <div
      className="contents"
      data-nexus-page-shell={shellId}
      data-nexus-production-apply="blocked"
      data-nexus-production-page-shell-boundary={
        NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1
      }
    >
      {children}
    </div>
  );
}
