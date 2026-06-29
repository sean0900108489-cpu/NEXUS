"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  FloatingAppProps,
  FloatingWebAppManifest,
} from "@/runtime/floating/registry/floating-app-types";
import { nexusApiClient } from "@/lib/api/nexus-api-client";
import { useNexusStore } from "@/store/nexus-store";
import {
  buildFloatingWebAppApiBridgeResponse,
  parseFloatingWebAppApiBridgeRequestEvent,
} from "./floating-web-app-api-bridge";
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
  const currentUser = useNexusStore((state) => state.authVault.user);
  const contextBridge = useMemo(
    () =>
      buildFloatingWebAppContextBridgeMessage({
        manifest,
        user: currentUser
          ? {
              email: currentUser.email ?? null,
              id: currentUser.id,
            }
          : null,
        window,
      }),
    [currentUser, manifest, window],
  );
  const sendContextBridge = useCallback(() => {
    postFloatingWebAppContextBridgeMessage(
      iframeRef.current?.contentWindow,
      contextBridge,
    );
  }, [contextBridge]);
  const sendApiBridgeResponse = useCallback((message: unknown, targetOrigin: string) => {
    iframeRef.current?.contentWindow?.postMessage(message, targetOrigin);
  }, []);
  const handleApiBridgeMessage = useCallback(
    async (event: MessageEvent) => {
      const request = parseFloatingWebAppApiBridgeRequestEvent(event, manifest);
      if (!request) return;

      const requestId = request.payload.requestId;
      const options = {
        userId: currentUser?.id,
        workspaceId: window.workspaceId,
      };

      try {
        const data =
          request.payload.action === "community-posts:list"
            ? await nexusApiClient.get("/api/community/posts", options)
            : await nexusApiClient.post(
                "/api/community/posts",
                {
                  ...(isRecord(request.payload.body) ? request.payload.body : {}),
                  workspaceId:
                    isRecord(request.payload.body) &&
                    typeof request.payload.body.workspaceId === "string"
                      ? request.payload.body.workspaceId
                      : window.workspaceId,
                },
                options,
              );

        sendApiBridgeResponse(
          buildFloatingWebAppApiBridgeResponse({ data, requestId }),
          event.origin,
        );
      } catch (error) {
        sendApiBridgeResponse(
          buildFloatingWebAppApiBridgeResponse({ error, requestId }),
          event.origin,
        );
      }
    },
    [currentUser?.id, manifest, sendApiBridgeResponse, window.workspaceId],
  );

  useEffect(() => {
    setTitle(manifest.title);
  }, [manifest.title, setTitle]);

  useEffect(() => {
    if (!manifest.bridge.apiBridge) return;

    globalThis.window.addEventListener("message", handleApiBridgeMessage);

    return () => {
      globalThis.window.removeEventListener("message", handleApiBridgeMessage);
    };
  }, [handleApiBridgeMessage, manifest.bridge.apiBridge]);

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
      data-bridge-user-context={String(Boolean(manifest.bridge.userContext))}
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
