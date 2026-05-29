"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileJson,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  compileNexusStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  createNexusStyleExportPackageV1,
  createNexusStylePreviewPatchV1,
  parseNexusStyleImportTextV1,
  reviewNexusStylePackV1,
  type NexusStyleImportTextResultV1,
  type NexusStyleManifestV1,
} from "@/lib/style-engine";
import { useNexusStyleRuntimeV1 } from "@/components/style-engine/nexus-style-runtime-provider";

type PreviewState = "idle" | "previewing" | "reverted";

const maxVisibleImportIssues = 3;

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

export function NexusStyleLab() {
  const runtime = useNexusStyleRuntimeV1();
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [manifest, setManifest] = useState<NexusStyleManifestV1>(() =>
    createLegacyCyberpunkStyleManifestV1(),
  );
  const [draftText, setDraftText] = useState("");
  const [importResult, setImportResult] =
    useState<NexusStyleImportTextResultV1 | null>(null);
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
  const exportText = useMemo(
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

    return importResult.errors.slice(0, maxVisibleImportIssues);
  }, [importResult]);
  const importStatus = importResult
    ? importResult.accepted
      ? `${importResult.source} accepted`
      : `${importResult.source} rejected`
    : "no draft";

  const startPreview = () => {
    if (!previewPatch) {
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
    setDraftText(exportText);
    setImportResult(null);
  };

  const resetToBaseline = () => {
    runtime.clearPreview();
    setManifest(createLegacyCyberpunkStyleManifestV1());
    setImportResult(null);
    setPreviewState("idle");
  };

  const loadDraft = () => {
    const result = parseNexusStyleImportTextV1(draftText);

    setImportResult(result);

    if (!result.accepted) {
      return;
    }

    runtime.clearPreview();
    setManifest(result.manifest);
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
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 border border-cyan-300/35 bg-cyan-300/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
                disabled={!previewPatch}
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
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
                {previewState}
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
            </div>
          </section>

          <aside className="grid min-h-0 gap-4 overflow-hidden lg:grid-rows-[minmax(260px,0.95fr)_minmax(260px,1fr)]">
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
                onChange={(event) => setDraftText(event.target.value)}
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
                            className="truncate font-mono text-[10px] text-rose-200"
                          >
                            {issue.path} / {issue.code}
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

            <section className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden border border-white/10 bg-black/30">
              <header className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-100">
                  <FileJson className="h-4 w-4" />
                  Export Package
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  {review.validation.warningCount}W / {review.validation.errorCount}E
                </span>
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
