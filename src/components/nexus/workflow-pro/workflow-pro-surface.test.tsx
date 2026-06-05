import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  WorkflowProSurface,
  type WorkflowProMode,
  type WorkflowProSurfaceProps,
} from "./workflow-pro-surface";
import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "@/lib/workflow-pro/capability-inventory";
import { createWorkflowBrainContextPack } from "@/lib/workflow-pro/brain-context";
import { createWorkflowProFileNodeContract } from "@/lib/workflow-pro/file-node-contract";
import { createWorkflowProApplyPlan } from "@/lib/workflow-pro/workflow-contract-apply-plan";
import { parseWorkflowProContractImportText } from "@/lib/workflow-pro/workflow-contract-import";
import { createWorkflowProContractDraftFromRuntimeLite } from "@/lib/workflow-pro/workflow-contract";
import { createWorkflowProProposalDiff } from "@/lib/workflow-pro/proposal-diff";

const inventory = createWorkflowProCapabilityInventory();
const runtimeSummary = summarizeWorkflowProRuntime(undefined);
const contractDraft = createWorkflowProContractDraftFromRuntimeLite({
  generatedAt: "2026-06-03T00:00:00.000Z",
  inventory,
  runtimeLite: undefined,
  workspaceId: "workspace-test",
  workspaceName: "NEXUS TEST",
});
const brainContext = createWorkflowBrainContextPack({
  contract: contractDraft,
  runtimeSummary,
});
const applyPlan = createWorkflowProApplyPlan({
  contract: contractDraft,
  currentRuntimeLite: undefined,
});
const proposalDiff = createWorkflowProProposalDiff({
  applyPlan,
  currentRuntimeLite: undefined,
});
const fileNodeContract = createWorkflowProFileNodeContract();
const importReview = parseWorkflowProContractImportText({
  sourceName: "workflow.json",
  text: JSON.stringify(contractDraft),
});

function renderWorkflowProSurface(
  overrides: Partial<WorkflowProSurfaceProps> = {},
) {
  return renderToStaticMarkup(
    <WorkflowProSurface
      agentCount={4}
      applyPlan={applyPlan}
      brainContext={brainContext}
      contractDraft={contractDraft}
      fileNodeContract={fileNodeContract}
      generatedArtifactCount={2}
      importReview={null}
      inventory={inventory}
      onApplyPlan={vi.fn()}
      onClearImportedContract={vi.fn()}
      onExportContract={vi.fn()}
      onImportContractText={vi.fn()}
      onOpenGraph={vi.fn()}
      onOpenPanels={vi.fn()}
      proposalDiff={proposalDiff}
      runtimeSummary={runtimeSummary}
      runtimeEdgeCount={1}
      runtimeNodeCount={3}
      workspaceName="NEXUS // TEST"
      {...overrides}
    />,
  );
}

