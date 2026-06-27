/**
 * NEXUS Window OS — Apps Capability Panel
 *
 * Lists all window apps with their capabilities, archetype, and lifecycle.
 *
 * @module features/developer
 */

"use client";

import { AlertTriangle, Box } from "lucide-react";
import type { NexusWindowAppDefinition } from "@/kernel/window/window-types";
import { validateAppCapabilities } from "@/kernel/capabilities/capability-registry";

const LIFECYCLE_LABELS: Record<string, string> = {
  active: "Active",
  demo: "Demo",
  legacy: "Legacy",
  planned: "Planned",
  internal: "Internal",
};

export function AppsCapabilityPanel({ apps }: { apps: NexusWindowAppDefinition[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {apps.map((app) => {
        const validation = validateAppCapabilities(app);
        const hasCaps = (app.capabilities?.length ?? 0) > 0;
        const hasArchetype = !!app.archetype;
        const lifecycle = app.lifecycle ?? "active";
        const isUnclassified = !hasCaps && !hasArchetype;
        const isDemo = lifecycle === "demo" || app.kind.includes("-demo");

        return (
          <div
            key={app.kind}
            className={`rounded-lg border p-4 ${
              isUnclassified
                ? "border-yellow-500/20 bg-yellow-500/[0.02]"
                : isDemo
                  ? "border-white/5 bg-white/[0.01]"
                  : "border-white/5 bg-white/[0.02]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-white/70">{app.title}</span>
              <code className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                {app.kind}
              </code>
              <span className="text-[10px] text-white/15">{app.scope}</span>
              {app.singleton && (
                <span className="text-[10px] text-purple-400/60 bg-purple-500/10 px-1 rounded">singleton</span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isDemo
                    ? "text-yellow-400 bg-yellow-500/10"
                    : lifecycle === "internal"
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-white/20 bg-white/5"
                }`}
              >
                {LIFECYCLE_LABELS[lifecycle] ?? lifecycle}
              </span>
            </div>

            {/* Archetype */}
            <div className="flex items-center gap-2 mb-2">
              {hasArchetype ? (
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  Archetype: {app.archetype}
                </span>
              ) : (
                <span className="text-[10px] text-yellow-400/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  No archetype
                </span>
              )}
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1">
              {hasCaps ? (
                app.capabilities!.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded"
                  >
                    {cap}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-yellow-400/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  No capabilities declared
                </span>
              )}
            </div>

            {/* Validation */}
            {!validation.valid && (
              <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded">
                Unknown capabilities: {validation.unknownCapabilities.join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
