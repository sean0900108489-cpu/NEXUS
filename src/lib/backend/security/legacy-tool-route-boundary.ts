export function blockLegacyToolRouteInProduction() {
  if (!isProductionRuntime()) {
    return null;
  }

  return Response.json({ error: "Not found." }, { status: 404 });
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}
