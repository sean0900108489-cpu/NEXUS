import type { PromptListResponse } from "@/lib/nexus-types";
import { apiHandler } from "@/lib/backend/api/api-handler";
import {
  createPromptService,
  type PromptService,
} from "@/lib/backend/prompts/prompt-service";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthSessionVerifier,
} from "@/lib/backend/security/auth-session";

const PROMPT_FETCH_LIMIT = 100;
let promptService: PromptService = createPromptService();
let authSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function GET(request: Request) {
  return apiHandler<undefined, PromptListResponse>({
    auth: {
      required: true,
      verifier: authSessionVerifier,
    },
    handler: async ({ request: routeRequest, requestId, sessionUser, traceId }) => {
      const url = new URL(routeRequest.url);
      const workspaceId = url.searchParams.get("workspaceId")?.trim();

      const prompts = await promptService.listVisiblePrompts(
        {
          limit: PROMPT_FETCH_LIMIT,
          userId: sessionUser!.id,
          workspaceId: workspaceId ?? "",
        },
        {
          requestId,
          traceId,
          userId: sessionUser!.id,
        },
      );

      return {
        prompts,
        source: "prompt_service",
        workspaceId: workspaceId ?? "",
      };
    },
    methods: ["GET"],
    route: "/api/v1/prompts",
    workspaceId: (routeRequest) => {
      const workspaceId = new URL(routeRequest.url).searchParams
        .get("workspaceId")
        ?.trim();

      return workspaceId || undefined;
    },
  })(request);
}

export function setPromptRouteDependenciesForTests(dependencies: {
  authVerifier?: AuthSessionVerifier;
  service?: PromptService;
}) {
  if (dependencies.authVerifier) {
    authSessionVerifier = dependencies.authVerifier;
  }

  if (dependencies.service) {
    promptService = dependencies.service;
  }
}

export function resetPromptRouteDependenciesForTests() {
  authSessionVerifier = createSupabaseBearerAuthSessionVerifier();
  promptService = createPromptService();
}
