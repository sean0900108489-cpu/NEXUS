/**
 * Legacy tool route boundary for production.
 *
 * In production, tool routes that have not yet been migrated to the
 * product model gateway are blocked with a 404 response.
 *
 * Routes that have been productized (auth + plan + catalog + quota +
 * user token + usage ledger) are whitelisted and allowed through.
 *
 * MVP whitelist (2026-06-17):
 *   - brain-draft     Graph Brain THINK (core product feature)
 *   - agent-stream    Legacy agent stream (until v1 stream is stable)
 */
const PRODUCTION_WHITELIST = new Set([
  "brain-draft",
  "agent-stream",
]);

export function blockLegacyToolRouteInProduction(
  routeName?: string,
) {
  if (!isProductionRuntime()) {
    return null;
  }

  if (routeName && PRODUCTION_WHITELIST.has(routeName)) {
    return null;
  }

  return Response.json({ error: "Not found." }, { status: 404 });
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}
