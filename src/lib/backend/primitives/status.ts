export const BACKEND_STATUSES = [
  "created",
  "pending",
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
  "expired",
] as const;

export type BackendStatus = (typeof BACKEND_STATUSES)[number];

const terminalStatuses = new Set<BackendStatus>([
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
  "expired",
]);

export function isTerminalBackendStatus(status: BackendStatus) {
  return terminalStatuses.has(status);
}
