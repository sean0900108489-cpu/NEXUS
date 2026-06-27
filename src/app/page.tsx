"use client";

import { NexusOps } from "@/components/nexus/nexus-ops";

/**
 * NEXUS — direct entry point.
 *
 * "/" renders NexusOps directly (with built-in AuthScreen gate).
 * Unauthenticated users see the login form; authenticated users
 * enter the full NEXUS workspace.
 *
 * Global Chat is available at the Home Shell, preserved as an
 * alternate surface. Sign-in is also available at /sign-in.
 */
export default function NexusEntryPage() {
  return <NexusOps />;
}
