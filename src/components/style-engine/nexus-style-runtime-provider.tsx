"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createNexusStylePreviewControllerV1,
  type NexusStylePreviewPatchV1,
  type NexusStyleVariablePreviewSessionV1,
} from "@/lib/style-engine";

type NexusStyleRuntimePreviewResultV1 =
  | {
      accepted: true;
      session: NexusStyleVariablePreviewSessionV1;
    }
  | {
      accepted: false;
      reasonCode: "style.runtime.targetUnavailable";
    };

type NexusStyleRuntimeContextValueV1 = {
  activePreview: NexusStyleVariablePreviewSessionV1 | null;
  clearPreview(): void;
  previewPatch(patch: NexusStylePreviewPatchV1): NexusStyleRuntimePreviewResultV1;
  revertPreview(previewId?: string): void;
};

const NexusStyleRuntimeContext =
  createContext<NexusStyleRuntimeContextValueV1 | null>(null);

export function NexusStyleRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ReturnType<
    typeof createNexusStylePreviewControllerV1
  > | null>(null);
  const [activePreview, setActivePreview] =
    useState<NexusStyleVariablePreviewSessionV1 | null>(null);

  const getController = useCallback(() => {
    if (!targetRef.current) {
      return null;
    }

    controllerRef.current ??= createNexusStylePreviewControllerV1(
      targetRef.current,
    );

    return controllerRef.current;
  }, []);

  const previewPatch = useCallback(
    (patch: NexusStylePreviewPatchV1): NexusStyleRuntimePreviewResultV1 => {
      const controller = getController();

      if (!controller) {
        return {
          accepted: false,
          reasonCode: "style.runtime.targetUnavailable",
        };
      }

      const session = controller.preview(patch);

      setActivePreview(session);

      return {
        accepted: true,
        session,
      };
    },
    [getController],
  );

  const revertPreview = useCallback(
    (previewId?: string) => {
      const controller = getController();

      if (!controller) {
        return;
      }

      const result = controller.revert(previewId);

      if (result.reverted) {
        setActivePreview(null);
      }
    },
    [getController],
  );

  const clearPreview = useCallback(() => {
    const controller = getController();

    if (!controller) {
      return;
    }

    controller.clearAll();
    setActivePreview(null);
  }, [getController]);

  const value = useMemo<NexusStyleRuntimeContextValueV1>(
    () => ({
      activePreview,
      clearPreview,
      previewPatch,
      revertPreview,
    }),
    [activePreview, clearPreview, previewPatch, revertPreview],
  );

  return (
    <NexusStyleRuntimeContext.Provider value={value}>
      <div
        ref={targetRef}
        className="contents"
        data-nexus-style-runtime="v1"
      >
        {children}
      </div>
    </NexusStyleRuntimeContext.Provider>
  );
}

export function useNexusStyleRuntimeV1() {
  const context = useContext(NexusStyleRuntimeContext);

  if (!context) {
    throw new Error(
      "useNexusStyleRuntimeV1 must be used inside NexusStyleRuntimeProvider.",
    );
  }

  return context;
}
