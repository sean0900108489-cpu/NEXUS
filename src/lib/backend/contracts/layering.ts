export const BACKEND_LAYERING_ORDER = [
  "apiRoute",
  "apiHandler",
  "validateRequest",
  "permissionService",
  "domainService",
  "repository",
  "supabaseAdapter",
] as const;

export type BackendLayer = (typeof BACKEND_LAYERING_ORDER)[number];

/**
 * NEXUS backend flow:
 * API Route -> apiHandler / validateRequest -> PermissionService ->
 * DomainService -> Repository -> Supabase Adapter.
 *
 * API routes should stay thin: parse request, call shared handlers, and return
 * an ApiEnvelope. Domain services own business decisions. Repositories own
 * persistence shape. Supabase adapters are the only layer that should know
 * generated database column names.
 */
export type BackendLayeringContract = {
  order: typeof BACKEND_LAYERING_ORDER;
  routeBoundary: Extract<BackendLayer, "apiRoute">;
  validationBoundary: Extract<BackendLayer, "apiHandler" | "validateRequest">;
  permissionBoundary: Extract<BackendLayer, "permissionService">;
  domainBoundary: Extract<BackendLayer, "domainService">;
  persistenceBoundary: Extract<BackendLayer, "repository" | "supabaseAdapter">;
};

export const BACKEND_LAYERING_CONTRACT: BackendLayeringContract = {
  order: BACKEND_LAYERING_ORDER,
  routeBoundary: "apiRoute",
  validationBoundary: "validateRequest",
  permissionBoundary: "permissionService",
  domainBoundary: "domainService",
  persistenceBoundary: "repository",
};
