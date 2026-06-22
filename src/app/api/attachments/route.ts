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
