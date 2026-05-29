import { ApiError } from "./api-errors";
import {
  resetApiAuthSessionVerifierForTests,
  setApiAuthSessionVerifierForTests,
} from "./api-auth";

export const TEST_SESSION_AUTHORIZATION = "Bearer test-session";

export function installMockApiAuthSessionVerifierForTests(
  defaultUserId = "local-owner",
) {
  setApiAuthSessionVerifierForTests({
    async verifyRequest(request) {
      const authorization = request.headers.get("authorization")?.trim();

      if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
        throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
      }

      return {
        email: null,
        id: request.headers.get("X-User-Id")?.trim() || defaultUserId,
      };
    },
  });
}

export function resetMockApiAuthSessionVerifierForTests() {
  resetApiAuthSessionVerifierForTests();
}

export function authHeaders(
  userId = "local-owner",
  headers: Record<string, string> = {},
) {
  return {
    Authorization: TEST_SESSION_AUTHORIZATION,
    "X-User-Id": userId,
    ...headers,
  };
}
