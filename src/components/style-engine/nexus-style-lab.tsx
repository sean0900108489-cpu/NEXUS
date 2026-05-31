"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileJson,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from "react";

import {
  compileNexusStyleManifestV1,
  createNexusSkinPackAuthoringContextV1,
  createCyberpunkCompatibleSkinPackV2,
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  createNexusStyleManifestDraftFromIntentV1,
  createNexusStyleExportPackageV1,
  createNexusStylePreviewPatchV1,
  createNexusProductionTokenBridgePlanV1,
  createDefaultWorkspaceLayoutPresetV1,
  createDefaultWorkspacePageShellFeatureMountPlanV1,
  createInvalidUnsafeWorkspaceLayoutPresetV1,
  createInvalidUnsafePageShellFeatureMountPlanV1,
  createLeftRightSwappedWorkspaceLayoutPresetV1,
  createNexusPageShellPrototypeV1,
  createOverBudgetSkinPackV2,
  createPageShellFeatureMountPlanV1,
  createPageShellLayoutPresetV1,
  createPixelWorkshopSkinPackV2,
  createReactFlowStyleAdapterFromManifestV1,
  createTopBottomSwappedWorkspaceLayoutPresetV1,
  compileNexusSkinPackRenderPlanTextV2,
  emitReactFlowAdapterCssVariablesV1,
  getNexusSkinPackIssueRepairHintV1,
  HIGH_CONTRAST_CARBON_STYLE_ID,
  LEGACY_CYBERPUNK_STYLE_ID,
  compileNexusSkinPackTokenPreviewTextV2,
  normalizeNexusStyleIntentV1,
  parseNexusSkinPackReviewImportTextV2,
  parseNexusStyleImportTextV1,
  previewNexusProductionTokenBridgePlanOnTargetV1,
  reviewNexusWorkspaceLayoutPresetTextV1,
  reviewNexusStylePackV1,
  revertNexusProductionTokenBridgePreviewOnTargetV1,
  validateNexusPageShellFeatureMountPlanV1,
  validateNexusWorkspaceLayoutPresetV1,
  type NexusProductionTokenBridgePreviewSessionV1,
  type NexusSkinPackReviewImportResultV2,
  type NexusSkinPackReviewSummarySectionV2,
  type NexusSkinPackTokenPreviewResultV2,
  type NexusStyleIntentManifestDraftResultV1,
  type NexusStyleIntentNormalizerResultV1,
  type NexusStyleImportTextResultV1,
  type NexusStyleManifestV1,
  type NexusWorkspaceLayoutPresetReviewResultV1,
} from "@/lib/style-engine";
import { useNexusStyleRuntimeV1 } from "@/components/style-engine/nexus-style-runtime-provider";

type PreviewState = "idle" | "previewing" | "reverted";
type SkinPackTokenPreviewState = "idle" | "previewing" | "reverted" | "blocked";
type ProductionBridgePreviewState =
  | "idle"
  | "previewing"
  | "reverted"
  | "blocked";
type ProductionChromeSmokeState = "idle" | "applied" | "reverted";
type ExportView = "manifest" | "package" | "review";
type AuthoringContextView = "context" | "prompt" | "minimal" | "pixel";
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
const maxVisibleSkinPackIssues = 5;
const maxVisibleLayoutBoundaryIssues = 5;
const maxVisibleSpecimenFallbacks = 4;
const maxVisibleBridgeVariables = 10;
const maxVisibleBridgePreserveVariables = 8;
const maxVisibleBridgeUnsupportedVariables = 6;

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

const authoringContextViews: Array<{ id: AuthoringContextView; label: string }> =
  [
    { id: "prompt", label: "Prompt" },
    { id: "context", label: "Context" },
    { id: "minimal", label: "Minimal" },
    { id: "pixel", label: "Pixel" },
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
  background:
    "var(--nexus-recipe-modal-backdrop, rgb(2 6 23 / 0.72))",
};

const primitiveModalSurfaceStyle = {
  background:
    "var(--nexus-recipe-modal-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-strong, rgb(226 232 240 / 0.18)))",
  boxShadow:
    "var(--nexus-recipe-modal-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-recipe-modal-body-text, var(--nexus-text-primary, #f8fafc))",
};

const primitiveModalFooterStyle = {
  background:
    "var(--nexus-recipe-modal-footer-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
};

const primitiveModalCalloutStyle = {
  background:
    "var(--nexus-recipe-modal-header-surface, var(--nexus-surface-input, rgb(15 23 42 / 0.72)))",
  borderColor:
    "var(--nexus-recipe-modal-danger-callout, var(--nexus-status-warning, #fcd34d))",
  color:
    "var(--nexus-recipe-modal-danger-callout, var(--nexus-status-warning, #fcd34d))",
};

const primitiveCommandPaletteItems = [
  "Open Agent",
  "Toggle Dock",
  "Review Style",
];

const primitiveCommandPaletteOverlayStyle = {
  background:
    "var(--nexus-recipe-command-palette-overlay, rgb(2 6 23 / 0.76))",
};

const primitiveCommandPaletteSurfaceStyle = {
  background:
    "var(--nexus-recipe-command-palette-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor: "var(--nexus-border-strong, rgb(226 232 240 / 0.18))",
  boxShadow: "var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveCommandPaletteInputStyle = {
  background:
    "var(--nexus-recipe-command-palette-input, var(--nexus-surface-input, rgb(15 23 42 / 0.72)))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-secondary, #cbd5e1)",
};

