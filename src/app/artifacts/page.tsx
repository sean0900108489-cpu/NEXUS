"use client";

import Link from "next/link";

/**
 * Artifacts — thin page placeholder.
 *
 * Artifact library with browsing, filtering, and preview is planned.
 * Currently provides navigation back to Home.
 */
export default function ArtifactsPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Artifacts</h1>
        <p className="nexus-muted">
          Browse and manage generated images, code snippets, documents, and
          other artifacts from your workspaces here. Full library view is
          planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
