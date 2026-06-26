"use client";

import Link from "next/link";

/**
 * Search Chats — thin page placeholder.
 *
 * Full search implementation deferred to future slice.
 * Currently provides navigation back to Home.
 */
export default function SearchPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Search Chats</h1>
        <p className="nexus-muted">
          Full-text search across your global conversations, workspace chats,
          and artifacts is planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
