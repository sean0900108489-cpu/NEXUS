import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

export type UsageLedgerStatus = "succeeded" | "failed";

export type UsageLedgerRecord = {
  id: string;
  userId: string;
  operatorId: string;
  conversationId?: string | null;
  requestId: string;
  modelId: string;
  newApiModel: string;
  providerFamily: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  chargedPoints: number;
  sourceType: string;
  status: UsageLedgerStatus;
  errorCode?: string | null;
  createdAt: string;
};

export type UsageLedgerInsert = Omit<UsageLedgerRecord, "createdAt" | "id"> & {
  createdAt?: string;
  id?: string;
};

export interface UsageLedgerRepository {
  insert(input: UsageLedgerInsert): Promise<UsageLedgerRecord>;
  sumChargedPointsForUserSince(input: {
    since: Date;
    userId: string;
  }): Promise<number>;
}

export class InMemoryUsageLedgerRepository implements UsageLedgerRepository {
  private readonly records = new Map<string, UsageLedgerRecord>();

  async insert(input: UsageLedgerInsert) {
    const record: UsageLedgerRecord = {
      createdAt: input.createdAt ?? new Date().toISOString(),
      id: input.id ?? makeId(),
      ...input,
    };

    this.records.set(record.id, record);

    return record;
  }

  async sumChargedPointsForUserSince(input: { since: Date; userId: string }) {
    const sinceTime = input.since.getTime();

    return this.all()
      .filter(
        (record) =>
          record.userId === input.userId &&
          record.status === "succeeded" &&
          new Date(record.createdAt).getTime() >= sinceTime,
      )
      .reduce((total, record) => total + record.chargedPoints, 0);
  }

  all() {
    return [...this.records.values()];
  }

  clear() {
    this.records.clear();
  }
}

export class SupabaseUsageLedgerRepository implements UsageLedgerRepository {
  async insert(input: UsageLedgerInsert) {
    const record: UsageLedgerRecord = {
      createdAt: input.createdAt ?? new Date().toISOString(),
      id: input.id ?? makeId(),
      ...input,
    };
    const client = getNexusSupabaseAdminClient();
    const { error } = await client.from("model_usage_ledger" as never).insert({
      charged_points: record.chargedPoints,
      conversation_id: record.conversationId ?? null,
      created_at: record.createdAt,
      error_code: record.errorCode ?? null,
      id: record.id,
      input_tokens: record.inputTokens,
      model_id: record.modelId,
      new_api_model: record.newApiModel,
      operator_id: record.operatorId,
      output_tokens: record.outputTokens,
      provider_family: record.providerFamily,
      request_id: record.requestId,
      source_type: record.sourceType,
      status: record.status,
      total_tokens: record.totalTokens,
      user_id: record.userId,
    } as never);

    if (error) {
      throw new Error(error.message);
    }

    return record;
  }

  async sumChargedPointsForUserSince(input: { since: Date; userId: string }) {
    const client = getNexusSupabaseAdminClient();
    const { data, error } = await client
      .from("model_usage_ledger" as never)
      .select("charged_points")
      .eq("user_id", input.userId)
      .eq("status", "succeeded")
      .gte("created_at", input.since.toISOString());

    if (error) {
      throw new Error(error.message);
    }

    return (Array.isArray(data) ? data : []).reduce((total, row) => {
      const chargedPoints = Number(
        (row as { charged_points?: number | string | null }).charged_points ?? 0,
      );

      return total + (Number.isFinite(chargedPoints) ? chargedPoints : 0);
    }, 0);
  }
}

const inMemoryUsageLedgerRepository = new InMemoryUsageLedgerRepository();

export function createUsageLedgerRepository(): UsageLedgerRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseUsageLedgerRepository()
    : inMemoryUsageLedgerRepository;
}

export function getInMemoryUsageLedgerRepository() {
  return inMemoryUsageLedgerRepository;
}

export function estimateChargedPoints(totalTokens: number) {
  return Math.max(1, Math.ceil(totalTokens / 1000));
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `usage_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
