import type { SupabaseClient } from "@supabase/supabase-js";

import type { FeatureFlagProvider } from "@/lib/backend/contracts/feature-flags";
import type {
  FeatureFlagProjection,
  FeatureFlagScopeKey,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  FeatureFlagInsert,
  Feature_Flags,
} from "@/lib/supabase/database.types";

import { SecretBoundaryService } from "../security/secret-boundary-service";

export type FeatureFlagRecord = {
  id: string;
  flagKey: string;
  scopeKey: FeatureFlagScopeKey;
  enabled: boolean;
  rolloutPercentage: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FeatureFlagContext = {
  workspaceId?: string;
  userId?: string;
};

export type ToggleFeatureFlagInput = {
  flagKey: string;
  scopeKey?: FeatureFlagScopeKey;
  workspaceId?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  metadata?: Record<string, unknown>;
};

export interface FeatureFlagRepository {
  list(scopeKeys: string[]): Promise<FeatureFlagRecord[]>;
  find(flagKey: string, scopeKeys: string[]): Promise<FeatureFlagRecord[]>;
  upsert(input: ToggleFeatureFlagInput & { scopeKey: string; rolloutPercentage: number }): Promise<FeatureFlagRecord>;
}

export class InMemoryFeatureFlagRepository implements FeatureFlagRepository {
  private readonly flags = new Map<string, FeatureFlagRecord>();

  async list(scopeKeys: string[]) {
    const scopeSet = new Set(scopeKeys);

    return [...this.flags.values()].filter((flag) => scopeSet.has(flag.scopeKey));
  }

  async find(flagKey: string, scopeKeys: string[]) {
    const scopeSet = new Set(scopeKeys);

    return [...this.flags.values()].filter(
      (flag) => flag.flagKey === flagKey && scopeSet.has(flag.scopeKey),
    );
  }

  async upsert(input: ToggleFeatureFlagInput & { scopeKey: string; rolloutPercentage: number }) {
    const now = new Date().toISOString();
    const key = makeFlagKey(input.flagKey, input.scopeKey);
    const current = this.flags.get(key);
    const record: FeatureFlagRecord = {
      createdAt: current?.createdAt ?? now,
      enabled: input.enabled,
      flagKey: input.flagKey,
      id: current?.id ?? makeId("flag"),
      metadata: input.metadata ?? {},
      rolloutPercentage: input.rolloutPercentage,
      scopeKey: input.scopeKey,
      updatedAt: now,
    };

    this.flags.set(key, record);

    return record;
  }
}

export class SupabaseFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(scopeKeys: string[]) {
    const { data, error } = await this.client
      .from("feature_flags")
      .select("*")
      .in("scope_key", scopeKeys);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapFeatureFlag);
  }

  async find(flagKey: string, scopeKeys: string[]) {
    const { data, error } = await this.client
      .from("feature_flags")
      .select("*")
      .eq("flag_key", flagKey)
      .in("scope_key", scopeKeys);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapFeatureFlag);
  }

  async upsert(input: ToggleFeatureFlagInput & { scopeKey: string; rolloutPercentage: number }) {
    const row: FeatureFlagInsert = {
      enabled: input.enabled,
      flag_key: input.flagKey,
      metadata: input.metadata ?? {},
      rollout_percentage: input.rolloutPercentage,
      scope_key: input.scopeKey,
    };
    const { data, error } = await this.client
      .from("feature_flags")
      .upsert(row, {
        onConflict: "flag_key,scope_key",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFeatureFlag(data);
  }
}

export class FeatureFlagService implements FeatureFlagProvider {
  private readonly repository: FeatureFlagRepository;
  private readonly secretBoundaryService: SecretBoundaryService;

  constructor(dependencies: {
    repository?: FeatureFlagRepository;
    secretBoundaryService?: SecretBoundaryService;
  } = {}) {
    this.repository = dependencies.repository ?? createFeatureFlagRepository();
    this.secretBoundaryService =
      dependencies.secretBoundaryService ?? new SecretBoundaryService();
  }

  async isEnabled(flagKey: string, context: FeatureFlagContext = {}) {
    const records = await this.repository.find(flagKey, scopeKeysFor(context));
    const record = chooseMostSpecific(records, context.workspaceId);

    if (!record || !record.enabled || record.rolloutPercentage <= 0) {
      return false;
    }

    if (record.rolloutPercentage >= 100) {
      return true;
    }

    return (
      stablePercentageBucket([
        context.workspaceId ?? "__global__",
        context.userId ?? "__anonymous__",
        flagKey,
      ].join(":")) < record.rolloutPercentage
    );
  }

  async listFlags(context: FeatureFlagContext = {}) {
    const records = await this.repository.list(scopeKeysFor(context));
    const selected = chooseVisibleFlags(records, context.workspaceId);
    const flags: FeatureFlagProjection[] = [];

    for (const record of selected) {
      flags.push({
        enabled: await this.isEnabled(record.flagKey, context),
        flagKey: record.flagKey,
        rolloutPercentage: record.rolloutPercentage,
        scopeKey: record.scopeKey,
      });
    }

    return flags.sort((left, right) => left.flagKey.localeCompare(right.flagKey));
  }

  async toggleFlag(input: ToggleFeatureFlagInput) {
    this.assertValidToggle(input);
    const scopeKey = input.scopeKey ?? input.workspaceId ?? "__global__";
    const rolloutPercentage =
      input.rolloutPercentage ?? (input.enabled ? 100 : 0);
    const redactedMetadata = this.secretBoundaryService.redact(input.metadata ?? {});

    this.secretBoundaryService.assertNoSecrets(redactedMetadata);

    const record = await this.repository.upsert({
      ...input,
      metadata: isRecord(redactedMetadata) ? redactedMetadata : {},
      rolloutPercentage,
      scopeKey,
    });

    return {
      enabled: record.enabled,
      flagKey: record.flagKey,
      rolloutPercentage: record.rolloutPercentage,
      scopeKey: record.scopeKey,
    } satisfies FeatureFlagProjection;
  }

  private assertValidToggle(input: ToggleFeatureFlagInput) {
    if (!input.flagKey.trim()) {
      throw new Error("flagKey is required");
    }

    if (
      input.rolloutPercentage !== undefined &&
      (!Number.isInteger(input.rolloutPercentage) ||
        input.rolloutPercentage < 0 ||
        input.rolloutPercentage > 100)
    ) {
      throw new Error("rolloutPercentage must be between 0 and 100");
    }
  }
}

const inMemoryFeatureFlagRepository = new InMemoryFeatureFlagRepository();

export function createFeatureFlagRepository(): FeatureFlagRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseFeatureFlagRepository(getNexusSupabaseAdminClient())
    : inMemoryFeatureFlagRepository;
}

