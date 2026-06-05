import type { WorkflowProContractDraft } from "./workflow-contract";
import { validateWorkflowProContractDraft } from "./workflow-contract-validator";

export type WorkflowProBrainReviewProposal = {
  analysis: string;
  missingCapabilities: string[];
  optimizedWorkflow: WorkflowProContractDraft | null;
  questionsForSean: string[];
  schema: "nexus.workflowPro.brainReviewProposal.v1";
  source?: {
    createdAt?: string;
    model?: string;
  };
};

export type WorkflowProBrainReviewProposalIssue = {
  message: string;
  path: string;
};

export type WorkflowProBrainReviewProposalValidationResult = {
  errors: WorkflowProBrainReviewProposalIssue[];
  ok: boolean;
  proposal: WorkflowProBrainReviewProposal | null;
  schema: "nexus.workflowPro.brainReviewProposal.validation.v1";
  warnings: WorkflowProBrainReviewProposalIssue[];
};

export function validateWorkflowProBrainReviewProposal(
  input: unknown,
): WorkflowProBrainReviewProposalValidationResult {
  const errors: WorkflowProBrainReviewProposalIssue[] = [];
  const warnings: WorkflowProBrainReviewProposalIssue[] = [];

  if (!isRecord(input)) {
    return createResult({
      errors: [{ message: "Proposal must be an object.", path: "$" }],
      proposal: null,
      warnings,
    });
  }

  if (input.schema !== "nexus.workflowPro.brainReviewProposal.v1") {
    errors.push({
      message: "schema must be nexus.workflowPro.brainReviewProposal.v1.",
      path: "$.schema",
    });
  }

  if (!isNonEmptyString(input.analysis)) {
    errors.push({
      message: "analysis must be a non-empty string.",
      path: "$.analysis",
    });
  }

  if (!isStringArray(input.questionsForSean)) {
    errors.push({
      message: "questionsForSean must be an array of strings.",
      path: "$.questionsForSean",
    });
  }

  if (!isStringArray(input.missingCapabilities)) {
    errors.push({
      message: "missingCapabilities must be an array of strings.",
      path: "$.missingCapabilities",
    });
  }

  if (input.optimizedWorkflow !== null && !isRecord(input.optimizedWorkflow)) {
    errors.push({
      message: "optimizedWorkflow must be null or a nexus.workflow.v1 object.",
      path: "$.optimizedWorkflow",
    });
  }

  if (isRecord(input.optimizedWorkflow)) {
    if (input.optimizedWorkflow.schema !== "nexus.workflow.v1") {
      errors.push({
        message: "optimizedWorkflow.schema must be nexus.workflow.v1.",
        path: "$.optimizedWorkflow.schema",
      });
    } else {
      const workflowValidation = validateWorkflowProContractDraft(
        input.optimizedWorkflow as WorkflowProContractDraft,
      );

      for (const error of workflowValidation.errors) {
        errors.push({
          message: error.message,
          path: `$.optimizedWorkflow.${error.path}`,
        });
      }

      for (const warning of workflowValidation.warnings) {
        warnings.push({
          message: warning.message,
          path: `$.optimizedWorkflow.${warning.path}`,
        });
      }
    }
  }

  if (isRecord(input.source)) {
    if (input.source.model !== undefined && !isNonEmptyString(input.source.model)) {
      errors.push({
        message: "source.model must be a non-empty string when provided.",
        path: "$.source.model",
      });
    }

    if (
      input.source.createdAt !== undefined &&
      !isNonEmptyString(input.source.createdAt)
    ) {
      errors.push({
        message: "source.createdAt must be a non-empty string when provided.",
        path: "$.source.createdAt",
      });
    }
  } else if (input.source !== undefined) {
    errors.push({
      message: "source must be an object when provided.",
      path: "$.source",
    });
  }

  const proposal =
    errors.length === 0
      ? (input as WorkflowProBrainReviewProposal)
      : null;

  return createResult({ errors, proposal, warnings });
}

export function parseWorkflowProBrainReviewProposalText({
  text,
}: {
  text: string;
}): WorkflowProBrainReviewProposalValidationResult {
  try {
    return validateWorkflowProBrainReviewProposal(JSON.parse(text));
  } catch (error) {
    return createResult({
      errors: [
        {
          message: error instanceof Error ? error.message : "Invalid JSON.",
          path: "$",
        },
      ],
      proposal: null,
      warnings: [],
    });
  }
}

function createResult({
  errors,
  proposal,
  warnings,
}: {
  errors: WorkflowProBrainReviewProposalIssue[];
  proposal: WorkflowProBrainReviewProposal | null;
  warnings: WorkflowProBrainReviewProposalIssue[];
}): WorkflowProBrainReviewProposalValidationResult {
  return {
    errors,
    ok: errors.length === 0,
    proposal,
    schema: "nexus.workflowPro.brainReviewProposal.validation.v1",
    warnings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
