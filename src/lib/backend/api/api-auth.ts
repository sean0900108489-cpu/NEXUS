import { ApiError } from "./api-errors";
import {
  createSupabaseBearerAuthSessionVerifier,
  type AuthenticatedSessionUser,
  type AuthSessionVerifier,
} from "../security/auth-session";

export type ResolvedApiActor = {
  actorUserId?: string;
  sessionUser?: AuthenticatedSessionUser;
};

let apiAuthSessionVerifier: AuthSessionVerifier =
  createSupabaseBearerAuthSessionVerifier();

export async function resolveApiActor(
  request: Request,
  {
    declaredUserId,
    required,
    verifier,
  }: {
    declaredUserId?: string | null;
    required: boolean;
    verifier?: AuthSessionVerifier;
  },
): Promise<ResolvedApiActor> {
  if (!required) {
    return {};
  }

  const sessionUser = await (verifier ?? apiAuthSessionVerifier).verifyRequest(request);
  const normalizedDeclaredUserId = declaredUserId?.trim();

  if (normalizedDeclaredUserId && normalizedDeclaredUserId !== sessionUser.id) {
    throw new ApiError(
      "AUTH_INVALID_CREDENTIAL",
      "X-User-Id does not match the authenticated session.",
      401,
    );
  }

  return {
    actorUserId: sessionUser.id,
    sessionUser,
  };
}

export function setApiAuthSessionVerifierForTests(verifier: AuthSessionVerifier) {
  apiAuthSessionVerifier = verifier;
}

export function resetApiAuthSessionVerifierForTests() {
  apiAuthSessionVerifier = createSupabaseBearerAuthSessionVerifier();
}