export function createFeatureFlagService() {
  return new FeatureFlagService();
}

function scopeKeysFor(context: FeatureFlagContext) {
  return context.workspaceId
    ? ["__global__", context.workspaceId]
    : ["__global__"];
}

function chooseVisibleFlags(records: FeatureFlagRecord[], workspaceId?: string) {
  const selected = new Map<string, FeatureFlagRecord>();
  const sorted = [...records].sort((left, right) =>
    specificity(left, workspaceId) - specificity(right, workspaceId),
  );

  for (const record of sorted) {
    selected.set(record.flagKey, record);
  }

  return [...selected.values()];
}

function chooseMostSpecific(records: FeatureFlagRecord[], workspaceId?: string) {
  return [...records].sort(
    (left, right) => specificity(right, workspaceId) - specificity(left, workspaceId),
  )[0];
}

function specificity(record: FeatureFlagRecord, workspaceId?: string) {
  return workspaceId && record.scopeKey === workspaceId ? 2 : 1;
}

function stablePercentageBucket(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 100;
}

function mapFeatureFlag(row: Feature_Flags): FeatureFlagRecord {
  return {
    createdAt: row.created_at,
    enabled: row.enabled,
    flagKey: row.flag_key,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    rolloutPercentage: row.rollout_percentage,
    scopeKey: row.scope_key,
    updatedAt: row.updated_at,
  };
}

function makeFlagKey(flagKey: string, scopeKey: string) {
  return `${scopeKey}:${flagKey}`;
}

function makeId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
