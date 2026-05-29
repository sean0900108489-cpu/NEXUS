"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileJson,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, type CSSProperties, type ChangeEvent } from "react";

import {
  compileNexusStyleManifestV1,
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  createNexusStyleManifestDraftFromIntentV1,
  createNexusStyleExportPackageV1,
  createNexusStylePreviewPatchV1,
  createReactFlowStyleAdapterFromManifestV1,
  emitReactFlowAdapterCssVariablesV1,
  HIGH_CONTRAST_CARBON_STYLE_ID,
  LEGACY_CYBERPUNK_STYLE_ID,
  normalizeNexusStyleIntentV1,
  parseNexusStyleImportTextV1,
  reviewNexusStylePackV1,
  type NexusStyleIntentManifestDraftResultV1,
  type NexusStyleIntentNormalizerResultV1,
  type NexusStyleImportTextResultV1,
  type NexusStyleManifestV1,
} from "@/lib/style-engine";
import { useNexusStyleRuntimeV1 } from "@/components/style-engine/nexus-style-runtime-provider";

type PreviewState = "idle" | "previewing" | "reverted";
type ExportView = "manifest" | "package" | "review";
type VisibleIssueSeverity = "error" | "question" | "warning";
type BriefDraftResult = {
  draft: NexusStyleIntentManifestDraftResultV1 | null;
  intent: NexusStyleIntentNormalizerResultV1;
};
type VisibleStyleIssue = {
  code: string;
  message: string;
  path: string;
  severity: VisibleIssueSeverity;
};

const maxVisibleImportIssues = 3;

const comparisonVariables = [
  "--nexus-surface-app",
  "--nexus-surface-panel",
  "--nexus-text-primary",
  "--nexus-accent-primary",
  "--nexus-status-warning",
];

const builtInPresets = [
  {
    create: createLegacyCyberpunkStyleManifestV1,
    id: LEGACY_CYBERPUNK_STYLE_ID,
    label: "Cyberpunk",
  },
  {
    create: createHighContrastCarbonStyleManifestV1,
    id: HIGH_CONTRAST_CARBON_STYLE_ID,
    label: "High Contrast",
  },
];

const exportViews: Array<{ id: ExportView; label: string }> = [
  { id: "package", label: "Package" },
  { id: "manifest", label: "Manifest" },
  { id: "review", label: "Review" },
];

function toVisibleStyleIssue(
  issue: { code: string; message: string; path: string },
  severity: VisibleIssueSeverity,
): VisibleStyleIssue {
  return {
    code: issue.code,
    message: issue.message,
    path: issue.path,
    severity,
  };
}

const surfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const sampleStyle = {
  background: "var(--nexus-surface-workspace, #020617)",
  borderColor: "var(--nexus-accent-primary, #67e8f9)",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitivePanelStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveButtonStyle = {
  background: "var(--nexus-accent-primary, #67e8f9)",
  borderColor: "var(--nexus-accent-primary-strong, #22d3ee)",
  color: "var(--nexus-text-inverse, #020617)",
};

const primitiveInputStyle = {
  background: "var(--nexus-surface-input, rgb(15 23 42 / 0.72))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveBadgeStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-status-warning, #fcd34d)",
  color: "var(--nexus-status-warning, #fcd34d)",
};

const primitiveModalBackdropStyle = {
  background: "rgb(2 6 23 / 0.72)",
};

const primitiveModalSurfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-border-strong, rgb(226 232 240 / 0.18))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveModalFooterStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
};

const primitiveModalCalloutStyle = {
  background: "var(--nexus-surface-input, rgb(15 23 42 / 0.72))",
  borderColor: "var(--nexus-status-warning, #fcd34d)",
  color: "var(--nexus-status-warning, #fcd34d)",
};

const primitiveCommandPaletteItems = [
  "Open Agent",
  "Toggle Dock",
  "Review Style",
];

const primitiveCommandPaletteOverlayStyle = {
  background: "rgb(2 6 23 / 0.76)",
};

const primitiveCommandPaletteSurfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-border-strong, rgb(226 232 240 / 0.18))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveCommandPaletteInputStyle = {
  background: "var(--nexus-surface-input, rgb(15 23 42 / 0.72))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-secondary, #cbd5e1)",
};

const primitiveCommandPaletteItemStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveCommandPaletteActiveItemStyle = {
  background: "var(--nexus-accent-primary, #67e8f9)",
  borderColor: "var(--nexus-accent-primary-strong, #22d3ee)",
  color: "var(--nexus-text-inverse, #020617)",
};

const primitiveCommandPaletteIconStyle = {
  background: "var(--nexus-accent-primary, #67e8f9)",
};

const primitivePromptVaultSurfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-border-strong, rgb(226 232 240 / 0.18))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitivePromptVaultHeaderStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-accent-primary, #67e8f9)",
};

const primitivePromptVaultSidebarStyle = {
  background: "var(--nexus-surface-workspace, #020617)",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
};

const primitivePromptVaultRecordStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-accent-primary, #67e8f9)",
};

const primitivePromptVaultContentStyle = {
  background: "var(--nexus-surface-input, rgb(15 23 42 / 0.72))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
};

const primitiveWindowSurfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-border-strong, rgb(226 232 240 / 0.18))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveWindowChromeStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-secondary, #cbd5e1)",
};

const primitiveWindowBodyStyle = {
  background: "var(--nexus-surface-workspace, #020617)",
};

const primitiveWindowHandleStyle = {
  background: "var(--nexus-accent-primary, #67e8f9)",
};

