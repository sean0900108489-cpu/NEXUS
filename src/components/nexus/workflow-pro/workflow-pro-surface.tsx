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
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type {
  WorkflowProCapabilityInventory,
  WorkflowProRuntimeSummary,
} from "@/lib/workflow-pro/capability-inventory";
import type { WorkflowBrainContextPack } from "@/lib/workflow-pro/brain-context";
import type { WorkflowProFileNodeContract } from "@/lib/workflow-pro/file-node-contract";
import type { WorkflowProApplyPlan } from "@/lib/workflow-pro/workflow-contract-apply-plan";
import type { WorkflowProContractImportReview } from "@/lib/workflow-pro/workflow-contract-import";
import type { WorkflowProContractDraft } from "@/lib/workflow-pro/workflow-contract";
import { validateWorkflowProContractDraft } from "@/lib/workflow-pro/workflow-contract-validator";
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

export function WorkflowProSurface({
  agentCount,
  applyPlan,
  brainContext,
  contractDraft,
  fileNodeContract,
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
  const benchmarkFixtures = useMemo(
    () => createWorkflowProFoundationBenchmarkFixtures(),
    [],
  );
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
                aria-label={`${mode} view placeholder`}
                className="flex min-h-10 items-center justify-between border border-white/10 bg-white/[0.035] px-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300"
                type="button"
              >
                <span>{mode}</span>
                <span className="text-neutral-600">{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="system-scroll min-h-0 overflow-auto border border-white/10 bg-white/[0.025] p-4">
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
            <div className="mt-4 border border-white/10 bg-black/20 p-3">
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
