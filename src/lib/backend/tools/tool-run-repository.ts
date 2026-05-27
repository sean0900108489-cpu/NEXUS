import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ToolRiskLevel,
  ToolRunRecord,
  ToolRunStatus,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type {
  Database,
  ToolRunInsert,
  Tool_Runs,
} from "@/lib/supabase/database.types";

export type CreateToolRunInput = {
  workspaceId: string;
  agentId?: string | null;
  taskId?: string | null;
  toolId: string;
  executorId?: string | null;
  status: ToolRunStatus;
  riskLevel: ToolRiskLevel;
  inputHash?: string | null;
  inputRedacted?: Record<string, unknown>;
  executableInput?: Record<string, unknown>;
  confirmationExpiresAt?: string | null;
  createdBy?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type PatchToolRunInput = {
  status?: ToolRunStatus;
  outputRedacted?: Record<string, unknown> | null;
  outputHash?: string | null;
  artifactId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  costEstimate?: number | null;
  confirmationExpiresAt?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type ToolRunQuery = {
  workspaceId: string;
  agentId?: string | null;
  limit?: number;
};

export interface ToolRunRepository {
  create(input: CreateToolRunInput): Promise<ToolRunRecord>;
  findById(id: string): Promise<ToolRunRecord | null>;
  findByWorkspace(query: ToolRunQuery): Promise<ToolRunRecord[]>;
  patch(id: string, input: PatchToolRunInput): Promise<ToolRunRecord>;
}

export class InMemoryToolRunRepository implements ToolRunRepository {
  private readonly toolRuns = new Map<string, ToolRunRecord>();

  async create(input: CreateToolRunInput) {
    const now = new Date().toISOString();
    const record: ToolRunRecord = {
      agentId: input.agentId ?? null,
      artifactId: null,
      confirmationExpiresAt: input.confirmationExpiresAt ?? null,
      confirmedAt: null,
      confirmedBy: null,
      costEstimate: null,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      endedAt: null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      executableInput: input.executableInput ?? {},
      executorId: input.executorId ?? null,
      id: makeUuid(),
      inputHash: input.inputHash ?? null,
      inputRedacted: input.inputRedacted ?? {},
      outputHash: null,
      outputRedacted: null,
      riskLevel: input.riskLevel,
      startedAt: null,
      status: input.status,
      taskId: input.taskId ?? null,
      toolId: input.toolId,
      workspaceId: input.workspaceId,
    };

    this.toolRuns.set(record.id, record);

    return record;
  }

  async findById(id: string) {
    return this.toolRuns.get(id) ?? null;
  }

  async findByWorkspace(query: ToolRunQuery) {
    return [...this.toolRuns.values()]
      .filter((toolRun) => toolRun.workspaceId === query.workspaceId)
      .filter((toolRun) => !query.agentId || toolRun.agentId === query.agentId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, query.limit ?? 50);
  }

  async patch(id: string, input: PatchToolRunInput) {
    const current = this.toolRuns.get(id);

    if (!current) {
      throw new Error("tool run not found");
    }

    const next: ToolRunRecord = {
      ...current,
      artifactId: input.artifactId === undefined ? current.artifactId : input.artifactId,
      confirmationExpiresAt:
        input.confirmationExpiresAt === undefined
          ? current.confirmationExpiresAt
          : input.confirmationExpiresAt,
      confirmedAt: input.confirmedAt === undefined ? current.confirmedAt : input.confirmedAt,
      confirmedBy: input.confirmedBy === undefined ? current.confirmedBy : input.confirmedBy,
      costEstimate:
        input.costEstimate === undefined ? current.costEstimate : input.costEstimate,
      endedAt: input.endedAt === undefined ? current.endedAt : input.endedAt,
      errorCode: input.errorCode === undefined ? current.errorCode : input.errorCode,
      errorMessage:
        input.errorMessage === undefined ? current.errorMessage : input.errorMessage,
      outputHash: input.outputHash === undefined ? current.outputHash : input.outputHash,
      outputRedacted:
        input.outputRedacted === undefined ? current.outputRedacted : input.outputRedacted,
      startedAt: input.startedAt === undefined ? current.startedAt : input.startedAt,
      status: input.status ?? current.status,
    };

    this.toolRuns.set(id, next);

    return next;
  }
}

export class SupabaseToolRunRepository implements ToolRunRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(input: CreateToolRunInput) {
    const row: ToolRunInsert = {
      agent_id: input.agentId ?? null,
      confirmation_expires_at: input.confirmationExpiresAt ?? null,
      created_by: input.createdBy ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      executable_input: input.executableInput ?? {},
      executor_id: input.executorId ?? null,
      input_hash: input.inputHash ?? null,
      input_redacted: input.inputRedacted ?? {},
      risk_level: input.riskLevel,
      status: input.status,
      task_id: input.taskId ?? null,
      tool_id: input.toolId,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("tool_runs")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapToolRun(data);
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("tool_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapToolRun(data) : null;
  }

  async findByWorkspace(query: ToolRunQuery) {
    let request = this.client
      .from("tool_runs")
      .select("*")
      .eq("workspace_id", query.workspaceId)
      .order("created_at", { ascending: false })
      .limit(query.limit ?? 50);

    if (query.agentId) {
      request = request.eq("agent_id", query.agentId);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapToolRun);
  }

  async patch(id: string, input: PatchToolRunInput) {
    const row: Partial<Tool_Runs> = {
      artifact_id: input.artifactId,
      confirmation_expires_at: input.confirmationExpiresAt,
      confirmed_at: input.confirmedAt,
      confirmed_by: input.confirmedBy,
      cost_estimate: input.costEstimate,
      ended_at: input.endedAt,
      error_code: input.errorCode,
      error_message: input.errorMessage,
      output_hash: input.outputHash,
      output_redacted: input.outputRedacted,
      started_at: input.startedAt,
      status: input.status,
    };
    const { data, error } = await this.client
      .from("tool_runs")
      .update(removeUndefined(row))
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapToolRun(data);
  }
}

const inMemoryToolRunRepository = new InMemoryToolRunRepository();

export function createToolRunRepository(): ToolRunRepository {
  return hasSupabaseServiceRoleConfig()
    ? new SupabaseToolRunRepository(getNexusSupabaseAdminClient())
    : inMemoryToolRunRepository;
}

function mapToolRun(row: Tool_Runs): ToolRunRecord {
  return {
    agentId: row.agent_id,
    artifactId: row.artifact_id,
    confirmationExpiresAt: row.confirmation_expires_at,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    costEstimate: row.cost_estimate,
    createdAt: row.created_at,
    createdBy: row.created_by,
    endedAt: row.ended_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    executableInput: isRecord(row.executable_input) ? row.executable_input : {},
    executorId: row.executor_id,
    id: row.id,
    inputHash: row.input_hash,
    inputRedacted: isRecord(row.input_redacted) ? row.input_redacted : {},
    outputHash: row.output_hash,
    outputRedacted: isRecord(row.output_redacted) ? row.output_redacted : null,
    riskLevel: row.risk_level as ToolRiskLevel,
    startedAt: row.started_at,
    status: row.status as ToolRunStatus,
    taskId: row.task_id,
    toolId: row.tool_id,
    workspaceId: row.workspace_id,
  };
}

function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function makeUuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
