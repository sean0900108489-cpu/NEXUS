import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  getNexusSupabaseAdminClient: vi.fn(),
  hasSupabaseServiceRoleConfig: vi.fn(),
}));

import {
  createCommunityBoardRepository,
  resetCommunityBoardRepositoryForTests,
} from "./community-board-repository";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

describe("community board repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCommunityBoardRepositoryForTests();
  });

  it("falls back to memory only when Supabase community tables are not migrated yet", async () => {
    vi.mocked(hasSupabaseServiceRoleConfig).mockReturnValue(true);
    const missingTableResult = async () => ({
      data: null,
      error: {
        code: "42P01",
        message: 'relation "public.community_posts" does not exist',
      },
    });
    vi.mocked(getNexusSupabaseAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: missingTableResult,
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: missingTableResult,
          }),
        }),
      }),
    } as unknown as ReturnType<typeof getNexusSupabaseAdminClient>);

    const repository = createCommunityBoardRepository();
    expect(await repository.listPosts()).toEqual([]);
    const post = await repository.createPost({
      authorUserId: "user-r6",
      body: "local fallback post",
      title: "fallback",
    });

    expect(post).toMatchObject({
      authorUserId: "user-r6",
      body: "local fallback post",
      title: "fallback",
    });
    expect(await repository.listPosts()).toHaveLength(1);
  });
});
