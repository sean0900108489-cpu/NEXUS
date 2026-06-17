"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SlidersHorizontal } from "lucide-react";

import type {
  ImportedWorkspaceStyleReviewState,
  WorkspaceThemeStyleControlsV1,
} from "@/lib/style-engine/v2-workspace-style-payload";
import {
  createDefaultWorkspaceThemeStyleControlsV1,
  createWorkspaceThemeStylePreviewVariablesV1,
  extractWorkspaceThemeStyleControlsV1,
} from "@/lib/style-engine/v2-workspace-style-payload";
import {
  NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
  createProductionPreviewApplyPlan,
  createProductionPreviewResidueCheck,
  createProductionPreviewRevertPlan,
  type ProductionPreviewApplyTransaction,
  type ProductionPreviewInlineValueSnapshot,
  type ProductionPreviewTargetFacts,
} from "@/lib/style-engine/v2-production-preview-transaction";


type WorkspaceThemeLivePreviewStatus =
  | "idle"
  | "active"
  | "saved"
  | "reverted"
  | "blocked";

type WorkspaceThemeLivePreviewTargetStatus = "ready" | "missing" | "blocked";

type WorkspaceThemeLivePreviewState = {
  applyDurationMs: number | null;
  checksum: string;
  error: string | null;
  remainingPreviewVariableCount: number | null;
  residueCheck: "not-run" | "pass" | "fail";
  revertDurationMs: number | null;
  status: WorkspaceThemeLivePreviewStatus;
  targetCount: number | null;
  targetStatus: WorkspaceThemeLivePreviewTargetStatus;
  transactionId: string;
  variableCount: number;
};

const workspaceThemeLivePreviewInitialState: WorkspaceThemeLivePreviewState = {
  applyDurationMs: null,
  checksum: "",
  error: null,
  remainingPreviewVariableCount: null,
  residueCheck: "not-run",
  revertDurationMs: null,
  status: "idle",
  targetCount: null,
  targetStatus: "missing",
  transactionId: "",
  variableCount: 0,
};

const workspaceThemeLivePreviewNetworkBaselineWindowId =
  "theme-panel-live-preview-local-scope";

function createWorkspaceThemePreviewId(kind: "session" | "transaction") {
  return `nexus-workspace-style-controls:${kind}:${Date.now().toString(36)}`;
}

function getWorkspaceThemePreviewNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function roundWorkspaceThemePreviewDuration(value: number) {
  return Math.round(value * 100) / 100;
}

function compareWorkspaceThemeControls(
  left: WorkspaceThemeStyleControlsV1,
  right: WorkspaceThemeStyleControlsV1,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getWorkspaceThemePreviewTargets() {
  if (typeof document === "undefined") {
    return [];
  }

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    ),
  );
}

function createWorkspaceThemeTargetFacts(
  targets: HTMLElement[],
  target: HTMLElement | null,
): ProductionPreviewTargetFacts {
  const tagName = target?.tagName.toLowerCase() ?? "";
  const rect = target?.getBoundingClientRect();

  return {
    classList: target ? Array.from(target.classList) : [],
    isBodyElement: tagName === "body",
    isDocumentRoot:
      typeof document !== "undefined" && target === document.documentElement,
    isHtmlElement: tagName === "html",
    selector: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    tagName,
    targetCount: targets.length,
    visible: rect ? rect.width > 0 && rect.height > 0 : false,
  };
}

function snapshotWorkspaceThemeInlineValues(
  target: HTMLElement,
  variableNames: string[],
): ProductionPreviewInlineValueSnapshot {
  return Object.fromEntries(
    variableNames.map((name) => {
      const value = target.style.getPropertyValue(name);

      return [name, value.length > 0 ? value : undefined];
    }),
  );
}

type WorkspaceStylePresetDefinition = {
  id: string;
  label: string;
  description: string;
  controls: Omit<WorkspaceThemeStyleControlsV1, "version">;
};

