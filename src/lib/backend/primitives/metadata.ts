import type { RequestId, TraceId, UserId } from "./ids";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type BackendSource =
  | "api"
  | "sync"
  | "agent"
  | "tool"
  | "artifact"
  | "database"
  | "provider"
  | "security"
  | "deployment"
  | "history";

export type RedactionStatus = "clean" | "redacted" | "hash_only";

export type BackendProvenance = {
  source?: BackendSource;
  actorId?: UserId;
  requestId?: RequestId;
  traceId?: TraceId;
  createdAt?: string;
  reason?: string;
  [key: string]: JsonValue | undefined;
};

export type BackendMetadata = {
  schemaVersion?: number;
  source?: BackendSource;
  registryVersion?: string;
  redactionStatus?: RedactionStatus;
  provenance: BackendProvenance;
  [key: string]: JsonValue | BackendProvenance | undefined;
};

export function createBackendMetadata(
  provenance: BackendProvenance,
  metadata: Omit<BackendMetadata, "provenance"> = {},
): BackendMetadata {
  return {
    ...metadata,
    provenance,
  };
}
