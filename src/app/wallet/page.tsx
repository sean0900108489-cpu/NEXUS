"use client";

import Link from "next/link";

/**
 * Wallet — thin page placeholder.
 *
 * Detailed wallet balance, transaction history, and billing management
 * is planned for a future release.
 * Currently provides navigation back to Home.
 */
export default function WalletPage() {
  return (
    <div className="nexus-thin-page">
      <div className="nexus-thin-page-card">
        <div className="nexus-orb" aria-hidden />
        <h1>Wallet</h1>
        <p className="nexus-muted">
          View your credit balance, transaction history, and billing settings.
          Full wallet dashboard is planned for a future release.
        </p>
        <Link href="/" className="nexus-btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