const workspaceStylePresetDefinitions = [
  {
    controls: {
      accent: "custom",
      accentColor: "#e5e7eb",
      blur: 16,
      glass: 54,
      radius: 18,
      shadow: 34,
      warmth: 48,
      workspaceWash: 42,
    },
    description: "Neutral surface",
    id: "neutral",
    label: "Neutral",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#8bd3ff",
      blur: 8,
      glass: 38,
      radius: 14,
      shadow: 20,
      warmth: 36,
      workspaceWash: 30,
    },
    description: "Low haze",
    id: "clear",
    label: "Clear",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#f5f5f4",
      blur: 24,
      glass: 70,
      radius: 24,
      shadow: 48,
      warmth: 52,
      workspaceWash: 52,
    },
    description: "Soft panels",
    id: "soft",
    label: "Soft",
  },
  {
    controls: {
      accent: "custom",
      accentColor: "#eeeeee",
      blur: 14,
      glass: 50,
      radius: 16,
      shadow: 58,
      warmth: 44,
      workspaceWash: 24,
    },
    description: "High signal",
    id: "signal",
    label: "Signal",
  },
] as const satisfies readonly WorkspaceStylePresetDefinition[];

function createWorkspaceStylePresetControls(
  baseControls: WorkspaceThemeStyleControlsV1,
  preset: WorkspaceStylePresetDefinition,
): WorkspaceThemeStyleControlsV1 {
  return {
    ...baseControls,
    ...preset.controls,
    version: baseControls.version,
  };
}

