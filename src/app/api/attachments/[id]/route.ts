import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError } from "@/lib/backend/api/api-errors";
import { getNexusSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** GET /api/attachments/[id] — Retrieve attachment metadata with signed URL. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const { id } = await params;
    const supabase = getNexusSupabaseAdminClient();

    // Fetch attachment record
    const { data, error } = await supabase
      .from("user_attachments" as never)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new ApiError("VALIDATION_FAILED", "Attachment not found.", 404);
    }

    const record = data as {
      id: string;
      storage_key: string;
      filename: string;
      mime_type: string;
      size_bytes: number;
      scope: string;
      workspace_id: string | null;
      created_at: string;
    };

    // Generate fresh signed URL
    const { data: signedUrlData } = await supabase.storage
      .from("user-attachments")
      .createSignedUrl(record.storage_key, 3600);

    return Response.json({
      attachment: {
        id: record.id,
        filename: record.filename,
        mimeType: record.mime_type,
        size: record.size_bytes,
        scope: record.scope,
        workspaceId: record.workspace_id,
        storageKey: record.storage_key,
        signedUrl: signedUrlData?.signedUrl ?? null,
        createdAt: record.created_at,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/attachments/[id] — Soft-delete an attachment. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await resolveApiActor(request, { required: true });
    const userId = actor.actorUserId;
    if (!userId) throw new ApiError("AUTH_REQUIRED", "User ID is required.", 401);

    const { id } = await params;
    const supabase = getNexusSupabaseAdminClient();

    // Fetch attachment to verify ownership and get storage key
    const { data, error } = await supabase
      .from("user_attachments" as never)
      .select("id, user_id, storage_key")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new ApiError("VALIDATION_FAILED", "Attachment not found.", 404);
    }

    const record = data as { id: string; user_id: string; storage_key: string };

    // Remove from storage
    await supabase.storage
      .from("user-attachments")
      .remove([record.storage_key])
      .catch(() => {});

    // Soft-delete the database record
    await supabase
      .from("user_attachments" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("user_id", userId);

    return Response.json({ ok: true });
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
