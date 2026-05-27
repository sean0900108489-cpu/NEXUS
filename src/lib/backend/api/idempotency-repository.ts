import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  ApiIdempotencyKeyInsert,
  Api_Idempotency_Keys,
  Database,
} from "@/lib/supabase/database.types";

import { SecretBoundaryService } from "../security/secret-boundary-service";

export type IdempotencyLookupInput = {
  workspaceId: string;
  actorUserId?: string;
  idempotencyKey: string;
  method: string;
  path: string;
  requestHash: string;
  requestFingerprint: string;
};

export type IdempotencyLookupResult =
  | { type: "miss"; recordId: string }
  | { type: "hit"; statusCode: number; responsePayload: unknown }
  | { type: "conflict" }
  | { type: "pending" };

export interface IdempotencyRepository {
  begin(input: IdempotencyLookupInput): Promise<IdempotencyLookupResult>;
  complete(recordId: string, statusCode: number, responsePayload: unknown): Promise<void>;
  fail(recordId: string, statusCode: number, responsePayload: unknown): Promise<void>;
  cleanupExpired(now?: Date): Promise<number>;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_LOCK_MS = 2 * 60 * 1000;

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly records = new Map<string, Api_Idempotency_Keys>();

  async begin(input: IdempotencyLookupInput): Promise<IdempotencyLookupResult> {
    const key = keyFor(input.workspaceId, input.idempotencyKey);
    const existing = this.records.get(key);
    const now = new Date();

    if (existing && new Date(existing.expires_at) > now) {
      return resolveExistingRecord(existing, input, now);
    }

    const record = createPendingRecord(input);
    this.records.set(key, record);

    return {
      recordId: record.id,
      type: "miss",
    };
  }

  async complete(recordId: string, statusCode: number, responsePayload: unknown) {
    this.updateRecord(recordId, "completed", statusCode, responsePayload);
  }

  async fail(recordId: string, statusCode: number, responsePayload: unknown) {
    this.updateRecord(recordId, "failed", statusCode, responsePayload);
  }

  async cleanupExpired(now = new Date()) {
    let count = 0;

    for (const [key, record] of this.records.entries()) {
      if (new Date(record.expires_at) <= now) {
        this.records.delete(key);
        count += 1;
      }
    }

    return count;
  }

  private updateRecord(
    recordId: string,
    status: "completed" | "failed",
    statusCode: number,
    responsePayload: unknown,
  ) {
    const secretBoundary = new SecretBoundaryService();

    for (const [key, record] of this.records.entries()) {
      if (record.id !== recordId) {
        continue;
      }

      this.records.set(key, {
        ...record,
        completed_at: new Date().toISOString(),
        response_payload: secretBoundary.redact(responsePayload),
        status,
        status_code: statusCode,
      });
      return;
    }
  }
}

export class SupabaseIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async begin(input: IdempotencyLookupInput): Promise<IdempotencyLookupResult> {
    const now = new Date();
    const { data, error } = await this.client
      .from("api_idempotency_keys")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data && new Date(data.expires_at) > now) {
      return resolveExistingRecord(data, input, now);
    }

    if (data) {
      const { error: updateError } = await this.client
        .from("api_idempotency_keys")
        .update({
          actor_user_id: input.actorUserId ?? null,
          completed_at: null,
          expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString(),
          locked_at: now.toISOString(),
          method: input.method as "POST" | "PUT" | "PATCH" | "DELETE",
          path: input.path,
          request_fingerprint: input.requestFingerprint,
          request_hash: input.requestHash,
          response_payload: null,
          status: "pending",
          status_code: null,
        })
        .eq("id", data.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return {
        recordId: data.id,
        type: "miss",
      };
    }

    const record = createPendingRecord(input);
    const insertRecord: ApiIdempotencyKeyInsert = {
      actor_user_id: record.actor_user_id,
      completed_at: record.completed_at,
      created_at: record.created_at,
      expires_at: record.expires_at,
      id: record.id,
      idempotency_key: record.idempotency_key,
      locked_at: record.locked_at,
      method: record.method,
      path: record.path,
      request_fingerprint: record.request_fingerprint,
      request_hash: record.request_hash,
      response_payload: record.response_payload,
      status: record.status,
      status_code: record.status_code,
      workspace_id: record.workspace_id,
    };
    const { data: inserted, error: insertError } = await this.client
      .from("api_idempotency_keys")
      .insert(insertRecord)
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return this.begin(input);
      }

      throw new Error(insertError.message);
    }

    return {
      recordId: inserted.id,
      type: "miss",
    };
  }

  async complete(recordId: string, statusCode: number, responsePayload: unknown) {
    await this.updateRecord(recordId, "completed", statusCode, responsePayload);
  }

  async fail(recordId: string, statusCode: number, responsePayload: unknown) {
    await this.updateRecord(recordId, "failed", statusCode, responsePayload);
  }

  async cleanupExpired(now = new Date()) {
    const { data, error } = await this.client
      .from("api_idempotency_keys")
      .delete()
      .lt("expires_at", now.toISOString())
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    return data?.length ?? 0;
  }

  private async updateRecord(
    recordId: string,
    status: "completed" | "failed",
    statusCode: number,
    responsePayload: unknown,
  ) {
    const secretBoundary = new SecretBoundaryService();
    const { error } = await this.client
      .from("api_idempotency_keys")
      .update({
        completed_at: new Date().toISOString(),
        response_payload: secretBoundary.redact(responsePayload),
        status,
        status_code: statusCode,
      })
      .eq("id", recordId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

const inMemoryIdempotencyRepository = new InMemoryIdempotencyRepository();

export function createServerIdempotencyRepository(): IdempotencyRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseIdempotencyRepository(getNexusSupabaseAdminClient())
    : inMemoryIdempotencyRepository;
}

function resolveExistingRecord(
  record: Api_Idempotency_Keys,
  input: IdempotencyLookupInput,
  now: Date,
): IdempotencyLookupResult {
  if (record.request_hash !== input.requestHash) {
    return { type: "conflict" };
  }

  if (
    (record.status === "completed" || record.status === "failed") &&
    record.status_code &&
    record.response_payload !== null
  ) {
    return {
      responsePayload: record.response_payload,
      statusCode: record.status_code,
      type: "hit",
    };
  }

  const lockedAt = record.locked_at ? new Date(record.locked_at) : undefined;

  if (record.status === "pending" && lockedAt && now.getTime() - lockedAt.getTime() < PENDING_LOCK_MS) {
    return { type: "pending" };
  }

  return { type: "pending" };
}

function createPendingRecord(input: IdempotencyLookupInput): Api_Idempotency_Keys {
  const now = new Date();

  return {
    actor_user_id: input.actorUserId ?? null,
    completed_at: null,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + IDEMPOTENCY_TTL_MS).toISOString(),
    id: createId(),
    idempotency_key: input.idempotencyKey,
    locked_at: now.toISOString(),
    method: input.method as "POST" | "PUT" | "PATCH" | "DELETE",
    path: input.path,
    request_fingerprint: input.requestFingerprint,
    request_hash: input.requestHash,
    response_payload: null,
    status: "pending",
    status_code: null,
    workspace_id: input.workspaceId,
  };
}

function keyFor(workspaceId: string, idempotencyKey: string) {
  return `${workspaceId}:${idempotencyKey}`;
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
