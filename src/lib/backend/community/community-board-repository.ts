import { getNexusSupabaseAdminClient, hasSupabaseServiceRoleConfig } from "@/lib/supabase/admin";

export type CommunityBoardPostStatus = "published" | "deleted";

export type CommunityBoardPost = {
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
  replyCount: number;
  status: CommunityBoardPostStatus;
  title?: string;
  updatedAt: string;
  workspaceId?: string;
};

export type CommunityBoardPostCreateInput = {
  authorUserId: string;
  body: string;
  title?: string;
  workspaceId?: string;
};

export interface CommunityBoardRepository {
  createPost(input: CommunityBoardPostCreateInput): Promise<CommunityBoardPost>;
  listPosts(): Promise<CommunityBoardPost[]>;
}

let memoryRepository: CommunityBoardRepository | undefined;

export function createCommunityBoardRepository(): CommunityBoardRepository {
  if (hasSupabaseServiceRoleConfig()) {
    return new SupabaseCommunityBoardRepository();
  }

  return getMemoryRepository();
}

export function resetCommunityBoardRepositoryForTests() {
  memoryRepository = undefined;
}

class SupabaseCommunityBoardRepository implements CommunityBoardRepository {
  async listPosts(): Promise<CommunityBoardPost[]> {
    const { data, error } = await getNexusSupabaseAdminClient()
      .from("community_posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingCommunityBoardTableError(error)) {
        return getMemoryRepository().listPosts();
      }

      throw new Error(error.message);
    }

    return (data ?? []).map(mapPostRow);
  }

  async createPost(input: CommunityBoardPostCreateInput): Promise<CommunityBoardPost> {
    const { data, error } = await getNexusSupabaseAdminClient()
      .from("community_posts")
      .insert({
        author_user_id: input.authorUserId,
        body: input.body,
        title: input.title ?? null,
        workspace_id: input.workspaceId ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingCommunityBoardTableError(error)) {
        return getMemoryRepository().createPost(input);
      }

      throw new Error(error.message);
    }

    return mapPostRow(data);
  }
}

function getMemoryRepository() {
  memoryRepository ??= new MemoryCommunityBoardRepository();
  return memoryRepository;
}

class MemoryCommunityBoardRepository implements CommunityBoardRepository {
  private posts: CommunityBoardPost[] = [];

  async listPosts(): Promise<CommunityBoardPost[]> {
    return [...this.posts].filter((post) => post.status === "published");
  }

  async createPost(input: CommunityBoardPostCreateInput): Promise<CommunityBoardPost> {
    const timestamp = new Date().toISOString();
    const post: CommunityBoardPost = {
      authorUserId: input.authorUserId,
      body: input.body,
      createdAt: timestamp,
      id: makeId("community_post"),
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

function mapPostRow(row: Record<string, unknown>): CommunityBoardPost {
  return {
    authorUserId: String(row.author_user_id ?? ""),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? ""),
    id: String(row.id ?? ""),
    replyCount: Number(row.reply_count ?? 0),
    status: row.status === "deleted" ? "deleted" : "published",
    title: typeof row.title === "string" ? row.title : undefined,
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
    workspaceId: typeof row.workspace_id === "string" ? row.workspace_id : undefined,
  };
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isMissingCommunityBoardTableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    message.includes("community_posts") && (
      message.includes("does not exist") ||
      message.includes("schema cache")
    )
  );
}
