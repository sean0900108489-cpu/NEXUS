import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = new URL("../../../../", import.meta.url);

describe("frontend bundle secret safety", () => {
  it("does not expose SUPABASE_SERVICE_ROLE_KEY as a NEXT_PUBLIC env var", () => {
    const envExample = readFileSync(new URL(".env.example", projectRoot), "utf8");

    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    expect(envExample).not.toContain("NEXT_PUBLIC_SERVICE_ROLE");
  });

  it("does not reference service-role keys from browser-accessible source", () => {
    const browserSource = [
      ...readFiles(new URL("src/lib/api", projectRoot).pathname),
      readFileSync(new URL("src/lib/state-sync.ts", projectRoot), "utf8"),
      ...readFiles(new URL("src/components", projectRoot).pathname),
      ...readFiles(new URL("src/store", projectRoot).pathname),
    ].join("\n");

    expect(browserSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(browserSource).not.toContain("service_role");
    expect(browserSource).not.toContain("@/lib/backend/security");
  });

  it("does not import a server-only Supabase admin client in browser code", () => {
    const browserSource = [
      ...readFiles(new URL("src/lib/api", projectRoot).pathname),
      readFileSync(new URL("src/lib/state-sync.ts", projectRoot), "utf8"),
      ...readFiles(new URL("src/components", projectRoot).pathname),
      ...readFiles(new URL("src/store", projectRoot).pathname),
    ].join("\n");

    expect(browserSource).not.toContain("@/lib/supabase/admin");
    expect(browserSource).not.toContain("createAdminSupabaseClient");
  });
});

function readFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return readFiles(path);
    }

    if (!/\.(ts|tsx)$/.test(entry)) {
      return [];
    }

    return readFileSync(path, "utf8");
  });
}
