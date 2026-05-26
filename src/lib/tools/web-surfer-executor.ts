import type { IToolExecutor, WebSurferResult } from "@/lib/nexus-types";

export type WebSurferExecutorResult = {
  markdown: string;
  page: WebSurferResult;
};

const MAX_CONTEXT_CHARS = 24_000;

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatWebpageContext(page: WebSurferResult) {
  const body = page.content.slice(0, MAX_CONTEXT_CHARS);
  const clipped = page.truncated || page.content.length > MAX_CONTEXT_CHARS;

  return [
    `# Web Surfer`,
    ``,
    `Webpage content from [${page.url}](${page.url})`,
    `Reader source: ${page.readerUrl}`,
    `Fetched: \`${page.fetchedAt}\``,
    clipped ? `Context note: content clipped for lightweight tool payload.` : undefined,
    ``,
    body || "_No readable page content returned._",
  ]
    .filter(Boolean)
    .join("\n");
}

export class WebSurferExecutor implements IToolExecutor {
  id = "web-surfer";
  type = "rest-api" as const;

  constructor(private readonly url = "") {}

  async execute(): Promise<WebSurferExecutorResult> {
    const url = normalizeUrl(this.url);

    if (!url) {
      throw new Error("Web Surfer requires a valid URL.");
    }

    const response = await fetch("/api/tools/web-surfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new Error(detail || `Web Surfer returned ${response.status}.`);
    }

    const page = (await response.json()) as WebSurferResult;

    return {
      markdown: formatWebpageContext(page),
      page,
    };
  }
}
