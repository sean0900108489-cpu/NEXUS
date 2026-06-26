"use client";

import Link from "next/link";

/**
 * Workflows — thin page placeholder.
 *
 * Workflow builder and runtime dashboard is planned for a future release.
 * Currently provides navigation back to Home.
 */
export default function WorkflowsPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Workflows</h1>
        <p className="nexus-muted">
          Design, run, and monitor multi-step agent workflows with visual
          graphs. Workflow builder is planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
