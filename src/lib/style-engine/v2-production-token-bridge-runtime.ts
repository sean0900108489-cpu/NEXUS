import type { NexusStyleVariableTargetV1 } from "./runtime-target";
import type { NexusProductionTokenBridgePlanV1 } from "./v2-production-token-bridge";

export type NexusProductionTokenBridgePreviewSessionV1 = {
  previewId: string;
  bridgePlanId: string;
  sourceRenderPlanId: string;
  skinPackId: string;
  manifestId: string;
  appliedVariables: Record<string, string>;
  previousVariables: Record<string, string | undefined>;
};

export type NexusProductionTokenBridgePreviewResultV1 =
  | {
      accepted: true;
      changed: boolean;
      session: NexusProductionTokenBridgePreviewSessionV1;
    }
  | {
      accepted: false;
      reasonCode:
        | "productionTokenBridge.targetUnavailable"
        | "productionTokenBridge.noVariables";
    };

export type NexusProductionTokenBridgeRevertResultV1 =
  | {
      reverted: true;
    }
  | {
      reverted: false;
      reasonCode: "productionTokenBridge.targetUnavailable";
    };

export function previewNexusProductionTokenBridgePlanOnTargetV1({
  bridgePlan,
  currentSession,
  target,
}: {
  bridgePlan: NexusProductionTokenBridgePlanV1;
  currentSession?: NexusProductionTokenBridgePreviewSessionV1 | null;
  target: NexusStyleVariableTargetV1 | null | undefined;
}): NexusProductionTokenBridgePreviewResultV1 {
  if (!target) {
    return {
      accepted: false,
      reasonCode: "productionTokenBridge.targetUnavailable",
    };
  }

  const appliedVariables = sortStringRecord(bridgePlan.variables);

  if (Object.keys(appliedVariables).length === 0) {
    return {
      accepted: false,
      reasonCode: "productionTokenBridge.noVariables",
    };
  }

  if (currentSession?.bridgePlanId === bridgePlan.bridgePlanId) {
    return {
      accepted: true,
      changed: false,
      session: cloneBridgePreviewSession(currentSession),
    };
  }

  if (currentSession) {
    revertNexusProductionTokenBridgePreviewOnTargetV1({
      session: currentSession,
      target,
    });
  }

  const previousVariables: Record<string, string | undefined> = {};

  for (const [name, value] of Object.entries(appliedVariables)) {
    const previous = target.style.getPropertyValue(name);

    previousVariables[name] = previous.length > 0 ? previous : undefined;
    target.style.setProperty(name, value);
  }

  return {
    accepted: true,
    changed: true,
    session: {
      appliedVariables,
      bridgePlanId: bridgePlan.bridgePlanId,
      manifestId: bridgePlan.manifestId,
      previewId: `${bridgePlan.bridgePlanId}:injected-target-preview`,
      previousVariables: sortOptionalStringRecord(previousVariables),
      skinPackId: bridgePlan.skinPackId,
      sourceRenderPlanId: bridgePlan.sourceRenderPlanId,
    },
  };
}

export function revertNexusProductionTokenBridgePreviewOnTargetV1({
  session,
  target,
}: {
  session: NexusProductionTokenBridgePreviewSessionV1;
  target: NexusStyleVariableTargetV1 | null | undefined;
}): NexusProductionTokenBridgeRevertResultV1 {
  if (!target) {
    return {
      reasonCode: "productionTokenBridge.targetUnavailable",
      reverted: false,
    };
  }

  for (const [name, previous] of Object.entries(session.previousVariables)) {
    if (previous === undefined) {
      target.style.removeProperty(name);
    } else {
      target.style.setProperty(name, previous);
    }
  }

  return {
    reverted: true,
  };
}

function cloneBridgePreviewSession(
  session: NexusProductionTokenBridgePreviewSessionV1,
): NexusProductionTokenBridgePreviewSessionV1 {
  return {
    appliedVariables: { ...session.appliedVariables },
    bridgePlanId: session.bridgePlanId,
    manifestId: session.manifestId,
    previewId: session.previewId,
    previousVariables: { ...session.previousVariables },
    skinPackId: session.skinPackId,
    sourceRenderPlanId: session.sourceRenderPlanId,
  };
}

function sortStringRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sortOptionalStringRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}
