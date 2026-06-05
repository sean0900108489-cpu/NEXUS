import { getSupabaseRequestAccessToken } from "@/lib/backend/security/auth-session";

import { createArtifactRepository } from "./artifact-repository";
import { createArtifactService } from "./artifact-service";

export function createArtifactServiceForRequest(request: Request) {
  return createArtifactService({
    repository: createArtifactRepository({
      accessToken: getSupabaseRequestAccessToken(request),
    }),
  });
}
