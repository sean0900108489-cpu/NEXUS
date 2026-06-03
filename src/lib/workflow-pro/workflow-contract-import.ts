import type { WorkflowProContractDraft } from "./workflow-contract";
import {
  assertWorkflowProContractDraft,
  validateWorkflowProContractDraft,
  type WorkflowProContractValidationResult,
} from "./workflow-contract-validator";

export type WorkflowProContractImportReview =
  | {
      contract: WorkflowProContractDraft;
      error: null;
      receivedAt: string;
      schema: "nexus.workflowPro.importReview.v1";
      sourceName: string;
      status: "accepted";
      validation: WorkflowProContractValidationResult;
    }
  | {
      contract: null;
      error: string;
      receivedAt: string;
      schema: "nexus.workflowPro.importReview.v1";
      sourceName: string;
      status: "rejected";
      validation: WorkflowProContractValidationResult;
    };

export function parseWorkflowProContractImportText({
  receivedAt = new Date().toISOString(),
  sourceName,
  text,
}: {
  receivedAt?: string;
  sourceName: string;
  text: string;
}): WorkflowProContractImportReview {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      contract: null,
      error: error instanceof Error ? error.message : "Invalid JSON.",
      receivedAt,
      schema: "nexus.workflowPro.importReview.v1",
      sourceName,
      status: "rejected",
      validation: validateWorkflowProContractDraft(null),
    };
  }

  const contractPayload = extractContractPayload(parsed);
  const validation = validateWorkflowProContractDraft(contractPayload);

  if (!validation.ok) {
    return {
      contract: null,
      error: validation.errors[0]?.message ?? "Workflow contract validation failed.",
      receivedAt,
      schema: "nexus.workflowPro.importReview.v1",
      sourceName,
      status: "rejected",
      validation,
    };
  }

  assertWorkflowProContractDraft(contractPayload);

  return {
    contract: contractPayload,
    error: null,
    receivedAt,
    schema: "nexus.workflowPro.importReview.v1",
    sourceName,
    status: "accepted",
    validation,
  };
}

function extractContractPayload(value: unknown) {
  if (isRecord(value) && isRecord(value.contract)) {
    return value.contract;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
