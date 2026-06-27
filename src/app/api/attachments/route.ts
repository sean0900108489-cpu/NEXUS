import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError } from "@/lib/backend/api/api-errors";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import {
  validateAttachment,
  ALL_UPLOADABLE_MIME_TYPES,
  UNSAFE_EXTENSIONS,
  getExtension,
} from "@/features/composer-attachments/shared/attachment-validation";
import { resolveAttachmentKind } from "@/features/composer-attachments/shared/attachment-types";

export const runtime = "nodejs";

// ── GET /api/attachments — List user's attachments ─────────────────

/**
 * List attachments for the authenticated user.
 *
 * Query params:
 *   query?   — search in filename
 *   mimeType? — filter by MIME type prefix (e.g. "image/")
 *   scope?   — filter by scope ("global-chat" | "workspace")
 *   limit?   — max results (default 50, max 100)
 *   cursor?  — pagination cursor (created_at ISO string)
 */
export async function GET(request: Request) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() ?? undefined;
    const mimeType = url.searchParams.get("mimeType")?.trim() ?? undefined;
    const scope = url.searchParams.get("scope")?.trim() ?? undefined;
    const limit = Math.min(
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
      100,
    );
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const supabase = getNexusSupabaseAdminClient();

    // Build query
    let dbQuery = supabase
      .from("user_attachments" as never)
      .select("id, filename, mime_type, size_bytes, scope, workspace_id, storage_key, status, created_at", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (query) {
      dbQuery = dbQuery.ilike("filename", `%${query}%`);
    }

    if (mimeType) {
      dbQuery = dbQuery.like("mime_type", `${mimeType}%`);
    }

    if (scope && (scope === "global-chat" || scope === "workspace")) {
      dbQuery = dbQuery.eq("scope", scope);
    }

    if (cursor) {
      dbQuery = dbQuery.lt("created_at", cursor);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      throw new ApiError("INTERNAL_ERROR", `Database query failed: ${error.message}`, 500);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      filename: string;
      mime_type: string;
      size_bytes: number;
      scope: string;
      workspace_id: string | null;
      storage_key: string;
      status: string;
      created_at: string;
    }>;

    const items = rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size_bytes,
      scope: row.scope,
      workspaceId: row.workspace_id ?? null,
      kind: resolveAttachmentKind(row.mime_type),
      createdAt: row.created_at,
    }));

    const lastItem = items.at(-1);
    const nextCursor = items.length === limit && lastItem ? lastItem.createdAt : null;

    return Response.json({
      items,
      total: count ?? items.length,
      nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ── POST /api/attachments — Upload an attachment ───────────────────

/** POST /api/attachments — Upload an attachment. */
export async function POST(request: Request) {
  try {
    // 1. Auth check
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const scope = (formData.get("scope") as string) ?? "global-chat";
    const workspaceId = formData.get("workspaceId") as string | undefined;

    if (!file) {
      throw new ApiError("VALIDATION_FAILED", "No file provided.", 400);
    }

    if (scope !== "global-chat" && scope !== "workspace") {
      throw new ApiError("VALIDATION_FAILED", "Invalid scope. Must be 'global-chat' or 'workspace'.", 400);
    }

    // 3. Server-side validation
    const validation = validateAttachment({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!validation.ok) {
      throw new ApiError("VALIDATION_FAILED", validation.error.message, 400);
    }

    // 4. Build storage path and upload to Supabase Storage
    const attachmentId = crypto.randomUUID?.() ?? `att_${Date.now()}`;
    const safeFilename = encodeURIComponent(file.name);
    const storagePath = `${userId}/${scope}${workspaceId ? `/${workspaceId}` : ""}/${attachmentId}/${safeFilename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getNexusSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("user-attachments")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError("INTERNAL_ERROR", `Storage upload failed: ${uploadError.message}`, 500);
    }

    // 5. Get signed URL for retrieval
    const { data: signedUrlData } = await supabase.storage
      .from("user-attachments")
      .createSignedUrl(storagePath, 3600); // 1 hour TTL

    const signedUrl = signedUrlData?.signedUrl ?? undefined;

    // 6. Create DB record
    const kind = resolveAttachmentKind(file.type || "application/octet-stream");
    const now = new Date().toISOString();

    const { error: dbError } = await supabase
      .from("user_attachments" as never)
      .insert({
        id: attachmentId,
        user_id: userId,
        scope,
        workspace_id: workspaceId ?? null,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_key: storagePath,
        status: "ready",
        created_at: now,
      } as never);

    if (dbError) {
      // Clean up uploaded file on DB failure
      await supabase.storage.from("user-attachments").remove([storagePath]).catch(() => {});
      throw new ApiError("INTERNAL_ERROR", `Database write failed: ${dbError.message}`, 500);
    }

    // 7. Return attachment
    return Response.json({
      attachment: {
        id: attachmentId,
        kind,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        source: "local_upload",
        storageKey: storagePath,
        signedUrl,
        createdAt: now,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode },
    );
  }

  const message = error instanceof Error ? error.message : "Internal server error.";
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}
