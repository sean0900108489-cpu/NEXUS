import type { ReactNode } from "react";

export type NexusOpsBodyFrameProps = {
  children: ReactNode;
};

export function NexusOpsBodyFrame({ children }: NexusOpsBodyFrameProps) {
  return (
    <section
      className="flex min-h-0 flex-1 gap-2 p-2"
      style={{
        background: "var(--nexus-body-frame-bg, rgb(18 18 18))",
      }}
    >
      {children}
    </section>
  );
}
