/**
 * NEXUS Window OS — Notification Types
 *
 * @module kernel/notifications/notification-types
 */

export type NexusNotificationType = "info" | "warning" | "error" | "success";

export type NexusNotification = {
  /** Unique notification ID */
  id: string;

  /** Severity / type */
  type: NexusNotificationType;

  /** Short title */
  title: string;

  /** Optional detail message */
  message?: string;

  /** ISO timestamp */
  createdAt: string;

  /** True when dismissed by user */
  dismissed: boolean;

  /** Auto-dismiss after this many ms (0 = manual only) */
  autoDismissMs?: number;
};
