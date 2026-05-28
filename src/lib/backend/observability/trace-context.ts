import type { BackendSource } from "../primitives/metadata";
import type {
  RequestId,
  ResourceId,
  TraceId,
  UserId,
  WorkspaceId,
} from "../primitives/ids";

export type TraceContext = {
  requestId: RequestId;
  traceId: TraceId;
  workspaceId?: WorkspaceId;
  userId?: UserId;
  source: BackendSource;
  resourceType?: string;
  resourceId?: ResourceId;
};
