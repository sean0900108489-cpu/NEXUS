"use client";

import { NexusHomeShell } from "@/components/nexus-home/NexusHomeShell";

/**
 * NEXUS Home — S-8 platform-first entry point.
 *
 * "/" no longer renders NexusOps directly.
 * NexusOps is preserved at "/workspace/[id]".
 *
 * All global chat state is managed inside NexusHomeShell
 * via useNexusHomeData hook and the api adapter layer.
 */
export default function NexusHomePage() {
  return <NexusHomeShell />;
}
