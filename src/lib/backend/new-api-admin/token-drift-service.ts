import { createBackendMetadata } from "@/lib/backend/primitives/metadata";
import {
  SecurityAuditRepository,
  type SecurityAuditStore,
  type SecuritySupabaseClient,
} from "@/lib/backend/security/repositories";
import type {
  PermissionAuditDecision,
  SecurityAuditLogEntry,
} from "@/lib/backend/security/types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";

export type NewApiTokenMapping = {
  enabled: boolean;
  newApiGroup?: string | null;
  plan: string;
  tokenId?: string | null;
  tokenName?: string | null;
  userId: string;
};

export type NewApiTokenSnapshot = {
  group?: string | null;
  modelLimitSummary: ModelLimitSummary;
  quotaSummary: QuotaSummary;
};

export type QuotaSummary = {
  remainingQuota?: number | null;
  unlimited?: boolean | null;
  usedQuota?: number | null;
};

export type ModelLimitSummary = {
  count?: number | null;
  models?: string[] | null;
  restricted?: boolean | null;
};

export type NewApiTokenDriftItem = {
  groupMatch: boolean | null;
  modelLimitSummary: ModelLimitSummary | null;
  newApiGroup: string | null;
  nexusGroup: string | null;
  nexusPlan: string;
  quotaSummary: QuotaSummary | null;
  status: "checked" | "new_api_admin_unavailable" | "new_api_lookup_failed" | "token_id_missing";
  suggestedAction:
    | "none"
    | "configure_new_api_admin_read_access"
    | "fix_nexus_mapping_token_id"
    | "manual_new_api_lookup_required"
    | "update_new_api_group_to_match_nexus_mapping";
  tokenName: string | null;
  userId: string;
};

export type NewApiTokenDriftReport = {
  items: NewApiTokenDriftItem[];
  summary: {
    checked: number;
    drifted: number;
    missingTokenId: number;
    newApiLookupFailed: number;
    unavailable: number;
  };
};

export interface NewApiTokenMappingRepository {
  listEnabledMappings(): Promise<NewApiTokenMapping[]>;
}

export interface NewApiAdminTokenClient {
  getToken(tokenId: string): Promise<NewApiTokenSnapshot>;
  isConfigured(): boolean;
}

class SupabaseNewApiTokenMappingRepository
  implements NewApiTokenMappingRepository
{
  async listEnabledMappings() {
    const client = getNexusSupabaseAdminClient();
    const { data, error } = await client
      .from("user_new_api_tokens" as never)
      .select(
        [
          "user_id",
          "new_api_token_name",
          "new_api_token_id",
          "new_api_group",
          "plan",
          "enabled",
        ].join(","),
      )
      .eq("enabled", true);

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as Array<Record<string, unknown>>)
      .map(mapTokenMappingRow)
      .filter((row): row is NewApiTokenMapping => row !== null);
  }
}

class HttpNewApiAdminTokenClient implements NewApiAdminTokenClient {
  isConfigured() {
    return Boolean(getNewApiAdminBaseUrl() && getNewApiAdminHeaders());
  }

