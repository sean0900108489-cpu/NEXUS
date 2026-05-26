import type {
  FileSystemScanResult,
  FileSystemTreeNode,
  IToolExecutor,
  ToolExecutorPermissions,
} from "@/lib/nexus-types";

export type LocalFsScannerExecutorResult = {
  markdown: string;
  tree: FileSystemScanResult;
};

export const LOCAL_FS_SCANNER_PERMISSIONS = {
  allowedPaths: ["./src", "./public"],
  readOnly: true,
} satisfies ToolExecutorPermissions;

type LocalFsScannerExecutorOptions = {
  maxDepth?: number;
  scanPath?: string;
};

function formatTree(node: FileSystemTreeNode, depth = 0): string[] {
  const prefix = depth === 0 ? "" : `${"  ".repeat(depth - 1)}- `;
  const suffix = node.type === "directory" ? "/" : "";
  const lines = [`${prefix}${node.name}${suffix}`];

  for (const child of node.children ?? []) {
    lines.push(...formatTree(child, depth + 1));
  }

  return lines;
}

function formatScanResult(scan: FileSystemScanResult) {
  return [
    `# Project Scanner`,
    ``,
    `Root: \`${scan.root}\``,
    `Max depth: \`${scan.maxDepth}\``,
    `Ignored: ${scan.ignored.map((name) => `\`${name}\``).join(", ")}`,
    `Scanned: \`${scan.scannedAt}\``,
    ``,
    "```text",
    ...formatTree(scan.tree),
    "```",
  ].join("\n");
}

export class LocalFsScannerExecutor implements IToolExecutor {
  id = "real-file-scanner";
  type = "local-fs" as const;
  permissions = LOCAL_FS_SCANNER_PERMISSIONS;

  private readonly maxDepth: number;
  private readonly scanPath: string;

  constructor({ maxDepth = 3, scanPath = "./src" }: LocalFsScannerExecutorOptions = {}) {
    this.maxDepth = maxDepth;
    this.scanPath = scanPath;
  }

  async execute(): Promise<LocalFsScannerExecutorResult> {
    const response = await fetch("/api/tools/fs-scanner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maxDepth: this.maxDepth, path: this.scanPath }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      throw new Error(detail || `FS scanner returned ${response.status}.`);
    }

    const tree = (await response.json()) as FileSystemScanResult;

    return {
      markdown: formatScanResult(tree),
      tree,
    };
  }
}
