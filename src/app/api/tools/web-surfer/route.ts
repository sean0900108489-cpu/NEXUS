import type { WebSurferResult } from "@/lib/nexus-types";
import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";

export const runtime = "nodejs";

const JINA_READER_PREFIX = "https://r.jina.ai/";
const MAX_CONTENT_CHARS = 60_000;
const REQUEST_TIMEOUT_MS = 12_000;

type WebSurferPayload = {
  url?: unknown;
};

function normalizeTargetUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

async function readPostUrl(request: Request) {
  try {
    const payload = (await request.json()) as WebSurferPayload;

    return normalizeTargetUrl(payload.url);
  } catch {
    return undefined;
  }
}

function timeoutSignal() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

async function surfUrl(url: string) {
  const readerUrl = `${JINA_READER_PREFIX}${url}`;
  const timeout = timeoutSignal();

  try {
    const response = await fetch(readerUrl, {
      headers: {
        Accept: "text/plain, text/markdown;q=0.9, */*;q=0.1",
      },
      signal: timeout.signal,
    });

    if (!response.ok) {
      return Response.json(
        {
          error: `Web Surfer failed with HTTP ${response.status}.`,
          url,
        },
        { status: response.status },
      );
    }

    const rawContent = await response.text();
    const content = rawContent.trim().slice(0, MAX_CONTENT_CHARS);
    const result: WebSurferResult = {
      url,
      readerUrl,
      content,
      fetchedAt: new Date().toISOString(),
      truncated: rawContent.length > MAX_CONTENT_CHARS,
    };

    return Response.json(result);
  } catch (error) {
    const aborted =
      error instanceof DOMException ||
      (error instanceof Error && error.name === "AbortError");

    return Response.json(
      {
        error: aborted ? "Web Surfer request timed out." : "Web Surfer request failed.",
        url,
      },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    timeout.cleanup();
  }
}

export async function GET(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  const requestUrl = new URL(request.url);
  const url = normalizeTargetUrl(requestUrl.searchParams.get("url"));

  if (!url) {
    return Response.json(
      { error: "A valid http(s) url query parameter is required." },
      { status: 400 },
    );
  }

  return surfUrl(url);
}

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  const url = await readPostUrl(request);

  if (!url) {
    return Response.json(
      { error: "A valid http(s) url field is required." },
      { status: 400 },
    );
  }

  return surfUrl(url);
}