  async getToken(tokenId: string) {
    const baseUrl = getNewApiAdminBaseUrl();
    const headers = getNewApiAdminHeaders();

    if (!baseUrl || !headers) {
      throw new Error("New API admin read access is not configured.");
    }

    const response = await fetch(`${baseUrl}/api/token/${encodeURIComponent(tokenId)}`, {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`New API admin token lookup failed with ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;
    const record = unwrapNewApiData(payload);

    return mapNewApiTokenSnapshot(record);
  }
}

class InMemoryNewApiAdminAuditStore implements SecurityAuditStore {
  private readonly entries: Array<SecurityAuditLogEntry> = [];

  all() {
    return [...this.entries];
  }

  clear() {
    this.entries.length = 0;
  }

  async insert(entry: SecurityAuditLogEntry) {
    this.entries.push(entry);
  }
}

const inMemoryAuditStore = new InMemoryNewApiAdminAuditStore();
let mappingRepositoryOverride: NewApiTokenMappingRepository | null = null;
let adminTokenClientOverride: NewApiAdminTokenClient | null = null;
let auditRepositoryOverride: SecurityAuditRepository | null = null;

export async function checkNewApiTokenDrift(input: {
  actorUserId: string;
  requestId?: string;
  repository?: NewApiTokenMappingRepository;
  tokenClient?: NewApiAdminTokenClient;
}): Promise<NewApiTokenDriftReport> {
  const repository =
    input.repository ?? mappingRepositoryOverride ?? createNewApiTokenMappingRepository();
  const tokenClient =
    input.tokenClient ?? adminTokenClientOverride ?? createNewApiAdminTokenClient();
  const mappings = await repository.listEnabledMappings();
  const items: NewApiTokenDriftItem[] = [];

  for (const mapping of mappings) {
    items.push(await checkMappingDrift(mapping, tokenClient));
  }

  const report = summarizeDriftItems(items);

  await recordNewApiAdminAudit({
    action: "new_api_token_drift_check",
    actorUserId: input.actorUserId,
    decision: "allowed",
    metadata: {
      checked: report.summary.checked,
      drifted: report.summary.drifted,
      missingTokenId: report.summary.missingTokenId,
      newApiLookupFailed: report.summary.newApiLookupFailed,
      unavailable: report.summary.unavailable,
    },
    reasonCode: "drift_check_completed",
    requestId: input.requestId,
    resourceId: null,
  });

  return report;
}

export async function recordNewApiTokenGroupSyncAttempt(input: {
  actorUserId: string;
  requestId?: string;
  targetGroup?: string | null;
  targetUserId?: string | null;
}) {
  await recordNewApiAdminAudit({
    action: "new_api_token_group_sync_attempt",
    actorUserId: input.actorUserId,
    decision: "requires_confirmation",
    metadata: {
      reason: "NEW_API_PARTIAL_GROUP_UPDATE_NOT_VERIFIED",
      targetGroup: input.targetGroup ?? null,
    },
    reasonCode: "manual_operation_required",
    requestId: input.requestId,
    resourceId: input.targetUserId ?? null,
  });
}

export function createNewApiTokenMappingRepository(): NewApiTokenMappingRepository {
  if (!hasSupabaseServiceRoleConfig()) {
    return {
      listEnabledMappings: async () => [],
    };
  }

  return new SupabaseNewApiTokenMappingRepository();
}

export function createNewApiAdminTokenClient(): NewApiAdminTokenClient {
  return new HttpNewApiAdminTokenClient();
}

export function setNewApiTokenMappingRepositoryForTests(
  repository: NewApiTokenMappingRepository,
) {
  mappingRepositoryOverride = repository;
}

export function setNewApiAdminTokenClientForTests(client: NewApiAdminTokenClient) {
  adminTokenClientOverride = client;
}

export function setNewApiAdminAuditRepositoryForTests(
  repository: SecurityAuditRepository,
) {
  auditRepositoryOverride = repository;
}

export function getInMemoryNewApiAdminAuditStore() {
  auditRepositoryOverride = new SecurityAuditRepository(inMemoryAuditStore);

  return inMemoryAuditStore;
}

export function resetNewApiTokenDriftServiceForTests() {
  mappingRepositoryOverride = null;
  adminTokenClientOverride = null;
  auditRepositoryOverride = null;
  inMemoryAuditStore.clear();
}

async function checkMappingDrift(
  mapping: NewApiTokenMapping,
  tokenClient: NewApiAdminTokenClient,
): Promise<NewApiTokenDriftItem> {
  const baseItem = {
    modelLimitSummary: null,
    newApiGroup: null,
    nexusGroup: normalizeGroup(mapping.newApiGroup),
    nexusPlan: mapping.plan,
    quotaSummary: null,
    tokenName: mapping.tokenName ?? null,
    userId: mapping.userId,
  };

  if (!mapping.tokenId?.trim()) {
    return {
      ...baseItem,
      groupMatch: null,
      status: "token_id_missing",
      suggestedAction: "fix_nexus_mapping_token_id",
    };
  }

  if (!tokenClient.isConfigured()) {
    return {
      ...baseItem,
      groupMatch: null,
      status: "new_api_admin_unavailable",
      suggestedAction: "configure_new_api_admin_read_access",
    };
  }

  try {
    const snapshot = await tokenClient.getToken(mapping.tokenId.trim());
    const newApiGroup = normalizeGroup(snapshot.group);
    const groupMatch = baseItem.nexusGroup === newApiGroup;

    return {
      ...baseItem,
      groupMatch,
      modelLimitSummary: snapshot.modelLimitSummary,
      newApiGroup,
      quotaSummary: snapshot.quotaSummary,
      status: "checked",
      suggestedAction: groupMatch
        ? "none"
        : "update_new_api_group_to_match_nexus_mapping",
    };
  } catch {
    return {
      ...baseItem,
      groupMatch: null,
      status: "new_api_lookup_failed",
      suggestedAction: "manual_new_api_lookup_required",
    };
  }
}

function summarizeDriftItems(items: NewApiTokenDriftItem[]): NewApiTokenDriftReport {
  return {
    items,
    summary: {
      checked: items.filter((item) => item.status === "checked").length,
      drifted: items.filter((item) => item.groupMatch === false).length,
      missingTokenId: items.filter((item) => item.status === "token_id_missing").length,
      newApiLookupFailed: items.filter((item) => item.status === "new_api_lookup_failed")
        .length,
      unavailable: items.filter((item) => item.status === "new_api_admin_unavailable")
        .length,
    },
  };
}

async function recordNewApiAdminAudit(input: {
  action: string;
  actorUserId: string;
  decision: PermissionAuditDecision;
  metadata: Record<string, unknown>;
  reasonCode: string;
  requestId?: string;
  resourceId: string | null;
}) {
  const auditRepository =
    auditRepositoryOverride ??
    (hasSupabaseServiceRoleConfig()
      ? SecurityAuditRepository.fromSupabase(
          getNexusSupabaseAdminClient() as unknown as SecuritySupabaseClient,
        )
      : new SecurityAuditRepository(inMemoryAuditStore));

  await auditRepository.record({
    action: input.action,
    actorUserId: input.actorUserId,
    decision: input.decision,
    metadata: createBackendMetadata(
      {
        actorId: input.actorUserId,
        requestId: input.requestId,
        source: "security",
      },
      {
        source: "security",
        ...toAuditJsonMetadata(input.metadata),
      },
    ),
    reasonCode: input.reasonCode,
    resourceId: input.resourceId,
    resourceType: "new_api_token_mapping",
    workspaceId: null,
  });
}

function toAuditJsonMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => isSafeJsonMetadataValue(value)),
  );
}

function isSafeJsonMetadataValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function mapTokenMappingRow(row: Record<string, unknown>): NewApiTokenMapping | null {
  const userId = asString(row.user_id);

  if (!userId) {
    return null;
  }

  return {
    enabled: row.enabled === true,
    newApiGroup: asString(row.new_api_group),
    plan: asString(row.plan) ?? "free",
    tokenId: asString(row.new_api_token_id),
    tokenName: asString(row.new_api_token_name),
    userId,
  };
}

function unwrapNewApiData(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.data)) {
    return payload.data;
  }

  return payload;
}

function mapNewApiTokenSnapshot(record: Record<string, unknown>): NewApiTokenSnapshot {
  return {
    group: asString(record.group) ?? asString(record.group_name),
    modelLimitSummary: summarizeModelLimit(
      record.model_limits ?? record.model_limit ?? record.models,
    ),
    quotaSummary: compactQuotaSummary({
      remainingQuota:
        asNumber(record.remain_quota) ??
        asNumber(record.remaining_quota) ??
        asNumber(record.quota),
      unlimited: asBoolean(record.unlimited_quota) ?? asBoolean(record.unlimited),
      usedQuota: asNumber(record.used_quota),
    }),
  };
}

function compactQuotaSummary(summary: QuotaSummary): QuotaSummary {
  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== null && value !== undefined),
  );
}

function summarizeModelLimit(value: unknown): ModelLimitSummary {
  const models = normalizeModelList(value);

  if (models) {
    return {
      count: models.length,
      models,
      restricted: models.length > 0,
    };
  }

  return {
    count: null,
    models: null,
    restricted: null,
  };
}

function normalizeModelList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed || trimmed === "*") {
      return null;
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  return null;
}

function getNewApiAdminBaseUrl() {
  const explicit = process.env.NEW_API_ADMIN_BASE_URL?.trim();
  const fromGateway = process.env.NEW_API_BASE_URL?.trim().replace(/\/v1\/?$/, "");
  const value = explicit || fromGateway;

  return value ? value.replace(/\/+$/, "") : null;
}

function getNewApiAdminHeaders(): Record<string, string> | null {
  const newApiUserId = process.env.NEW_API_ADMIN_USER_ID?.trim();
  const cookie = process.env.NEW_API_ADMIN_COOKIE?.trim();

  if (cookie) {
    return {
      Cookie: cookie,
      ...(newApiUserId ? { "New-Api-User": newApiUserId } : {}),
    } satisfies Record<string, string>;
  }

  const bearer = (
    process.env.NEW_API_ADMIN_BEARER_TOKEN ??
    process.env.NEW_API_ADMIN_KEY ??
    ""
  ).trim();

  if (bearer) {
    return {
      Authorization: `Bearer ${bearer}`,
      ...(newApiUserId ? { "New-Api-User": newApiUserId } : {}),
    } satisfies Record<string, string>;
  }

  return null;
}

function normalizeGroup(value: string | null | undefined) {
  const group = value?.trim();

  return group ? group : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
