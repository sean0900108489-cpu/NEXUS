import type { ReactNode } from "react";

export type NexusOpsTopBarFrameProps = {
  children: ReactNode;
};

export function NexusOpsTopBarFrame({ children }: NexusOpsTopBarFrameProps) {
  return (
    <header
      className="nexus-top-bar-frame relative z-[110] flex h-11 shrink-0 items-center border-b border-white/10 px-3"
      style={{
        background:
          "var(--nexus-body-frame-bg, color-mix(in srgb, var(--theme-primary, #e5e5e5) 10%, rgb(16 16 16 / 0.84)))",
        borderBottomColor:
          "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
        boxShadow:
          "var(--nexus-layout-panel-shadow, var(--nexus-panel-shadow, 0 0 0 transparent))",
      }}
    >
      <div className="relative z-10 flex min-w-0 flex-1 items-center">
        {children}
      </div>
    </header>
  );
}
