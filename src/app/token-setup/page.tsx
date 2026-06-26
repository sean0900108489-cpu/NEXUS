"use client";

import Link from "next/link";

/**
 * Token Setup — thin page placeholder.
 *
 * Explains that New API token configuration is required for AI model access.
 * Currently manual setup by workspace Owner.
 */
export default function TokenSetupPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>API Token Setup</h1>
        <p className="nexus-muted">
          NEXUS uses a New API token to access AI models. Token
          configuration is currently managed by your workspace Owner.
        </p>
        <p className="nexus-muted">
          If you are the workspace Owner, please refer to the NEXUS
          documentation for token setup instructions. Regular users
          should contact their workspace Owner for access.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
