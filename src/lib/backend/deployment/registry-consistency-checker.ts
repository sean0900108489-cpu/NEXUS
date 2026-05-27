import { CAPABILITY_REGISTRY, TOOL_SLOT_REGISTRY } from "@/lib/nexus-registry";
import { toolExecutors } from "@/lib/tool-executors";

import type { DeploymentCheckResult } from "./deployment-types";

export const TOOL_EXECUTOR_ALIASES: Record<string, string> = {
  "mock-review-mesh": "mock.review-mesh",
};

export const TOOL_EXECUTOR_FALLBACKS: Record<string, string> = {
  "real-video-gen": "mock-video-gen",
};

export class RegistryConsistencyChecker {
  check(): DeploymentCheckResult {
    const executorIds = new Set(Object.keys(toolExecutors));
    const missingExecutors: string[] = [];
    const acceptedFallbacks: Array<{ slotId: string; fallbackExecutorId: string }> = [];
    const acceptedAliases: Array<{ registryId: string; executorId: string }> = [];
    const reservedSlots: string[] = [];

    for (const [slotId, slot] of Object.entries(TOOL_SLOT_REGISTRY)) {
      if (executorIds.has(slotId)) {
        continue;
      }

      const fallback = TOOL_EXECUTOR_FALLBACKS[slotId];

      if (fallback && executorIds.has(fallback)) {
        acceptedFallbacks.push({
          fallbackExecutorId: fallback,
          slotId,
        });
        continue;
      }

      if (slot.state === "not-implemented" || slot.state === "planned") {
        reservedSlots.push(slotId);
        continue;
      }

      missingExecutors.push(slotId);
    }

    for (const [registryId, executorId] of Object.entries(TOOL_EXECUTOR_ALIASES)) {
      if (executorIds.has(executorId) && registryReferencesToolSlot(registryId)) {
        acceptedAliases.push({ executorId, registryId });
      } else {
        missingExecutors.push(registryId);
      }
    }

    const orphanExecutors = [...executorIds].filter(
      (executorId) =>
        !TOOL_SLOT_REGISTRY[executorId] &&
        !Object.values(TOOL_EXECUTOR_ALIASES).includes(executorId) &&
        !Object.values(TOOL_EXECUTOR_FALLBACKS).includes(executorId),
    );
    const status =
      missingExecutors.length > 0 || orphanExecutors.length > 0
        ? "failed"
        : reservedSlots.length > 0
          ? "warning"
          : "passed";

    return {
      details: {
        acceptedAliases,
        acceptedFallbacks,
        missingExecutors,
        orphanExecutors,
        reservedSlots,
      },
      name: "registry_consistency",
      status,
      summary:
        status === "failed"
          ? "Registry and runtime executor map contain undeclared mismatches."
          : "Registry and runtime executor map are consistent with declared aliases and fallbacks.",
    };
  }
}

function registryReferencesToolSlot(slotId: string) {
  return Object.values(CAPABILITY_REGISTRY).some((entry) =>
    entry.toolSlots.includes(slotId),
  );
}
