/**
 * NEXUS Window OS — Settings Placeholder Panel
 *
 * Quick-action links for account settings and global apps.
 *
 * @module features/global-user
 */

"use client";

import { useRouter } from "next/navigation";
import { Settings, FolderOpen, StickyNote, MessageSquare } from "lucide-react";
import { useWindowStore } from "@/kernel/window/window-store";
import { getWindowApp } from "@/kernel/window/window-registry";

export function SettingsPlaceholderPanel() {
  const router = useRouter();
  const openWindow = useWindowStore((s) => s.openWindow);

  const handleOpenArtifactLibrary = () => {
    const appDef = getWindowApp("artifact-library");
    if (!appDef) return;
    openWindow({
      kind: "artifact-library",
      title: appDef.title,
      scope: appDef.scope,
      defaultSize: appDef.defaultSize,
      singleton: appDef.singleton,
    });
  };

  const handleOpenNotes = () => {
    const appDef = getWindowApp("notes");
    if (!appDef) return;
    openWindow({
      kind: "notes",
      title: appDef.title,
      scope: appDef.scope,
      defaultSize: appDef.defaultSize,
      singleton: appDef.singleton,
    });
  };

  const handleOpenForum = () => {
    const appDef = getWindowApp("forum");
    if (!appDef) return;
    openWindow({
      kind: "forum",
      title: appDef.title,
      scope: appDef.scope,
      defaultSize: appDef.defaultSize,
      singleton: appDef.singleton,
    });
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-white/60 text-xs font-medium uppercase tracking-wider">
        <Settings className="w-3.5 h-3.5" />
        Shortcuts
      </div>
      <div className="space-y-1.5">
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={handleOpenArtifactLibrary}
        >
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-3 h-3" />
            Artifact Library
          </span>
        </button>
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={handleOpenNotes}
        >
          <span className="flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" />
            Notes
          </span>
        </button>
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={handleOpenForum}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Forum
          </span>
        </button>
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={() => router.push("/token-setup")}
        >
          API Token Setup
        </button>
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={() => router.push("/wallet")}
        >
          Wallet Details
        </button>
        <button
          className="w-full text-left text-xs text-white/50 hover:text-white/80 transition-colors"
          onClick={() => router.push("/sign-in")}
        >
          Switch Account
        </button>
      </div>
    </div>
  );
}
