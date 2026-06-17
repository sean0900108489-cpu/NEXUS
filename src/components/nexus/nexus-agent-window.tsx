"use client";

// =============================================================================
// nexus-agent-window.tsx — Agent 彈出視窗及其子元件
// 從 nexus-ops.tsx 第 3 輪拆出（v26ds2）
//   - AgentWindow, SandboxCanvas, MediaCanvas, MessageBubble, MediaArtifactPreview
//   - 工具函數: getLatestMediaArtifact, normalizeSandboxUrl
// =============================================================================

import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Download,
  ExternalLink,
  Fullscreen,
  Maximize2,
  Pencil,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";

import { AgentActionToolbar } from "@/components/nexus/nexus-chrome";
import { cx } from "@/components/nexus/nexus-utils";
import { DEFAULT_SANDBOX_CODE } from "@/lib/nexus-defaults";
import type {
  AgentCapabilityType,
  AgentLayout,
  AgentMediaArtifact,
  AgentMessage,
  AgentModelSettings,
  NexusAgent,
} from "@/lib/nexus-types";


type AgentHistoricalPage = {
  error?: string;
  hasMore: boolean;
  items: Array<{ message: AgentMessage }>;
  loading?: boolean;
  nextCursor?: string;
};
type AgentMessageRuntimeMeta = AgentMessage & {
  model?: string;
  reasoning?: string;
};
const Rnd = dynamic(() => import("react-rnd").then((module) => module.Rnd), {
  ssr: false,
});
import type { RndDragCallback, RndResizeCallback } from "react-rnd";

const AGENT_WINDOW_MIN_WIDTH = 390;
const AGENT_WINDOW_MIN_HEIGHT = 360;
const AGENT_WINDOW_COMPACT_MIN_WIDTH = 320;
const AGENT_WINDOW_COMPACT_MIN_HEIGHT = 300;
const AGENT_WINDOW_BOUNDS_MARGIN = 12;

type AgentWindowWorkspaceBounds = {
  width: number;
  height: number;
};

const FALLBACK_AGENT_WINDOW_WORKSPACE_BOUNDS: AgentWindowWorkspaceBounds = {
  width: 0,
  height: 0,
};

// ---------------------------------------------------------------------------
// 工具函數
// ---------------------------------------------------------------------------

/** 取得 agent 最新的 media artifact */
function getLatestMediaArtifact(agent: NexusAgent): AgentMediaArtifact | undefined {
  return [...agent.messages].reverse().find((message) => message.media)?.media;
}

/** 規範化 sandbox URL */
function normalizeSandboxUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function getCapabilityType(agent: NexusAgent): AgentCapabilityType {
  return agent.capabilities?.type ?? "chat";
}

function isMediaCapability(capabilityType: AgentCapabilityType): boolean {
  return capabilityType === "image" || capabilityType === "video";
}

function isSandboxCapability(capabilityType: AgentCapabilityType): boolean {
  return capabilityType === "sandbox";
}

function getAgentWindowEffectiveMinWidth(bounds: AgentWindowWorkspaceBounds | undefined) {
  if (!bounds || !Number.isFinite(bounds.width) || bounds.width <= 0) {
    return AGENT_WINDOW_MIN_WIDTH;
  }

  const availableWidth = Math.max(1, bounds.width - AGENT_WINDOW_BOUNDS_MARGIN * 2);

  return Math.min(
    AGENT_WINDOW_MIN_WIDTH,
    Math.min(
      availableWidth,
      Math.max(AGENT_WINDOW_COMPACT_MIN_WIDTH, availableWidth),
    ),
  );
}

function getAgentWindowEffectiveMinHeight(bounds: AgentWindowWorkspaceBounds | undefined) {
  if (!bounds || !Number.isFinite(bounds.height) || bounds.height <= 0) {
    return AGENT_WINDOW_MIN_HEIGHT;
  }

  const availableHeight = Math.max(1, bounds.height - AGENT_WINDOW_BOUNDS_MARGIN * 2);

  return Math.min(
    AGENT_WINDOW_MIN_HEIGHT,
    Math.min(
      availableHeight,
      Math.max(AGENT_WINDOW_COMPACT_MIN_HEIGHT, availableHeight),
    ),
  );
}

