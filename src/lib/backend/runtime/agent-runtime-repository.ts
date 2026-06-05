import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AgentRuntimeEventType,
  AgentRuntimeSessionRecord,
  AgentRuntimeSessionStatus,
  AgentTaskRecord,
  AgentTaskStatus,
  AgentTaskType,
} from "@/lib/nexus-types";
import {
  getNexusSupabaseAdminClient,
  hasSupabaseServiceRoleConfig,
} from "@/lib/supabase/admin";
import type { NexusSupabaseRequestClient } from "@/lib/supabase/request";
import type {
  AgentRuntimeEventInsert,
  AgentRuntimeSessionInsert,
  AgentTaskInsert,
  Agent_Runtime_Sessions,
  Agent_Tasks,
  Database,
} from "@/lib/supabase/database.types";

export type FindActiveSessionInput = {
  workspaceId: string;
  agentId: string;
  userId: string;
  provider?: string | null;
  model?: string | null;
};

export type CreateSessionInput = FindActiveSessionInput & {
  metadata?: Record<string, unknown>;
};

export type CreateTaskInput = {
  sessionId?: string | null;
  workspaceId: string;
  agentId: string;
  taskType: AgentTaskType;
  status: AgentTaskStatus;
  inputMessageId?: string | null;
  outputMessageId?: string | null;
  parentTaskId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PatchTaskInput = {
  status?: AgentTaskStatus;
  attemptCount?: number;
  errorCode?: string | null;
  outputMessageId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AppendRuntimeEventInput = {
  taskId: string;
  eventType: AgentRuntimeEventType;
  payload?: Record<string, unknown>;
};

export interface AgentRuntimeRepository {
  findActiveSession(input: FindActiveSessionInput): Promise<AgentRuntimeSessionRecord | null>;
  findSession(sessionId: string): Promise<AgentRuntimeSessionRecord | null>;
  createSession(input: CreateSessionInput): Promise<AgentRuntimeSessionRecord>;
  findTask(taskId: string): Promise<AgentTaskRecord | null>;
  createTask(input: CreateTaskInput): Promise<AgentTaskRecord>;
  patchTask(taskId: string, input: PatchTaskInput): Promise<AgentTaskRecord>;
  appendEvent(input: AppendRuntimeEventInput): Promise<void>;
}

export class InMemoryAgentRuntimeRepository implements AgentRuntimeRepository {
  private readonly sessions = new Map<string, AgentRuntimeSessionRecord>();
  private readonly tasks = new Map<string, AgentTaskRecord>();
  readonly events: Array<AppendRuntimeEventInput & { createdAt: string }> = [];

  async findActiveSession(input: FindActiveSessionInput) {
    return (
      [...this.sessions.values()].find(
        (session) =>
          session.workspaceId === input.workspaceId &&
          session.agentId === input.agentId &&
          session.userId === input.userId &&
          session.status === "active" &&
          !session.endedAt &&
          (session.provider ?? null) === (input.provider ?? null) &&
          (session.model ?? null) === (input.model ?? null),
      ) ?? null
    );
  }

  async findSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async createSession(input: CreateSessionInput) {
    const now = new Date().toISOString();
    const session: AgentRuntimeSessionRecord = {
      agentId: input.agentId,
      endedAt: null,
      id: makeUuid(),
      metadata: input.metadata ?? {},
      model: input.model ?? null,
      provider: input.provider ?? null,
      startedAt: now,
      status: "active",
      userId: input.userId,
      workspaceId: input.workspaceId,
    };

    this.sessions.set(session.id, session);

    return session;
  }

  async findTask(taskId: string) {
    return this.tasks.get(taskId) ?? null;
  }

  async createTask(input: CreateTaskInput) {
    const now = new Date().toISOString();
    const task: AgentTaskRecord = {
      agentId: input.agentId,
      attemptCount: 0,
      createdAt: now,
      errorCode: null,
      id: makeUuid(),
      inputMessageId: input.inputMessageId ?? null,
      metadata: input.metadata ?? {},
      outputMessageId: input.outputMessageId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      sessionId: input.sessionId ?? null,
      status: input.status,
      taskType: input.taskType,
      updatedAt: now,
      workspaceId: input.workspaceId,
    };

    this.tasks.set(task.id, task);

    return task;
  }

  async patchTask(taskId: string, input: PatchTaskInput) {
    const current = this.tasks.get(taskId);

    if (!current) {
      throw new Error("agent task not found");
    }

    const task: AgentTaskRecord = {
      ...current,
      attemptCount: input.attemptCount ?? current.attemptCount,
      errorCode: input.errorCode === undefined ? current.errorCode : input.errorCode,
      metadata: input.metadata ?? current.metadata,
      outputMessageId: input.outputMessageId ?? current.outputMessageId,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);

    return task;
  }

  async appendEvent(input: AppendRuntimeEventInput) {
    this.events.push({
      ...input,
      createdAt: new Date().toISOString(),
    });
  }
}

export class SupabaseAgentRuntimeRepository implements AgentRuntimeRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findActiveSession(input: FindActiveSessionInput) {
    let query = this.client
      .from("agent_runtime_sessions")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("agent_id", input.agentId)
      .eq("user_id", input.userId)
      .eq("status", "active")
      .is("ended_at", null);

    query = input.provider ? query.eq("provider", input.provider) : query.is("provider", null);
    query = input.model ? query.eq("model", input.model) : query.is("model", null);

    const { data, error } = await query
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSession(data) : null;
  }

  async findSession(sessionId: string) {
    const { data, error } = await this.client
      .from("agent_runtime_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSession(data) : null;
  }

  async createSession(input: CreateSessionInput) {
    const row: AgentRuntimeSessionInsert = {
      agent_id: input.agentId,
      metadata: input.metadata ?? {},
      model: input.model ?? null,
      provider: input.provider ?? null,
      started_at: new Date().toISOString(),
      status: "active",
      user_id: input.userId,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("agent_runtime_sessions")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapSession(data);
  }

  async findTask(taskId: string) {
    const { data, error } = await this.client
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapTask(data) : null;
  }

  async createTask(input: CreateTaskInput) {
    const row: AgentTaskInsert = {
      agent_id: input.agentId,
      input_message_id: input.inputMessageId ?? null,
      metadata: input.metadata ?? {},
      output_message_id: input.outputMessageId ?? null,
      parent_task_id: input.parentTaskId ?? null,
      session_id: input.sessionId ?? null,
      status: input.status,
      task_type: input.taskType,
      workspace_id: input.workspaceId,
    };
    const { data, error } = await this.client
      .from("agent_tasks")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapTask(data);
  }

  async patchTask(taskId: string, input: PatchTaskInput) {
    const row: Partial<Agent_Tasks> = {
      attempt_count: input.attemptCount,
      error_code: input.errorCode,
      metadata: input.metadata,
      output_message_id: input.outputMessageId,
      status: input.status,
    };
    const { data, error } = await this.client
      .from("agent_tasks")
      .update(removeUndefined(row))
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapTask(data);
  }

  async appendEvent(input: AppendRuntimeEventInput) {
    const row: AgentRuntimeEventInsert = {
      event_type: input.eventType,
      payload: input.payload ?? {},
      task_id: input.taskId,
    };
    const { error } = await this.client
      .from("agent_runtime_events")
      .insert(row);

    if (error) {
      throw new Error(error.message);
    }
  }
}

const inMemoryAgentRuntimeRepository = new InMemoryAgentRuntimeRepository();

export function createAgentRuntimeRepository(
  input: {
    forceInMemory?: boolean;
    requestClient?: NexusSupabaseRequestClient | null;
  } = {},
): AgentRuntimeRepository {
  if (input.forceInMemory) {
    return inMemoryAgentRuntimeRepository;
  }

  if (hasSupabaseServiceRoleConfig()) {
    return new SupabaseAgentRuntimeRepository(getNexusSupabaseAdminClient());
  }

  if (input.requestClient) {
    return new SupabaseAgentRuntimeRepository(input.requestClient);
  }

  return inMemoryAgentRuntimeRepository;
}

function mapSession(row: Agent_Runtime_Sessions): AgentRuntimeSessionRecord {
  return {
    agentId: row.agent_id,
    endedAt: row.ended_at,
    id: row.id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    model: row.model,
    provider: row.provider,
    startedAt: row.started_at,
    status: row.status as AgentRuntimeSessionStatus,
    userId: row.user_id,
    workspaceId: row.workspace_id,
  };
}

function mapTask(row: Agent_Tasks): AgentTaskRecord {
  return {
    agentId: row.agent_id,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    errorCode: row.error_code,
    id: row.id,
    inputMessageId: row.input_message_id,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    outputMessageId: row.output_message_id,
    parentTaskId: row.parent_task_id,
    sessionId: row.session_id,
    status: row.status as AgentTaskStatus,
    taskType: row.task_type as AgentTaskType,
    updatedAt: row.updated_at,
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
