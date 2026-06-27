/**
 * NEXUS Window OS — Developer Inspector Window
 *
 * Internal developer tool for inspecting the Capability Registry,
 * Window App Registry, and Product Archetype Map.
 *
 * Reads metadata only — does NOT control runtime behavior.
 *
 * Sub-components:
 *   DeveloperInspectorTabs  — tab navigation
 *   AppsCapabilityPanel     — all window apps + capabilities
 *   CapabilityMatrixPanel   — all capabilities + used-by apps
 *   ArchetypeGapPanel       — archetype readiness + gaps
 *
 * @module features/developer
 */

"use client";

import { useEffect, useState } from "react";
import { Code } from "lucide-react";
import { DeveloperInspectorTabs } from "./DeveloperInspectorTabs";
import { AppsCapabilityPanel } from "./AppsCapabilityPanel";
import { CapabilityMatrixPanel } from "./CapabilityMatrixPanel";
import { ArchetypeGapPanel } from "./ArchetypeGapPanel";
import { DEFAULT_WINDOW_APPS } from "@/kernel/window/default-window-apps";
import { DEFAULT_CAPABILITIES } from "@/kernel/capabilities/default-capabilities";
import { registerCapabilities } from "@/kernel/capabilities/capability-registry";
import type { NexusWindowAppDefinition } from "@/kernel/window/window-types";
import type { NexusWindowAppProps } from "@/kernel/window/window-types";

type DevTab = "apps" | "capabilities" | "archetypes";

// ── Ensure capabilities are registered (idempotent) ────────────────

let capsRegistered = false;
function ensureCaps() {
  if (capsRegistered) return;
  registerCapabilities(DEFAULT_CAPABILITIES);
  capsRegistered = true;
}

// ── Component ──────────────────────────────────────────────────────

export function DeveloperInspectorWindow({ setTitle }: NexusWindowAppProps) {
  const [activeTab, setActiveTab] = useState<DevTab>("apps");
  const apps = DEFAULT_WINDOW_APPS as NexusWindowAppDefinition[];

  useEffect(() => {
    setTitle("Developer Inspector");
  }, [setTitle]);

  useEffect(() => {
    ensureCaps();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 shrink-0">
        <Code className="w-4 h-4 text-purple-400/60" />
        <span className="text-xs font-medium text-white/50">Developer Inspector</span>
        <span className="text-[10px] text-white/15 ml-auto">
          {apps.length} apps · {DEFAULT_CAPABILITIES.length} capabilities · {9} archetypes
        </span>
      </div>

      {/* Tabs */}
      <DeveloperInspectorTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Panels */}
      {activeTab === "apps" && <AppsCapabilityPanel apps={apps} />}
      {activeTab === "capabilities" && <CapabilityMatrixPanel apps={apps} />}
      {activeTab === "archetypes" && <ArchetypeGapPanel />}
    </div>
  );
}
