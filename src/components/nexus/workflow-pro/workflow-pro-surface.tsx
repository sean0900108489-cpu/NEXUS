import {
  BrainCircuit,
  Boxes,
  ClipboardPaste,
  Download,
  FileJson2,
  FlaskConical,
  GitBranch,
  History,
  Network,
  PanelRight,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type {
  WorkflowProCapabilityInventory,
  WorkflowProRuntimeSummary,
} from "@/lib/workflow-pro/capability-inventory";
import type { WorkflowBrainContextPack } from "@/lib/workflow-pro/brain-context";
import type { WorkflowProFileNodeContract } from "@/lib/workflow-pro/file-node-contract";
import {
  parseWorkflowProBrainReviewProposalText,
  type WorkflowProBrainReviewProposalValidationResult,
} from "@/lib/workflow-pro/brain-review-proposal";
import type { WorkflowProApplyPlan } from "@/lib/workflow-pro/workflow-contract-apply-plan";
import type { WorkflowProContractImportReview } from "@/lib/workflow-pro/workflow-contract-import";
import type { WorkflowProContractDraft } from "@/lib/workflow-pro/workflow-contract";
import {
  validateWorkflowProContractDraft,
  type WorkflowProContractValidationResult,
} from "@/lib/workflow-pro/workflow-contract-validator";
import type { WorkflowProProposalDiff } from "@/lib/workflow-pro/proposal-diff";
import {
  createWorkflowProFoundationBenchmarkFixtures,
  serializeWorkflowProFoundationBenchmarkFixture,
  type WorkflowProFoundationBenchmarkId,
} from "@/lib/workflow-pro/foundation-benchmark-fixtures";

type WorkflowProMetric = {
  label: string;
  value: number | string;
};

export type WorkflowProSurfaceProps = {
  agentCount: number;
  applyPlan: WorkflowProApplyPlan;
  brainContext: WorkflowBrainContextPack;
  generatedArtifactCount: number;
  contractDraft: WorkflowProContractDraft;
  fileNodeContract: WorkflowProFileNodeContract;
  initialMode?: WorkflowProMode;
  importReview: WorkflowProContractImportReview | null;
  inventory: WorkflowProCapabilityInventory;
  proposalDiff: WorkflowProProposalDiff;
  runtimeSummary: WorkflowProRuntimeSummary;
  runtimeEdgeCount: number;
  runtimeNodeCount: number;
  workspaceName?: string;
  onApplyPlan: () => void;
  onClearImportedContract: () => void;
  onExportContract: () => void;
  onImportContractText: (input: { sourceName: string; text: string }) => void;
  onOpenGraph: () => void;
  onOpenPanels: () => void;
};

const workflowProModes = [
  "Design",
  "Brain",
  "Evidence",
  "Proposal Diff",
  "Files",
  "Settings",
] as const;
export type WorkflowProMode = (typeof workflowProModes)[number];

const workflowProModeDescriptions: Record<WorkflowProMode, string> = {
  Design: "Import, validate, preview, and apply a canonical workflow contract.",
  Brain: "Package the full workflow into a stable context that an LLM can understand before it proposes changes.",
  Evidence: "Review runtime runs, node status, artifacts, and execution gaps before trusting a workflow.",
  "Proposal Diff": "Compare the current graph with the imported or proposed contract before applying it.",
  Files: "Inspect file-node attachment flow, compiler boundary, and downstream ContextPacket behavior.",
  Settings: "See capability inventory, unavailable features, and guarded extension slots.",
};

export function WorkflowProSurface({
  agentCount,
  applyPlan,
  brainContext,
  contractDraft,
  fileNodeContract,
  initialMode = "Design",
  importReview,
  generatedArtifactCount,
  inventory,
  proposalDiff,
  runtimeEdgeCount,
  runtimeNodeCount,
  runtimeSummary,
  workspaceName = "NEXUS // AI OPS",
  onApplyPlan,
  onClearImportedContract,
  onExportContract,
  onImportContractText,
  onOpenGraph,
  onOpenPanels,
}: WorkflowProSurfaceProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importReviewPanelRef = useRef<HTMLDivElement | null>(null);
  const benchmarkFixtures = useMemo(
    () => createWorkflowProFoundationBenchmarkFixtures(),
    [],
  );
  const [activeMode, setActiveMode] = useState<WorkflowProMode>(initialMode);
  const [importing, setImporting] = useState(false);
  const [pastedContractSourceName, setPastedContractSourceName] =
    useState("workflow-pro-pasted-contract.json");
  const [pastedContractText, setPastedContractText] = useState("");
  const contractValidation = validateWorkflowProContractDraft(contractDraft);
  const applyReady =
    contractValidation.ok &&
    applyPlan.status === "ready" &&
    Boolean(applyPlan.candidateRuntimeLite);
  const metrics: WorkflowProMetric[] = [
    { label: "agents", value: agentCount },
    { label: "runtime nodes", value: runtimeNodeCount },
    { label: "runtime edges", value: runtimeEdgeCount },
    { label: "generated", value: generatedArtifactCount },
  ];

  useEffect(() => {
    if (!importReview) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      importReviewPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);

    return () => window.clearTimeout(scrollTimer);
  }, [importReview]);

  return (
    <section
      aria-label="Workflow Pro workspace"
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="grid gap-3 border-b border-white/10 bg-black/20 p-3 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.42fr)_minmax(260px,0.82fr)]">
        <input
          ref={importInputRef}
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void handleImportFileChange(event);
          }}
          type="file"
        />
        <div className="border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            <Network className="h-3.5 w-3.5" />
            Workspace Pro
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold uppercase tracking-[0.08em] text-neutral-100">
            {workspaceName}
          </h2>
          <p className="mt-2 text-xs leading-6 text-neutral-400">
            Brain-readable workflow design layer. Graph stays executable; Workflow Pro
            explains intent, topology, files, artifacts, and optimization proposals.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="border border-white/10 bg-white/[0.035] p-3"
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                {metric.label}
              </div>
              <div className="mt-2 font-mono text-2xl text-neutral-100">
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <button
            aria-label="Open executable Graph workspace"
            className="flex min-h-10 items-center justify-center gap-2 border border-neutral-300/35 bg-neutral-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 transition hover:bg-neutral-300/20"
            onClick={onOpenGraph}
            type="button"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Open Graph
          </button>
          <button
            aria-label="Open agent Panels workspace"
            className="flex min-h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.035] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100"
            onClick={onOpenPanels}
            type="button"
          >
            <PanelRight className="h-3.5 w-3.5" />
            Open Panels
          </button>
          <button
            aria-label="Export Workflow Pro contract"
            className="flex min-h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.035] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100"
            onClick={onExportContract}
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            Export Contract
          </button>
          <button
            aria-label="Import Workflow Pro contract"
            className="flex min-h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.035] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100 disabled:opacity-45"
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            <Upload className="h-3.5 w-3.5" />
            {importing ? "Importing" : "Import Contract"}
          </button>
          {importReview ? (
            <button
              aria-label="Clear imported Workflow Pro contract"
              className="flex min-h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.035] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100"
              onClick={onClearImportedContract}
              type="button"
            >
              Clear Import
            </button>
          ) : null}
          <button
            aria-label="Apply Workflow Pro preview to Graph"
            className="flex min-h-10 items-center justify-center gap-2 border border-neutral-300/35 bg-neutral-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:border-white/10 disabled:bg-white/[0.025] disabled:text-neutral-600"
            disabled={!applyReady}
            onClick={onApplyPlan}
            type="button"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Apply Preview
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="system-scroll min-h-0 overflow-auto border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            <Boxes className="h-3.5 w-3.5" />
            Modes
          </div>
          <div className="mt-3 grid gap-2">
            {workflowProModes.map((mode, index) => (
              <button
                key={mode}
                aria-label={`Open Workflow Pro ${mode} bay`}
                aria-pressed={activeMode === mode}
                className={[
                  "flex min-h-10 items-center justify-between border px-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] transition",
                  activeMode === mode
                    ? "border-neutral-300/45 bg-neutral-300/10 text-neutral-100"
                    : "border-white/10 bg-white/[0.035] text-neutral-400 hover:bg-white/10 hover:text-neutral-100",
                ].join(" ")}
                onClick={() => setActiveMode(mode)}
                type="button"
              >
                <span>{mode}</span>
                <span className="text-neutral-600">{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="system-scroll min-h-0 overflow-auto border border-white/10 bg-white/[0.025] p-4">
          <WorkflowProActiveModeBay
            activeMode={activeMode}
            applyPlan={applyPlan}
            brainContext={brainContext}
            contractDraft={contractDraft}
            contractValidation={contractValidation}
            fileNodeContract={fileNodeContract}
            generatedArtifactCount={generatedArtifactCount}
            importReview={importReview}
            inventory={inventory}
            onImportContractText={onImportContractText}
            proposalDiff={proposalDiff}
            runtimeSummary={runtimeSummary}
          />

          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Canonical Contract
          </div>
          <div className="mt-4 grid gap-3">
            <WorkflowProLane
              icon={<FileJson2 className="h-4 w-4" />}
              title="nexus.workflow.v1"
              body="One JSON contract should describe intent, success criteria, nodes, edges, packet contracts, limits, artifact policy, and brain permissions."
            />
            <WorkflowProLane
              icon={<BrainCircuit className="h-4 w-4" />}
              title="Workflow Brain"
              body="The brain reads the whole workflow before execution, identifies serial and parallel logic, critiques weak nodes, and proposes optimized workflows only within available capabilities."
            />
            <WorkflowProLane
              icon={<History className="h-4 w-4" />}
              title="Evidence Timeline"
              body="Runtime evidence and proposal diff will share a switchable analysis bay so the interface stays dense without becoming crowded."
            />
            <WorkflowProLane
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Apply Gate"
              body="Workflow Pro can create a Runtime Lite replacement preview from validated JSON, but it mutates Graph only through explicit operator apply."
            />
          </div>
          <div className="mt-4 border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                <FlaskConical className="h-3.5 w-3.5" />
                Foundation Benchmark JSON
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                30-point gate
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {benchmarkFixtures.map((fixture) => (
                <button
                  key={fixture.id}
                  aria-label={`Load ${fixture.title} benchmark JSON`}
                  className="min-h-10 border border-white/10 bg-white/[0.035] px-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100"
                  onClick={() => handleLoadBenchmarkFixture(fixture.id)}
                  type="button"
                >
                  <span className="block text-neutral-100">{fixture.id}</span>
                  <span className="mt-1 block text-neutral-500">
                    {fixture.expectedScore} pts
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-3 block font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
              Source name
              <input
                aria-label="Workflow Pro pasted JSON source name"
                className="mt-1 min-h-9 w-full border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-neutral-300 outline-none transition focus:border-neutral-300/50"
                onChange={(event) => setPastedContractSourceName(event.currentTarget.value)}
                value={pastedContractSourceName}
              />
            </label>
            <textarea
              aria-label="Workflow Pro JSON paste input"
              className="mt-3 h-44 w-full resize-y border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-5 text-neutral-300 outline-none transition placeholder:text-neutral-700 focus:border-neutral-300/50"
              onChange={(event) => setPastedContractText(event.currentTarget.value)}
              placeholder="Paste a nexus.workflow.v1 JSON contract here, then import and apply."
              spellCheck={false}
              value={pastedContractText}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                aria-label="Import pasted Workflow Pro JSON contract"
                className="flex min-h-10 items-center justify-center gap-2 border border-neutral-300/35 bg-neutral-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:border-white/10 disabled:bg-white/[0.025] disabled:text-neutral-600"
                disabled={!pastedContractText.trim()}
                onClick={handleImportPastedContract}
                type="button"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Import Pasted JSON
              </button>
              <button
                aria-label="Clear pasted Workflow Pro JSON"
                className="min-h-10 border border-white/10 bg-white/[0.035] px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300 transition hover:bg-white/10 hover:text-neutral-100"
                onClick={() => setPastedContractText("")}
                type="button"
              >
                Clear Paste
              </button>
            </div>
            {importReview ? (
              <div
                aria-label="Workflow Pro import status"
                aria-live="polite"
                className="mt-3 grid gap-2 border border-emerald-300/20 bg-emerald-400/[0.06] p-3 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span>
                  Import {importReview.status}
                  <span className="ml-2 text-neutral-500">
                    {importReview.sourceName}
                  </span>
                </span>
                <span className="text-neutral-400">
                  {importReview.status === "accepted"
                    ? "Ready to apply preview"
                    : "Review errors before apply"}
                </span>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-6 text-neutral-500">
              This bay is the UI-only foundation gate: paste JSON, import review,
              apply preview, open Graph, then run the benchmark from the screen.
            </p>
          </div>
          <div className="mt-4 border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Contract Draft
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                {contractDraft.schema}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <WorkflowProRuntimeDatum label="draft nodes" value={contractDraft.nodes.length} />
              <WorkflowProRuntimeDatum label="draft edges" value={contractDraft.edges.length} />
              <WorkflowProRuntimeDatum label="outputs" value={contractDraft.outputs.length} />
              <WorkflowProRuntimeDatum
                label="validation"
                value={contractValidation.ok ? "valid" : "invalid"}
              />
              <WorkflowProRuntimeDatum
                label="warnings"
                value={contractValidation.warnings.length}
              />
              <WorkflowProRuntimeDatum
                label="errors"
                value={contractValidation.errors.length}
              />
            </div>
            <p className="mt-3 text-xs leading-6 text-neutral-500">
              {contractDraft.metadata.description}
            </p>
            {!contractValidation.ok ? (
              <ul className="mt-3 grid gap-2 text-[11px] leading-5 text-neutral-400">
                {contractValidation.errors.slice(0, 3).map((error) => (
                  <li
                    key={`${error.path}-${error.message}`}
                    className="border border-red-300/20 bg-red-500/10 px-2 py-1.5"
                  >
                    {error.path}: {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {importReview ? (
            <div
              ref={importReviewPanelRef}
              className="mt-4 scroll-mt-24 border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  Import Review
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                  {importReview.schema}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <WorkflowProRuntimeDatum label="status" value={importReview.status} />
                <WorkflowProRuntimeDatum
                  label="source"
                  value={importReview.sourceName}
                />
                <WorkflowProRuntimeDatum
                  label="errors"
                  value={importReview.validation.errors.length}
                />
              </div>
              {importReview.error ? (
                <p className="mt-3 text-xs leading-6 text-red-200">
                  {importReview.error}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-6 text-neutral-500">
                  Accepted import is now the active review contract for validation,
                  export, brain context, and apply preview. Graph is still unchanged.
                </p>
              )}
            </div>
          ) : null}
          <div className="mt-4 border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Apply Plan
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                {applyPlan.schema}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <WorkflowProRuntimeDatum label="status" value={applyPlan.status} />
              <WorkflowProRuntimeDatum
                label="candidate nodes"
                value={applyPlan.candidateRuntimeLite?.nodes.length ?? 0}
              />
              <WorkflowProRuntimeDatum
                label="candidate edges"
                value={applyPlan.candidateRuntimeLite?.edges.length ?? 0}
              />
              <WorkflowProRuntimeDatum
                label="mutates now"
                value={applyPlan.safety.mutatesGraphNow ? "yes" : "no"}
              />
              <WorkflowProRuntimeDatum
                label="explicit apply"
                value={applyPlan.safety.requiresExplicitOperatorApply ? "required" : "none"}
              />
              <WorkflowProRuntimeDatum
                label="operations"
                value={applyPlan.operations.length}
              />
            </div>
            {applyPlan.reasons.length ? (
              <ul className="mt-3 grid gap-2 text-[11px] leading-5 text-neutral-400">
                {applyPlan.reasons.slice(0, 3).map((reason) => (
                  <li
                    key={reason}
                    className="border border-yellow-300/20 bg-yellow-500/10 px-2 py-1.5"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="mt-4 border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                Proposal Diff
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                {proposalDiff.schema}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <WorkflowProRuntimeDatum label="status" value={proposalDiff.status} />
              <WorkflowProRuntimeDatum
                label="nodes +"
                value={proposalDiff.summary.addedNodes}
              />
              <WorkflowProRuntimeDatum
                label="nodes -"
                value={proposalDiff.summary.removedNodes}
              />
              <WorkflowProRuntimeDatum
                label="nodes delta"
                value={proposalDiff.summary.changedNodes}
              />
              <WorkflowProRuntimeDatum
                label="edges +"
                value={proposalDiff.summary.addedEdges}
              />
              <WorkflowProRuntimeDatum
                label="edges -"
                value={proposalDiff.summary.removedEdges}
              />
            </div>
            {proposalDiff.changes.length ? (
              <ul className="mt-3 grid gap-2 text-[11px] leading-5 text-neutral-400">
                {proposalDiff.changes.slice(0, 5).map((change) => (
                  <li
                    key={`${change.type}-${change.kind}-${change.id}`}
                    className="border border-white/10 bg-white/[0.025] px-2 py-1.5 font-mono"
                  >
                    {change.kind} {change.type}: {change.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-6 text-neutral-500">
                No proposal changes are pending against the current Runtime Lite graph.
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Available Node Types
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {inventory.nodeTypes.map((nodeType) => (
                <div
                  key={nodeType.type}
                  className="border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200">
                      {nodeType.type}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-emerald-300">
                      {nodeType.state}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-neutral-500">
                    {nodeType.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="system-scroll min-h-0 overflow-auto border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Guardrails
          </div>
          <ul className="mt-3 grid gap-2 text-xs leading-6 text-neutral-400">
            <li className="border border-white/10 bg-white/[0.03] p-3">
              Graph interactions remain owned by the Graph tab until an explicit apply
              action exists.
            </li>
            <li className="border border-white/10 bg-white/[0.03] p-3">
              Generated media should keep using artifact-backed history and downloads.
            </li>
            <li className="border border-white/10 bg-white/[0.03] p-3">
              File nodes route raw artifact, compiler metadata, compiled artifact, and
              ContextPacket references through one expandable pipeline.
            </li>
          </ul>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Runtime Status
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <WorkflowProRuntimeDatum label="runs" value={runtimeSummary.runCount} />
              <WorkflowProRuntimeDatum
                label="last run"
                value={runtimeSummary.lastRunStatus ?? "none"}
              />
              <WorkflowProRuntimeDatum
                label="success nodes"
                value={runtimeSummary.nodeStatusCounts.success}
              />
              <WorkflowProRuntimeDatum
                label="running"
                value={runtimeSummary.nodeStatusCounts.running}
              />
            </dl>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              File Pipeline
            </div>
            <div className="mt-3 border border-white/10 bg-white/[0.025] p-3 text-xs leading-6 text-neutral-400">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-200">
                {fileNodeContract.type}
              </div>
              <div className="mt-2 font-mono text-[10px] text-neutral-500">
                {fileNodeContract.compiler.id}@{fileNodeContract.compiler.version}
              </div>
              <p className="mt-2">{fileNodeContract.packetAttachmentPolicy.rawTextBehavior}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Brain Context
            </div>
            <dl className="mt-3 grid gap-2 text-xs">
              <WorkflowProRuntimeDatum label="schema" value={brainContext.schema} />
              <WorkflowProRuntimeDatum
                label="missing"
                value={brainContext.missingCapabilities.length}
              />
              <WorkflowProRuntimeDatum
                label="graph apply"
                value={brainContext.guardrails.mayMutateGraph ? "allowed" : "blocked"}
              />
            </dl>
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Planned / Missing
            </div>
            <ul className="mt-3 grid gap-2 text-[11px] leading-5 text-neutral-500">
              {inventory.notAvailableYet.slice(0, 7).map((capability) => (
                <li
                  key={capability}
                  className="border border-white/10 bg-white/[0.025] px-2 py-1.5 font-mono"
                >
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setImporting(true);

    try {
      onImportContractText({
        sourceName: file.name,
        text: await file.text(),
      });
    } finally {
      setImporting(false);
      event.currentTarget.value = "";
    }
  }

  function handleLoadBenchmarkFixture(id: WorkflowProFoundationBenchmarkId) {
    setPastedContractSourceName(`workflow-pro-foundation-${id}.json`);
    setPastedContractText(serializeWorkflowProFoundationBenchmarkFixture(id));
  }

  function handleImportPastedContract() {
    const sourceName =
      pastedContractSourceName.trim() || "workflow-pro-pasted-contract.json";

    onImportContractText({
      sourceName,
      text: pastedContractText,
    });
  }
}

function WorkflowProActiveModeBay({
  activeMode,
  applyPlan,
  brainContext,
  contractDraft,
  contractValidation,
  fileNodeContract,
  generatedArtifactCount,
  importReview,
  inventory,
  onImportContractText,
  proposalDiff,
  runtimeSummary,
}: {
  activeMode: WorkflowProMode;
  applyPlan: WorkflowProApplyPlan;
  brainContext: WorkflowBrainContextPack;
  contractDraft: WorkflowProContractDraft;
  contractValidation: WorkflowProContractValidationResult;
  fileNodeContract: WorkflowProFileNodeContract;
  generatedArtifactCount: number;
  importReview: WorkflowProContractImportReview | null;
  inventory: WorkflowProCapabilityInventory;
  onImportContractText: (input: { sourceName: string; text: string }) => void;
  proposalDiff: WorkflowProProposalDiff;
  runtimeSummary: WorkflowProRuntimeSummary;
}) {
  const bayItems = getWorkflowProModeBayItems({
    activeMode,
    applyPlan,
    brainContext,
    contractDraft,
    contractValidation,
    fileNodeContract,
    generatedArtifactCount,
    importReview,
    inventory,
    proposalDiff,
    runtimeSummary,
  });

  return (
    <section className="mb-4 border border-neutral-300/20 bg-black/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Active Cockpit Bay
          </div>
          <h3 className="mt-2 font-mono text-lg uppercase tracking-[0.1em] text-neutral-100">
            {activeMode}
          </h3>
        </div>
        <span className="border border-neutral-300/25 bg-neutral-300/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-300">
          {activeMode === "Design" ? "operator-gated" : "read-only"}
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
        {workflowProModeDescriptions[activeMode]}
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {bayItems.map((item) => (
          <WorkflowProRuntimeDatum
            key={item.label}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>
      <div className="mt-3 border border-white/10 bg-white/[0.025] p-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          Next operator move
        </div>
        <p className="mt-2 text-xs leading-6 text-neutral-400">
          {getWorkflowProModeNextMove({
            activeMode,
            applyPlan,
            contractValidation,
            importReview,
            proposalDiff,
            runtimeSummary,
          })}
        </p>
      </div>
      <WorkflowProActiveModeDetails
        activeMode={activeMode}
        applyPlan={applyPlan}
        brainContext={brainContext}
        contractDraft={contractDraft}
        fileNodeContract={fileNodeContract}
        generatedArtifactCount={generatedArtifactCount}
        importReview={importReview}
        inventory={inventory}
        onImportContractText={onImportContractText}
        proposalDiff={proposalDiff}
        runtimeSummary={runtimeSummary}
      />
    </section>
  );
}

function WorkflowProActiveModeDetails({
  activeMode,
  applyPlan,
  brainContext,
  contractDraft,
  fileNodeContract,
  generatedArtifactCount,
  importReview,
  inventory,
  onImportContractText,
  proposalDiff,
  runtimeSummary,
}: {
  activeMode: WorkflowProMode;
  applyPlan: WorkflowProApplyPlan;
  brainContext: WorkflowBrainContextPack;
  contractDraft: WorkflowProContractDraft;
  fileNodeContract: WorkflowProFileNodeContract;
  generatedArtifactCount: number;
  importReview: WorkflowProContractImportReview | null;
  inventory: WorkflowProCapabilityInventory;
  onImportContractText: (input: { sourceName: string; text: string }) => void;
  proposalDiff: WorkflowProProposalDiff;
  runtimeSummary: WorkflowProRuntimeSummary;
}) {
  const [brainProposalSourceName, setBrainProposalSourceName] =
    useState("workflow-brain-proposal.json");
  const [brainProposalText, setBrainProposalText] = useState("");
  const [brainProposalValidation, setBrainProposalValidation] =
    useState<WorkflowProBrainReviewProposalValidationResult | null>(null);
  const [brainProposalValidatedText, setBrainProposalValidatedText] =
    useState<string | null>(null);
  const brainProposalIsStale =
    brainProposalValidation !== null &&
    brainProposalText !== brainProposalValidatedText;

  function handleValidateBrainProposal() {
    const validation = parseWorkflowProBrainReviewProposalText({
      text: brainProposalText,
    });

    setBrainProposalValidation(validation);
    setBrainProposalValidatedText(brainProposalText);
  }

  function handleImportOptimizedBrainWorkflow() {
    const optimizedWorkflow =
      brainProposalValidation?.proposal?.optimizedWorkflow ?? null;

    if (!optimizedWorkflow || brainProposalIsStale) {
      return;
    }

    onImportContractText({
      sourceName: brainProposalSourceName.trim() || "workflow-brain-proposal.json",
      text: JSON.stringify(optimizedWorkflow, null, 2),
    });
  }

  switch (activeMode) {
    case "Design":
      return (
        <>
          <WorkflowProDetailGrid
            items={[
              {
                body: contractDraft.intent,
                title: "Workflow intent",
              },
              {
                body:
                  importReview?.status === "accepted"
                    ? `Imported from ${importReview.sourceName}; Graph still waits for explicit apply.`
                    : "No imported contract is active; the draft is generated from the current Runtime Lite graph.",
                title: "Import state",
              },
              {
                body: `${applyPlan.operations.length} operation(s), explicit apply required, mutates now: ${applyPlan.safety.mutatesGraphNow ? "yes" : "no"}.`,
                title: "Apply safety",
              },
            ]}
          />
          <WorkflowProDesignGate
            applyPlan={applyPlan}
            importReview={importReview}
          />
        </>
      );
    case "Brain":
      return (
        <WorkflowProDetailGrid
          items={[
            {
              body: brainContext.systemBrief,
              title: "System brief",
            },
            {
              body: Object.entries(brainContext.requiredOutput)
                .map(([key, value]) => `${key}: ${value}`)
                .join("; "),
              title: "Required output",
            },
            {
              body: brainContext.missingCapabilities.slice(0, 6).join(", "),
              title: "Missing capability signal",
            },
          ]}
        />
      );
    case "Evidence":
      return (
        <>
          <WorkflowProDetailGrid
            items={[
              {
                body: `${runtimeSummary.runCount} recorded run(s); last run id: ${runtimeSummary.lastRunId ?? "none"}.`,
                title: "Run ledger",
              },
              {
                body: `success ${runtimeSummary.nodeStatusCounts.success}, running ${runtimeSummary.nodeStatusCounts.running}, failed ${runtimeSummary.nodeStatusCounts.failed + runtimeSummary.nodeStatusCounts.failed_interrupted}.`,
                title: "Node status counts",
              },
              {
                body: runtimeSummary.lastError ?? "No last runtime error is recorded.",
                title: "Last error",
              },
            ]}
          />
          <WorkflowProEvidenceGateSummary
            generatedArtifactCount={generatedArtifactCount}
            runtimeSummary={runtimeSummary}
          />
        </>
      );
    case "Proposal Diff":
      return (
        <>
          <WorkflowProDetailGrid
            items={[
              {
                body: `${proposalDiff.summary.addedNodes} node(s) added, ${proposalDiff.summary.removedNodes} removed, ${proposalDiff.summary.changedNodes} changed.`,
                title: "Node delta",
              },
              {
                body: `${proposalDiff.summary.addedEdges} edge(s) added, ${proposalDiff.summary.removedEdges} removed.`,
                title: "Edge delta",
              },
              {
                body: proposalDiff.changes.length
                  ? proposalDiff.changes
                      .slice(0, 4)
                      .map((change) => `${change.kind} ${change.type}: ${change.label}`)
                      .join("; ")
                  : "No proposal changes are pending against the current graph.",
                title: "Review queue",
              },
            ]}
          />
          <WorkflowProProposalReviewQueue proposalDiff={proposalDiff} />
          <WorkflowProBrainProposalIntake
            brainProposalSourceName={brainProposalSourceName}
            brainProposalIsStale={brainProposalIsStale}
            brainProposalText={brainProposalText}
            brainProposalValidation={brainProposalValidation}
            onBrainProposalSourceNameChange={setBrainProposalSourceName}
            onBrainProposalTextChange={setBrainProposalText}
            onImportOptimizedWorkflow={handleImportOptimizedBrainWorkflow}
            onValidateBrainProposal={handleValidateBrainProposal}
          />
        </>
      );
    case "Files":
      return (
        <>
          <WorkflowProDetailGrid
            items={[
              {
                body: "Raw file artifact enters the file node before any model sees it.",
                title: "Raw artifact",
              },
              {
                body: `${fileNodeContract.compiler.id}@${fileNodeContract.compiler.version} keeps a noop compiler boundary for files that do not need transformation.`,
                title: "Compiler boundary",
              },
              {
                body: fileNodeContract.packetAttachmentPolicy.rawTextBehavior,
                title: "ContextPacket packaging",
              },
            ]}
          />
          <WorkflowProFilePipelinePath fileNodeContract={fileNodeContract} />
        </>
      );
    case "Settings":
      return (
        <>
          <WorkflowProDetailGrid
            items={[
              {
                body: inventory.nodeTypes
                  .map((nodeType) => `${nodeType.type}:${nodeType.state}`)
                  .join(", "),
                title: "Executable node registry",
              },
              {
                body: inventory.compilers
                  .map((compiler) => `${compiler.id}:${compiler.state}`)
                  .join(", "),
                title: "Compiler registry",
              },
              {
                body: inventory.notAvailableYet.join(", "),
                title: "Planned capability flags",
              },
            ]}
          />
          <WorkflowProCapabilityRegistry inventory={inventory} />
        </>
      );
  }
}

function WorkflowProDetailGrid({
  items,
}: {
  items: Array<{
    body: string;
    title: string;
  }>;
}) {
  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.title}
          className="min-h-28 border border-white/10 bg-black/20 p-3"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
            {item.title}
          </div>
          <p className="mt-2 break-words text-xs leading-6 text-neutral-400">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function WorkflowProEvidenceGateSummary({
  generatedArtifactCount,
  runtimeSummary,
}: {
  generatedArtifactCount: number;
  runtimeSummary: WorkflowProRuntimeSummary;
}) {
  const gates = [
    {
      body: "R83 screen operation passed A, B, and C through fixture load, import review, Apply Preview, Graph, and Start All.",
      evidence: "docs/workflow-pro/foundation-benchmark-verification.manifest.json",
      state: "passed",
      title: "Foundation 30/30",
    },
    {
      body: "Owner/admin/editor/viewer/new-account expectations are source-guarded; R92 deployed a clean protected preview and passed 49 strict live probes with 0 blocking findings. Screen matrix remains pending.",
      evidence: "docs/workflow-pro/strict-preview-live-probe.manifest.json",
      state: "preview green",
      title: "Account matrix source guard",
    },
    {
      body: "Generated image asset downloads are screen verified; R91 makes /api/image-gen a formal protected production route with Supabase session and runtime provider credentials separated.",
      evidence: "docs/workflow-pro/image-generation-production-boundary.manifest.json",
      state: "protected",
      title: "Generated image route guard",
    },
    {
      body: "R93 adds a 100-point owner/editor/viewer/new-account screen-run evidence manifest and validator. Current score is 0/100 pending until real browser operations fill the record.",
      evidence: "docs/workflow-pro/account-matrix-screen-run.manifest.json",
      state: "harness ready",
      title: "Account matrix screen run",
    },
    {
      body: "Still open: run owner/editor/viewer/new-account screen matrix on the strict-preview-green deployment, then verify non-owner generated media download before production promotion.",
      evidence: `${runtimeSummary.runCount} runtime run(s), ${generatedArtifactCount} generated artifact(s) currently visible.`,
      state: "open",
      title: "Preview ready gaps",
    },
  ];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
          Evidence gate summary
        </div>
        <span className="border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
          traceable
        </span>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {gates.map((gate) => (
          <article
            key={gate.title}
            className="border border-white/10 bg-black/20 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300">
                {gate.title}
              </div>
              <span
                className={[
                  "border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em]",
                  gate.state === "open"
                    ? "border-yellow-300/20 bg-yellow-300/10 text-yellow-100"
                    : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
                ].join(" ")}
              >
                {gate.state}
              </span>
            </div>
            <p className="mt-2 break-words text-xs leading-6 text-neutral-400">
              {gate.body}
            </p>
            <div className="mt-2 break-words font-mono text-[9px] leading-5 text-neutral-600">
              {gate.evidence}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkflowProDesignGate({
  applyPlan,
  importReview,
}: {
  applyPlan: WorkflowProApplyPlan;
  importReview: WorkflowProContractImportReview | null;
}) {
  const steps = [
    {
      body: "Load a foundation fixture or paste a nexus.workflow.v1 contract into the JSON bay.",
      state: importReview ? "done" : "ready",
      title: "01 Load contract",
    },
    {
      body:
        importReview?.status === "accepted"
          ? `Accepted from ${importReview.sourceName}.`
          : "Import review has not accepted an external contract yet.",
      state: importReview?.status === "accepted" ? "done" : "waiting",
      title: "02 Import review",
    },
    {
      body:
        applyPlan.status === "ready"
          ? "Apply Preview is armed, but Graph mutates only when the operator clicks it."
          : applyPlan.reasons[0] ?? "Apply Preview is not ready.",
      state: applyPlan.status === "ready" ? "armed" : "blocked",
      title: "03 Apply preview",
    },
  ];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
        Foundation gate
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.title}
            className="border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300">
                {step.title}
              </div>
              <span className="border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                {step.state}
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-neutral-400">{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkflowProProposalReviewQueue({
  proposalDiff,
}: {
  proposalDiff: WorkflowProProposalDiff;
}) {
  const reviewItems = proposalDiff.changes.length
    ? proposalDiff.changes.slice(0, 5).map((change) => ({
        body: change.label,
        id: `${change.kind}-${change.type}-${change.id}`,
        state: change.type,
        title: `${change.kind} ${change.id}`,
      }))
    : [
        {
          body: "Current contract and candidate graph do not expose pending structural changes.",
          id: "proposal-diff-none",
          state: "clean",
          title: "No pending review",
        },
      ];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
        Proposal review queue
      </div>
      <div className="mt-3 grid gap-2">
        {reviewItems.map((item) => (
          <article
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 border border-white/10 bg-black/20 p-3"
          >
            <div className="min-w-0">
              <div className="break-words font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-300">
                {item.title}
              </div>
              <p className="mt-2 break-words text-xs leading-6 text-neutral-400">
                {item.body}
              </p>
            </div>
            <span className="shrink-0 border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              {item.state}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkflowProBrainProposalIntake({
  brainProposalSourceName,
  brainProposalIsStale,
  brainProposalText,
  brainProposalValidation,
  onBrainProposalSourceNameChange,
  onBrainProposalTextChange,
  onImportOptimizedWorkflow,
  onValidateBrainProposal,
}: {
  brainProposalSourceName: string;
  brainProposalIsStale: boolean;
  brainProposalText: string;
  brainProposalValidation: WorkflowProBrainReviewProposalValidationResult | null;
  onBrainProposalSourceNameChange: (value: string) => void;
  onBrainProposalTextChange: (value: string) => void;
  onImportOptimizedWorkflow: () => void;
  onValidateBrainProposal: () => void;
}) {
  const hasOptimizedWorkflow =
    !brainProposalIsStale &&
    Boolean(brainProposalValidation?.proposal?.optimizedWorkflow);
  const validationStatus = brainProposalIsStale
    ? "stale"
    : brainProposalValidation
    ? brainProposalValidation.ok
      ? "accepted"
      : "rejected"
    : "waiting";
  const analysisExcerpt =
    brainProposalIsStale
      ? "Proposal text changed after validation. Revalidate before importing the optimized workflow."
      : brainProposalValidation?.proposal?.analysis ??
    "Paste a nexus.workflowPro.brainReviewProposal.v1 object generated by the Workflow Brain.";
  const issues = brainProposalValidation
    ? [
        ...brainProposalValidation.errors.map((issue) => ({
          ...issue,
          state: "error",
        })),
        ...brainProposalValidation.warnings.map((issue) => ({
          ...issue,
          state: "warning",
        })),
      ]
    : [];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
            Brain proposal intake
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-neutral-400">
            Validate the Workflow Brain response before it can become an operator-gated
            Workflow Pro import preview. Editing after validation locks import until
            the proposal is revalidated.
          </p>
        </div>
        <span
          className={[
            "border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em]",
            validationStatus === "accepted"
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
              : validationStatus === "rejected"
                ? "border-red-300/20 bg-red-300/10 text-red-200"
                : validationStatus === "stale"
                  ? "border-yellow-300/20 bg-yellow-300/10 text-yellow-100"
                : "border-white/10 bg-white/[0.04] text-neutral-500",
          ].join(" ")}
        >
          {validationStatus}
        </span>
      </div>

      <label className="mt-3 block font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
        Source name
        <input
          aria-label="Workflow Brain proposal source name"
          className="mt-1 min-h-9 w-full border border-white/10 bg-black/30 px-3 font-mono text-[11px] text-neutral-300 outline-none transition focus:border-neutral-300/50"
          onChange={(event) =>
            onBrainProposalSourceNameChange(event.currentTarget.value)
          }
          value={brainProposalSourceName}
        />
      </label>

      <textarea
        aria-label="Workflow Brain proposal JSON paste input"
        className="mt-3 min-h-32 w-full resize-y border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-5 text-neutral-300 outline-none transition placeholder:text-neutral-700 focus:border-neutral-300/50"
        onChange={(event) => onBrainProposalTextChange(event.currentTarget.value)}
        placeholder="Paste nexus.workflowPro.brainReviewProposal.v1 JSON here"
        spellCheck={false}
        value={brainProposalText}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          aria-label="Validate Workflow Brain proposal"
          className="inline-flex min-h-9 items-center justify-center gap-2 border border-white/10 bg-white/[0.06] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!brainProposalText.trim()}
          onClick={onValidateBrainProposal}
          type="button"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Validate Brain Proposal
        </button>
        <button
          aria-label="Import optimized Workflow Brain proposal"
          className="inline-flex min-h-9 items-center justify-center gap-2 border border-emerald-300/20 bg-emerald-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasOptimizedWorkflow}
          onClick={onImportOptimizedWorkflow}
          type="button"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Import optimized workflow
        </button>
      </div>

      <div
        aria-label="Workflow Brain proposal validation status"
        className="mt-3 border border-white/10 bg-black/20 p-3"
      >
        <div className="grid gap-2 md:grid-cols-3">
          <WorkflowProRuntimeDatum label="proposal" value={validationStatus} />
          <WorkflowProRuntimeDatum
            label="optimized workflow"
            value={hasOptimizedWorkflow ? "ready" : "none"}
          />
          <WorkflowProRuntimeDatum
            label="issues"
            value={
              brainProposalValidation
                ? brainProposalValidation.errors.length +
                  brainProposalValidation.warnings.length
                : 0
            }
          />
        </div>
        <p className="mt-3 break-words text-xs leading-6 text-neutral-400">
          {analysisExcerpt}
        </p>
        {issues.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {issues.slice(0, 4).map((issue) => (
              <div
                key={`${issue.state}-${issue.path}-${issue.message}`}
                className="border border-white/10 bg-white/[0.025] p-2"
              >
                <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                  {issue.state} / {issue.path}
                </div>
                <p className="mt-1 break-words text-[11px] leading-5 text-neutral-400">
                  {issue.message}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkflowProFilePipelinePath({
  fileNodeContract,
}: {
  fileNodeContract: WorkflowProFileNodeContract;
}) {
  const steps = [
    {
      body: "The original upload or generated file reference remains addressable.",
      state: "required",
      title: "Raw artifact",
    },
    {
      body: `${fileNodeContract.compiler.id}@${fileNodeContract.compiler.version} (${fileNodeContract.compiler.mode}) keeps every file behind an explicit compiler boundary.`,
      state: "available",
      title: "Compiler boundary",
    },
    {
      body: "A transformed artifact slot is reserved even when the current compiler is noop.",
      state: "reserved",
      title: "Compiled artifact",
    },
    {
      body: "Downstream model nodes receive attachment references through ContextPacket packaging instead of ad hoc prompt text.",
      state: "packet",
      title: "ContextPacket attachments",
    },
  ];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
        File pipeline path
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        {steps.map((step) => (
          <article
            key={step.title}
            className="border border-white/10 bg-black/20 p-3"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300">
              {step.title}
            </div>
            <span className="mt-2 inline-flex border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-neutral-500">
              {step.state}
            </span>
            <p className="mt-2 break-words text-xs leading-6 text-neutral-400">
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkflowProCapabilityRegistry({
  inventory,
}: {
  inventory: WorkflowProCapabilityInventory;
}) {
  const groups = [
    {
      items: inventory.nodeTypes.map((nodeType) => ({
        id: nodeType.type,
        state: nodeType.state,
        summary: nodeType.description,
      })),
      title: "Node capabilities",
    },
    {
      items: inventory.compilers.map((compiler) => ({
        id: compiler.id,
        state: compiler.state,
        summary: compiler.summary,
      })),
      title: "Compiler capabilities",
    },
    {
      items: inventory.artifactPolicies.map((policy) => ({
        id: policy.id,
        state: policy.state,
        summary: policy.summary,
      })),
      title: "Artifact policies",
    },
  ];

  return (
    <div className="mt-3 border border-neutral-300/20 bg-neutral-300/[0.035] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-500">
        Capability registry
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.title}
            className="min-h-32 border border-white/10 bg-black/20 p-3"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300">
              {group.title}
            </div>
            <div className="mt-3 grid gap-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="border border-white/10 bg-white/[0.025] p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="break-words font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-300">
                      {item.id}
                    </span>
                    <span
                      className={[
                        "border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em]",
                        item.state === "available"
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                          : "border-yellow-300/20 bg-yellow-300/10 text-yellow-100",
                      ].join(" ")}
                    >
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-[11px] leading-5 text-neutral-500">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function getWorkflowProModeBayItems({
  activeMode,
  applyPlan,
  brainContext,
  contractDraft,
  contractValidation,
  fileNodeContract,
  generatedArtifactCount,
  importReview,
  inventory,
  proposalDiff,
  runtimeSummary,
}: {
  activeMode: WorkflowProMode;
  applyPlan: WorkflowProApplyPlan;
  brainContext: WorkflowBrainContextPack;
  contractDraft: WorkflowProContractDraft;
  contractValidation: WorkflowProContractValidationResult;
  fileNodeContract: WorkflowProFileNodeContract;
  generatedArtifactCount: number;
  importReview: WorkflowProContractImportReview | null;
  inventory: WorkflowProCapabilityInventory;
  proposalDiff: WorkflowProProposalDiff;
  runtimeSummary: WorkflowProRuntimeSummary;
}): WorkflowProMetric[] {
  switch (activeMode) {
    case "Design":
      return [
        { label: "contract", value: contractValidation.ok ? "valid" : "blocked" },
        { label: "nodes", value: contractDraft.nodes.length },
        { label: "apply", value: applyPlan.status },
      ];
    case "Brain":
      return [
        { label: "schema", value: brainContext.schema },
        { label: "missing", value: brainContext.missingCapabilities.length },
        { label: "mutate graph", value: brainContext.guardrails.mayMutateGraph ? "yes" : "no" },
      ];
    case "Evidence":
      return [
        { label: "runs", value: runtimeSummary.runCount },
        { label: "last run", value: runtimeSummary.lastRunStatus ?? "none" },
        { label: "generated", value: generatedArtifactCount },
      ];
    case "Proposal Diff":
      return [
        { label: "status", value: proposalDiff.status },
        { label: "changes", value: proposalDiff.changes.length },
        { label: "import", value: importReview?.status ?? "none" },
      ];
    case "Files":
      return [
        { label: "node", value: fileNodeContract.type },
        { label: "compiler", value: fileNodeContract.compiler.mode },
        { label: "compiler id", value: fileNodeContract.compiler.id },
      ];
    case "Settings":
      return [
        { label: "nodes", value: inventory.nodeTypes.length },
        { label: "compilers", value: inventory.compilers.length },
        { label: "planned", value: inventory.notAvailableYet.length },
      ];
  }
}

function getWorkflowProModeNextMove({
  activeMode,
  applyPlan,
  contractValidation,
  importReview,
  proposalDiff,
  runtimeSummary,
}: {
  activeMode: WorkflowProMode;
  applyPlan: WorkflowProApplyPlan;
  contractValidation: WorkflowProContractValidationResult;
  importReview: WorkflowProContractImportReview | null;
  proposalDiff: WorkflowProProposalDiff;
  runtimeSummary: WorkflowProRuntimeSummary;
}) {
  if (!contractValidation.ok) {
    return `Fix ${contractValidation.errors[0]?.path ?? "contract"} before importing or applying this workflow.`;
  }

  switch (activeMode) {
    case "Design":
      return applyPlan.status === "ready"
        ? "Use Apply Preview only after the imported JSON matches the intended graph. Graph will not mutate before this explicit operator action."
        : applyPlan.reasons[0] ?? "Load a benchmark fixture or paste a workflow contract to produce an apply preview.";
    case "Brain":
      return "Send the contract, runtime summary, guardrails, and missing capabilities together so the Workflow Brain can explain the entire topology before proposing an optimized workflow.";
    case "Evidence":
      return runtimeSummary.runCount
        ? "Read the last run status and node status counts before trusting this workflow as repeatable evidence."
        : "Run a screen-level benchmark from Graph after applying a fixture so runtime evidence exists outside the code test harness.";
    case "Proposal Diff":
      return proposalDiff.changes.length
        ? "Review added, removed, and changed nodes before applying. The imported contract is still reversible until Apply Preview is clicked."
        : importReview
          ? "The accepted import matches the current candidate closely; proceed to evidence or apply review."
          : "Import a contract to generate a proposal diff against the current Runtime Lite graph.";
    case "Files":
      return "Keep raw file, noop compiler metadata, compiled artifact placeholder, and ContextPacket attachment references together so future zip/pdf/video compilers can plug in cleanly.";
    case "Settings":
      return "Treat planned capabilities as feature flags: expose them to the brain as limits, but do not let the UI pretend they are executable.";
  }
}

function WorkflowProLane({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-300">
        {icon}
        {title}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">{body}</p>
    </article>
  );
}

function WorkflowProRuntimeDatum({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.025] p-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-600">
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-neutral-200">{value}</dd>
    </div>
  );
}
