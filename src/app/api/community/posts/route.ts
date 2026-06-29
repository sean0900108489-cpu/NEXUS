import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import {
  createCommunityBoardRepository,
  type CommunityBoardRepository,
} from "@/lib/backend/community/community-board-repository";

export const runtime = "nodejs";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:5175",
  "http://127.0.0.1:5175",
]);

let repositoryOverride: CommunityBoardRepository | undefined;

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: getCorsHeaders(request),
    status: 204,
  });
}

export async function GET(request: Request) {
  try {
    await requireActor(request);
    const posts = await getRepository().listPosts();

    return Response.json(
      { posts },
      {
        headers: getCorsHeaders(request),
        status: 200,
      },
    );
  } catch (error) {
    return toErrorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const body = (await request.json().catch(() => ({}))) as {
      body?: string;
      title?: string;
      workspaceId?: string;
    };
    const postBody = body.body?.trim();

    if (!postBody) {
      throw new ApiError("VALIDATION_FAILED", "Post body is required.", 400);
    }

    const post = await getRepository().createPost({
      authorUserId: actor.actorUserId,
      body: postBody,
      title: normalizeOptionalText(body.title),
      workspaceId: normalizeOptionalText(body.workspaceId),
    });

    return Response.json(
      { post },
      {
        headers: getCorsHeaders(request),
        status: 201,
      },
    );
  } catch (error) {
    return toErrorResponse(error, request);
  }
}

export function setCommunityPostsRouteDependenciesForTests(dependencies: {
  repository?: CommunityBoardRepository;
}) {
  repositoryOverride = dependencies.repository;
}

export function resetCommunityPostsRouteDependenciesForTests() {
  repositoryOverride = undefined;
}

function getRepository() {
  return repositoryOverride ?? createCommunityBoardRepository();
}

async function requireActor(request: Request) {
  const actor = await resolveApiActor(request, {
    declaredUserId: request.headers.get("X-User-Id"),
    required: true,
  });

  if (!actor.actorUserId) {
    throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);
  }

  return {
    ...actor,
    actorUserId: actor.actorUserId,
  };
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getCorsHeaders(request: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Trace-Id, X-User-Id, X-Workspace-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");

  if (origin && getAllowedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function getAllowedOrigins() {
  const configured = process.env.COMMUNITY_BOARD_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configured?.length) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return new Set(configured);
}

function toErrorResponse(error: unknown, request: Request) {
  const apiError = toApiError(error);

  return Response.json(
    { error: { code: apiError.code, message: apiError.message } },
    {
      headers: getCorsHeaders(request),
      status: apiError.statusCode,
    },
  );
}
