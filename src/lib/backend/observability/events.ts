import type { BackendStatus } from "../primitives/status";
import type { JsonValue } from "../primitives/metadata";
import type { TraceContext } from "./trace-context";
import { getDefaultObservabilityService } from "./observability-service";

export type BackendEvent = {
  name: string;
  trace: TraceContext;
  status?: BackendStatus;
  payload?: Record<string, JsonValue | undefined>;
  occurredAt?: string;
};

export type EmitBackendEvent = (event: BackendEvent) => void | Promise<void>;

export const emitBackendEvent: EmitBackendEvent = (event) => {
  getDefaultObservabilityService().emit(event);
};