describe("WorkflowProSurface", () => {
  it("renders the Workflow Pro skeleton with contract and brain landmarks", () => {
    const html = renderWorkflowProSurface();

    expect(html).toContain("Workflow Pro");
    expect(html).toContain("NEXUS // TEST");
    expect(html).toContain("Active Cockpit Bay");
    expect(html).toContain("Foundation gate");
    expect(html).toContain("01 Load contract");
    expect(html).toContain("02 Import review");
    expect(html).toContain("03 Apply preview");
    expect(html).toContain("nexus.workflow.v1");
    expect(html).toContain("Workflow Brain");
    expect(html).toContain("Evidence Timeline");
    expect(html).toContain("Apply Gate");
    expect(html).toContain("Apply Plan");
    expect(html).toContain("Proposal Diff");
    expect(html).toContain("Foundation Benchmark JSON");
    expect(html).toContain("baseline-linear");
    expect(html).toContain("llm-to-image");
    expect(html).toContain("image-reverse-fanout");
    expect(html).toContain("Contract Draft");
    expect(html).toContain("valid");
    expect(html).toContain("Export Contract");
    expect(html).toContain("Import Contract");
    expect(html).toContain("Apply Preview");
    expect(html).toContain("Brain Context");
    expect(html).toContain("File Pipeline");
    expect(html).toContain("nexus-attachment-noop-compiler-v1");
    expect(html).toContain("input.text");
    expect(html).toContain("node.file");
  });

  it("exposes explicit navigation controls back to Graph and Panels", () => {
    const html = renderWorkflowProSurface({
      agentCount: 0,
      generatedArtifactCount: 0,
      runtimeEdgeCount: 0,
      runtimeNodeCount: 0,
      workspaceName: undefined,
    });

    expect(html).toContain('aria-label="Open executable Graph workspace"');
    expect(html).toContain('aria-label="Open agent Panels workspace"');
    expect(html).toContain('aria-label="Export Workflow Pro contract"');
    expect(html).toContain('aria-label="Import Workflow Pro contract"');
    expect(html).toContain('aria-label="Workflow Pro JSON paste input"');
    expect(html).toContain('aria-label="Import pasted Workflow Pro JSON contract"');
    expect(html).toContain('aria-label="Apply Workflow Pro preview to Graph"');
  });

  it("renders a compact import status band when a contract review exists", () => {
    const html = renderWorkflowProSurface({
      importReview,
    });

    expect(html).toContain('aria-label="Workflow Pro import status"');
    expect(html).toContain("Import accepted");
    expect(html).toContain("Ready to apply preview");
    expect(html).toContain("workflow.json");
  });

  it("renders every cockpit mode with its dedicated operational details", () => {
    const modeExpectations: Array<{
      expectedText: string[];
      mode: WorkflowProMode;
    }> = [
      {
        expectedText: ["Foundation gate", "Workflow intent", "Apply safety"],
        mode: "Design",
      },
      {
        expectedText: [
          "System brief",
          "Required output",
          "Missing capability signal",
        ],
        mode: "Brain",
      },
      {
        expectedText: [
          "Run ledger",
          "Node status counts",
          "Last error",
          "Evidence gate summary",
          "Foundation 30/30",
          "Account matrix source guard",
          "preview green",
          "R92 deployed a clean protected preview",
          "Generated image route guard",
          "protected",
          "R91 makes /api/image-gen a formal protected production route",
          "Account matrix screen run",
          "harness ready",
          "Current score is 0/100 pending",
          "Preview ready gaps",
          "run owner/editor/viewer/new-account screen matrix",
          "verify non-owner generated media download",
        ],
        mode: "Evidence",
      },
      {
        expectedText: [
          "Proposal review queue",
          "No pending review",
          "Brain proposal intake",
          "Workflow Brain proposal JSON paste input",
          "Validate Brain Proposal",
          "Import optimized workflow",
          "Editing after validation locks import until",
        ],
        mode: "Proposal Diff",
      },
      {
        expectedText: [
          "File pipeline path",
          "Compiled artifact",
          "ContextPacket attachments",
        ],
        mode: "Files",
      },
      {
        expectedText: [
          "Capability registry",
          "Node capabilities",
          "Compiler capabilities",
          "Artifact policies",
          "compiler.file.transform",
        ],
        mode: "Settings",
      },
    ];

    for (const { expectedText, mode } of modeExpectations) {
      const html = renderWorkflowProSurface({ initialMode: mode });

      expect(html).toContain(`Open Workflow Pro ${mode} bay`);
      expect(html).toContain(mode);

      for (const text of expectedText) {
        expect(html).toContain(text);
      }
    }
  });

  it("renders accepted import review state without applying it to Graph", () => {
    const html = renderWorkflowProSurface({
      agentCount: 0,
      generatedArtifactCount: 0,
      importReview,
      runtimeEdgeCount: 0,
      runtimeNodeCount: 0,
      workspaceName: undefined,
    });

    expect(html).toContain("Import Review");
    expect(html).toContain("workflow.json");
    expect(html).toContain("Clear Import");
    expect(html).toContain("Graph is still unchanged");
  });
});
