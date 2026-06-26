"use client";

import { useEffect, useState } from "react";

type TokenStatus = {
  configured: boolean;
  enabled: boolean;
  plan: string | null;
  lastError: string | null;
};

/**
 * NexusTokenStatus — token readiness indicator.
 *
 * Only visible when the user's New API token is missing or broken.
 * When everything is OK, this component renders nothing.
 *
 * States:
 * - not configured → "AI models require API token setup"
 * - decryption failed → "Token needs reconfiguration"
 * - disabled → "Token is paused"
 * - configured + enabled → hidden
 */
export function NexusTokenStatus({ authenticated }: { authenticated: boolean }) {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetch("/api/user/token-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) setStatus(data);
      })
      .catch(() => {
        // Token status is non-critical; suppress fetch errors
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authenticated]);

  // Loading → nothing (avoid flash)
  if (loading || !status) return null;

  // Everything OK → nothing
  if (status.configured && status.enabled) return null;

  // Determine message based on state
  const isDecryptFailed =
    status.lastError === "USER_NEW_API_TOKEN_DECRYPT_FAILED";
  const isDisabled = status.configured && !status.enabled;
  const isNotConfigured = !status.configured;

  let message: string;
  if (isDecryptFailed) {
    message = "Token needs reconfiguration. AI models are temporarily unavailable.";
  } else if (isDisabled) {
    message = "Token is paused. AI models are temporarily unavailable.";
  } else if (isNotConfigured) {
    message = "AI models require API token setup.";
  } else {
    return null;
  }

  return (
    <div className="nexus-token-status" role="alert">
      <span className="nexus-token-status-dot" aria-hidden />
      <span>{message}</span>
      <a className="nexus-token-status-link" href="/token-setup">
        Learn more →
      </a>
    </div>
  );
}
