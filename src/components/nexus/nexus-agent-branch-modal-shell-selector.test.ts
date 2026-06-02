import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus agent branch modal shell selector", () => {
  it("adds the stable selector to the existing inner visual shell", () => {
    const source = readAgentBranchModalSource();

    expect(source).toContain("export function AgentBranchModal({");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain(
      'className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 p-4 backdrop-blur-md"',
    );
    expect(source).toContain(
      'className="nexus-agent-branch-modal-shell w-full max-w-3xl border border-white/10 bg-black/70 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"',
    );
    expect(source).not.toContain(
      'className="nexus-agent-branch-modal-shell w-full max-w-3xl border border-neutral-300/25 bg-neutral-950/95 shadow-[0_0_48px_rgba(34,211,238,0.14),0_24px_80px_rgba(0,0,0,0.6)]"',
    );
  });

  it("keeps close, submit, form state, focus, and branch execution ownership in place", () => {
    const source = readAgentBranchModalSource();

    expect(source).toContain('const [mode, setMode] = useState<AgentBranchMode>("full");');
    expect(source).toContain("const [branchAttempted, setBranchAttempted] = useState(false);");
    expect(source).toContain("const branchAgent = useNexusStore((state) => state.branchAgent);");
    expect(source).toContain("const executeBranchConfiguration = async");
    expect(source).toContain("setBranchAttempted(true);");
    expect(source).toContain("await branchAgent(agent.id, config)");
    expect(source).toContain("onBranchComplete(newAgentId);");
    expect(source).toContain("onClose();");
    expect(source).toContain('aria-label="Close branch agent interface"');
    expect(source).toContain("onClick={onClose}");
    expect(source).toContain("onChange={(event) => setCompressorModelId(event.target.value)}");
    expect(source).toContain("onChange={(event) => setRetentionRatio(Number(event.target.value))}");
    expect(source).toContain("onChange={(event) => setCustomFocus(event.target.value)}");
    expect(source).toContain("void executeBranchConfiguration();");
  });

  it("adds modal shell aliases in globals with panel and surface-shell fallbacks", () => {
    const source = readAgentBranchModalSource();
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-shell .nexus-agent-branch-modal-shell");
    expect(css).toContain(
      "background: var(--nexus-modal-shell-bg, var(--nexus-panel-bg, rgb(16 16 16 / 0.95)))",
    );
    expect(css).toContain(
      "border-color: var(--nexus-modal-shell-border, var(--nexus-panel-border, rgb(210 210 210 / 0.25)))",
    );
    expect(css).toContain(
      "border-radius: var(--nexus-modal-shell-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(css).toContain("--nexus-modal-shell-shadow");
    expect(css).toContain("var(--nexus-panel-shadow, 0 0 48px rgb(210 210 210 / 0.14)");
    expect(css).toContain(
      "backdrop-filter: blur(var(--nexus-modal-shell-blur, var(--nexus-panel-blur, var(--glass-blur))))",
    );
    expect(css).not.toContain("--nexus-agent-branch-modal");
    expect(source).not.toContain("ModalDialogShellFrame");
    expect(source).not.toContain("AgentBranchModalShellFrame");
  });

  it("does not add forbidden runtime imports beyond the existing modal owner", () => {
    const source = readAgentBranchModalSource();
    const forbiddenImports = [
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@\/lib\/api\//,
      /from\s+["']@\/components\/nexus\/nexus-graph["']/,
      /from\s+["']react-rnd["']/,
      /\bRnd\b/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    for (const pattern of forbiddenImports) {
      expect(source, `AgentBranchModal should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readAgentBranchModalSource() {
  return readFileSync(new URL("AgentBranchModal.tsx", import.meta.url), "utf8");
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}
