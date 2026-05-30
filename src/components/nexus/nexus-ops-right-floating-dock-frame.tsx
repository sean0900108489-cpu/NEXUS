import type { ReactNode } from "react";

export type NexusOpsRightFloatingDockFrameProps = {
  children: ReactNode;
};

export function NexusOpsRightFloatingDockFrame({
  children,
}: NexusOpsRightFloatingDockFrameProps) {
  return (
    <nav
      aria-label="Right workspace tools"
      className="pointer-events-none fixed right-3 top-1/2 z-[130] hidden -translate-y-1/2 xl:block"
    >
      <div className="nexus-right-floating-dock-rail pointer-events-auto grid gap-2 border border-cyan-300/25 bg-slate-950/90 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_32px_rgba(34,211,238,0.14)] backdrop-blur-xl">
        {children}
      </div>
    </nav>
  );
}