const primitiveCommandPaletteItemStyle = {
  background:
    "var(--nexus-recipe-command-palette-item-default, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor: "var(--nexus-border-subtle, rgb(226 232 240 / 0.12))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveCommandPaletteActiveItemStyle = {
  background:
    "var(--nexus-recipe-command-palette-item-active, var(--nexus-accent-primary, #67e8f9))",
  borderColor: "var(--nexus-accent-primary-strong, #22d3ee)",
  color: "var(--nexus-text-inverse, #020617)",
};

const primitiveCommandPaletteIconStyle = {
  background:
    "var(--nexus-recipe-command-palette-icon, var(--nexus-accent-primary, #67e8f9))",
};

const primitivePromptVaultSurfaceStyle = {
  background:
    "var(--nexus-recipe-modal-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-strong, rgb(226 232 240 / 0.18)))",
  boxShadow:
    "var(--nexus-recipe-modal-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-recipe-modal-body-text, var(--nexus-text-primary, #f8fafc))",
};

const primitivePromptVaultHeaderStyle = {
  background:
    "var(--nexus-recipe-modal-header-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
  color: "var(--nexus-recipe-modal-title-text, var(--nexus-accent-primary, #67e8f9))",
};

const primitivePromptVaultSidebarStyle = {
  background:
    "var(--nexus-recipe-modal-backdrop, var(--nexus-surface-workspace, #020617))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
};

const primitivePromptVaultRecordStyle = {
  background:
    "var(--nexus-recipe-modal-footer-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-modal-focus-ring, var(--nexus-accent-primary, #67e8f9))",
};

const primitivePromptVaultContentStyle = {
  background:
    "var(--nexus-recipe-modal-header-surface, var(--nexus-surface-input, rgb(15 23 42 / 0.72)))",
  borderColor:
    "var(--nexus-recipe-modal-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
};

const primitiveWindowSurfaceStyle = {
  background:
    "var(--nexus-recipe-window-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-recipe-window-border, var(--nexus-border-strong, rgb(226 232 240 / 0.18)))",
  boxShadow:
    "var(--nexus-recipe-window-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveWindowChromeStyle = {
  background:
    "var(--nexus-recipe-window-chrome-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-window-chrome-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
  color: "var(--nexus-recipe-window-chrome-text, var(--nexus-text-secondary, #cbd5e1))",
};

const primitiveWindowBodyStyle = {
  background:
    "var(--nexus-recipe-window-body-surface, var(--nexus-surface-workspace, #020617))",
};

const primitiveWindowHandleStyle = {
  background:
    "var(--nexus-recipe-window-handle-visual, var(--nexus-accent-primary, #67e8f9))",
};

const primitiveDatapadSurfaceStyle = {
  background:
    "var(--nexus-recipe-window-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-recipe-window-border, var(--nexus-status-success, #6ee7b7))",
  boxShadow:
    "var(--nexus-recipe-window-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveDatapadChromeStyle = {
  background:
    "var(--nexus-recipe-window-chrome-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-window-chrome-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
  color: "var(--nexus-status-success, #6ee7b7)",
};

const primitiveDatapadBodyStyle = {
  background:
    "var(--nexus-recipe-window-body-surface, var(--nexus-surface-input, rgb(15 23 42 / 0.72)))",
};

const primitiveDatapadFooterStyle = {
  background:
    "var(--nexus-recipe-window-body-surface, var(--nexus-surface-workspace, #020617))",
  borderColor:
    "var(--nexus-recipe-window-chrome-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
};

const primitiveDatapadActionStyle = {
  background: "var(--nexus-status-success, #6ee7b7)",
  borderColor: "var(--nexus-status-success, #6ee7b7)",
  color: "var(--nexus-text-inverse, #020617)",
};

const primitiveAgentChromeSurfaceStyle = {
  background:
    "var(--nexus-recipe-window-surface, var(--nexus-surface-panel, rgb(8 16 22 / 0.78)))",
  borderColor:
    "var(--nexus-recipe-window-border, var(--nexus-accent-primary, #67e8f9))",
  boxShadow:
    "var(--nexus-recipe-window-shadow, var(--nexus-shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38)))",
  color: "var(--nexus-text-primary, #f8fafc)",
};

const primitiveAgentChromeTopStyle = {
  background:
    "var(--nexus-recipe-window-handle-visual, var(--nexus-accent-primary, #67e8f9))",
};

const primitiveAgentChromeToolbarStyle = {
  background:
    "var(--nexus-recipe-window-chrome-surface, var(--nexus-surface-panel-muted, rgb(15 23 42 / 0.62)))",
  borderColor:
    "var(--nexus-recipe-window-chrome-border, var(--nexus-border-subtle, rgb(226 232 240 / 0.12)))",
};

const primitiveAgentChromeBodyStyle = {
  background:
    "var(--nexus-recipe-window-body-surface, var(--nexus-surface-workspace, #020617))",
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

const productionBridgeTargetSurfaceStyle = {
  background: "var(--panel-bg, rgb(8 16 22 / 0.78))",
  borderColor: "var(--border-subtle, rgb(226 232 240 / 0.12))",
  borderRadius: "var(--surface-radius, 4px)",
  boxShadow: "var(--shadow-panel, 0 24px 80px rgb(0 0 0 / 0.38))",
  color: "var(--text-main, #f8fafc)",
};

const productionBridgeTargetButtonStyle = {
  background: "var(--theme-primary, #67e8f9)",
  borderColor: "var(--theme-primary-strong, #22d3ee)",
  color: "var(--bg-base, #020617)",
};

const productionBridgeTargetMutedStyle = {
  background: "var(--panel-muted, rgb(255 255 255 / 0.04))",
  borderColor: "var(--border-glow, rgb(34 211 238 / 0.42))",
  color: "var(--text-soft, #cbd5e1)",
};

const productionChromeSmokeSelectors = [
  ".nexus-agent-window",
  ".nexus-drag-handle",
  ".nexus-top-bar-frame",
  ".nexus-right-floating-dock-rail",
  ".nexus-command-palette-shell",
  ".nexus-workspace",
  ".nexus-message-bubble",
  ".nexus-message-bubble-user",
  ".nexus-message-bubble-assistant",
  ".nexus-message-bubble-tool",
] as const;

const productionChromeSmokeVariables = [
  ["--nexus-agent-window-bg", "rgb(126 34 206 / 0.82)"],
  ["--nexus-agent-window-border", "rgb(34 211 238 / 0.92)"],
  ["--nexus-agent-window-shadow", "0 0 0 2px rgb(34 211 238 / 0.36), 0 24px 74px rgb(126 34 206 / 0.42)"],
  ["--nexus-agent-window-radius", "10px"],
  ["--nexus-agent-window-handle-bg", "rgb(34 211 238 / 0.32)"],
  ["--nexus-agent-window-handle-border", "rgb(103 232 249 / 0.72)"],
  ["--nexus-top-bar-bg", "rgb(20 184 166 / 0.26)"],
  ["--nexus-top-bar-border", "rgb(45 212 191 / 0.86)"],
  ["--nexus-right-dock-bg", "rgb(59 7 100 / 0.84)"],
  ["--nexus-right-dock-border", "rgb(216 180 254 / 0.78)"],
  ["--nexus-workspace-bg", "rgb(3 7 18 / 0.96)"],
  ["--nexus-workspace-border", "rgb(45 212 191 / 0.64)"],
  ["--nexus-message-user-bg", "rgb(236 72 153 / 0.34)"],
  ["--nexus-message-assistant-bg", "rgb(34 211 238 / 0.26)"],
  ["--nexus-message-tool-bg", "rgb(16 185 129 / 0.3)"],
] as const;

export function NexusStyleLab() {
  const runtime = useNexusStyleRuntimeV1();
  const productionBridgeTargetRef = useRef<HTMLDivElement | null>(null);
  const productionChromeSmokeTargetRef = useRef<HTMLDivElement | null>(null);
  const pageShellPrototypeTargetRef = useRef<HTMLDivElement | null>(null);
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
  const [authoringContextView, setAuthoringContextView] =
    useState<AuthoringContextView>("prompt");
  const [importResult, setImportResult] =
    useState<NexusStyleImportTextResultV1 | null>(null);
  const [skinPackText, setSkinPackText] = useState("");
  const [skinPackReviewResult, setSkinPackReviewResult] =
    useState<NexusSkinPackReviewImportResultV2 | null>(null);
  const [skinPackTokenPreviewResult, setSkinPackTokenPreviewResult] =
    useState<NexusSkinPackTokenPreviewResultV2 | null>(null);
  const [skinPackTokenPreviewState, setSkinPackTokenPreviewState] =
    useState<SkinPackTokenPreviewState>("idle");
  const [layoutPresetText, setLayoutPresetText] = useState(() =>
    JSON.stringify(createDefaultWorkspaceLayoutPresetV1(), null, 2),
  );
  const [layoutPresetReviewResult, setLayoutPresetReviewResult] =
    useState<NexusWorkspaceLayoutPresetReviewResultV1 | null>(null);
  const [
    productionBridgePreviewState,
    setProductionBridgePreviewState,
  ] = useState<ProductionBridgePreviewState>("idle");
  const [
    productionBridgePreviewSession,
    setProductionBridgePreviewSession,
  ] = useState<NexusProductionTokenBridgePreviewSessionV1 | null>(null);
  const [
    pageShellPrototypePreviewSession,
    setPageShellPrototypePreviewSession,
  ] = useState<NexusProductionTokenBridgePreviewSessionV1 | null>(null);
  const [productionChromeSmokeState, setProductionChromeSmokeState] =
    useState<ProductionChromeSmokeState>("idle");
  const [
    productionChromeSmokeTargetCount,
    setProductionChromeSmokeTargetCount,
  ] = useState<number>(productionChromeSmokeSelectors.length);
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
  const skinPackAuthoringContext = useMemo(
    () => createNexusSkinPackAuthoringContextV1(),
    [],
  );
  const authoringPanelText = useMemo(() => {
    switch (authoringContextView) {
      case "context":
        return skinPackAuthoringContext.contextText;
      case "minimal":
        return skinPackAuthoringContext.minimalJson;
      case "pixel":
        return skinPackAuthoringContext.pixelWorkshopJson;
      case "prompt":
      default:
        return skinPackAuthoringContext.promptTemplate;
    }
  }, [authoringContextView, skinPackAuthoringContext]);
  const authoringOverviewRows = useMemo(
    () => [
      ["Required", String(skinPackAuthoringContext.requiredTopLevelFields.length)],
      ["Editable", String(skinPackAuthoringContext.editableFields.length)],
      ["Review Only", String(skinPackAuthoringContext.reviewOnlyFields.length)],
      ["Forbidden", String(skinPackAuthoringContext.forbiddenOutputs.length)],
      ["Preview", "scoped CSS variables only"],
    ],
    [skinPackAuthoringContext],
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
  const skinPackReviewStatus = skinPackReviewResult
    ? skinPackReviewResult.accepted
      ? "accepted"
      : "rejected"
    : "no review";
  const skinPackReviewSections = useMemo<
    NexusSkinPackReviewSummarySectionV2[]
  >(() => {
    if (!skinPackReviewResult) {
      return [];
    }

    return [
      skinPackReviewResult.summary.metadata,
      skinPackReviewResult.summary.assets,
      skinPackReviewResult.summary.recipes,
      skinPackReviewResult.summary.layoutPreset,
      skinPackReviewResult.summary.performanceBudget,
    ];
  }, [skinPackReviewResult]);
  const skinPackReviewIssues = useMemo(() => {
    if (!skinPackReviewResult) {
      return [];
    }

    return skinPackReviewResult.issues.slice(0, maxVisibleSkinPackIssues);
  }, [skinPackReviewResult]);
  const skinPackReviewIssueRows = useMemo(
    () =>
      skinPackReviewIssues.map((issue) => ({
        ...issue,
        repair: getNexusSkinPackIssueRepairHintV1(issue.code),
      })),
    [skinPackReviewIssues],
  );
  const canPreviewSkinPackTokens =
    skinPackReviewResult?.tokenPreview.canPreviewTokens === true;
  const canRevertSkinPackTokens =
    skinPackTokenPreviewResult?.accepted === true &&
    skinPackTokenPreviewState === "previewing";
  const skinPackTokenPreviewStatus =
    skinPackTokenPreviewState === "previewing"
      ? "token-only previewing"
      : skinPackTokenPreviewState === "reverted"
        ? "token-only reverted"
        : skinPackTokenPreviewState === "blocked"
          ? "token preview blocked"
          : canPreviewSkinPackTokens
            ? "tokens ready"
            : "token preview idle";
  const skinPackGalleryTokenPreviewResult = useMemo(() => {
    if (!canPreviewSkinPackTokens) {
      return null;
    }

    return compileNexusSkinPackTokenPreviewTextV2(skinPackText);
  }, [canPreviewSkinPackTokens, skinPackText]);
  const acceptedSkinPackTokenPreviewResult =
    skinPackTokenPreviewResult?.accepted
      ? skinPackTokenPreviewResult
      : skinPackGalleryTokenPreviewResult?.accepted
        ? skinPackGalleryTokenPreviewResult
        : null;
  const skinPackRenderPlanResult = useMemo(() => {
    if (!acceptedSkinPackTokenPreviewResult) {
      return null;
    }

    return compileNexusSkinPackRenderPlanTextV2(skinPackText);
  }, [acceptedSkinPackTokenPreviewResult, skinPackText]);
  const renderPlan =
    skinPackRenderPlanResult?.accepted === true
      ? skinPackRenderPlanResult.renderPlan
      : null;
  const productionBridgePlanResult = useMemo(() => {
    if (!renderPlan) {
      return null;
    }

    return createNexusProductionTokenBridgePlanV1(renderPlan);
  }, [renderPlan]);
  const productionBridgePlan =
    productionBridgePlanResult?.accepted === true
      ? productionBridgePlanResult.bridgePlan
      : null;
  const specimenGallery =
    renderPlan?.specimenGallery ?? null;
  const hasRejectedSkinPackReview = skinPackReviewResult?.accepted === false;
  const renderPlanStatus = renderPlan
    ? "render plan ready"
    : canPreviewSkinPackTokens || hasRejectedSkinPackReview
      ? "render plan blocked"
      : "review required";
  const specimenGalleryStatus = specimenGallery
    ? "isolated gallery ready"
    : canPreviewSkinPackTokens || hasRejectedSkinPackReview
      ? "gallery blocked"
      : "review required";
  const productionBridgeStatus =
    productionBridgePreviewState === "previewing"
      ? "bridge previewing"
      : productionBridgePreviewState === "reverted"
        ? "bridge reverted"
        : productionBridgePreviewState === "blocked"
          ? "bridge blocked"
          : productionBridgePlan
            ? "bridge ready"
            : renderPlan || hasRejectedSkinPackReview
              ? "bridge blocked"
              : "review required";
  const renderPlanRows = useMemo(
    () => [
      ["Status", renderPlanStatus],
      ["Plan", renderPlan?.planId ?? "none"],
      ["Mode", renderPlan?.renderMode ?? "blocked"],
      ["Token Vars", String(renderPlan?.diagnostics.tokenVariableCount ?? 0)],
      ["Specimens", String(renderPlan?.diagnostics.specimenCount ?? 0)],
      ["Budget", renderPlan?.performanceBudget.status ?? "blocked"],
      ["Production", renderPlan?.eligibility.canApplyProduction ? "allowed" : "blocked"],
    ],
    [renderPlan, renderPlanStatus],
  );
  const productionBridgeRows = useMemo(
    () => [
      ["Status", productionBridgeStatus],
      ["Plan", productionBridgePlan?.bridgePlanId ?? "none"],
      ["Mode", productionBridgePlan?.renderMode ?? "blocked"],
      [
        "Bridge Vars",
        String(productionBridgePlan?.fallbackSummary.bridgedVariableCount ?? 0),
      ],
      [
        "Preserve",
        String(productionBridgePlan?.fallbackSummary.preservedVariableCount ?? 0),
      ],
      [
        "Unsupported",
        String(
          productionBridgePlan?.fallbackSummary.unsupportedVariableCount ?? 0,
        ),
      ],
      [
        "Fallbacks",
        String(productionBridgePlan?.fallbackSummary.renderPlanFallbackCount ?? 0),
      ],
      ["Production", "blocked"],
    ],
    [productionBridgePlan, productionBridgeStatus],
  );
  const productionBridgeVariableRows = useMemo(
    () =>
      productionBridgePlan
        ? Object.entries(productionBridgePlan.variables)
            .sort(([left], [right]) => left.localeCompare(right))
            .slice(0, maxVisibleBridgeVariables)
        : [],
    [productionBridgePlan],
  );
  const productionBridgePreserveRows = useMemo(
    () =>
      productionBridgePlan
        ? Object.entries(productionBridgePlan.legacyPreserveMap)
            .sort(([left], [right]) => left.localeCompare(right))
            .slice(0, maxVisibleBridgePreserveVariables)
        : [],
    [productionBridgePlan],
  );
  const productionBridgeUnsupportedRows = useMemo(
    () =>
      productionBridgePlan
        ? productionBridgePlan.unsupportedVariables.slice(
            0,
            maxVisibleBridgeUnsupportedVariables,
          )
        : [],
    [productionBridgePlan],
  );
  const acceptedLayoutPreset =
    layoutPresetReviewResult?.accepted === true
      ? layoutPresetReviewResult
      : null;
  const layoutBoundaryStatus = layoutPresetReviewResult
    ? layoutPresetReviewResult.accepted
      ? "layout preset accepted"
      : "layout preset rejected"
    : "layout boundary idle";
  const layoutBoundaryRows = useMemo(
    () => [
      ["Status", layoutBoundaryStatus],
      ["Preset", acceptedLayoutPreset?.summary.presetId ?? "none"],
      ["Page Shell", acceptedLayoutPreset?.summary.pageShell ?? "none"],
      ["Arrangement", acceptedLayoutPreset?.summary.arrangement ?? "none"],
      ["Slots", String(acceptedLayoutPreset?.summary.slotCount ?? 0)],
      [
        "Production",
        acceptedLayoutPreset?.summary.protectedBoundary ??
          "production-layout-blocked",
      ],
    ],
    [acceptedLayoutPreset, layoutBoundaryStatus],
  );
  const layoutBoundaryIssueRows = useMemo(
    () =>
      layoutPresetReviewResult?.issues.slice(0, maxVisibleLayoutBoundaryIssues) ??
      [],
    [layoutPresetReviewResult],
  );
  const pageShellPrototypeItems = useMemo(
    () =>
      [
        {
          id: "home",
          label: "Home Shell",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createPageShellFeatureMountPlanV1("home"),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createPageShellLayoutPresetV1("home"),
            ),
          }),
        },
        {
          id: "workspace",
          label: "Workspace Shell",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createDefaultWorkspacePageShellFeatureMountPlanV1(),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createDefaultWorkspaceLayoutPresetV1(),
            ),
          }),
        },
        {
          id: "settings",
          label: "Settings Shell",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createPageShellFeatureMountPlanV1("settings"),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createPageShellLayoutPresetV1("settings"),
            ),
          }),
        },
        {
          id: "style-lab",
          label: "Style Lab Shell",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createPageShellFeatureMountPlanV1("styleLab"),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createPageShellLayoutPresetV1("styleLab"),
            ),
          }),
        },
        {
          id: "left-right",
          label: "Left/Right Swapped",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createDefaultWorkspacePageShellFeatureMountPlanV1(),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createLeftRightSwappedWorkspaceLayoutPresetV1(),
            ),
          }),
        },
        {
          id: "top-bottom",
          label: "Top/Bottom Swapped",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createDefaultWorkspacePageShellFeatureMountPlanV1(),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createTopBottomSwappedWorkspaceLayoutPresetV1(),
            ),
          }),
        },
        {
          id: "invalid",
          label: "Unsafe Example",
          prototype: createNexusPageShellPrototypeV1({
            featurePlanResult: validateNexusPageShellFeatureMountPlanV1(
              createInvalidUnsafePageShellFeatureMountPlanV1(),
            ),
            layoutResult: validateNexusWorkspaceLayoutPresetV1(
              createInvalidUnsafeWorkspaceLayoutPresetV1(),
            ),
          }),
        },
      ] as const,
    [],
  );
  const acceptedPageShellPrototypeCount = pageShellPrototypeItems.filter(
    (item) => item.prototype.accepted,
  ).length;
  const specimenGalleryRows = useMemo(
    () => [
      ["Render Plan", renderPlan ? "ready" : "blocked"],
      ["Token Preview", acceptedSkinPackTokenPreviewResult ? "accepted" : "blocked"],
      ["Recipe Specimen", specimenGallery ? "isolated visual objects" : "blocked"],
      ["Production Apply", "blocked"],
      ["Pack", specimenGallery?.skinPackId ?? "none"],
      ["Manifest", specimenGallery?.manifestId ?? "none"],
      [
        "Groups",
        specimenGallery?.coverage.supportedRecipeGroups.join(", ") || "none",
      ],
      ["Fallbacks", String(specimenGallery?.coverage.fallbackCount ?? 0)],
    ],
    [acceptedSkinPackTokenPreviewResult, renderPlan, specimenGallery],
  );
  const specimenFallbackRows = useMemo(
    () => specimenGallery?.fallbacks.slice(0, maxVisibleSpecimenFallbacks) ?? [],
    [specimenGallery],
  );
  const skinPackTokenPreviewRows = useMemo(() => {
    const eligibility = skinPackReviewResult?.tokenPreview;
    const previewResult = skinPackTokenPreviewResult;

    return [
      ["Status", skinPackTokenPreviewStatus],
      ["Eligible", eligibility?.canPreviewTokens ? "yes" : "no"],
      ["Groups", eligibility?.tokenGroups.join(", ") || "none"],
      ["Eligible Vars", String(eligibility?.variableCount ?? 0)],
      [
        "Patch Vars",
        previewResult?.accepted
          ? String(Object.keys(previewResult.patch.variables).length)
          : "none",
      ],
      [
        "Preview Id",
        previewResult?.accepted ? previewResult.patch.previewId : "none",
      ],
      ["Render Plan", renderPlanStatus],
      [
        "Blocked By",
        eligibility && eligibility.reasonCodes.length > 0
          ? eligibility.reasonCodes.join(", ")
          : "none",
      ],
      ["Gallery", specimenGalleryStatus],
    ];
  }, [
    skinPackReviewResult,
    skinPackTokenPreviewResult,
    renderPlanStatus,
    specimenGalleryStatus,
    skinPackTokenPreviewStatus,
  ]);
  const skinPackTokenPreviewVariables = useMemo(() => {
    if (!acceptedSkinPackTokenPreviewResult) {
      return [];
    }

    return Object.entries(acceptedSkinPackTokenPreviewResult.patch.variables)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 16);
  }, [acceptedSkinPackTokenPreviewResult]);
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
    ? [
        `reactFlow:${compiled.style.report.adapterCoverage.reactFlow}`,
        `windowModal:${compiled.style.report.adapterCoverage.windowModal}`,
      ].join(" / ")
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
      ["Validator", review.validatorVersion],
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

  const clearProductionBridgePreview = () => {
    if (productionBridgePreviewSession) {
      revertNexusProductionTokenBridgePreviewOnTargetV1({
        session: productionBridgePreviewSession,
        target: productionBridgeTargetRef.current,
      });
    }

    if (pageShellPrototypePreviewSession) {
      revertNexusProductionTokenBridgePreviewOnTargetV1({
        session: pageShellPrototypePreviewSession,
        target: pageShellPrototypeTargetRef.current,
      });
    }

    setProductionBridgePreviewSession(null);
    setPageShellPrototypePreviewSession(null);
    setProductionBridgePreviewState("idle");
  };

  const previewProductionBridge = () => {
    if (!productionBridgePlan) {
      setProductionBridgePreviewState("blocked");
      return;
    }

    const result = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan: productionBridgePlan,
      currentSession: productionBridgePreviewSession,
      target: productionBridgeTargetRef.current,
    });
    const pageShellResult = previewNexusProductionTokenBridgePlanOnTargetV1({
      bridgePlan: productionBridgePlan,
      currentSession: pageShellPrototypePreviewSession,
      target: pageShellPrototypeTargetRef.current,
    });

    if (!result.accepted || !pageShellResult.accepted) {
      if (result.accepted) {
        revertNexusProductionTokenBridgePreviewOnTargetV1({
          session: result.session,
          target: productionBridgeTargetRef.current,
        });
      }

      setProductionBridgePreviewState("blocked");
      return;
    }

    setProductionBridgePreviewSession(result.session);
    setPageShellPrototypePreviewSession(pageShellResult.session);
    setProductionBridgePreviewState("previewing");
  };

  const revertProductionBridgePreview = () => {
    if (!productionBridgePreviewSession && !pageShellPrototypePreviewSession) {
      setProductionBridgePreviewState("reverted");
      return;
    }

    if (productionBridgePreviewSession) {
      revertNexusProductionTokenBridgePreviewOnTargetV1({
        session: productionBridgePreviewSession,
        target: productionBridgeTargetRef.current,
      });
    }

    if (pageShellPrototypePreviewSession) {
      revertNexusProductionTokenBridgePreviewOnTargetV1({
        session: pageShellPrototypePreviewSession,
        target: pageShellPrototypeTargetRef.current,
      });
    }

    setProductionBridgePreviewSession(null);
    setPageShellPrototypePreviewSession(null);
    setProductionBridgePreviewState("reverted");
  };

  const countProductionChromeSmokeTargets = () => {
    const target = productionChromeSmokeTargetRef.current;

    if (!target) {
      return 0;
    }

    return productionChromeSmokeSelectors.filter((selector) =>
      target.querySelector(selector),
    ).length;
  };

  const applyProductionChromeSmokeVars = () => {
    const target = productionChromeSmokeTargetRef.current;

    if (!target) {
      setProductionChromeSmokeTargetCount(0);
      return;
    }

    for (const [name, value] of productionChromeSmokeVariables) {
      target.style.setProperty(name, value);
    }

    setProductionChromeSmokeTargetCount(countProductionChromeSmokeTargets());
    setProductionChromeSmokeState("applied");
  };

  const revertProductionChromeSmokeVars = () => {
    const target = productionChromeSmokeTargetRef.current;

    if (!target) {
      setProductionChromeSmokeTargetCount(0);
      setProductionChromeSmokeState("reverted");
      return;
    }

    for (const [name] of productionChromeSmokeVariables) {
      target.style.removeProperty(name);
    }

    setProductionChromeSmokeTargetCount(countProductionChromeSmokeTargets());
    setProductionChromeSmokeState("reverted");
  };

  const startPreview = () => {
    if (!previewPatch || !canPreview) {
      return;
    }

    const result = runtime.previewPatch(previewPatch);

    if (result.accepted) {
      setPreviewState("previewing");
      setSkinPackTokenPreviewState("reverted");
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

  const handleSkinPackTextChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (skinPackTokenPreviewResult?.accepted) {
      runtime.revertPreview(skinPackTokenPreviewResult.patch.previewId);
    }

    clearProductionBridgePreview();
    setSkinPackText(event.target.value);
    setSkinPackReviewResult(null);
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
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
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
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
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
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
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
    setSelectedBuiltInPreset(
      builtInPresets.some((preset) => preset.id === result.manifest.id)
        ? result.manifest.id
        : "imported-draft",
    );
    setPreviewState("idle");
  };

  const loadValidSkinPackFixture = () => {
    clearProductionBridgePreview();
    setSkinPackText(
      JSON.stringify(createCyberpunkCompatibleSkinPackV2(), null, 2),
    );
    setSkinPackReviewResult(null);
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
  };

  const loadMinimalSkinPackFixture = () => {
    clearProductionBridgePreview();
    setSkinPackText(skinPackAuthoringContext.minimalJson);
    setSkinPackReviewResult(null);
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
  };

  const loadPixelSkinPackFixture = () => {
    clearProductionBridgePreview();
    setSkinPackText(
      JSON.stringify(createPixelWorkshopSkinPackV2(), null, 2),
    );
    setSkinPackReviewResult(null);
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
  };

  const loadInvalidSkinPackFixture = () => {
    clearProductionBridgePreview();
    setSkinPackText(JSON.stringify(createOverBudgetSkinPackV2(), null, 2));
    setSkinPackReviewResult(null);
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
  };

  const loadLayoutPresetFixture = (preset: unknown) => {
    setLayoutPresetText(JSON.stringify(preset, null, 2));
    setLayoutPresetReviewResult(null);
  };

  const reviewLayoutPresetText = () => {
    setLayoutPresetReviewResult(
      reviewNexusWorkspaceLayoutPresetTextV1(layoutPresetText),
    );
  };

  const reviewSkinPackText = () => {
    clearProductionBridgePreview();
    setSkinPackReviewResult(
      parseNexusSkinPackReviewImportTextV2(skinPackText),
    );
    setSkinPackTokenPreviewResult(null);
    setSkinPackTokenPreviewState("idle");
  };

  const previewSkinPackTokens = () => {
    if (!canPreviewSkinPackTokens) {
      setSkinPackTokenPreviewState("blocked");
      return;
    }

    const result = compileNexusSkinPackTokenPreviewTextV2(skinPackText);

    setSkinPackTokenPreviewResult(result);

    if (!result.accepted) {
      setSkinPackTokenPreviewState("blocked");
      return;
    }

    const previewResult = runtime.previewPatch(result.patch);

    if (previewResult.accepted) {
      setPreviewState("reverted");
      setSkinPackTokenPreviewState("previewing");
    }
  };

  const revertSkinPackTokens = () => {
    if (skinPackTokenPreviewResult?.accepted) {
      runtime.revertPreview(skinPackTokenPreviewResult.patch.previewId);
    }

    setSkinPackTokenPreviewState("reverted");
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
                  className="mt-3 overflow-hidden border"
                  style={primitiveAgentChromeSurfaceStyle}
                >
                  <div className="h-2" style={primitiveAgentChromeTopStyle} />
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3"
                    style={primitiveAgentChromeToolbarStyle}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                        Agent Chrome Specimen
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Operator Window
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {["run", "dock", "view"].map((item) => (
                        <span
                          key={item}
                          className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 p-4" style={primitiveAgentChromeBodyStyle}>
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
                      <span
                        className="h-11 border border-white/10"
                        style={primitiveWindowHandleStyle}
                      />
                      <span className="grid min-w-0 content-center gap-2">
                        <span className="h-2 w-3/4 bg-white/15" />
                        <span className="h-2 w-1/2 bg-white/10" />
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["stream", "tools", "state"].map((item) => (
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

              <section
                className="border border-violet-300/15 bg-black/20 p-4 lg:col-span-2"
                data-testid="v2-layout-boundary-panel"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100">
                    Layout Boundary
                  </div>
                  <div
                    className={[
                      "font-mono text-[10px] uppercase tracking-[0.12em]",
                      layoutPresetReviewResult?.accepted
                        ? "text-emerald-200"
                        : layoutPresetReviewResult
                          ? "text-rose-200"
                          : "text-slate-500",
                    ].join(" ")}
                    data-testid="v2-layout-boundary-status"
                  >
                    {layoutBoundaryStatus}
                  </div>
                </div>

                <div
                  className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3"
                  data-testid="v2-layout-boundary-summary"
                >
                  {layoutBoundaryRows.map(([label, value]) => (
                    <div
                      key={`layout-boundary:${label}`}
                      className="min-w-0 border border-white/10 bg-black/20 p-2"
                    >
                      <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                        {label}
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="grid min-w-0 gap-3">
                    <textarea
                      aria-label="Workspace layout preset JSON"
                      className="min-h-56 resize-none overflow-auto border border-white/10 bg-black/20 p-3 font-mono text-[10px] leading-5 text-slate-300 outline-none placeholder:text-slate-700"
                      data-testid="v2-layout-boundary-json"
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                        setLayoutPresetText(event.target.value);
                        setLayoutPresetReviewResult(null);
                      }}
                      spellCheck={false}
                      value={layoutPresetText}
                    />

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                        data-testid="v2-layout-boundary-default-fixture"
                        onClick={() =>
                          loadLayoutPresetFixture(
                            createDefaultWorkspaceLayoutPresetV1(),
                          )
                        }
                        type="button"
                      >
                        <span className="truncate">Default</span>
                      </button>
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center border border-violet-300/35 bg-violet-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-300/20"
                        data-testid="v2-layout-boundary-left-right-fixture"
                        onClick={() =>
                          loadLayoutPresetFixture(
                            createLeftRightSwappedWorkspaceLayoutPresetV1(),
                          )
                        }
                        type="button"
                      >
                        <span className="truncate">Swap L/R</span>
                      </button>
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center border border-violet-300/35 bg-violet-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-300/20"
                        data-testid="v2-layout-boundary-top-bottom-fixture"
                        onClick={() =>
                          loadLayoutPresetFixture(
                            createTopBottomSwappedWorkspaceLayoutPresetV1(),
                          )
                        }
                        type="button"
                      >
                        <span className="truncate">Swap T/B</span>
                      </button>
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                        data-testid="v2-layout-boundary-settings-fixture"
                        onClick={() =>
                          loadLayoutPresetFixture(
                            createPageShellLayoutPresetV1("settings"),
                          )
                        }
                        type="button"
                      >
                        <span className="truncate">Settings</span>
                      </button>
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center border border-rose-300/35 bg-rose-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-rose-100 transition hover:bg-rose-300/20"
                        data-testid="v2-layout-boundary-invalid-fixture"
                        onClick={() =>
                          loadLayoutPresetFixture(
                            createInvalidUnsafeWorkspaceLayoutPresetV1(),
                          )
                        }
                        type="button"
                      >
                        <span className="truncate">Invalid</span>
                      </button>
                    </div>

                    <button
                      className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-violet-300/35 bg-violet-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-300/20 disabled:opacity-40"
                      data-testid="v2-layout-boundary-review-button"
                      disabled={layoutPresetText.trim().length === 0}
                      onClick={reviewLayoutPresetText}
                      type="button"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">Review Layout</span>
                    </button>
                  </div>

                  <div className="grid min-w-0 gap-3">
                    <div
                      className="grid gap-2 border border-violet-300/15 bg-violet-300/[0.035] p-3"
                      data-testid="v2-layout-boundary-specimen"
                    >
                      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-violet-100">
                        Slot Arrangement Specimen
                      </div>
                      {acceptedLayoutPreset ? (
                        <div className="grid gap-2">
                          {acceptedLayoutPreset.summary.regions.map((region) => (
                            <div
                              key={`layout-region:${region.regionId}`}
                              className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2"
                            >
                              <span className="truncate border border-white/10 bg-black/20 px-2 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                {region.regionId}
                              </span>
                              <div className="flex min-w-0 flex-wrap gap-1 border border-white/10 bg-black/20 p-1.5">
                                {region.slots.length > 0 ? (
                                  region.slots.map((slot) => (
                                    <span
                                      key={`layout-region:${region.regionId}:${slot}`}
                                      className="max-w-full truncate border border-violet-300/20 bg-violet-300/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-violet-100"
                                    >
                                      {slot}
                                    </span>
                                  ))
                                ) : (
                                  <span className="truncate px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
                                    empty
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          accepted layout preset required
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Redacted Layout Issues
                      </div>
                      {layoutBoundaryIssueRows.length > 0 ? (
                        <div className="grid gap-2">
                          {layoutBoundaryIssueRows.map((issue) => (
                            <div
                              key={`${issue.path}:${issue.code}`}
                              className="min-w-0 border border-white/10 bg-white/[0.03] p-2"
                            >
                              <div className="truncate font-mono text-[10px] text-amber-100">
                                {issue.code}
                              </div>
                              <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
                                {issue.path} / {issue.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          none
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="border border-cyan-300/15 bg-black/20 p-4 lg:col-span-2"
                data-testid="v2-page-shell-prototype-panel"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                    Page Shell Prototype
                  </div>
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-200"
                    data-testid="v2-page-shell-prototype-status"
                  >
                    {acceptedPageShellPrototypeCount} isolated shells ready
                  </div>
                </div>

                <div
                  ref={pageShellPrototypeTargetRef}
                  className="nexus-workspace grid min-w-0 gap-3 border border-white/10 p-3"
                  data-testid="v2-page-shell-prototype-target"
                >
                  <div className="grid gap-3 lg:grid-cols-2">
                    {pageShellPrototypeItems.map((item) => {
                      const result = item.prototype;

                      return (
                        <div
                          key={`page-shell-prototype:${item.id}`}
                          className="nexus-panel min-w-0 p-3"
                          data-testid={`v2-page-shell-prototype-${item.id}`}
                        >
                          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                            <div className="truncate font-mono text-[9px] uppercase tracking-[0.14em]">
                              {item.label}
                            </div>
                            <div
                              className={[
                                "shrink-0 font-mono text-[8px] uppercase tracking-[0.1em]",
                                result.accepted
                                  ? "text-emerald-200"
                                  : "text-rose-200",
                              ].join(" ")}
                            >
                              {result.accepted ? "accepted" : "rejected"}
                            </div>
                          </div>

                          {result.accepted ? (
                            <div className="grid gap-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="nexus-glass min-w-0 p-2">
                                  <div className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                    Shell
                                  </div>
                                  <div className="mt-1 truncate font-mono text-[9px]">
                                    {result.prototype.pageShell}
                                  </div>
                                </div>
                                <div className="nexus-glass min-w-0 p-2">
                                  <div className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                    Arrangement
                                  </div>
                                  <div className="mt-1 truncate font-mono text-[9px]">
                                    {result.prototype.arrangement}
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                {result.prototype.regions.map((region) => (
                                  <div
                                    key={`page-shell-region:${item.id}:${region.regionId}`}
                                    className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2"
                                  >
                                    <span className="nexus-glass truncate px-2 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-400">
                                      {region.regionId}
                                    </span>
                                    <div className="flex min-w-0 flex-wrap gap-1 border border-white/10 bg-black/20 p-1.5">
                                      {region.slots.length > 0 ? (
                                        region.slots.map((slot) => (
                                          <span
                                            key={`page-shell-slot:${item.id}:${region.regionId}:${slot.slotId}`}
                                            className="max-w-full truncate border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-cyan-100"
                                          >
                                            {slot.slotId}
                                            {slot.features.length > 0
                                              ? ` / ${slot.features
                                                  .map((feature) => feature.label)
                                                  .join(", ")}`
                                              : ""}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="truncate px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-600">
                                          empty
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="grid gap-1 border border-white/10 bg-black/20 p-2">
                                <div className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                  Slot Feature Placement
                                </div>
                                {result.prototype.featurePlacementSummary.map(
                                  (placement) => (
                                    <div
                                      key={`page-shell-placement:${item.id}:${placement.featureId}`}
                                      className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2"
                                    >
                                      <span className="truncate font-mono text-[8px] text-slate-400">
                                        {placement.slotId}
                                      </span>
                                      <span className="truncate font-mono text-[8px] text-slate-200">
                                        {placement.label}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-2 border border-rose-300/20 bg-rose-300/[0.04] p-2">
                              {result.issues.map((issue) => (
                                <div
                                  key={`page-shell-prototype-issue:${item.id}:${issue.path}:${issue.code}`}
                                  className="min-w-0"
                                >
                                  <div className="truncate font-mono text-[9px] text-rose-100">
                                    {issue.code}
                                  </div>
                                  <div className="mt-1 truncate font-mono text-[8px] text-slate-500">
                                    {issue.path} / {issue.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section
                className="border border-emerald-300/15 bg-black/20 p-4 lg:col-span-2"
                data-testid="v2-specimen-gallery"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                    V2 Specimen Gallery
                  </div>
                  <div
                    className={[
                      "font-mono text-[10px] uppercase tracking-[0.12em]",
                      specimenGallery ? "text-emerald-200" : "text-slate-500",
                    ].join(" ")}
                    data-testid="v2-specimen-gallery-status"
                  >
                    {specimenGalleryStatus}
                  </div>
                </div>

                <div
                  className="mb-4 border border-emerald-300/15 bg-emerald-300/[0.035] p-3"
                  data-testid="v2-render-plan-summary"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                      Render Plan IR
                    </div>
                    <div
                      className={[
                        "font-mono text-[10px] uppercase tracking-[0.12em]",
                        renderPlan ? "text-emerald-200" : "text-slate-500",
                      ].join(" ")}
                      data-testid="v2-render-plan-status"
                    >
                      {renderPlanStatus}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {renderPlanRows.map(([label, value]) => (
                      <div
                        key={`render-plan:${label}`}
                        className="min-w-0 border border-white/10 bg-black/20 p-2"
                      >
                        <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          {label}
                        </div>
                        <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="mb-4 border border-sky-300/15 bg-sky-300/[0.035] p-3"
                  data-testid="v2-production-bridge-readiness"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sky-100">
                      Production Bridge Readiness
                    </div>
                    <div
                      className={[
                        "font-mono text-[10px] uppercase tracking-[0.12em]",
                        productionBridgePlan ? "text-sky-200" : "text-slate-500",
                      ].join(" ")}
                      data-testid="v2-production-bridge-status"
                    >
                      {productionBridgeStatus}
                    </div>
                  </div>

                  <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {productionBridgeRows.map(([label, value]) => (
                      <div
                        key={`production-bridge:${label}`}
                        className="min-w-0 border border-white/10 bg-black/20 p-2"
                      >
                        <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          {label}
                        </div>
                        <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div
                      ref={productionBridgeTargetRef}
                      className="min-w-0 border p-4"
                      data-testid="v2-production-bridge-target"
                      style={productionBridgeTargetSurfaceStyle}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                        Isolated Bridge Target
                      </div>
                      <div className="mt-3 truncate text-sm">
                        legacy variable scope only
                      </div>
                      <div
                        className="nexus-panel mt-3 min-w-0 p-3"
                        data-testid="v2-production-bridge-nexus-panel"
                      >
                        <div className="truncate font-mono text-[9px] uppercase tracking-[0.12em]">
                          .nexus-panel compatibility
                        </div>
                        <div className="mt-2 h-2 bg-white/10">
                          <div
                            className="h-full w-2/3"
                            style={{
                              background:
                                "var(--theme-primary, #67e8f9)",
                            }}
                          />
                        </div>
                      </div>
                      <div
                        className="nexus-glass mt-3 min-w-0 p-3"
                        data-testid="v2-production-bridge-nexus-glass"
                      >
                        <div className="truncate font-mono text-[9px] uppercase tracking-[0.12em]">
                          .nexus-glass compatibility
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {["surface", "blur", "border"].map((item) => (
                            <span
                              key={`glass-compat:${item}`}
                              className="truncate border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.1em]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="nexus-workspace mt-3 min-h-24 min-w-0 overflow-hidden border border-white/10 p-3"
                        data-testid="v2-production-bridge-nexus-workspace"
                      >
                        <div className="nexus-panel max-w-xs p-3">
                          <div className="truncate font-mono text-[9px] uppercase tracking-[0.12em]">
                            .nexus-workspace compatibility
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {["grid", "wash"].map((item) => (
                              <span
                                key={`workspace-compat:${item}`}
                                className="truncate border border-white/10 bg-black/20 px-2 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.1em]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <span
                          className="truncate border px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em]"
                          style={productionBridgeTargetMutedStyle}
                        >
                          panel
                        </span>
                        <span
                          className="truncate border px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em]"
                          style={productionBridgeTargetButtonStyle}
                        >
                          accent
                        </span>
                        <span
                          className="truncate border px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em]"
                          style={productionBridgeTargetMutedStyle}
                        >
                          text
                        </span>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-sky-300/35 bg-sky-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-sky-100 transition hover:bg-sky-300/20 disabled:opacity-40"
                          data-testid="v2-production-bridge-preview"
                          disabled={!productionBridgePlan}
                          onClick={previewProductionBridge}
                          type="button"
                        >
                          <Sparkles className="h-4 w-4 shrink-0" />
                          <span className="truncate">Preview Bridge</span>
                        </button>
                        <button
                          className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
                          data-testid="v2-production-bridge-revert"
                          disabled={
                            !productionBridgePreviewSession &&
                            !pageShellPrototypePreviewSession
                          }
                          onClick={revertProductionBridgePreview}
                          type="button"
                        >
                          <RotateCcw className="h-4 w-4 shrink-0" />
                          <span className="truncate">Revert Bridge</span>
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="min-w-0 border border-white/10 bg-black/20 p-2">
                          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            Bridge Variables
                          </div>
                          {productionBridgeVariableRows.length > 0 ? (
                            <div className="grid gap-1">
                              {productionBridgeVariableRows.map(
                                ([name, value]) => (
                                  <div
                                    key={`production-bridge-variable:${name}`}
                                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-2"
                                  >
                                    <span className="truncate font-mono text-[9px] text-sky-100">
                                      {name}
                                    </span>
                                    <span className="truncate font-mono text-[9px] text-slate-300">
                                      {value}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                              accepted render plan required
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 border border-white/10 bg-black/20 p-2">
                          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            Preserve
                          </div>
                          {productionBridgePreserveRows.length > 0 ? (
                            <div className="grid gap-1">
                              {productionBridgePreserveRows.map(
                                ([name, reason]) => (
                                  <div
                                    key={`production-bridge-preserve:${name}`}
                                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-2"
                                  >
                                    <span className="truncate font-mono text-[9px] text-sky-100">
                                      {name}
                                    </span>
                                    <span className="truncate font-mono text-[9px] text-slate-300">
                                      {reason}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                              none
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 border border-white/10 bg-black/20 p-2">
                          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            Unsupported
                          </div>
                          {productionBridgeUnsupportedRows.length > 0 ? (
                            <div className="grid gap-1">
                              {productionBridgeUnsupportedRows.map((row) => (
                                <div
                                  key={`production-bridge-unsupported:${row.name}`}
                                  className="min-w-0"
                                >
                                  <div className="truncate font-mono text-[9px] text-amber-100">
                                    {row.name}
                                  </div>
                                  <div className="truncate font-mono text-[9px] text-slate-500">
                                    {row.reasonCode}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-200">
                              none
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <section
                  className="mb-4 border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-3"
                  data-testid="production-chrome-smoke-panel"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-100">
                      Production Chrome Smoke
                    </div>
                    <div
                      className={[
                        "font-mono text-[10px] uppercase tracking-[0.12em]",
                        productionChromeSmokeState === "applied"
                          ? "text-fuchsia-100"
                          : productionChromeSmokeState === "reverted"
                            ? "text-emerald-200"
                            : "text-slate-500",
                      ].join(" ")}
                      data-testid="production-chrome-smoke-status"
                    >
                      {productionChromeSmokeState}
                    </div>
                  </div>

                  <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Vars", String(productionChromeSmokeVariables.length)],
                      [
                        "Targets",
                        `${productionChromeSmokeTargetCount}/${productionChromeSmokeSelectors.length}`,
                      ],
                      ["Scope", "local ref"],
                      ["Persistence", "none"],
                    ].map(([label, value]) => (
                      <div
                        key={`production-chrome-smoke:${label}`}
                        className="min-w-0 border border-white/10 bg-black/20 p-2"
                      >
                        <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          {label}
                        </div>
                        <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div
                      ref={productionChromeSmokeTargetRef}
                      className="nexus-shell grid min-w-0 gap-3 border border-white/10 bg-slate-950/80 p-3"
                      data-testid="production-chrome-smoke-target"
                    >
                      <div
                        className="nexus-top-bar-frame flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-3"
                        data-testid="production-chrome-smoke-top-bar"
                      >
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100">
                          TopBar
                        </span>
                        <span className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-400">
                          inert
                        </span>
                      </div>

                      <div
                        aria-hidden="true"
                        className="nexus-command-palette-shell nexus-panel mx-auto w-full max-w-xl overflow-hidden border border-white/10 bg-slate-950/90"
                        data-testid="production-chrome-smoke-command-palette"
                      >
                        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                          <span className="h-2 w-2 border border-cyan-200/60 bg-cyan-200/40" />
                          <span className="min-w-0 flex-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                            Search command fabric
                          </span>
                          <span className="border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                            esc
                          </span>
                        </div>
                        <div className="grid gap-1 p-2">
                          {["Spawn Agent", "Arrange Workstations", "Save Snapshot"].map(
                            (item) => (
                              <div
                                key={`production-chrome-smoke-command:${item}`}
                                className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border border-white/10 bg-white/[0.035] px-2 py-1.5"
                              >
                                <span className="h-2 w-2 bg-cyan-200/60" />
                                <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-200">
                                  {item}
                                </span>
                                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                  static
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_72px]">
                        <div
                          className="nexus-workspace min-h-64 min-w-0 overflow-hidden border border-white/10 bg-slate-950/80 p-3 shadow-2xl"
                          data-testid="production-chrome-smoke-workspace"
                        >
                          <div
                            className="nexus-agent-window min-h-56 overflow-hidden border-2 bg-slate-950/88 shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
                            data-testid="production-chrome-smoke-agent-window"
                            style={
                              {
                                "--nexus-agent-window-default-bg":
                                  "color-mix(in srgb, var(--bg-elevated) var(--chat-panel-opacity), transparent)",
                                "--nexus-agent-window-default-border":
                                  "rgb(34 211 238 / 0.68)",
                                "--nexus-agent-window-default-shadow":
                                  "0 0 24px rgb(34 211 238 / 0.18), 0 22px 70px rgb(0 0 0 / 0.38)",
                              } as CSSProperties
                            }
                          >
                            <div
                              aria-hidden="true"
                              className="nexus-drag-handle h-2 shrink-0"
                              data-testid="production-chrome-smoke-agent-handle"
                            />
                            <div className="border-b border-white/10 px-3 py-2">
                              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                                Agent Window
                              </div>
                              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                                static chrome specimen
                              </div>
                            </div>
                            <div className="grid gap-2 p-3">
                              <article
                                className="nexus-message-bubble nexus-message-bubble-user border p-3"
                                data-testid="production-chrome-smoke-message-user"
                              >
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                                  user bubble
                                </div>
                                <p className="mt-1 text-xs text-slate-100">
                                  Local smoke variable target.
                                </p>
                              </article>
                              <article
                                className="nexus-message-bubble nexus-message-bubble-assistant border p-3"
                                data-testid="production-chrome-smoke-message-assistant"
                              >
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                                  assistant bubble
                                </div>
                                <p className="mt-1 text-xs text-slate-100">
                                  Visual apply/revert only.
                                </p>
                              </article>
                              <article
                                className="nexus-message-bubble nexus-message-bubble-tool border p-3"
                                data-testid="production-chrome-smoke-message-tool"
                              >
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">
                                  tool bubble
                                </div>
                                <p className="mt-1 text-xs text-slate-100">
                                  No runtime persistence.
                                </p>
                              </article>
                            </div>
                          </div>
                        </div>

                        <div
                          className="nexus-right-floating-dock-rail grid content-start gap-2 border border-cyan-300/25 bg-slate-950/90 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_32px_rgba(34,211,238,0.14)] backdrop-blur-xl"
                          data-testid="production-chrome-smoke-right-dock"
                        >
                          {["Intel", "Theme", "Trace", "Vault"].map((item) => (
                            <span
                              key={`production-chrome-smoke-dock:${item}`}
                              className="grid h-9 place-items-center border border-white/10 bg-white/[0.04] font-mono text-[8px] uppercase tracking-[0.1em] text-slate-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 content-start gap-2">
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-fuchsia-300/35 bg-fuchsia-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fuchsia-100 transition hover:bg-fuchsia-300/20"
                        data-testid="production-chrome-smoke-apply"
                        onClick={applyProductionChromeSmokeVars}
                        type="button"
                      >
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="truncate">Apply Smoke Vars</span>
                      </button>
                      <button
                        className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                        data-testid="production-chrome-smoke-revert"
                        onClick={revertProductionChromeSmokeVars}
                        type="button"
                      >
                        <RotateCcw className="h-4 w-4 shrink-0" />
                        <span className="truncate">Revert Smoke Vars</span>
                      </button>
                      <div className="border border-white/10 bg-black/20 p-2">
                        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                          Smoke Variables
                        </div>
                        <div className="grid max-h-52 gap-1 overflow-hidden">
                          {productionChromeSmokeVariables.slice(0, 8).map(([name]) => (
                            <div
                              key={`production-chrome-smoke-var:${name}`}
                              className="truncate font-mono text-[9px] text-fuchsia-100"
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mb-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {specimenGalleryRows.map(([label, value]) => (
                    <div
                      key={`specimen-gallery:${label}`}
                      className="min-w-0 border border-white/10 bg-white/[0.03] p-2"
                    >
                      <div className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                        {label}
                      </div>
                      <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {specimenGallery ? (
                  <div className="grid gap-4">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div
                        className="min-w-0 border p-4"
                        data-testid="v2-specimen-panel"
                        style={specimenGallery.specimens.panel.style}
                      >
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                          Panel
                        </div>
                        <div className="mt-3 truncate text-sm">
                          {specimenGallery.displayName}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {["review", "tokens", "safe"].map((item) => (
                            <span
                              key={item}
                              className="truncate border border-white/10 bg-white/[0.04] px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div
                          className="grid min-h-20 place-items-center border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
                          data-testid="v2-specimen-button-default"
                          style={specimenGallery.specimens.buttonDefault.style}
                        >
                          Default
                        </div>
                        <div
                          className="grid min-h-20 place-items-center border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
                          data-testid="v2-specimen-button-hover"
                          style={specimenGallery.specimens.buttonHover.style}
                        >
                          Hover-Like
                        </div>
                        <div
                          className="grid min-h-20 place-items-center border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
                          data-testid="v2-specimen-button-disabled"
                          style={specimenGallery.specimens.buttonDisabled.style}
                        >
                          Disabled-Like
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                      <div className="grid gap-2">
                        <input
                          aria-label="V2 specimen input"
                          className="h-10 min-w-0 border px-3 font-mono text-[10px] uppercase tracking-[0.12em] outline-none"
                          data-testid="v2-specimen-input"
                          readOnly
                          style={specimenGallery.specimens.input.style}
                          value="Input"
                        />
                        <span
                          className="inline-flex max-w-full items-center border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                          data-testid="v2-specimen-badge"
                          style={specimenGallery.specimens.badgeStatus.style}
                        >
                          Badge / Status
                        </span>
                      </div>

                      <div
                        className="grid gap-3 border p-3"
                        data-testid="v2-specimen-command-palette"
                        style={specimenGallery.specimens.commandPalette.style}
                      >
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                          Command Palette
                        </div>
                        <div
                          className="truncate border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                          style={
                            specimenGallery.specimens.commandPalette.parts.input
                          }
                        >
                          Search command
                        </div>
                        <div className="grid gap-2">
                          {["Open Agent", "Toggle Dock", "Review Style"].map(
                            (item, index) => (
                              <div
                                key={item}
                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2"
                                style={
                                  index === 0
                                    ? specimenGallery.specimens.commandPalette
                                        .parts.activeItem
                                    : specimenGallery.specimens.commandPalette
                                        .parts.item
                                }
                              >
                                <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em]">
                                  {item}
                                </span>
                                <span className="font-mono text-[9px] uppercase tracking-[0.1em] opacity-70">
                                  visual
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      <div
                        className="overflow-hidden border"
                        data-testid="v2-specimen-agent-window"
                        style={specimenGallery.specimens.agentWindow.style}
                      >
                        <div
                          className="border-b px-4 py-3"
                          style={specimenGallery.specimens.agentWindow.parts.chrome}
                        >
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                            Agent Window
                          </div>
                          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] opacity-70">
                            specimen only
                          </div>
                        </div>
                        <div
                          className="grid gap-3 p-4"
                          style={specimenGallery.specimens.agentWindow.parts.body}
                        >
                          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                            <span
                              className="h-10 border"
                              style={
                                specimenGallery.specimens.agentWindow.parts.status
                              }
                            />
                            <span className="grid content-center gap-2">
                              <span className="h-2 w-3/4 bg-white/15" />
                              <span className="h-2 w-1/2 bg-white/10" />
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {["stream", "tools", "state"].map((item) => (
                              <span
                                key={item}
                                className="truncate border border-white/10 bg-white/[0.04] px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.1em]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div
                        className="min-h-52 border p-4"
                        data-testid="v2-specimen-modal"
                        style={specimenGallery.specimens.modalDialog.parts.backdrop}
                      >
                        <div
                          className="grid gap-3 border p-4"
                          style={specimenGallery.specimens.modalDialog.style}
                        >
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                            Modal / Dialog
                          </div>
                          <div
                            className="border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                            style={
                              specimenGallery.specimens.modalDialog.parts.callout
                            }
                          >
                            Review Required
                          </div>
                          <div
                            className="grid grid-cols-2 gap-2 border-t pt-3"
                            style={
                              specimenGallery.specimens.modalDialog.parts.footer
                            }
                          >
                            <span className="border border-white/10 bg-white/[0.04] px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]">
                              Cancel
                            </span>
                            <span
                              className="border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em]"
                              style={
                                specimenGallery.specimens.buttonDefault.style
                              }
                            >
                              Apply
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="grid min-h-52 gap-2 border p-3"
                        data-testid="v2-specimen-sidebar-dock"
                        style={specimenGallery.specimens.sidebarDock.style}
                      >
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em]">
                          Sidebar / Dock
                        </div>
                        {["Workspace", "Agents", "Style Lab"].map(
                          (item, index) => (
                            <span
                              key={item}
                              className="truncate border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em]"
                              style={
                                index === 2
                                  ? specimenGallery.specimens.sidebarDock.parts
                                      .activeItem
                                  : specimenGallery.specimens.sidebarDock.parts
                                      .item
                              }
                            >
                              {item}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                        Fallback Summary
                      </div>
                      {specimenFallbackRows.length > 0 ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {specimenFallbackRows.map((issue) => (
                            <div
                              key={`${issue.path}:${issue.code}`}
                              className="min-w-0 border border-white/10 bg-black/20 p-2"
                            >
                              <div className="truncate font-mono text-[9px] text-amber-100">
                                {issue.code}
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
                ) : (
                  <div className="border border-white/10 bg-white/[0.03] p-4 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    accepted token preview result required
                  </div>
                )}
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

          <aside className="grid min-h-0 auto-rows-min gap-4 overflow-y-auto pr-1">
            <section className="grid min-h-[260px] grid-rows-[auto_1fr_auto] overflow-hidden border border-white/10 bg-black/30">
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

            <section
              className="grid min-h-[420px] grid-rows-[auto_auto_1fr_auto] overflow-hidden border border-emerald-300/15 bg-black/30"
              data-testid="v2-authoring-context"
            >
              <header className="grid gap-3 border-b border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                    <FileJson className="h-4 w-4 shrink-0" />
                    <span className="truncate">V2 Authoring Context</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    token-only
                  </span>
                </div>
                <div
                  aria-label="Authoring context view"
                  className="grid grid-cols-4 gap-2"
                >
                  {authoringContextViews.map((view) => {
                    const active = authoringContextView === view.id;

                    return (
                      <button
                        key={view.id}
                        className={[
                          "h-8 min-w-0 border px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition",
                          active
                            ? "border-emerald-300/45 bg-emerald-300/15 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:bg-white/10",
                        ].join(" ")}
                        onClick={() => setAuthoringContextView(view.id)}
                        type="button"
                      >
                        <span className="truncate">{view.label}</span>
                      </button>
                    );
                  })}
                </div>
              </header>

              <div className="grid gap-2 border-b border-white/10 p-3">
                {authoringOverviewRows.map(([label, value]) => (
                  <div
                    key={`authoring:${label}`}
                    className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 border border-white/10 bg-white/[0.03] p-2"
                  >
                    <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                      {label}
                    </span>
                    <span className="truncate font-mono text-[9px] text-slate-300">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <textarea
                aria-label="V2 authoring context text"
                className="min-h-0 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-[10px] leading-5 text-slate-300 outline-none"
                data-testid="v2-authoring-context-text"
                readOnly
                spellCheck={false}
                value={authoringPanelText}
              />

              <footer className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
                <button
                  className="inline-flex h-9 min-w-0 items-center justify-center border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                  data-testid="v2-skin-pack-minimal-fixture"
                  onClick={loadMinimalSkinPackFixture}
                  type="button"
                >
                  <span className="truncate">Use Minimal</span>
                </button>
                <button
                  className="inline-flex h-9 min-w-0 items-center justify-center border border-emerald-300/35 bg-emerald-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/20"
                  data-testid="v2-skin-pack-pixel-fixture"
                  onClick={loadPixelSkinPackFixture}
                  type="button"
                >
                  <span className="truncate">Use Pixel</span>
                </button>
              </footer>
            </section>

            <section
              className="grid min-h-[360px] grid-rows-[auto_minmax(130px,0.55fr)_auto] overflow-hidden border border-cyan-300/15 bg-black/30"
              data-testid="v2-skin-pack-review"
            >
              <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                  <FileJson className="h-4 w-4 shrink-0" />
                  <span className="truncate">V2 Skin Pack Review</span>
                </div>
                <span
                  className={[
                    "shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]",
                    skinPackReviewResult?.accepted
                      ? "text-emerald-200"
                      : skinPackReviewResult
                        ? "text-rose-200"
                        : "text-slate-500",
                  ].join(" ")}
                >
                  {skinPackReviewStatus}
                </span>
              </header>

              <textarea
                aria-label="V2 skin pack JSON"
                className="min-h-0 resize-none overflow-auto border-0 bg-transparent p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none placeholder:text-slate-700"
                data-testid="v2-skin-pack-json"
                onChange={handleSkinPackTextChange}
                placeholder="{}"
                spellCheck={false}
                value={skinPackText}
              />

              <footer className="border-t border-white/10 p-3">
                <div className="mb-3 max-h-72 overflow-y-auto border border-white/10 bg-white/[0.03] p-2">
                  {skinPackReviewResult ? (
                    <div className="grid gap-3">
                      <div
                        className={[
                          "font-mono text-[10px] uppercase tracking-[0.12em]",
                          skinPackReviewResult.accepted
                            ? "text-emerald-200"
                            : "text-rose-200",
                        ].join(" ")}
                      >
                        V2 skin pack {skinPackReviewStatus}
                      </div>

                      <div className="grid gap-3">
                        {skinPackReviewSections.map((section) => (
                          <div
                            key={section.title}
                            className="min-w-0 border border-white/10 bg-black/20 p-2"
                          >
                            <div className="mb-2 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                              {section.title}
                            </div>
                            <div className="grid gap-1">
                              {section.rows.map((row) => (
                                <div
                                  key={`${section.title}:${row.label}`}
                                  className="grid grid-cols-[88px_minmax(0,1fr)] gap-2"
                                >
                                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                                    {row.label}
                                  </span>
                                  <span className="truncate font-mono text-[9px] text-slate-300">
                                    {row.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="min-w-0 border border-white/10 bg-black/20 p-2">
                        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                          Redacted Issues
                        </div>
                        {skinPackReviewIssueRows.length > 0 ? (
                          <div className="grid gap-2">
                            {skinPackReviewIssueRows.map((issue) => (
                              <div
                                key={`${issue.path}:${issue.code}`}
                                className="min-w-0 border border-white/10 bg-white/[0.03] p-2"
                              >
                                <div className="truncate font-mono text-[10px] text-amber-100">
                                  {issue.code}
                                </div>
                                <div className="mt-1 truncate font-mono text-[9px] text-slate-500">
                                  {issue.path} / {issue.message}
                                </div>
                                <div className="mt-1 max-h-8 overflow-hidden font-mono text-[9px] leading-4 text-slate-300">
                                  {issue.repair}
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

                      <div
                        className="min-w-0 border border-cyan-300/15 bg-cyan-300/[0.04] p-2"
                        data-testid="v2-token-preview-status"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            Token Preview
                          </span>
                          <span
                            className={[
                              "truncate font-mono text-[9px] uppercase tracking-[0.1em]",
                              skinPackTokenPreviewState === "previewing"
                                ? "text-cyan-100"
                                : canPreviewSkinPackTokens
                                  ? "text-emerald-200"
                                  : "text-slate-500",
                            ].join(" ")}
                          >
                            {skinPackTokenPreviewStatus}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          {skinPackTokenPreviewRows.map(([label, value]) => (
                            <div
                              key={`token-preview:${label}`}
                              className="grid grid-cols-[88px_minmax(0,1fr)] gap-2"
                            >
                              <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                                {label}
                              </span>
                              <span className="truncate font-mono text-[9px] text-slate-300">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div
                          className="mt-3 border border-white/10 bg-black/20 p-2"
                          data-testid="v2-token-preview-variables"
                        >
                          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500">
                            Scoped Variables
                          </div>
                          {skinPackTokenPreviewVariables.length > 0 ? (
                            <div className="grid gap-1">
                              {skinPackTokenPreviewVariables.map(
                                ([name, value]) => (
                                  <div
                                    key={`token-preview-variable:${name}`}
                                    className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-2"
                                  >
                                    <span className="truncate font-mono text-[9px] text-cyan-100">
                                      {name}
                                    </span>
                                    <span className="truncate font-mono text-[9px] text-slate-300">
                                      {value}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                              preview tokens to inspect emitted variables
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      idle
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                    data-testid="v2-skin-pack-valid-fixture"
                    onClick={loadValidSkinPackFixture}
                    type="button"
                  >
                    Valid
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                    onClick={loadPixelSkinPackFixture}
                    type="button"
                  >
                    Pixel
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10"
                    data-testid="v2-skin-pack-invalid-fixture"
                    onClick={loadInvalidSkinPackFixture}
                    type="button"
                  >
                    Invalid
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                    data-testid="v2-skin-pack-review-button"
                    disabled={skinPackText.trim().length === 0}
                    onClick={reviewSkinPackText}
                    type="button"
                  >
                    Review
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                    data-testid="v2-skin-pack-preview-tokens"
                    disabled={!canPreviewSkinPackTokens}
                    onClick={previewSkinPackTokens}
                    type="button"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="truncate">Preview Tokens</span>
                  </button>
                  <button
                    className="inline-flex h-9 min-w-0 items-center justify-center gap-2 border border-white/10 bg-white/[0.04] px-2 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-300 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-40"
                    data-testid="v2-skin-pack-revert-tokens"
                    disabled={!canRevertSkinPackTokens}
                    onClick={revertSkinPackTokens}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    <span className="truncate">Revert V2</span>
                  </button>
                </div>
              </footer>
            </section>

            <section className="grid min-h-[260px] grid-rows-[auto_1fr_auto] overflow-hidden border border-white/10 bg-black/30">
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

            <section className="grid min-h-[320px] grid-rows-[auto_1fr] overflow-hidden border border-white/10 bg-black/30">
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
