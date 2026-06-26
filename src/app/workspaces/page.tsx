"use client";

import Link from "next/link";

/**
 * Workspaces — thin page placeholder.
 *
 * Full workspace listing, creation, and management is planned.
 * Currently provides navigation back to Home.
 */
export default function WorkspacesPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Workspaces</h1>
        <p className="nexus-muted">
          Browse, create, and manage your workspaces. Full workspace dashboard
          and management is planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
