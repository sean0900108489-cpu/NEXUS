import type { NexusStylePreviewPatchV1 } from "./preview";
import {
  revertNexusStyleVariablePreviewV1,
  startNexusStyleVariablePreviewV1,
  type NexusStyleVariablePreviewSessionV1,
  type NexusStyleVariableTargetV1,
} from "./runtime-target";

export type NexusStylePreviewControllerV1 = {
  preview(patch: NexusStylePreviewPatchV1): NexusStyleVariablePreviewSessionV1;
  revert(previewId?: string): NexusStylePreviewControllerResultV1;
  clearAll(): NexusStylePreviewControllerResultV1;
  getActivePreview(): NexusStyleVariablePreviewSessionV1 | null;
};

export type NexusStylePreviewControllerResultV1 =
  | {
      reverted: true;
    }
  | {
      reverted: false;
      reasonCode:
        | "style.preview.noActiveSession"
        | "style.preview.sessionMismatch";
    };

export function createNexusStylePreviewControllerV1(
  target: NexusStyleVariableTargetV1,
): NexusStylePreviewControllerV1 {
  let activeSession: NexusStyleVariablePreviewSessionV1 | null = null;

  function revertActiveSession(): NexusStylePreviewControllerResultV1 {
    if (!activeSession) {
      return {
        reasonCode: "style.preview.noActiveSession",
        reverted: false,
      };
    }

    revertNexusStyleVariablePreviewV1(target, activeSession);
    activeSession = null;

    return {
      reverted: true,
    };
  }

  return {
    clearAll: revertActiveSession,
    getActivePreview: () =>
      activeSession ? clonePreviewSession(activeSession) : null,
    preview: (patch) => {
      if (activeSession) {
        revertNexusStyleVariablePreviewV1(target, activeSession);
      }

      activeSession = startNexusStyleVariablePreviewV1(target, patch);

      return clonePreviewSession(activeSession);
    },
    revert: (previewId) => {
      if (!activeSession) {
        return {
          reasonCode: "style.preview.noActiveSession",
          reverted: false,
        };
      }

      if (previewId !== undefined && previewId !== activeSession.previewId) {
        return {
          reasonCode: "style.preview.sessionMismatch",
          reverted: false,
        };
      }

      return revertActiveSession();
    },
  };
}

function clonePreviewSession(
  session: NexusStyleVariablePreviewSessionV1,
): NexusStyleVariablePreviewSessionV1 {
  return {
    appliedVariables: { ...session.appliedVariables },
    manifestChecksum: session.manifestChecksum,
    manifestId: session.manifestId,
    previewId: session.previewId,
    previousVariables: { ...session.previousVariables },
  };
}
