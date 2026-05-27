import type { ToolRiskLevel } from "@/lib/nexus-types";
import {
  CAPABILITY_REGISTRY,
  TOOL_SLOT_REGISTRY,
  type ToolSlotRegistryEntry,
} from "@/lib/nexus-registry";
import { toolExecutors, type ToolExecutor } from "@/lib/tool-executors";
import {
  TOOL_EXECUTOR_ALIASES,
  TOOL_EXECUTOR_FALLBACKS,
} from "@/lib/backend/deployment/registry-consistency-checker";

import { ApiError } from "../api/api-errors";

export type ToolRegistryResolution = {
  requestedToolId: string;
  registryToolId: string;
  executorId: string;
  executor: ToolExecutor;
  slot?: ToolSlotRegistryEntry;
  riskLevel: ToolRiskLevel;
  requiresMaterializationHook: boolean;
};

const EXECUTOR_TO_REGISTRY_ALIAS = Object.fromEntries(
  Object.entries(TOOL_EXECUTOR_ALIASES).map(([registryId, executorId]) => [
    executorId,
    registryId,
  ]),
);

export class ToolRegistryValidator {
  resolve(toolId: string): ToolRegistryResolution {
    const requestedToolId = normalizeToolId(toolId);
    const aliasExecutorId = TOOL_EXECUTOR_ALIASES[requestedToolId];
    const fallbackExecutorId = TOOL_EXECUTOR_FALLBACKS[requestedToolId];
    const directSlot = TOOL_SLOT_REGISTRY[requestedToolId];
    const directExecutor = toolExecutors[requestedToolId];
    const executorId =
      aliasExecutorId ??
      fallbackExecutorId ??
      (directExecutor ? requestedToolId : undefined);
    const registryToolId =
      aliasExecutorId
        ? requestedToolId
        : fallbackExecutorId
          ? requestedToolId
          : EXECUTOR_TO_REGISTRY_ALIAS[requestedToolId] ?? requestedToolId;
    const slot = directSlot ?? TOOL_SLOT_REGISTRY[registryToolId];

    if (!executorId || !toolExecutors[executorId]) {
      if (slot && ["planned", "not-implemented"].includes(slot.state)) {
        throw new ApiError(
          "TOOL_NOT_FOUND",
          "Tool is registered but does not have an executable V7 adapter.",
          404,
          {
            registryToolId,
            state: slot.state,
          },
        );
      }

      throw new ApiError("TOOL_NOT_FOUND", "Tool was not found.", 404, {
        toolId: requestedToolId,
      });
    }

    if (!slot && !capabilityReferencesTool(registryToolId)) {
      throw new ApiError(
        "TOOL_NOT_FOUND",
        "Tool executor is not declared in NEXUS_REGISTRY aliases or slots.",
        404,
        {
          executorId,
          registryToolId,
        },
      );
    }

    return {
      executor: toolExecutors[executorId],
      executorId,
      registryToolId,
      requestedToolId,
      requiresMaterializationHook: ["image", "video"].includes(slot?.capability ?? ""),
      riskLevel: inferRiskLevel(slot, executorId),
      slot,
    };
  }
}

function inferRiskLevel(
  slot: ToolSlotRegistryEntry | undefined,
  executorId: string,
): ToolRiskLevel {
  if (slot?.executorType === "local-fs" || slot?.executorType === "db-query") {
    return "high";
  }

  if (executorId.startsWith("real-") && ["image", "video"].includes(slot?.capability ?? "")) {
    return "high";
  }

  if (executorId.startsWith("mock-") || executorId.startsWith("mock.")) {
    return "low";
  }

  return "medium";
}

function capabilityReferencesTool(toolId: string) {
  return Object.values(CAPABILITY_REGISTRY).some((entry) =>
    entry.toolSlots.includes(toolId),
  );
}

function normalizeToolId(toolId: string) {
  const normalized = toolId.trim();

  if (!normalized) {
    throw new ApiError("VALIDATION_FAILED", "toolId is required.", 400, {
      issues: [
        {
          code: "required",
          message: "toolId is required.",
          path: ["toolId"],
        },
      ],
    });
  }

  return normalized;
}
