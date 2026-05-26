import type {
  AgentMediaArtifact,
  AgentTool,
  NexusAgent,
  ToolExecutorPermissions,
} from "@/lib/nexus-types";
import {
  MockImageAdapter,
  executeImageAdapterForAgent,
} from "@/lib/adapters/image-adapter";
import {
  LOCAL_FS_SCANNER_PERMISSIONS,
  LocalFsScannerExecutor,
} from "@/lib/tools/fs-scanner-executor";
import { WebSurferExecutor } from "@/lib/tools/web-surfer-executor";

export type ToolExecutorResult = {
  content: string;
  media?: AgentMediaArtifact;
};

export type ToolExecutorInput = {
  apiKey?: string;
  path?: string;
  prompt?: string;
  url?: string;
};

export type ToolExecutor = {
  id: string;
  label: string;
  permissions?: ToolExecutorPermissions;
  run: (
    agent: NexusAgent,
    tool: AgentTool,
    input?: ToolExecutorInput,
  ) => Promise<ToolExecutorResult>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createPlaceholderUrl({
  accent,
  label,
  prompt,
}: {
  accent: string;
  label: string;
  prompt: string;
}) {
  const safePrompt = escapeSvgText(prompt.slice(0, 118));
  const safeLabel = escapeSvgText(label);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#020617"/>
          <stop offset="0.5" stop-color="#0f172a"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect width="1280" height="720" fill="url(#grid)" opacity="0.45"/>
      <rect x="72" y="74" width="1136" height="572" fill="rgba(2,6,23,0.64)" stroke="${accent}" stroke-width="2"/>
      <text x="104" y="138" fill="${accent}" font-family="monospace" font-size="28" letter-spacing="6">${safeLabel}</text>
      <text x="104" y="212" fill="#e2e8f0" font-family="monospace" font-size="46" font-weight="700">MOCK MEDIA ARTIFACT</text>
      <text x="104" y="286" fill="#94a3b8" font-family="monospace" font-size="24">${safePrompt}</text>
      <circle cx="1088" cy="520" r="78" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="2"/>
      <path d="M1062 480 L1062 560 L1130 520 Z" fill="${accent}" opacity="0.88"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const toolExecutors: Record<string, ToolExecutor> = {
  "mock.review-mesh": {
    id: "mock.review-mesh",
    label: "Review Mesh",
    async run(agent, tool) {
      return {
        content: [
          `${tool.name} completed a mock reliability pass for ${agent.callsign}.`,
          `Mission checked: ${agent.mission}`,
          "Result: no blocking defects found. Future L2 can attach this to real review tools.",
        ].join(" "),
      };
    },
  },
  "mock-image-gen": {
    id: "mock-image-gen",
    label: "Mock Image Gen",
    async run(agent, tool, input) {
      const prompt = input?.prompt?.trim() || "Futuristic AI operations command center.";
      const result = await new MockImageAdapter({
        agent,
        prompt,
        toolName: tool.name,
      }).execute();

      return result;
    },
  },
  "real-image-gen": {
    id: "real-image-gen",
    label: "Image Adapter",
    async run(agent, tool, input) {
      const prompt = input?.prompt?.trim() || "Futuristic AI operations command center.";
      const result = await executeImageAdapterForAgent({
        agent,
        apiKey: input?.apiKey,
        prompt,
        toolName: tool.name,
      });

      return result;
    },
  },
  "real-file-scanner": {
    id: "real-file-scanner",
    label: "Project Scanner",
    permissions: LOCAL_FS_SCANNER_PERMISSIONS,
    async run(_agent, _tool, input) {
      const result = await new LocalFsScannerExecutor({
        scanPath: input?.path?.trim() || "./src",
      }).execute();

      return {
        content: result.markdown,
      };
    },
  },
  "web-surfer": {
    id: "web-surfer",
    label: "Web Surfer",
    async run(_agent, _tool, input) {
      const url = input?.url?.trim() || input?.prompt?.trim();

      if (!url) {
        return {
          content:
            "Web Surfer is online. Provide a URL as tool input to retrieve a lightweight markdown page context.",
        };
      }

      const result = await new WebSurferExecutor(url).execute();

      return {
        content: result.markdown,
      };
    },
  },
  "mock-video-gen": {
    id: "mock-video-gen",
    label: "Mock Video Gen",
    async run(agent, tool, input) {
      const prompt =
        input?.prompt?.trim() || "Storyboard a cinematic AI operations workflow.";

      await sleep(1200);

      const media: AgentMediaArtifact = {
        type: "video",
        prompt,
        createdAt: new Date().toISOString(),
        url: createPlaceholderUrl({
          accent: agent.accent,
          label: `${agent.callsign} / ${tool.name}`,
          prompt,
        }),
      };

      return {
        content: [
          `${tool.name} completed a mock video generation pass for ${agent.callsign}.`,
          `Prompt: ${prompt}`,
          `Placeholder video preview URL: ${media.url}`,
        ].join("\n"),
        media,
      };
    },
  },
};

export function hasToolExecutor(tool: AgentTool) {
  return Boolean(tool.executorId && toolExecutors[tool.executorId]);
}
