import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../api/api-errors";

import {
  HISTORY_CURSOR_TTL_MS,
  clampActiveWindowLimit,
  clampHistoryLimit,
} from "./history-constants";

type CursorDirection = "older";

export type HistoryCursorPayload = {
  agentId: string;
  createdAt: string;
  direction: CursorDirection;
  expiresAt: number;
  id: string;
  workspaceId: string;
};

export type ActiveWindowPolicy = {
  keepLatest: number;
};

export class StoragePartitionService {
  constructor(
    private readonly cursorSecret = resolveCursorSecret(),
    private readonly now = () => Date.now(),
  ) {}

  createCursor(input: Omit<HistoryCursorPayload, "direction" | "expiresAt">) {
    const payload: HistoryCursorPayload = {
      ...input,
      direction: "older",
      expiresAt: this.now() + HISTORY_CURSOR_TTL_MS,
    };
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(body);

    return `${body}.${signature}`;
  }

  parseCursor(
    token: string | null | undefined,
    scope: { workspaceId: string; agentId: string },
  ): HistoryCursorPayload | null {
    if (!token) {
      return null;
    }

    const [body, signature] = token.split(".");

    if (!body || !signature || !this.verify(body, signature)) {
      throw new ApiError(
        "HISTORY_CURSOR_EXPIRED",
        "History cursor has expired or is invalid.",
        410,
      );
    }

    const payload = parsePayload(body);

    if (
      !payload ||
      payload.workspaceId !== scope.workspaceId ||
      payload.agentId !== scope.agentId ||
      payload.direction !== "older" ||
      payload.expiresAt <= this.now()
    ) {
      throw new ApiError(
        "HISTORY_CURSOR_EXPIRED",
        "History cursor has expired or is invalid.",
        410,
      );
    }

    return payload;
  }

  normalizeLimit(limit: unknown) {
    return clampHistoryLimit(limit);
  }

  normalizeActiveWindowPolicy(input: { keepLatest?: number | null }): ActiveWindowPolicy {
    return {
      keepLatest: clampActiveWindowLimit(input.keepLatest),
    };
  }

  private sign(body: string) {
    return createHmac("sha256", this.cursorSecret).update(body).digest("base64url");
  }

  private verify(body: string, signature: string) {
    const expected = this.sign(body);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}

function parsePayload(body: string): HistoryCursorPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<HistoryCursorPayload>;

    if (
      typeof decoded.workspaceId !== "string" ||
      typeof decoded.agentId !== "string" ||
      typeof decoded.createdAt !== "string" ||
      typeof decoded.id !== "string" ||
      typeof decoded.expiresAt !== "number" ||
      decoded.direction !== "older"
    ) {
      return null;
    }

    return decoded as HistoryCursorPayload;
  } catch {
    return null;
  }
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function resolveCursorSecret() {
  return (
    process.env.HISTORY_CURSOR_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "nexus-history-local-development-secret"
  );
}