export function WorkspaceStyleControlsPanel({
  onSaveWorkspaceThemeStyleControls,
  stylePayloadReview,
}: {
  onSaveWorkspaceThemeStyleControls: (
    controls: WorkspaceThemeStyleControlsV1,
  ) => ImportedWorkspaceStyleReviewState | null;
  stylePayloadReview: ImportedWorkspaceStyleReviewState | null;
}) {
  const importedControls = useMemo(() => {
    if (stylePayloadReview?.decision.status !== "accepted") {
      return null;
    }

    const result = extractWorkspaceThemeStyleControlsV1(
      stylePayloadReview.decision.payload?.controls,
    );

    return result.accepted ? result.controls : null;
  }, [stylePayloadReview]);
  const baseThemeControls = useMemo(
    () => createDefaultWorkspaceThemeStyleControlsV1(),
    [],
  );
  const [controls, setControls] = useState<WorkspaceThemeStyleControlsV1>(
    () => importedControls ?? baseThemeControls,
  );
  const [savedControls, setSavedControls] =
    useState<WorkspaceThemeStyleControlsV1 | null>(importedControls);
  const [previewState, setPreviewState] =
    useState<WorkspaceThemeLivePreviewState>(
      workspaceThemeLivePreviewInitialState,
    );
  const activeTransactionRef = useRef<ProductionPreviewApplyTransaction | null>(
    null,
  );
  const sessionIdRef = useRef(createWorkspaceThemePreviewId("session"));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!stylePayloadReview) {
        return;
      }

      if (!importedControls) {
        setControls(baseThemeControls);
        setSavedControls(null);
        return;
      }

      setControls(importedControls);
      setSavedControls(importedControls);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseThemeControls, importedControls, stylePayloadReview]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (
        importedControls ||
        savedControls ||
        activeTransactionRef.current ||
        previewState.status === "active" ||
        previewState.status === "saved" ||
        previewState.status === "blocked"
      ) {
        return;
      }

      setControls(baseThemeControls);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [baseThemeControls, importedControls, previewState.status, savedControls]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const targets = getWorkspaceThemePreviewTargets();
      const target = targets[0] ?? null;
      const facts = createWorkspaceThemeTargetFacts(targets, target);
      const nextTargetStatus =
        targets.length === 1 &&
        facts.tagName !== "html" &&
        facts.tagName !== "body" &&
        !facts.isDocumentRoot
          ? "ready"
          : targets.length === 0
            ? "missing"
            : "blocked";

      setPreviewState((current) => ({
        ...current,
        targetCount: targets.length,
        targetStatus: nextTargetStatus,
      }));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeAccent = controls.accentColor;
  const controlRadius = `${controls.radius}px`;
  const panelMaterialStyle = {
    background:
      "var(--nexus-layout-panel-bg, linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.02))), var(--nexus-panel-bg, rgb(16 16 16 / 0.95))",
    borderColor:
      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.12)))",
    borderRadius: controlRadius,
    boxShadow:
      "var(--nexus-layout-panel-shadow, var(--nexus-panel-shadow, 0 0 0 transparent))",
  } satisfies CSSProperties;
  const panelMutedMaterialStyle = {
    background:
      "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(16 16 16 / 0.82))",
    borderColor:
      "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
    borderRadius: controlRadius,
  } satisfies CSSProperties;

  const applyPreview = useCallback(
    (nextControls: WorkspaceThemeStyleControlsV1) => {
      const variableResult =
        createWorkspaceThemeStylePreviewVariablesV1(nextControls);

      if (!variableResult.accepted) {
        setPreviewState((current) => ({
          ...current,
          error: variableResult.reasons.join(", "),
          status: "blocked",
          targetStatus: "blocked",
        }));
        return;
      }

      const targets = getWorkspaceThemePreviewTargets();
      const target = targets[0] ?? null;
      const targetFacts = createWorkspaceThemeTargetFacts(targets, target);
      const previousInlineValues =
        activeTransactionRef.current?.previousInlineValues ??
        (target
          ? snapshotWorkspaceThemeInlineValues(
              target,
              variableResult.variableNames,
            )
          : {});
      const transactionId = createWorkspaceThemePreviewId("transaction");
      const startedAt = getWorkspaceThemePreviewNow();
      const plan = createProductionPreviewApplyPlan({
        checksums: {
          bridgeChecksum: variableResult.checksum,
          budgetChecksum: variableResult.checksum,
          diagnosticsChecksum: variableResult.checksum,
        },
        createdAt: new Date().toISOString(),
        hasAuthenticatedEvidence: true,
        hasRollbackPlan: true,
        networkBaselineWindowId: workspaceThemeLivePreviewNetworkBaselineWindowId,
        preflightVerdict: "eligible",
        previousInlineValues,
        safetyFlags: {
          mutatesDocumentRoot: false,
          touchesProductionBehavior: false,
          writesToBackend: false,
          writesToStorage: false,
          writesToStore: false,
        },
        sessionId: sessionIdRef.current,
        target: targetFacts,
        transactionId,
        variables: variableResult.variables,
      });

      if (!target || plan.verdict !== "ready" || !plan.transaction) {
        setPreviewState({
          ...workspaceThemeLivePreviewInitialState,
          checksum: variableResult.checksum,
          error:
            plan.reasons[0]?.message ??
            "Workspace style preview failed closed.",
          status: "blocked",
          targetCount: targets.length,
          targetStatus: targets.length === 0 ? "missing" : "blocked",
          transactionId,
          variableCount: variableResult.variableNames.length,
        });
        return;
      }

      for (const [name, value] of Object.entries(
        plan.transaction.appliedVariables,
      )) {
        target.style.setProperty(name, value);
      }

      activeTransactionRef.current = plan.transaction;
      setPreviewState({
        applyDurationMs: roundWorkspaceThemePreviewDuration(
          getWorkspaceThemePreviewNow() - startedAt,
        ),
        checksum: variableResult.checksum,
        error: null,
        remainingPreviewVariableCount: null,
        residueCheck: "not-run",
        revertDurationMs: null,
        status: "active",
        targetCount: targets.length,
        targetStatus: "ready",
        transactionId,
        variableCount: variableResult.variableNames.length,
      });
    },
    [],
  );

  const updateControls = useCallback(
    (nextControls: WorkspaceThemeStyleControlsV1) => {
      setControls(nextControls);
      applyPreview(nextControls);
    },
    [applyPreview],
  );

  const revertPreview = useCallback(() => {
    const transaction = activeTransactionRef.current;
    const targets = getWorkspaceThemePreviewTargets();
    const target = targets[0] ?? null;
    const targetFacts = createWorkspaceThemeTargetFacts(targets, target);
    const startedAt = getWorkspaceThemePreviewNow();
    const revertPlan = createProductionPreviewRevertPlan({
      expectedBridgeChecksum: transaction?.checksums.bridgeChecksum,
      expectedSessionId: transaction?.sessionId,
      target: targetFacts,
      transaction,
    });

    if (!target || !transaction || revertPlan.verdict !== "ready") {
      setPreviewState((current) => ({
        ...current,
        error:
          revertPlan.reasons[0]?.message ??
          "Workspace style revert failed closed.",
        status: "blocked",
        targetCount: targets.length,
        targetStatus: targets.length === 0 ? "missing" : "blocked",
      }));
      return;
    }

    for (const operation of revertPlan.operations) {
      if (operation.kind === "remove") {
        target.style.removeProperty(operation.name);
      } else {
        target.style.setProperty(operation.name, operation.value);
      }
    }

    const residue = createProductionPreviewResidueCheck({
      currentInlineValues: snapshotWorkspaceThemeInlineValues(
        target,
        transaction.variableNames,
      ),
      transaction,
    });
    const revertDurationMs = roundWorkspaceThemePreviewDuration(
      getWorkspaceThemePreviewNow() - startedAt,
    );

    if (residue.result === "pass") {
      activeTransactionRef.current = null;
    }

    setPreviewState({
      applyDurationMs: previewState.applyDurationMs,
      checksum: transaction.checksums.bridgeChecksum,
      error:
        residue.result === "pass"
          ? null
          : `Residue check failed for ${residue.mismatchedVariableNames.length} variables.`,
      remainingPreviewVariableCount: residue.remainingPreviewVariableCount,
      residueCheck: residue.result,
      revertDurationMs,
      status: residue.result === "pass" ? "reverted" : "blocked",
      targetCount: targets.length,
      targetStatus: "ready",
      transactionId: transaction.transactionId,
      variableCount: transaction.variableCount,
    });
  }, [previewState.applyDurationMs]);

  const saveControls = useCallback(() => {
    const written = onSaveWorkspaceThemeStyleControls(controls);

    if (!written || written.decision.status !== "accepted") {
      setPreviewState((current) => ({
        ...current,
        error: "Workspace style controls were rejected style-only.",
        status: "blocked",
      }));
      return;
    }

    setSavedControls(controls);
    setPreviewState((current) => ({
      ...current,
      error: null,
      status: current.status === "active" ? "saved" : current.status,
    }));
  }, [controls, onSaveWorkspaceThemeStyleControls]);

  const resetControls = useCallback(() => {
    const nextControls =
      savedControls ?? baseThemeControls;

    updateControls(nextControls);
  }, [baseThemeControls, savedControls, updateControls]);

  const applyWorkspaceStylePreset = useCallback(
    (preset: WorkspaceStylePresetDefinition) => {
      updateControls(
        createWorkspaceStylePresetControls(baseThemeControls, preset),
      );
    },
    [baseThemeControls, updateControls],
  );

  const rangeControl = ({
    key,
    label,
    max,
    min = 0,
  }: {
    key: Exclude<
      keyof WorkspaceThemeStyleControlsV1,
      "accent" | "accentColor" | "version"
    >;
    label: string;
    max: number;
    min?: number;
  }) => (
    <label
      className="block border bg-black/20 p-3"
      data-testid={`workspace-style-control-${key}`}
      style={{
        ...panelMutedMaterialStyle,
      }}
    >
      <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-100">{controls[key]}</span>
      </span>
      <input
        className="mt-3 w-full"
        max={max}
        min={min}
        onInput={(event) =>
          updateControls({
            ...controls,
            [key]: Number(event.currentTarget.value),
          })
        }
        style={{ accentColor: activeAccent }}
        type="range"
        value={controls[key]}
      />
    </label>
  );

  return (
    <section
      className="mb-4 border p-3"
      data-testid="workspace-style-controls-panel"
      style={{
        ...panelMaterialStyle,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-100">
            <SlidersHorizontal className="h-4 w-4" />
            Workspace Style Controls
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Base theme seed plus scoped workspace override
          </div>
        </div>
        {previewState.error ? (
          <div
            className="mt-3 border p-3 text-xs text-neutral-100"
            data-testid="workspace-style-error"
            style={{
              ...panelMutedMaterialStyle,
            }}
          >
            {previewState.error}
          </div>
        ) : null}
      </div>

      <div
        className="mb-3 border p-3"
        data-testid="workspace-style-presets"
        style={{
          ...panelMutedMaterialStyle,
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-400">
          <span>Workspace Style Presets</span>
          <span className="text-neutral-100">Layer 4</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {workspaceStylePresetDefinitions.map((preset) => {
            const presetControls = createWorkspaceStylePresetControls(
              baseThemeControls,
              preset,
            );
            const isActivePreset = compareWorkspaceThemeControls(
              controls,
              presetControls,
            );

            return (
              <button
                aria-pressed={isActivePreset}
                className="min-h-14 border px-3 py-2 text-left font-mono uppercase tracking-[0.1em] text-neutral-100 transition hover:bg-white/[0.06]"
                data-testid={`workspace-style-preset-${preset.id}`}
                key={preset.id}
                onClick={() => applyWorkspaceStylePreset(preset)}
                style={{
                  background:
                    "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.2))",
                  borderColor: isActivePreset
                    ? `${activeAccent}99`
                    : "var(--nexus-layout-panel-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
                  borderRadius: controlRadius,
                }}
                type="button"
              >
                <span className="block text-[10px]">{preset.label}</span>
                <span className="mt-1 block text-[8px] text-neutral-500">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        {rangeControl({
          key: "warmth",
          label: "Warmth",
          max: 100,
        })}
        {rangeControl({
          key: "glass",
          label: "Glass",
          max: 100,
        })}
        {rangeControl({
          key: "blur",
          label: "Blur",
          max: 40,
        })}
        {rangeControl({
          key: "radius",
          label: "Radius",
          max: 32,
        })}
        {rangeControl({
          key: "shadow",
          label: "Shadow",
          max: 100,
        })}
        {rangeControl({
          key: "workspaceWash",
          label: "Surface Lightness",
          max: 100,
        })}

      </div>

      <footer className="mt-3 grid grid-cols-3 gap-2">
        <button
          className="border px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-100 transition hover:bg-white/10"
          data-testid="workspace-style-save"
          onClick={saveControls}
          style={{
            background:
              "var(--nexus-layout-panel-bg, linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.02))), var(--nexus-panel-bg, rgb(255 255 255 / 0.04))",
            borderColor: `${activeAccent}59`,
            borderRadius: controlRadius,
          }}
          title="Save to workspace style"
          type="button"
        >
          Save
        </button>
        <button
          className="border bg-black/25 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-200 transition hover:bg-white/10"
          data-testid="workspace-style-revert"
          onClick={revertPreview}
          style={{
            background:
              "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.25))",
            borderColor: `${activeAccent}40`,
            borderRadius: controlRadius,
          }}
          title="Revert preview"
          type="button"
        >
          Revert
        </button>
        <button
          className="border bg-black/25 px-2 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-neutral-200 transition hover:bg-white/10"
          data-testid="workspace-style-reset"
          onClick={resetControls}
          style={{
            background:
              "var(--nexus-layout-panel-muted-bg, linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.012))), var(--nexus-panel-bg, rgb(0 0 0 / 0.25))",
            borderColor: `${activeAccent}40`,
            borderRadius: controlRadius,
          }}
          title="Reset controls"
          type="button"
        >
          Reset
        </button>
      </footer>
    </section>
  );
}