const primitiveDatapadSurfaceStyle = {
  background: "var(--nexus-surface-panel, rgb(8 16 22 / 0.78))",
  borderColor: "var(--nexus-status-success, #6ee7b7)",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveDatapadChromeStyle = {
  background: "var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-status-success, #6ee7b7)",
};

const primitiveDatapadBodyStyle = {
  background: "var(--nexus-surface-input, rgb(15 23 42 / 0.72))",
};

const primitiveDatapadFooterStyle = {
  background: "var(--nexus-surface-workspace, #020617)",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
};

const primitiveDatapadActionStyle = {
  background: "var(--nexus-status-success, #6ee7b7)",
  borderColor: "var(--nexus-status-success, #6ee7b7)",
  color: "var(--nexus-text-inverse, #020617)",
};

const graphCanvasStyle = {
  background:
    "var(--nexus-graph-background-color, var(--nexus-surface-workspace, #020617))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
};

const graphNodeStyle = {
  background:
    "var(--nexus-graph-node-agent-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-graph-node-agent-border, var(--nexus-accent-primary, #67e8f9))",
  boxShadow:
    "var(--nexus-graph-node-runtime-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-graph-node-agent-text, var(--nexus-text-primary, #f8fafc))",
};

const graphEdgeStyle = {
  background:
    "linear-gradient(90deg, var(--nexus-graph-edge-default-stroke, #67e8f9), var(--nexus-graph-edge-selected-stroke, #6ee7b7))",
  transform: "rotate(14deg)",
};

export function NexusStyleLab() {
  const runtime = useNexusStyleRuntimeV1();
  const baselineManifest = useMemo(
    () => createLegacyCyberpunkStyleManifestV1(),
    [],
  );
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [selectedBuiltInPreset, setSelectedBuiltInPreset] = useState<string>(
    LEGACY_CYBERPUNK_STYLE_ID,
  );
  const [manifest, setManifest] = useState<NexusStyleManifestV1>(() =>
    createLegacyCyberpunkStyleManifestV1(),
  );
  const [draftText, setDraftText] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefResult, setBriefResult] = useState<BriefDraftResult | null>(null);
  const [exportView, setExportView] = useState<ExportView>("package");
  const [importResult, setImportResult] =
    useState<NexusStyleImportTextResultV1 | null>(null);
  const baselineCompiled = useMemo(
    () => compileNexusStyleManifestV1(baselineManifest),
    [baselineManifest],
  );
  const compiled = useMemo(() => compileNexusStyleManifestV1(manifest), [manifest]);
  const review = useMemo(() => reviewNexusStylePackV1(manifest), [manifest]);
  const exportResult = useMemo(
    () => createNexusStyleExportPackageV1(manifest),
    [manifest],
  );
  const previewPatch = useMemo(() => {
    if (!compiled.accepted) {
      return null;
    }

    return createNexusStylePreviewPatchV1(compiled.style);
  }, [compiled]);
  const exportPackageText = useMemo(
    () =>
      JSON.stringify(
        exportResult.accepted
          ? exportResult.exportPackage
          : { review: exportResult.review },
        null,
        2,
      ),
    [exportResult],
  );
  const exportText = useMemo(() => {
    if (!exportResult.accepted) {
      return exportPackageText;
    }

    const exportValue =
      exportView === "manifest"
        ? exportResult.exportPackage.manifest
        : exportView === "review"
          ? exportResult.review
          : exportResult.exportPackage;

    return JSON.stringify(exportValue, null, 2);
  }, [exportPackageText, exportResult, exportView]);
  const tokenRows = useMemo(() => {
    if (!compiled.accepted) {
      return [];
    }

    return [
      "--nexus-surface-app",
      "--nexus-surface-panel",
      "--nexus-text-primary",
      "--nexus-text-secondary",
      "--nexus-accent-primary",
      "--nexus-status-warning",
    ].map((name) => ({
      name,
      value: compiled.style.cssVariables[name],
    }));
  }, [compiled]);
  const importIssues = useMemo(() => {
    if (!importResult || importResult.accepted) {
      return [];
    }

    return importResult.errors
      .map((issue) => toVisibleStyleIssue(issue, "error"))
      .slice(0, maxVisibleImportIssues);
  }, [importResult]);
  const importStatus = importResult
    ? importResult.accepted
      ? `${importResult.source} accepted`
      : `${importResult.source} rejected`
    : "no draft";
  const briefIssues = useMemo(() => {
    if (!briefResult) {
      return [];
    }

    const intentIssues = briefResult.intent.accepted
      ? [
          ...briefResult.intent.warnings.map((issue) =>
            toVisibleStyleIssue(issue, "warning"),
          ),
          ...briefResult.intent.questions.map((issue) =>
            toVisibleStyleIssue(issue, "question"),
          ),
        ]
      : briefResult.intent.errors.map((issue) =>
          toVisibleStyleIssue(issue, "error"),
        );
    const draftIssues =
      briefResult.draft && !briefResult.draft.accepted
        ? briefResult.draft.errors.map((issue) =>
            toVisibleStyleIssue(issue, "error"),
          )
        : [];

    return [...draftIssues, ...intentIssues].slice(0, maxVisibleImportIssues);
  }, [briefResult]);
  const briefStatus = briefResult
    ? briefResult.draft?.accepted
      ? "draft loaded"
      : "brief rejected"
    : "no brief";
  const briefIntentRows = useMemo(() => {
    if (!briefResult || !briefResult.intent.accepted) {
      return [];
    }

    const intent = briefResult.intent.draft.intent;

    return [
      ["Contrast", intent.contrast],
      ["Motion", intent.motion],
      ["Density", intent.density],
      ["Mood", intent.mood.join(", ")],
      ["Material", intent.material.join(", ")],
    ];
  }, [briefResult]);
  const activePreviewLabel = runtime.activePreview?.previewId ?? "none";
  const activePreviewChecksumLabel =
    runtime.activePreview?.manifestChecksum ?? "none";
  const activePreviewVariableCountLabel = runtime.activePreview
    ? String(Object.keys(runtime.activePreview.appliedVariables).length)
    : "none";
  const adapterCoverageLabel = compiled.accepted
    ? `reactFlow:${compiled.style.report.adapterCoverage.reactFlow}`
    : "blocked";
  const compiledVariableCountLabel = compiled.accepted
    ? String(compiled.style.report.emittedVariableCount)
    : "blocked";
  const previewVariableCountLabel = previewPatch
    ? String(Object.keys(previewPatch.variables).length)
    : "blocked";
  const intentProfileLabel = `${manifest.intent.contrast} / ${manifest.intent.density} / ${manifest.intent.motion}`;
  const sourceKindLabel = manifest.source?.kind ?? "unknown";
  const modeLabel = manifest.mode;
  const governanceRows = useMemo(
    () => [
      ["State", review.state],
      ["Source", sourceKindLabel],
      ["Mode", modeLabel],
      ["Intent", intentProfileLabel],
      ["Compatibility", review.compatibility],
      ["Adapter", adapterCoverageLabel],
      ["Preview", review.permissions.canPreview ? "allowed" : "blocked"],
      ["Apply", review.permissions.canApply ? "allowed" : "blocked"],
      ["Apply Reason", review.permissions.reasonCodes.join(", ") || "none"],
      [
        "Validation",
        `${review.validation.errorCount}E / ${review.validation.warningCount}W`,
      ],
      ["Compiled Vars", compiledVariableCountLabel],
      ["Preview Vars", previewVariableCountLabel],
      ["Manifest Checksum", review.checksums.normalizedManifest ?? "n/a"],
      ["Compiled Checksum", review.checksums.compiledOutput ?? "n/a"],
      ["Runtime Target", "scoped-provider-v1"],
      ["Active Preview", activePreviewLabel],
      ["Active Vars", activePreviewVariableCountLabel],
      ["Preview Checksum", activePreviewChecksumLabel],
      ["Export", "text-only"],
      ["Persistence", "not-persistent"],
      ["Governance", review.governanceVersion],
      ["Manifest", String(review.manifestVersion ?? "n/a")],
      ["Compiler", review.compilerVersion ?? "n/a"],
      ["Report", review.checksums.report],
    ],
    [
      activePreviewChecksumLabel,
      activePreviewLabel,
      activePreviewVariableCountLabel,
      adapterCoverageLabel,
      compiledVariableCountLabel,
      intentProfileLabel,
      modeLabel,
      previewVariableCountLabel,
      sourceKindLabel,
      review,
    ],
  );
  const governanceIssues = useMemo(
    () =>
      [
        ...review.validation.errors.map((issue) =>
          toVisibleStyleIssue(issue, "error"),
        ),
        ...review.validation.warnings.map((issue) =>
          toVisibleStyleIssue(issue, "warning"),
        ),
      ].slice(0, maxVisibleImportIssues),
    [review],
  );
  const comparisonRows = useMemo(() => {
    if (!baselineCompiled.accepted || !compiled.accepted) {
      return [];
    }

    return comparisonVariables.map((name) => ({
      active: compiled.style.cssVariables[name] ?? "",
      baseline: baselineCompiled.style.cssVariables[name] ?? "",
      name,
    }));
  }, [baselineCompiled, compiled]);
  const graphAdapterVariableStyle = useMemo<CSSProperties>(
    () =>
      emitReactFlowAdapterCssVariablesV1(
        createReactFlowStyleAdapterFromManifestV1(manifest),
      ) as CSSProperties,
    [manifest],
  );
  const graphSpecimenCanvasStyle = useMemo<CSSProperties>(
    () => ({
      ...graphAdapterVariableStyle,
      ...graphCanvasStyle,
    }),
    [graphAdapterVariableStyle],
  );
  const latestDraftRejected = importResult ? !importResult.accepted : false;
  const latestBriefRejected = briefResult ? !briefResult.draft?.accepted : false;
  const canPreview =
    Boolean(previewPatch) &&
    review.permissions.canPreview &&
    !latestDraftRejected &&
    !latestBriefRejected;
  const runtimeStatus = latestDraftRejected
    ? "draft rejected"
    : latestBriefRejected
      ? "brief rejected"
      : previewState;
  const previewBlockReason = canPreview
    ? null
    : latestDraftRejected
      ? "blocked / rejected draft"
      : latestBriefRejected
        ? "blocked / rejected brief"
        : !previewPatch
          ? "blocked / compile"
          : !review.permissions.canPreview
            ? `blocked / ${review.permissions.reasonCodes[0] ?? review.state}`
            : null;

  const startPreview = () => {
    if (!previewPatch || !canPreview) {
      return;
    }

    const result = runtime.previewPatch(previewPatch);

    if (result.accepted) {
      setPreviewState("previewing");
    }
  };

  const revertPreview = () => {
    runtime.revertPreview(previewPatch?.previewId);
    setPreviewState("reverted");
  };

  const loadCurrentExport = () => {
    setDraftText(exportPackageText);
    setImportResult(null);
  };

  const handleDraftTextChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDraftText(event.target.value);
    setImportResult(null);
  };

  const handleBriefTextChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setBriefText(event.target.value);
    setBriefResult(null);
  };

  const loadBriefDraft = () => {
    const intent = normalizeNexusStyleIntentV1(briefText, {
      source: "human-brief",
    });
    const draft = intent.accepted
      ? createNexusStyleManifestDraftFromIntentV1(intent)
      : null;

    setBriefResult({ draft, intent });

    if (!draft || !draft.accepted) {
      return;
    }

    runtime.clearPreview();
    setManifest(draft.manifest);
    setImportResult(null);
    setPreviewState("idle");
    setSelectedBuiltInPreset("brief-draft");
  };

  const loadBuiltInPreset = (presetId: string) => {
    const preset = builtInPresets.find((candidate) => candidate.id === presetId);

    if (!preset) {
      return;
    }

    runtime.clearPreview();
    setManifest(preset.create());
    setBriefResult(null);
    setImportResult(null);
    setPreviewState("idle");
    setSelectedBuiltInPreset(preset.id);
  };

  const resetToBaseline = () => {
    loadBuiltInPreset(LEGACY_CYBERPUNK_STYLE_ID);
  };

  const loadDraft = () => {
    const result = parseNexusStyleImportTextV1(draftText);

    setImportResult(result);

    if (!result.accepted) {
      return;
    }

    runtime.clearPreview();
    setManifest(result.manifest);
    setBriefResult(null);
    setSelectedBuiltInPreset(
      builtInPresets.some((preset) => preset.id === result.manifest.id)
        ? result.manifest.id
        : "imported-draft",
    );
    setPreviewState("idle");
  };

  const statusIcon =
    review.state === "rejected" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : review.state === "warning" ? (
      <ShieldCheck className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    );

  return (
    <main className="min-h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <section className="grid min-h-dvh grid-rows-[auto_1fr]">
        <header className="border-b border-white/10 bg-black/30 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-mono text-sm uppercase tracking-[0.22em] text-cyan-100">
                  NEXUS Style Lab
                </h1>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {manifest.id} / {review.state}
                </div>
                <div
                  aria-label="Built-in style presets"
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {builtInPresets.map((preset) => {
                    const active = selectedBuiltInPreset === preset.id;

                    return (
                      <button
                        key={preset.id}
                        className={[
                          "h-8 border px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition",
                          active
                            ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100"
                            : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:bg-white/10",
                        ].join(" ")}
                        onClick={() => loadBuiltInPreset(preset.id)}
                        type="button"
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                disabled={!canPreview}
                onClick={startPreview}
                type="button"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/[0.04] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                onClick={resetToBaseline}
                type="button"
              >
                <ShieldCheck className="h-4 w-4" />
                Baseline
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/[0.04] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                onClick={revertPreview}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Revert
              </button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section
            className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border p-4"
            style={surfaceStyle}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                {statusIcon}
                {review.compatibility}
              </div>
              <div className="grid justify-items-end gap-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {runtimeStatus}
                </div>
                {previewBlockReason ? (
                  <div className="max-w-64 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200">
                    {previewBlockReason}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid min-h-0 gap-4 overflow-y-auto py-4 lg:grid-cols-2">
              <section className="border border-white/10 bg-black/20 p-4">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Token Map
                </div>
                <div className="grid gap-2">
                  {tokenRows.map((token) => (
                    <div
                      key={token.name}
                      className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 border border-white/10 bg-white/[0.03] p-2"
                    >
                      <span
                        aria-hidden="true"
                        className="h-7 w-7 border border-white/15"
                        style={{ background: token.value }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[10px] text-slate-200">
                          {token.name}
                        </span>
                        <span className="mt-1 block truncate font-mono text-[9px] text-slate-500">
                          {token.value}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid min-h-0 grid-rows-[auto_1fr] border border-white/10 bg-black/20 p-4">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Preview Surface
                </div>
                <div
                  className="grid min-h-64 place-items-center border p-5"
                  style={sampleStyle}
                >
                  <div className="w-full max-w-sm border border-white/10 bg-black/30 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                      {manifest.name}
                    </div>
                    <div className="mt-3 h-2 bg-white/10">
                      <div
                        className="h-full w-2/3"
                        style={{
                          background:
                            "var(--nexus-accent-primary, #67e8f9)",
                        }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {["panel", "window", "dock"].map((item) => (
                        <div
                          key={item}
                          className="border border-white/10 bg-white/[0.04] p-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 overflow-hidden border"
                  style={primitiveWindowSurfaceStyle}
                >
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3"
                    style={primitiveWindowChromeStyle}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                        Window Specimen
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        {manifest.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((item) => (
                        <span
                          key={item}
                          className="h-2 w-2 rounded-full border border-white/15"
                          style={primitiveWindowHandleStyle}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 p-4" style={primitiveWindowBodyStyle}>
                    <div className="h-2 w-2/3 bg-white/10">
                      <div
                        className="h-full w-1/2"
                        style={primitiveWindowHandleStyle}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["agent", "tool", "log"].map((item) => (
                        <span
                          key={item}
                          className="truncate border border-white/10 bg-white/[0.04] px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 overflow-hidden border"
                  style={primitiveDatapadSurfaceStyle}
                >
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3"
                    style={primitiveDatapadChromeStyle}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em]">
                        Datapad Shell Specimen
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Global Notes
                      </div>
                    </div>
                    <span className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300">
                      visual
                    </span>
                  </div>
                  <div className="grid gap-2 p-4" style={primitiveDatapadBodyStyle}>
                    <span className="h-2 w-3/4 bg-white/15" />
                    <span className="h-2 w-2/3 bg-white/10" />
                    <span className="h-2 w-5/6 bg-white/10" />
                  </div>
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t px-4 py-3"
                    style={primitiveDatapadFooterStyle}
                  >
                    <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      Local shell preview
                    </span>
                    <span
                      className="border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                      style={primitiveDatapadActionStyle}
                    >
                      Ready
                    </span>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 min-h-48 overflow-hidden border p-4"
                  style={primitiveModalBackdropStyle}
                >
                  <div
                    className="mx-auto grid max-w-md gap-3 border p-4"
                    style={primitiveModalSurfaceStyle}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                      Modal Specimen
                    </div>
                    <div className="truncate text-sm text-slate-200">
                      {manifest.name}
                    </div>
                    <div
                      className="border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                      style={primitiveModalCalloutStyle}
                    >
                      Review Required
                    </div>
                    <div
                      className="grid grid-cols-2 gap-2 border-t pt-3"
                      style={primitiveModalFooterStyle}
                    >
                      <span className="border border-white/10 bg-white/[0.04] px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">
                        Cancel
                      </span>
                      <span
                        className="border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
                        style={primitiveButtonStyle}
                      >
                        Apply
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 overflow-hidden border"
                  style={primitivePromptVaultSurfaceStyle}
                >
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3"
                    style={primitivePromptVaultHeaderStyle}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em]">
                        Prompt Vault Specimen
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Surface Preview
                      </div>
                    </div>
                    <span className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300">
                      visual
                    </span>
                  </div>
                  <div className="grid min-h-44 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <div
                      className="grid gap-2 border-b p-3 md:border-b-0 md:border-r"
                      style={primitivePromptVaultSidebarStyle}
                    >
                      {["Agent Brief", "Style Notes", "Review Log"].map(
                        (item) => (
                          <span
                            key={item}
                            className="min-w-0 border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-100"
                            style={primitivePromptVaultRecordStyle}
                          >
                            {item}
                          </span>
                        ),
                      )}
                    </div>
                    <div className="grid gap-3 p-4" style={primitivePromptVaultContentStyle}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-fuchsia-100">
                        Selected Prompt
                      </div>
                      <div className="grid gap-2">
                        <span className="h-2 w-4/5 bg-white/15" />
                        <span className="h-2 w-2/3 bg-white/10" />
                        <span className="h-2 w-5/6 bg-white/10" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {["view", "meta", "state"].map((item) => (
                          <span
                            key={item}
                            className="truncate border border-white/10 bg-white/[0.04] px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 min-h-48 overflow-hidden border p-4"
                  style={primitiveCommandPaletteOverlayStyle}
                >
                  <div
                    className="mx-auto grid max-w-md gap-3 border p-3"
                    style={primitiveCommandPaletteSurfaceStyle}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                      Command Palette Specimen
                    </div>
                    <div
                      className="truncate border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                      style={primitiveCommandPaletteInputStyle}
                    >
                      Search command
                    </div>
                    <div className="grid gap-2">
                      {primitiveCommandPaletteItems.map((item, index) => (
                        <div
                          key={item}
                          className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2"
                          style={
                            index === 0
                              ? primitiveCommandPaletteActiveItemStyle
                              : primitiveCommandPaletteItemStyle
                          }
                        >
                          <span
                            className="h-2 w-2"
                            style={primitiveCommandPaletteIconStyle}
                          />
                          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em]">
                            {item}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] opacity-70">
                            visual
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-white/10 bg-black/20 p-4 lg:col-span-2">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Comparison
                </div>

                <div className="grid gap-2">
                  {comparisonRows.map((row) => (
                    <div
                      key={row.name}
                      className="grid gap-2 border border-white/10 bg-white/[0.03] p-2 md:grid-cols-[minmax(150px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <div className="truncate font-mono text-[10px] text-slate-300">
                        {row.name}
                      </div>
                      <div className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-6 w-6 border border-white/15"
                          style={{ background: row.baseline || "transparent" }}
                        />
                        <span className="truncate font-mono text-[9px] text-slate-500">
                          {row.baseline || "n/a"}
                        </span>
                      </div>
                      <div className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-6 w-6 border border-white/15"
                          style={{ background: row.active || "transparent" }}
                        />
                        <span className="truncate font-mono text-[9px] text-slate-200">
                          {row.active || "n/a"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-white/10 bg-black/20 p-4 lg:col-span-2">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Primitive Specimen
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
                  <div className="min-w-0 border p-4" style={primitivePanelStyle}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                      Panel
                    </div>
                    <div className="mt-3 truncate text-sm text-slate-200">
                      {manifest.name}
                    </div>
                    <div className="mt-2 h-2 bg-white/10">
                      <div
                        className="h-full w-1/2"
                        style={{
                          background:
                            "var(--nexus-accent-primary, #67e8f9)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-2">
                    <button
                      className="h-10 min-w-0 border px-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                      style={primitiveButtonStyle}
                      type="button"
                    >
                      Button
                    </button>
                    <input
                      aria-label="Specimen input"
                      className="h-10 min-w-0 border px-3 font-mono text-[10px] uppercase tracking-[0.12em] outline-none"
                      readOnly
                      style={primitiveInputStyle}
                      value="Input"
                    />
                    <div className="min-w-0">
                      <span
                        className="inline-flex max-w-full items-center border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                        style={primitiveBadgeStyle}
                      >
                        Badge
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-white/10 bg-black/20 p-4 lg:col-span-2">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Governance Report
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
                  <div className="grid gap-2">
                    {governanceRows.map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border border-white/10 bg-white/[0.03] p-2"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          {label}
                        </span>
                        <span className="truncate font-mono text-[10px] text-slate-200">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="min-w-0 border border-white/10 bg-black/20 p-3">
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Issues
                    </div>
                    {governanceIssues.length > 0 ? (
                      <div className="grid gap-2">
                        {governanceIssues.map((issue) => (
                          <div
                            key={`${issue.path}:${issue.code}`}
                            className="min-w-0 border border-white/10 bg-white/[0.03] p-2"
                          >
                            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                              {issue.severity}
                            </div>
                            <div className="truncate font-mono text-[10px] text-amber-100">
                              {issue.code}
                            </div>
                            <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                              {issue.message}
                            </div>
                            <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
                              {issue.path}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                        none
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="border border-white/10 bg-black/20 p-4 lg:col-span-2">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Graph Specimen
                </div>

                <div
                  className="relative min-h-64 overflow-hidden border"
                  style={graphSpecimenCanvasStyle}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(148_163_184_/_0.16)_1px,transparent_0)] bg-[length:24px_24px]" />
                  <div
                    aria-hidden="true"
                    className="absolute left-[31%] top-[45%] h-1 w-[38%] origin-left rounded-full"
                    style={graphEdgeStyle}
                  />

                  <div
                    className="absolute left-5 top-8 w-40 max-w-[42%] border p-3"
                    style={graphNodeStyle}
                  >
                    <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                      Source
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10">
                      <div
                        className="h-full w-3/5"
                        style={{
                          background:
                            "var(--nexus-graph-handle-source-fill, var(--nexus-accent-primary, #67e8f9))",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="absolute bottom-8 right-5 w-44 max-w-[46%] border p-3"
                    style={graphNodeStyle}
                  >
                    <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100">
                      Target
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <span className="h-1.5 bg-white/15" />
                      <span
                        className="h-1.5"
                        style={{
                          background:
                            "var(--nexus-graph-handle-target-fill, var(--nexus-status-success, #6ee7b7))",
                        }}
                      />
                      <span className="h-1.5 bg-white/15" />
                    </div>
                  </div>

                  <div
                    className="absolute right-12 top-8 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                    style={primitiveBadgeStyle}
                  >
                    Visual
                  </div>
                </div>
              </section>
            </div>
          </section>

          <aside className="grid min-h-0 gap-4 overflow-hidden lg:grid-rows-[minmax(220px,0.75fr)_minmax(220px,0.75fr)_minmax(260px,1fr)]">
            <section className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden border border-white/10 bg-black/30">
              <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span className="truncate">Draft Input</span>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {importStatus}
                </span>
              </header>

              <textarea
                aria-label="Style import JSON"
                className="min-h-0 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none placeholder:text-slate-700"
                onChange={handleDraftTextChange}
                placeholder="{}"
                spellCheck={false}
                value={draftText}
              />

              <footer className="border-t border-white/10 p-3">
                <div className="mb-3 min-h-12 border border-white/10 bg-white/[0.03] p-2">
                  {importResult ? (
                    importResult.accepted ? (
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                        {importResult.manifest.id} loaded
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        {importIssues.map((issue) => (
                          <div
                            key={`${issue.path}:${issue.code}`}
                            className="min-w-0"
                          >
                            <div className="truncate font-mono text-[10px] text-rose-200">
                              {issue.severity} / {issue.code}
                            </div>
                            <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
                              {issue.path} / {issue.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      idle
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                    onClick={loadCurrentExport}
                    type="button"
                  >
                    <FileJson className="h-4 w-4" />
                    Use Export
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                    disabled={draftText.trim().length === 0}
                    onClick={loadDraft}
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Load Draft
                  </button>
                </div>
              </footer>
            </section>

            <section className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden border border-white/10 bg-black/30">
              <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span className="truncate">Brief Input</span>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {briefStatus}
                </span>
              </header>

              <textarea
                aria-label="Style brief text"
                className="min-h-0 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none placeholder:text-slate-700"
                onChange={handleBriefTextChange}
                placeholder="brief"
                spellCheck={false}
                value={briefText}
              />

              <footer className="border-t border-white/10 p-3">
                <div className="mb-3 min-h-12 border border-white/10 bg-white/[0.03] p-2">
                  {briefResult?.draft?.accepted ? (
                    <div className="grid gap-2">
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-200">
                        {briefResult.draft.manifest.id} loaded
                      </div>
                      <div className="grid gap-1">
                        {briefIntentRows.map(([label, value]) => (
                          <div
                            key={label}
                            className="grid grid-cols-[72px_minmax(0,1fr)] gap-2"
                          >
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                              {label}
                            </span>
                            <span className="truncate font-mono text-[9px] text-slate-300">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : briefIssues.length > 0 ? (
                    <div className="grid gap-1">
                      {briefIssues.map((issue) => (
                        <div
                          key={`${issue.path}:${issue.code}`}
                          className="min-w-0"
                        >
                          <div className="truncate font-mono text-[10px] text-amber-100">
                            {issue.severity} / {issue.code}
                          </div>
                          <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
                            {issue.path} / {issue.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      idle
                    </div>
                  )}
                </div>

                <button
                  className="inline-flex h-9 w-full items-center justify-center gap-2 border border-emerald-300/35 bg-emerald-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-40"
                  disabled={briefText.trim().length === 0}
                  onClick={loadBriefDraft}
                  type="button"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Draft Manifest
                </button>
              </footer>
            </section>

            <section className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border border-white/10 bg-black/30">
              <header className="grid gap-3 border-b border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-100">
                    <FileJson className="h-4 w-4 shrink-0" />
                    <span className="truncate">Export Text</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {review.validation.warningCount}W /{" "}
                    {review.validation.errorCount}E
                  </span>
                </div>
                <div
                  aria-label="Export text view"
                  className="grid grid-cols-3 gap-2"
                >
                  {exportViews.map((view) => {
                    const active = exportView === view.id;

                    return (
                      <button
                        key={view.id}
                        className={[
                          "h-8 min-w-0 border px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition",
                          active
                            ? "border-fuchsia-300/45 bg-fuchsia-300/15 text-fuchsia-100"
                            : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:bg-white/10",
                        ].join(" ")}
                        onClick={() => setExportView(view.id)}
                        type="button"
                      >
                        {view.label}
                      </button>
                    );
                  })}
                </div>
              </header>
              <textarea
                className="min-h-0 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none"
                readOnly
                spellCheck={false}
                value={exportText}
              />
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
