import type { ReactNode } from "react";

export type NexusOpsTopBarFrameProps = {
  children: ReactNode;
};

export function NexusOpsTopBarFrame({ children }: NexusOpsTopBarFrameProps) {
  return (
    <header className="nexus-top-bar-frame flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3">
      {children}
    </header>
  );
}
