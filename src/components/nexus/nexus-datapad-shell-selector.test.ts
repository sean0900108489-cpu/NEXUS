import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus datapad shell selector", () => {
  it("adds the stable selector to the existing DatapadWindow visual shell", () => {
    const source = readDatapadWindowSource();

    expect(source).toContain("export function DatapadWindow({ notebookId }");
    expect(source).toContain("<Rnd");
    expect(source).toContain('dragHandleClassName="datapad-drag-handle"');
    expect(source).toContain(
      'className="nexus-datapad-shell nexus-datapad-window flex h-full min-h-0 flex-col overflow-hidden border border-emerald-300/30 bg-slate-950/94 text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,0.55),0_0_34px_rgba(16,185,129,0.14)] backdrop-blur-xl"',
    );
  });

  it("keeps drag, resize, focus, z-index, draft, save, close, and delete ownership in place", () => {
    const source = readDatapadWindowSource();

    expect(source).toContain('import { Rnd } from "react-rnd";');
    expect(source).toContain('import { useNexusStore } from "@/store/nexus-store";');
    expect(source).toContain("const zIndex = useNexusStore(");
    expect(source).toContain("const focusNotebookWindow = useNexusStore");
    expect(source).toContain("const saveNotebookDraft = useNexusStore");
    expect(source).toContain("const updateNotebook = useNexusStore");
    expect(source).toContain("const deleteNotebook = useNexusStore");
    expect(source).toContain("const bringToFront = () => focusNotebookWindow(notebook.id);");
    expect(source).toContain("onDragStart={bringToFront}");
    expect(source).toContain("onMouseDown={bringToFront}");
    expect(source).toContain("onTouchStart={bringToFront}");
    expect(source).toContain("style={{ zIndex }}");
    expect(source).toContain("onClick={() => toggleNotebookOpen(notebook.id)}");
    expect(source).toContain("onChange={(event) => handleTitleDraftChange(event.currentTarget.value)}");
    expect(source).toContain("onChange={(event) => handleContentDraftChange(event.currentTarget.value)}");
    expect(source).toContain("onClick={saveNotebook}");
    expect(source).toContain("onClick={() => deleteNotebook(notebook.id)}");
  });

  it("does not add token aliases or frame extraction in this prep step", () => {
    const source = readDatapadWindowSource();
    const css = readGlobalsCssSource();

    expect(css).not.toContain("--nexus-datapad-shell");
    expect(css).not.toContain("--nexus-datapad-bg");
    expect(css).not.toContain("--nexus-inspector");
    expect(source).not.toContain("DatapadShellFrame");
    expect(source).not.toContain("InspectorShellFrame");
  });

  it("does not add forbidden runtime imports beyond the existing DatapadWindow owner", () => {
    const source = readDatapadWindowSource();
    const forbiddenImports = [
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@\/lib\/api\//,
      /from\s+["']@\/components\/nexus\/nexus-graph["']/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    for (const pattern of forbiddenImports) {
      expect(source, `DatapadWindow should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readDatapadWindowSource() {
  return readFileSync(new URL("DatapadWindow.tsx", import.meta.url), "utf8");
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}
