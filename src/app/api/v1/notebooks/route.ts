import type { NotebookListResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";
import {
  createNotebookService,
  type NotebookService,
} from "@/lib/backend/notebooks/notebook-service";

const NOTEBOOK_FETCH_LIMIT = 100;
let notebookService: NotebookService = createNotebookService();
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function GET(request: Request) {
  return apiHandler<undefined, NotebookListResponse>({
    handler: async ({ request: routeRequest, requestId, traceId }) => {
      const sessionUser = await authSessionVerifier.verifyRequest(routeRequest);
      const url = new URL(routeRequest.url);
      const workspaceId = url.searchParams.get("workspaceId")?.trim() || null;
      const notebooks = await notebookService.listVisibleNotebooks(
        {
          limit: NOTEBOOK_FETCH_LIMIT,
          userId: sessionUser.id,
          workspaceId,
        },
        {
          requestId,
          traceId,
          userId: sessionUser.id,
        },
      );

      return {
        notebooks,
        source: "notebook_service",
        workspaceId,
      };
    },
    methods: ["GET"],
    route: "/api/v1/notebooks",
    workspaceId: (routeRequest) => {
      const workspaceId = new URL(routeRequest.url).searchParams
        .get("workspaceId")
        ?.trim();

      return workspaceId || undefined;
    },
  })(request);
}

export function setNotebookRouteDependenciesForTests(dependencies: {
  authVerifier?: AuthSessionVerifier;
  service?: NotebookService;
}) {
  if (dependencies.authVerifier) {
    authSessionVerifier = dependencies.authVerifier;
  }

  if (dependencies.service) {
    notebookService = dependencies.service;
  }
}

export function resetNotebookRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  notebookService = createNotebookService();
}
