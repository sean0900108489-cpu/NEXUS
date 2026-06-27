/**
 * NEXUS Window OS — Archetype Gap Panel
 *
 * Shows each product archetype and its capability readiness.
 *
 * @module features/developer
 */

"use client";

import { PRODUCT_ARCHETYPES } from "@/kernel/capabilities/product-archetypes";
import { getCapability } from "@/kernel/capabilities/capability-registry";
import type { NexusCapabilityKind, NexusProductArchetype } from "@/kernel/capabilities/capability-types";
import { Check, X, Box } from "lucide-react";

// ── Gap Analysis ───────────────────────────────────────────────────

function analyzeArchetypeReadiness(archetype: NexusProductArchetype) {
  const available = (caps: NexusCapabilityKind[]) =>
    caps.filter((c) => {
      const def = getCapability(c);
      return def && def.maturity !== "planned";
    });

  const missing = (caps: NexusCapabilityKind[]) =>
    caps.filter((c) => {
      const def = getCapability(c);
      return !def || def.maturity === "planned";
    });

  const requiredAvailable = available(archetype.requiredCapabilities);
  const requiredMissing = missing(archetype.requiredCapabilities);
  const optionalAvailable = available(archetype.optionalCapabilities);
  const optionalMissing = missing(archetype.optionalCapabilities);

  const readiness: "ready" | "partial" | "not-ready" =
    requiredMissing.length === 0
      ? "ready"
      : requiredAvailable.length > 0
        ? "partial"
        : "not-ready";

  return {
    requiredAvailable,
    requiredMissing,
    optionalAvailable,
    optionalMissing,
    readiness,
  };
}

const READINESS_COLORS: Record<string, string> = {
  ready: "text-green-400 bg-green-500/10 border-green-500/20",
  partial: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "not-ready": "text-red-400 bg-red-500/10 border-red-500/20",
};

// ── Component ──────────────────────────────────────────────────────

export function ArchetypeGapPanel() {
  const archetypes = PRODUCT_ARCHETYPES;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {archetypes.map((arch) => {
        const analysis = analyzeArchetypeReadiness(arch);

        return (
          <div
            key={arch.kind}
            className={`rounded-lg border p-4 ${READINESS_COLORS[analysis.readiness] ?? "border-white/5 bg-white/[0.02]"}`}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Box className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm font-medium text-white/70">{arch.title}</span>
              <code className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                {arch.kind}
              </code>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                analysis.readiness === "ready"
                  ? "text-green-400 bg-green-500/10"
                  : analysis.readiness === "partial"
                    ? "text-yellow-400 bg-yellow-500/10"
                    : "text-red-400 bg-red-500/10"
              }`}>
                {analysis.readiness}
              </span>
            </div>

            <p className="text-[10px] text-white/30 mb-2">{arch.description}</p>

            {/* Required */}
            <div className="mb-2">
              <span className="text-[10px] text-white/20 uppercase tracking-wider">Required</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.requiredAvailable.map((c) => (
                  <span key={c} className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> {c}
                  </span>
                ))}
                {analysis.requiredMissing.map((c) => (
                  <span key={c} className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <X className="w-2.5 h-2.5" /> {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional */}
            <div>
              <span className="text-[10px] text-white/20 uppercase tracking-wider">Optional</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.optionalAvailable.map((c) => (
                  <span key={c} className="text-[10px] text-green-400/60 bg-green-500/5 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> {c}
                  </span>
                ))}
                {analysis.optionalMissing.map((c) => (
                  <span key={c} className="text-[10px] text-white/15 bg-white/[0.02] px-1.5 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Examples */}
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-white/10">Examples:</span>
              {arch.examples.map((ex) => (
                <span key={ex} className="text-[10px] text-white/15">{ex}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
