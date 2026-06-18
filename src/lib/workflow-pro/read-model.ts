/**
 * NEXUS Workflow Pro Read-Model
 *
 * Pure read-model derivation from Workflow Runtime Lite state.
 * ZERO mutations — all computations are pure derivations.
 *
 * Phase 2B PR 2 — Workflow Pro Read-Model Extraction.
 */

import { useMemo } from "react";
import { createWorkflowProCapabilityInventory, summarizeWorkflowProRuntime } from "@/lib/workflow-pro/capability-inventory";
import { createWorkflowBrainContextPack } from "@/lib/workflow-pro/brain-context";
import { createWorkflowProFileNodeContract } from "@/lib/workflow-pro/file-node-contract";
import { createWorkflowProApplyPlan } from "@/lib/workflow-pro/workflow-contract-apply-plan";
import { createWorkflowProRuntimeEvidenceReport } from "@/lib/workflow-pro/runtime-evidence";
import { createWorkflowProRunHistoryGroupsReport } from "@/lib/workflow-pro/run-history-groups";
import { createWorkflowProContractDraftFromRuntimeLite } from "@/lib/workflow-pro/workflow-contract";
import { createWorkflowProProposalDiff } from "@/lib/workflow-pro/proposal-diff";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

// ── Inputs ───────────────────────────────────

export interface WorkflowProReadModelInputs {
  activeWorkspaceId: string;
  workspaceName: string;
  workflowRuntimeLite: WorkflowRuntimeLiteState | undefined;
  workflowProImportReview: {
    status: string;
    contract: unknown;
  } | null;
}

// ── Outputs ──────────────────────────────────

export interface WorkflowProReadModel {
  capabilityInventory: ReturnType<typeof createWorkflowProCapabilityInventory>;
  fileNodeContract: ReturnType<typeof createWorkflowProFileNodeContract>;
  runtimeSummary: ReturnType<typeof summarizeWorkflowProRuntime>;
  runtimeEvidence: ReturnType<typeof createWorkflowProRuntimeEvidenceReport>;
  runHistoryGroups: ReturnType<typeof createWorkflowProRunHistoryGroupsReport>;
  contractDraft: ReturnType<typeof createWorkflowProContractDraftFromRuntimeLite>;
  activeContract: ReturnType<typeof createWorkflowProContractDraftFromRuntimeLite>;
  brainContext: ReturnType<typeof createWorkflowBrainContextPack>;
  applyPlan: ReturnType<typeof createWorkflowProApplyPlan>;
  proposalDiff: ReturnType<typeof createWorkflowProProposalDiff>;
}

// ── Hook ─────────────────────────────────────

/**
 * Pure read-model hook — derives all Workflow Pro view-model values
 * from workspace/import-review inputs. Zero mutations.
 */
export function useWorkflowProReadModel(
  inputs: WorkflowProReadModelInputs,
): WorkflowProReadModel {
  const { activeWorkspaceId, workspaceName, workflowRuntimeLite, workflowProImportReview } = inputs;

  // 1. Static computations (empty deps)
  const capabilityInventory = useMemo(
    () => createWorkflowProCapabilityInventory(),
    [],
  );

  const fileNodeContract = useMemo(
    () => createWorkflowProFileNodeContract(),
    [],
  );

  // 2. Runtime-dependent computations
  const runtimeSummary = useMemo(
    () => summarizeWorkflowProRuntime(workflowRuntimeLite),
    [workflowRuntimeLite],
  );

  const runtimeEvidence = useMemo(
    () => createWorkflowProRuntimeEvidenceReport(workflowRuntimeLite),
    [workflowRuntimeLite],
  );

  const runHistoryGroups = useMemo(
    () => createWorkflowProRunHistoryGroupsReport(workflowRuntimeLite),
    [workflowRuntimeLite],
  );

  // 3. Contract draft (depends on capability inventory + runtime)
  const contractDraft = useMemo(
    () =>
      createWorkflowProContractDraftFromRuntimeLite({
        inventory: capabilityInventory,
        runtimeLite: workflowRuntimeLite,
        workspaceId: activeWorkspaceId,
        workspaceName: workspaceName || "NEXUS // AI OPS",
      }),
    [activeWorkspaceId, capabilityInventory, workflowRuntimeLite, workspaceName],
  );

  // 4. Active contract (imported or live draft)
  const activeContract =
    workflowProImportReview?.status === "accepted"
      ? (workflowProImportReview.contract as typeof contractDraft)
      : contractDraft;

  // 5. Derived from active contract
  const brainContext = useMemo(
    () =>
      createWorkflowBrainContextPack({
        contract: activeContract,
        runtimeSummary,
      }),
    [activeContract, runtimeSummary],
  );

  const applyPlan = useMemo(
    () =>
      createWorkflowProApplyPlan({
        contract: activeContract,
        currentRuntimeLite: workflowRuntimeLite,
      }),
    [activeContract, workflowRuntimeLite],
  );

  const proposalDiff = useMemo(
    () =>
      createWorkflowProProposalDiff({
        applyPlan,
        currentRuntimeLite: workflowRuntimeLite,
      }),
    [applyPlan, workflowRuntimeLite],
  );

  return {
    capabilityInventory,
    fileNodeContract,
    runtimeSummary,
    runtimeEvidence,
    runHistoryGroups,
    contractDraft,
    activeContract,
    brainContext,
    applyPlan,
    proposalDiff,
  };
}
