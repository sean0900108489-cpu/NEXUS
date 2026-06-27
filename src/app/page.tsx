"use client";

import { NexusOps } from "@/components/nexus/nexus-ops";

/**
 * NEXUS — primary entry point and default login landing.
 *
 * "/" renders NexusOps directly (with built-in AuthScreen gate).
 * Unauthenticated users see the login form; authenticated users
 * enter the full NEXUS workspace.
 *
 * This is the default post-login destination.
 * /desktop is an experimental Window OS surface and is NOT
 * the default landing — it must be visited explicitly.
 *
 * Global Chat is available at the Home Shell, preserved as an
 * alternate surface. Sign-in is also available at /sign-in.
 */
export default function NexusEntryPage() {
  return <NexusOps />;
}
