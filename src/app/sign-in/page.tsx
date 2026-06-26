"use client";

import Link from "next/link";

/**
 * Sign In — thin page placeholder.
 *
 * Authentication flow via Supabase Auth is planned.
 * Currently provides navigation back to Home.
 */
export default function SignInPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Sign In</h1>
        <p className="nexus-muted">
          Authentication via Supabase Auth is planned for a future release.
          Guest access is available on the Home page.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