export function clampAgentWindowLayoutToBounds(
  layout: AgentLayout,
  bounds: AgentWindowWorkspaceBounds | undefined,
): AgentLayout {
  if (
    !bounds ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return layout;
  }

  const availableWidth = Math.max(1, bounds.width - AGENT_WINDOW_BOUNDS_MARGIN * 2);
  const availableHeight = Math.max(1, bounds.height - AGENT_WINDOW_BOUNDS_MARGIN * 2);
  const effectiveMinWidth = getAgentWindowEffectiveMinWidth(bounds);
  const effectiveMinHeight = getAgentWindowEffectiveMinHeight(bounds);
  const layoutRight = Math.max(layout.width, layout.x + layout.width);
  const layoutBottom = Math.max(layout.height, layout.y + layout.height);
  const widthScale = layoutRight > availableWidth ? availableWidth / layoutRight : 1;
  const heightScale = layoutBottom > availableHeight ? availableHeight / layoutBottom : 1;
  const scale = Math.min(1, widthScale, heightScale);
  const width = Math.min(
    Math.max(layout.width * scale, effectiveMinWidth),
    availableWidth,
  );
  const height = Math.min(
    Math.max(layout.height * scale, effectiveMinHeight),
    availableHeight,
  );
  const maxX = Math.max(
    AGENT_WINDOW_BOUNDS_MARGIN,
    bounds.width - width - AGENT_WINDOW_BOUNDS_MARGIN,
  );
  const maxY = Math.max(
    AGENT_WINDOW_BOUNDS_MARGIN,
    bounds.height - height - AGENT_WINDOW_BOUNDS_MARGIN,
  );

  return {
    ...layout,
    width,
    height,
    x: Math.max(AGENT_WINDOW_BOUNDS_MARGIN, Math.min(layout.x * scale, maxX)),
    y: Math.max(AGENT_WINDOW_BOUNDS_MARGIN, Math.min(layout.y * scale, maxY)),
  };
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  reasoningDetail,
}: {
  message: AgentMessage;
  reasoningDetail?: string;
}) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const runtimeMessage = message as AgentMessageRuntimeMeta;
  const hasReasoning = Boolean(runtimeMessage.reasoning || runtimeMessage.reasoningContent);

  return (
    <div
      className={cx(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
        <span>{message.role}</span>
        {runtimeMessage.model ? <span>{runtimeMessage.model}</span> : null}
      </div>
      {hasReasoning ? (
        <details className="w-full">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            Reasoning
          </summary>
          <div className="mt-1 whitespace-pre-wrap border border-white/10 bg-black/30 px-3 py-2 text-xs leading-5 text-neutral-300">
            {runtimeMessage.reasoning || runtimeMessage.reasoningContent}
          </div>
        </details>
      ) : null}
      {message.content ? (
        <div
          className={cx(
            "max-w-full whitespace-pre-wrap border px-3 py-2 text-xs leading-5",
            isTool
              ? "border-white/10 bg-white/[0.03] text-neutral-400"
              : isUser
                ? "border-neutral-300/25 bg-neutral-300/10 text-neutral-100"
                : "border-white/10 bg-black/30 text-neutral-100",
          )}
        >
          {message.content}
        </div>
      ) : null}
      {message.media ? (
        <MediaArtifactPreview artifact={message.media} presentation="message" />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaArtifactPreview
// ---------------------------------------------------------------------------

function MediaArtifactPreview({
  artifact,
  presentation = "canvas",
}: {
  artifact: AgentMediaArtifact;
  presentation?: "canvas" | "message";
}) {
  const messagePresentation = presentation === "message";

  return (
    <div
      className={cx(
        "relative w-full overflow-hidden",
        messagePresentation ? "border border-white/10" : "",
      )}
    >
      {artifact.type === "image" && artifact.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={artifact.prompt ?? "Generated media"}
            className="block w-full object-contain"
            draggable={false}
            src={artifact.url}
          />
          {artifact.prompt && messagePresentation ? (
            <div className="border-t border-white/10 bg-black/50 px-3 py-1.5 text-[10px] leading-4 text-neutral-400">
              {artifact.prompt}
            </div>
          ) : null}
        </>
      ) : artifact.type === "video" && artifact.url ? (
        <video
          className="block w-full"
          controls
          src={artifact.url}
          title={artifact.prompt ?? "Generated media"}
        />
      ) : (
        <div className="flex items-center gap-2 border border-dashed border-white/10 px-3 py-4 text-xs text-neutral-500">
          <Download className="h-4 w-4" />
          {artifact.type} artifact
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SandboxCanvas
// ---------------------------------------------------------------------------

function SandboxCanvas({
  agent,
  editorCollapsed,
  interactionLocked,
  onUpdateSandboxCode,
  onUpdateSandboxUrl,
}: {
  agent: NexusAgent;
  editorCollapsed: boolean;
  interactionLocked: boolean;
  onUpdateSandboxCode: (agentId: string, sandboxCode: string) => void;
  onUpdateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
}) {
  const [urlInput, setUrlInput] = useState(agent.sandboxUrl ?? "");
  const normalizedUrl = normalizeSandboxUrl(urlInput);
  const embeddableUrl = normalizedUrl
    ? (() => {
        try {
          const url = new URL(normalizedUrl);
          return url.href;
        } catch {
          return "";
        }
      })()
    : "";

  const handleUrlSubmit = useCallback(() => {
    if (normalizedUrl && normalizedUrl !== agent.sandboxUrl) {
      onUpdateSandboxUrl(agent.id, normalizedUrl);
    }
  }, [agent.id, agent.sandboxUrl, normalizedUrl, onUpdateSandboxUrl]);

  return (
    <div className="flex min-h-0 flex-1 gap-0">
      {!editorCollapsed ? (
        <div className="flex w-72 shrink-0 flex-col border-r border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
              Code
            </span>
          </div>
          <textarea
            className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 font-mono text-xs leading-5 text-neutral-200 outline-none placeholder:text-neutral-600"
            onChange={(event) =>
              onUpdateSandboxCode(agent.id, event.currentTarget.value)
            }
            placeholder="Write HTML here..."
            spellCheck={false}
            value={agent.sandboxCode ?? DEFAULT_SANDBOX_CODE}
          />
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {embeddableUrl ? (
          <iframe
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            src={embeddableUrl}
            title="Sandbox preview"
          />
        ) : (
          <iframe
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            srcDoc={agent.sandboxCode ?? DEFAULT_SANDBOX_CODE}
            title="Sandbox preview"
          />
        )}
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2">
          <input
            className="pointer-events-auto w-64 border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-[11px] text-neutral-200 outline-none backdrop-blur transition placeholder:text-neutral-600 focus:border-neutral-300/55"
            onBlur={handleUrlSubmit}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleUrlSubmit();
              }
            }}
            placeholder="https://..."
            spellCheck={false}
            value={urlInput}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaCanvas
// ---------------------------------------------------------------------------

function MediaCanvas({ agent }: { agent: NexusAgent }) {
  const latestArtifact = getLatestMediaArtifact(agent);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {latestArtifact ? (
        <MediaArtifactPreview artifact={latestArtifact} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          No media generated yet.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentWindow
// ---------------------------------------------------------------------------

export function AgentWindow({
  agent,
  selected,
  onFocus,
  onUpdateLayout,
  onMinimize,
  onToggleMaximize,
  onClose,
  onDuplicate,
  onClear,
  onOpenBranchInterface,
  onOpenVaultManager,
  onSaveArtifact,
  historicalPage,
  onStop,
  onUpdateSandboxCode,
  onUpdateSandboxUrl,
  workspaceBounds = FALLBACK_AGENT_WINDOW_WORKSPACE_BOUNDS,
}: {
  agent: NexusAgent;
  selected: boolean;
  onFocus: (agentId: string) => void;
  onUpdateLayout: (
    agentId: string,
    geometry: Partial<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  ) => void;
  onMinimize: (agentId: string) => void;
  onToggleMaximize: (agentId: string) => void;
  onClose: (agentId: string) => void;
  onDuplicate: (agentId: string) => void;
  onClear: (agentId: string) => void;
  onOpenBranchInterface: (agentId: string) => void;
  onOpenVaultManager: () => void;
  onSaveArtifact: (agentId: string, content: string) => void;
  historicalPage?: AgentHistoricalPage;
  onStop: (agentId: string) => void;
  onUpdateSandboxCode: (agentId: string, sandboxCode: string) => void;
  onUpdateSandboxUrl: (agentId: string, sandboxUrl: string) => void;
  workspaceBounds: AgentWindowWorkspaceBounds;
}) {
  const [sandboxEditorCollapsed, setSandboxEditorCollapsed] = useState(false);
  const [sandboxInteractionLocked, setSandboxInteractionLocked] = useState(false);
  const windowRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const capabilityType = getCapabilityType(agent);
  const isMediaAgent = isMediaCapability(capabilityType);
  const isSandboxAgent = isSandboxCapability(capabilityType);
  const windowInteractionLocked = isSandboxAgent && sandboxInteractionLocked;

  const renderedMessages = useMemo(() => {
    const activeIds = new Set(agent.messages.map((message) => message.id));
    const historical = (historicalPage?.items ?? [])
      .filter((record: { message: AgentMessage }) => !activeIds.has(record.message.id))
      .sort((left: { message: AgentMessage }, right: { message: AgentMessage }) =>
        left.message.createdAt.localeCompare(right.message.createdAt),
      )
      .map((record: { message: AgentMessage }) => record.message);
    return [...historical, ...agent.messages];
  }, [agent.messages, historicalPage?.items]);

  useEffect(() => {
    bodyRef.current?.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [agent.messages.length]);

  // Workspace bounds are provided by the parent NexusOps via workspaceBounds prop.
  // NexusOps owns a single ResizeObserver + 800ms interval, avoiding N+1 polling
  // where every AgentWindow independently measured the same .nexus-workspace node.
  const effectiveWorkspaceBounds =
    workspaceBounds.width > 0 && workspaceBounds.height > 0
      ? workspaceBounds
      : FALLBACK_AGENT_WINDOW_WORKSPACE_BOUNDS;
  const effectiveLayout = useMemo(
    () => clampAgentWindowLayoutToBounds(agent.layout, effectiveWorkspaceBounds),
    [agent.layout, effectiveWorkspaceBounds],
  );
  const effectiveMinWidth = getAgentWindowEffectiveMinWidth(effectiveWorkspaceBounds);
  const effectiveMinHeight = getAgentWindowEffectiveMinHeight(effectiveWorkspaceBounds);

  const onDragStop: RndDragCallback = useCallback(
    (_event, data) => {
      onUpdateLayout(agent.id, { x: data.x, y: data.y });
    },
    [agent.id, onUpdateLayout],
  );

  const onResizeStop: RndResizeCallback = useCallback(
    (_event, _direction, ref, _delta, position) => {
      onUpdateLayout(agent.id, {
        width: ref.offsetWidth,
        height: ref.offsetHeight,
        x: position.x,
        y: position.y,
      });
    },
    [agent.id, onUpdateLayout],
  );

  const agentGlowColor = `color-mix(in srgb, ${agent.accent} var(--agent-glow-intensity), transparent)`;
  const agentWindowBackground = isSandboxAgent
    ? "color-mix(in srgb, var(--bg-elevated) 72%, transparent)"
    : "color-mix(in srgb, var(--bg-elevated) var(--chat-panel-opacity), transparent)";
  const agentWindowBorderColor = isSandboxAgent
    ? "transparent"
    : selected
      ? `${agent.accent}f2`
      : `${agent.accent}99`;
  const agentWindowShadow = isSandboxAgent
    ? "0 20px 60px rgba(0,0,0,0.32)"
    : selected
      ? `0 0 42px ${agentGlowColor}, 0 22px 70px rgba(0,0,0,0.45)`
      : `0 0 24px ${agentGlowColor}, 0 22px 70px rgba(0,0,0,0.38)`;

  return (
    <Rnd
      bounds="parent"
      className="absolute"
      disableDragging={agent.maximized || windowInteractionLocked}
      dragHandleClassName="nexus-drag-handle"
      enableResizing={!agent.maximized && !windowInteractionLocked}
      minHeight={effectiveMinHeight}
      minWidth={effectiveMinWidth}
      onDragStart={() => {
        if (!windowInteractionLocked) onFocus(agent.id);
      }}
      onDragStop={onDragStop}
      onMouseDown={() => {
        if (!windowInteractionLocked) onFocus(agent.id);
      }}
      onResizeStart={() => {
        if (!windowInteractionLocked) onFocus(agent.id);
      }}
      onResizeStop={onResizeStop}
      position={{ x: effectiveLayout.x, y: effectiveLayout.y }}
      size={{ width: effectiveLayout.width, height: effectiveLayout.height }}
      style={{ zIndex: agent.layout.zIndex }}
    >
      <motion.section
        ref={windowRef}
        animate={{ opacity: 1, scale: 1 }}
        className={cx(
          "nexus-agent-window relative flex h-full min-h-0 flex-col overflow-visible bg-neutral-950/88 shadow-[0_22px_70px_rgba(0,0,0,0.45)]",
          isSandboxAgent ? "border-0" : "border-2",
        )}
        exit={{ opacity: 0, scale: 0.96 }}
        initial={{ opacity: 0, scale: 0.96 }}
        style={
          {
            "--nexus-agent-window-default-bg": agentWindowBackground,
            "--nexus-agent-window-default-border": agentWindowBorderColor,
            "--nexus-agent-window-default-shadow": agentWindowShadow,
            WebkitBackdropFilter:
              "blur(var(--nexus-agent-window-blur, var(--nexus-panel-blur, var(--glass-blur))))",
            backdropFilter:
              "blur(var(--nexus-agent-window-blur, var(--nexus-panel-blur, var(--glass-blur))))",
            background:
              "var(--nexus-agent-window-bg, var(--nexus-panel-bg, var(--nexus-agent-window-default-bg)))",
            borderRadius:
              "var(--nexus-agent-window-radius, var(--nexus-panel-radius, var(--surface-radius)))",
            borderColor:
              "var(--nexus-agent-window-border, var(--nexus-panel-border, var(--nexus-agent-window-default-border)))",
            boxShadow:
              "var(--nexus-agent-window-shadow, var(--nexus-panel-shadow, var(--nexus-agent-window-default-shadow)))",
          } as CSSProperties
        }
        transition={{ duration: 0.18 }}
      >
        <div
          aria-label={`${agent.callsign} drag handle`}
          className="nexus-drag-handle h-2 shrink-0 cursor-move"
          style={{
            background: "var(--nexus-agent-window-handle-bg, transparent)",
            borderTopLeftRadius:
              "var(--nexus-agent-window-handle-radius, var(--nexus-agent-window-radius, var(--nexus-panel-radius, var(--surface-radius))))",
            borderTopRightRadius:
              "var(--nexus-agent-window-handle-radius, var(--nexus-agent-window-radius, var(--nexus-panel-radius, var(--surface-radius))))",
            boxShadow:
              "inset 0 1px 0 var(--nexus-agent-window-handle-border, transparent)",
          }}
        />

        <AgentActionToolbar
          agent={agent}
          isMediaAgent={isMediaAgent}
          isSandboxAgent={isSandboxAgent}
          onClear={() => onClear(agent.id)}
          onClose={() => onClose(agent.id)}
          onDuplicate={() => onDuplicate(agent.id)}
          onMinimize={() => onMinimize(agent.id)}
          onOpenBranchInterface={() => onOpenBranchInterface(agent.id)}
          onOpenVaultManager={onOpenVaultManager}
          onSaveSandboxArtifact={
            isSandboxAgent
              ? () => onSaveArtifact(agent.id, agent.sandboxCode ?? DEFAULT_SANDBOX_CODE)
              : undefined
          }
          onToggleSandboxEditor={
            isSandboxAgent
              ? () => setSandboxEditorCollapsed((current) => !current)
              : undefined
          }
          sandboxEditorCollapsed={sandboxEditorCollapsed}
          sandboxInteractionLocked={sandboxInteractionLocked}
          onToggleSandboxInteractionLock={
            isSandboxAgent
              ? () => setSandboxInteractionLocked((current) => !current)
              : undefined
          }
          onStop={() => onStop(agent.id)}
          onToggleMaximize={() => onToggleMaximize(agent.id)}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pr-7">
          {isSandboxAgent ? (
            <SandboxCanvas
              agent={agent}
              editorCollapsed={sandboxEditorCollapsed}
              interactionLocked={sandboxInteractionLocked}
              onUpdateSandboxCode={onUpdateSandboxCode}
              onUpdateSandboxUrl={onUpdateSandboxUrl}
            />
          ) : (
            <>
              {isMediaAgent ? (
                <MediaCanvas agent={agent} />
              ) : (
                <div
                  ref={bodyRef}
                  className="system-scroll min-h-0 flex-1 overflow-y-auto p-3"
                >
                  <div className="grid gap-3">
                    {historicalPage?.error ? (
                      <div className="border border-neutral-300/20 bg-neutral-500/10 px-3 py-2 text-xs text-neutral-100">
                        {historicalPage.error}
                      </div>
                    ) : null}
                    {renderedMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        reasoningDetail={agent.modelSettings?.reasoningDetail}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.section>
    </Rnd>
  );
}
