import type { ReactNode } from "react";

export type NexusOpsOuterShellFrameProps = {
  children: ReactNode;
};

export function NexusOpsOuterShellFrame({
  children,
}: NexusOpsOuterShellFrameProps) {
  return (
    <main className="nexus-shell flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100">
      {children}
    </main>
  );
}
