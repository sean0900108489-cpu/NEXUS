"use client";

import { motion } from "framer-motion";
import { BrainCircuit, GitBranch, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  AgentBranchMode,
  IMemoryCompressionConfig,
  IMemoryCompressionWeights,
  NexusAgent,
} from "@/lib/nexus-types";
import {
  MEMORY_COMPRESSION_PROFILE_REGISTRY,
  NEXUS_MODEL_CATALOG,
} from "@/lib/nexus-registry";
import { useNexusStore } from "@/store/nexus-store";

type AgentBranchModalProps = {
  agent: NexusAgent;
  defaultRetentionRatio?: number;
  onBranchComplete: (agentId: string) => void;
  onClose: () => void;
};

const DEFAULT_PROFILE = MEMORY_COMPRESSION_PROFILE_REGISTRY["default-context-compressor"];

function clampRetentionRatio(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(5, Math.round(value)))
    : DEFAULT_PROFILE.defaultRetentionRatio;
}

function clampAdvancedWeight(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(10, Math.max(0, Math.round(value)))
    : 5;
}

export function AgentBranchModal({
  agent,
  defaultRetentionRatio,
  onBranchComplete,
  onClose,
}: AgentBranchModalProps) {
  const [mode, setMode] = useState<AgentBranchMode>("full");
  const [retentionRatio, setRetentionRatio] = useState(() =>
    clampRetentionRatio(defaultRetentionRatio),
  );
  const [branchAttempted, setBranchAttempted] = useState(false);
  const branchAgent = useNexusStore((state) => state.branchAgent);
  const branchingStatus = useNexusStore((state) => state.branchingStatus);
  const [customFocus, setCustomFocus] = useState("");
  const [advancedWeights, setAdvancedWeights] = useState<
    Required<IMemoryCompressionWeights>
  >({
    contextArchitecture: 5,
    semanticMeaning: 5,
    uiUxIntent: 5,
    taskContinuity: 5,
  });
  const compressorModels = useMemo(
    () => NEXUS_MODEL_CATALOG.filter((model) => model.capability === "chat"),
    [],
  );
  const [compressorModelId, setCompressorModelId] = useState(
    compressorModels[0]?.id ?? agent.model,
  );
  const busy = branchingStatus === "compressing" || branchingStatus === "creating";
  const failed = branchAttempted && branchingStatus === "error";
  const updateAdvancedWeight = (
    key: keyof Required<IMemoryCompressionWeights>,
    value: string,
  ) => {
    const nextValue = clampAdvancedWeight(Number(value));

    setAdvancedWeights((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
  };

  const executeBranchConfiguration = async (modeOverride?: AgentBranchMode) => {
    const effectiveMode = modeOverride ?? mode;
    const config: IMemoryCompressionConfig = {
      mode: effectiveMode,
      retentionRatio,
      compressorModelId,
      customFocusPrompt: customFocus.trim() || undefined,
      advancedWeights: { ...advancedWeights },
      compressorProfileId: DEFAULT_PROFILE.id,
    };

    setBranchAttempted(true);
    const newAgentId = await branchAgent(agent.id, config);

    if (!newAgentId) {
      return;
    }

    onBranchComplete(newAgentId);
    onClose();
  };

  return (
    <motion.div
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 p-4 backdrop-blur-md"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      role="dialog"
      transition={{ duration: 0.16 }}
      animate={{ opacity: 1 }}
    >
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl border border-cyan-300/25 bg-slate-950/95 shadow-[0_0_48px_rgba(34,211,238,0.14),0_24px_80px_rgba(0,0,0,0.6)]"
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <header className="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
              <GitBranch className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-white">
                BRANCH AGENT // INTERFACE
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Phase 1 configuration shell. Execution pipeline reserved.
              </p>
            </div>
          </div>
          <button
            aria-label="Close branch agent interface"
            className="grid h-8 w-8 place-items-center border border-white/10 text-slate-400 transition hover:border-rose-300/40 hover:bg-rose-300/10 hover:text-rose-100 disabled:cursor-wait disabled:opacity-40"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {failed ? (
          <div className="grid gap-4 p-5">
            <section className="border border-rose-300/40 bg-rose-300/[0.08] p-5 shadow-[0_0_34px_rgba(244,63,94,0.14)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-100">
                Compression Recovery Protocol
              </div>
              <p className="mt-3 text-sm leading-6 text-rose-50">
                COMPRESSION PROTOCOL FAILED. API unreachable or rate-limited.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Retry the summary extraction, force a full clone without compression,
                or cancel without mutating the workspace.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button
                  className="border border-fuchsia-300/45 bg-fuchsia-300/12 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300/22 hover:shadow-[0_0_22px_rgba(217,70,239,0.14)]"
                  onClick={() => {
                    setMode("summary");
                    void executeBranchConfiguration("summary");
                  }}
                  type="button"
                >
                  [ Retry Compression ]
                </button>
                <button
                  className="border border-cyan-300/45 bg-cyan-300/12 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/22 hover:shadow-[0_0_22px_rgba(34,211,238,0.14)]"
                  onClick={() => {
                    setMode("full");
                    void executeBranchConfiguration("full");
                  }}
                  type="button"
                >
                  [ Force Full Branch ]
                </button>
                <button
                  className="border border-white/10 bg-black/35 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition hover:border-rose-300/35 hover:bg-rose-300/10 hover:text-rose-100"
                  onClick={onClose}
                  type="button"
                >
                  [ Cancel ]
                </button>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 p-5">
            <section className="grid gap-3 border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Source Callsign
              </div>
              <div className="mt-1 font-mono text-sm uppercase tracking-[0.16em] text-cyan-100">
                {agent.callsign}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Source Model
              </div>
              <div className="mt-1 truncate text-sm text-slate-200">{agent.model}</div>
            </div>
          </section>

          <section>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Branch Mode
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className={`border px-4 py-3 text-left transition ${
                  mode === "full"
                    ? "border-cyan-300/55 bg-cyan-300/12 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.13)]"
                    : "border-white/10 bg-black/25 text-slate-400 hover:border-cyan-300/25 hover:text-cyan-100"
                }`}
                disabled={busy}
                onClick={() => setMode("full")}
                type="button"
              >
                <span className="block font-mono text-xs uppercase tracking-[0.18em]">
                  Full Branch
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Preserve the source agent memory footprint for future cloning.
                </span>
              </button>
              <button
                className={`border px-4 py-3 text-left transition ${
                  mode === "summary"
                    ? "border-fuchsia-300/55 bg-fuchsia-300/12 text-fuchsia-50 shadow-[0_0_22px_rgba(217,70,239,0.13)]"
                    : "border-white/10 bg-black/25 text-slate-400 hover:border-fuchsia-300/25 hover:text-fuchsia-100"
                }`}
                disabled={busy}
                onClick={() => setMode("summary")}
                type="button"
              >
                <span className="block font-mono text-xs uppercase tracking-[0.18em]">
                  Summary Branch
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Route through a compressor profile before future branch creation.
                </span>
              </button>
            </div>
          </section>

          {mode === "summary" ? (
            <section className="grid gap-4 border border-fuchsia-300/20 bg-fuchsia-300/[0.045] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fuchsia-100">
                <BrainCircuit className="h-4 w-4" />
                Summary Compression Matrix
              </div>

              <label className="grid gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Compressor Model
                </span>
                <select
                  className="h-10 border border-white/10 bg-black/45 px-3 font-mono text-xs text-slate-100 outline-none transition focus:border-fuchsia-300/55"
                  disabled={busy}
                  onChange={(event) => setCompressorModelId(event.target.value)}
                  value={compressorModelId}
                >
                  {compressorModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Retention Ratio
                </span>
                <input
                  className="accent-fuchsia-300"
                  disabled={busy}
                  max={100}
                  min={5}
                  onChange={(event) => setRetentionRatio(Number(event.target.value))}
                  type="range"
                  value={retentionRatio}
                />
                <span className="text-xs leading-5 text-slate-300">
                  Keep the most important {retentionRatio}% of memory and reduce the
                  remaining {100 - retentionRatio}%.
                </span>
              </label>

              <label className="relative grid gap-2">
                <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Custom Focus Prompt
                  <span className="border border-fuchsia-300/25 px-2 py-0.5 text-[9px] text-fuchsia-100">
                    Layer 2 Active
                  </span>
                </span>
                <textarea
                  className="min-h-24 resize-none border border-white/10 bg-black/35 p-3 text-xs leading-5 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/55 focus:bg-black/45 disabled:cursor-wait disabled:opacity-55"
                  disabled={busy}
                  onChange={(event) => setCustomFocus(event.target.value)}
                  placeholder="e.g., Strictly preserve UI/UX architecture decisions, but discard API implementation details."
                  value={customFocus}
                />
              </label>

              <div className="border border-white/10 bg-black/25 p-3">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Advanced Evaluation Weights
                  <span className="ml-auto border border-fuchsia-300/25 px-2 py-0.5 text-[9px] text-fuchsia-100">
                    0-10
                  </span>
                </div>
                <div className="grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      Architecture Weight
                      <span className="text-fuchsia-100">
                        {advancedWeights.contextArchitecture}/10
                      </span>
                    </span>
                    <input
                      className="accent-fuchsia-300 disabled:cursor-wait disabled:opacity-55"
                      disabled={busy}
                      max={10}
                      min={0}
                      onChange={(event) =>
                        updateAdvancedWeight(
                          "contextArchitecture",
                          event.currentTarget.value,
                        )
                      }
                      onInput={(event) =>
                        updateAdvancedWeight(
                          "contextArchitecture",
                          event.currentTarget.value,
                        )
                      }
                      step={1}
                      type="range"
                      value={advancedWeights.contextArchitecture}
                    />
                    <span className="text-[11px] leading-4 text-slate-500">
                      Routes, files, schemas, registries, and system boundaries.
                    </span>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      Semantic Meaning
                      <span className="text-fuchsia-100">
                        {advancedWeights.semanticMeaning}/10
                      </span>
                    </span>
                    <input
                      className="accent-fuchsia-300 disabled:cursor-wait disabled:opacity-55"
                      disabled={busy}
                      max={10}
                      min={0}
                      onChange={(event) =>
                        updateAdvancedWeight(
                          "semanticMeaning",
                          event.currentTarget.value,
                        )
                      }
                      onInput={(event) =>
                        updateAdvancedWeight(
                          "semanticMeaning",
                          event.currentTarget.value,
                        )
                      }
                      step={1}
                      type="range"
                      value={advancedWeights.semanticMeaning}
                    />
                    <span className="text-[11px] leading-4 text-slate-500">
                      Intent, rationale, decisions, and conceptual relationships.
                    </span>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      UI/UX Direction
                      <span className="text-fuchsia-100">
                        {advancedWeights.uiUxIntent}/10
                      </span>
                    </span>
                    <input
                      className="accent-fuchsia-300 disabled:cursor-wait disabled:opacity-55"
                      disabled={busy}
                      max={10}
                      min={0}
                      onChange={(event) =>
                        updateAdvancedWeight(
                          "uiUxIntent",
                          event.currentTarget.value,
                        )
                      }
                      onInput={(event) =>
                        updateAdvancedWeight(
                          "uiUxIntent",
                          event.currentTarget.value,
                        )
                      }
                      step={1}
                      type="range"
                      value={advancedWeights.uiUxIntent}
                    />
                    <span className="text-[11px] leading-4 text-slate-500">
                      Designer constraints, visual language, interaction rules.
                    </span>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      Task Continuity
                      <span className="text-fuchsia-100">
                        {advancedWeights.taskContinuity}/10
                      </span>
                    </span>
                    <input
                      className="accent-fuchsia-300 disabled:cursor-wait disabled:opacity-55"
                      disabled={busy}
                      max={10}
                      min={0}
                      onChange={(event) =>
                        updateAdvancedWeight(
                          "taskContinuity",
                          event.currentTarget.value,
                        )
                      }
                      onInput={(event) =>
                        updateAdvancedWeight(
                          "taskContinuity",
                          event.currentTarget.value,
                        )
                      }
                      step={1}
                      type="range"
                      value={advancedWeights.taskContinuity}
                    />
                    <span className="text-[11px] leading-4 text-slate-500">
                      Open blockers, TODOs, acceptance criteria, and next actions.
                    </span>
                  </label>
                </div>
              </div>
            </section>
          ) : null}
          </div>
        )}

        {!failed ? (
          <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
            <button
              className="h-9 border border-white/10 bg-black/25 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 transition hover:border-white/25 hover:text-slate-100"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-9 border border-cyan-300/45 bg-cyan-300/12 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.16)] disabled:cursor-wait disabled:opacity-55"
              disabled={busy}
              onClick={() => {
                void executeBranchConfiguration();
              }}
              type="button"
            >
              {branchingStatus === "compressing"
                ? "Extracting Essence..."
                : branchingStatus === "creating"
                  ? "Creating Branch..."
                  : "Execute"}
            </button>
          </footer>
        ) : null}
      </motion.section>
    </motion.div>
  );
}
