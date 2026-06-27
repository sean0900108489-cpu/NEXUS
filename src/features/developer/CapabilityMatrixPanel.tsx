/**
 * NEXUS Window OS — Capability Matrix Panel
 *
 * Lists all capabilities with maturity, owner, and which apps use them.
 *
 * @module features/developer
 */

"use client";

import { DEFAULT_CAPABILITIES } from "@/kernel/capabilities/default-capabilities";
import { getAppsWithCapability } from "@/kernel/capabilities/capability-registry";
import type { NexusWindowAppDefinition } from "@/kernel/window/window-types";

const MATURITY_COLORS: Record<string, string> = {
  stable: "text-green-400 bg-green-500/10",
  mvp: "text-yellow-400 bg-yellow-500/10",
  planned: "text-blue-400 bg-blue-500/10",
};

export function CapabilityMatrixPanel({ apps }: { apps: NexusWindowAppDefinition[] }) {
  const capabilities = DEFAULT_CAPABILITIES;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {capabilities.map((cap) => {
        const usingApps = getAppsWithCapability(cap.kind, apps);
        const actualUsers = usingApps.length > 0
          ? usingApps.map((a) => a.kind)
          : (cap.providedBy ?? []);

        return (
          <div
            key={cap.kind}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <code className="text-xs text-white/60 font-medium">{cap.kind}</code>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${MATURITY_COLORS[cap.maturity] ?? "text-white/20 bg-white/5"}`}>
                {cap.maturity}
              </span>
              <span className="text-[10px] text-white/20">{cap.owner}</span>
            </div>
            <p className="text-[10px] text-white/30 mb-1.5">{cap.description}</p>
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-white/15">Used by:</span>
              {actualUsers.length > 0 ? (
                actualUsers.map((name) => (
                  <code
                    key={name}
                    className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded"
                  >
                    {name}
                  </code>
                ))
              ) : (
                <span className="text-[10px] text-white/10">none</span>
              )}
            </div>
            {cap.dependsOn && cap.dependsOn.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center mt-1">
                <span className="text-[10px] text-white/10">Depends on:</span>
                {cap.dependsOn.map((d) => (
                  <code key={d} className="text-[10px] text-white/15 bg-white/[0.02] px-1.5 py-0.5 rounded">
                    {d}
                  </code>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
