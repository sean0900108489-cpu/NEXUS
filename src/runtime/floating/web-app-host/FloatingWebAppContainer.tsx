"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  FloatingAppProps,
  FloatingWebAppManifest,
} from "@/runtime/floating/registry/floating-app-types";
import {
  buildFloatingWebAppContextBridgeMessage,
  postFloatingWebAppContextBridgeMessage,
} from "./floating-web-app-context-bridge";

export type FloatingWebAppContainerProps = FloatingAppProps & {
  manifest: FloatingWebAppManifest;
};

export function FloatingWebAppContainer({
  manifest,
  setTitle,
  window,
}: FloatingWebAppContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoadCount, setIframeLoadCount] = useState(0);
  const contextBridge = useMemo(
    () =>
      buildFloatingWebAppContextBridgeMessage({
        manifest,
        window,
      }),
    [manifest, window],
  );
  const sendContextBridge = useCallback(() => {
    postFloatingWebAppContextBridgeMessage(
      iframeRef.current?.contentWindow,
      contextBridge,
    );
  }, [contextBridge]);

  useEffect(() => {
    setTitle(manifest.title);
  }, [manifest.title, setTitle]);

  useEffect(() => {
    if (iframeLoadCount === 0) return;
    sendContextBridge();
  }, [iframeLoadCount, sendContextBridge]);

  return (
    <div
      className="flex h-full min-h-0 bg-black"
      data-bridge-api={String(manifest.bridge.apiBridge)}
      data-bridge-auth={String(manifest.bridge.authBridge)}
      data-bridge-command={String(manifest.bridge.commandBridge)}
      data-bridge-storage={String(manifest.bridge.storageBridge)}
      data-bridge-workspace-context={String(manifest.bridge.workspaceContext)}
      data-context-bridge-origin={contextBridge?.targetOrigin}
      data-floating-web-app-host={manifest.mode}
      data-floating-web-app-id={manifest.id}
      data-floating-window-id={window.id}
    >
      <iframe
        ref={iframeRef}
        className="h-full w-full border-0 bg-white"
        loading="lazy"
        onLoad={() => setIframeLoadCount((current) => current + 1)}
        referrerPolicy="no-referrer"
        sandbox={manifest.sandbox.join(" ")}
        src={manifest.entry}
        title={manifest.title}
      />
    </div>
  );
}
