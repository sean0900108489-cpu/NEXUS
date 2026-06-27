/**
 * NEXUS Window OS — Model Status Panel
 *
 * Displays available AI models with loading/error/empty states.
 *
 * @module features/global-user
 */

"use client";

import { Cpu, Loader2 } from "lucide-react";
import type { NexusModel } from "./global-user-api";

type ModelStatusPanelProps = {
  models: NexusModel[];
  loading: boolean;
  error: string | null;
};

export function ModelStatusPanel({ models, loading, error }: ModelStatusPanelProps) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-white/60 text-xs font-medium uppercase tracking-wider">
        <Cpu className="w-3.5 h-3.5" />
        Models
      </div>

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
      ) : error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : models.length === 0 ? (
        <p className="text-xs text-white/20">No models available</p>
      ) : (
        <div className="space-y-1.5">
          {models.slice(0, 6).map((model) => (
            <div key={model.id} className="flex items-center justify-between text-xs">
              <span className="text-white/70">{model.label}</span>
              <span className="text-white/20 text-[10px]">
                {model.estimatedCredits ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
