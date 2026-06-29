import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  authHeaders,
  installMockApiAuthSessionVerifierForTests,
  resetMockApiAuthSessionVerifierForTests,
} from "@/lib/backend/api/api-auth-test-helper";

import {
  GET,
  OPTIONS,
  POST,
  resetCommunityPostsRouteDependenciesForTests,
  setCommunityPostsRouteDependenciesForTests,
} from "./route";
import type {
  CommunityBoardPost,
  CommunityBoardRepository,
} from "@/lib/backend/community/community-board-repository";

describe("/api/community/posts", () => {
  let repository: InMemoryCommunityBoardRepository;

  beforeEach(() => {
    repository = new InMemoryCommunityBoardRepository();
    installMockApiAuthSessionVerifierForTests("session-user");
    setCommunityPostsRouteDependenciesForTests({ repository });
  });

  afterEach(() => {
    resetCommunityPostsRouteDependenciesForTests();
    resetMockApiAuthSessionVerifierForTests();
  });

  it("lists published community posts for authenticated users", async () => {
    await repository.createPost({
      authorUserId: "user-a",
      body: "第一篇互通測試",
      title: "Hello NEXUS",
      workspaceId: "workspace-nexus-ops",
    });

    const response = await GET(
      new Request("http://localhost/api/community/posts", {
        headers: authHeaders("viewer"),
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]).toMatchObject({
      authorUserId: "user-a",
      body: "第一篇互通測試",
      title: "Hello NEXUS",
    });
  });

  it("creates posts with the authenticated NEXUS user id instead of trusting body userId", async () => {
    const response = await POST(
      new Request("http://localhost/api/community/posts", {
        body: JSON.stringify({
          body: "這是第一個 shared post",
          title: "跨使用者互通",
          userId: "attacker-user",
          workspaceId: "workspace-nexus-ops",
        }),
        headers: {
          "Content-Type": "application/json",
          ...authHeaders("session-user"),
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.post).toMatchObject({
      authorUserId: "session-user",
      body: "這是第一個 shared post",
      title: "跨使用者互通",
      workspaceId: "workspace-nexus-ops",
    });
    expect(body.post.authorUserId).not.toBe("attacker-user");
  });

  it("returns CORS preflight headers for the standalone localhost webapp", async () => {
    const response = await OPTIONS(
      new Request("http://localhost/api/community/posts", {
        headers: { Origin: "http://localhost:5175" },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5175",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

class InMemoryCommunityBoardRepository implements CommunityBoardRepository {
  private posts: CommunityBoardPost[] = [];

  async listPosts() {
    return [...this.posts];
  }

  async createPost(input: {
    authorUserId: string;
    body: string;
    title?: string;
    workspaceId?: string;
  }) {
    const timestamp = "2026-06-30T00:00:00.000Z";
    const post: CommunityBoardPost = {
      authorUserId: input.authorUserId,
      body: input.body,
      createdAt: timestamp,
      id: `post-${this.posts.length + 1}`,
      replyCount: 0,
      status: "published",
      title: input.title,
      updatedAt: timestamp,
      workspaceId: input.workspaceId,
    };
    this.posts.unshift(post);
    return post;
  }
}
