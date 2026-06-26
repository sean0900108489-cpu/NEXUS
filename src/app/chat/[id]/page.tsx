"use client";

import Link from "next/link";

/**
 * Chat Detail — thin page placeholder.
 *
 * Individual global conversation view (standalone chat page) is planned.
 * Currently provides navigation back to Home where the conversation
 * can be opened from the sidebar.
 */
export default function ChatDetailPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Chat</h1>
        <p className="nexus-muted">
          This conversation is available from the Home sidebar. A standalone
          chat detail page is planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
