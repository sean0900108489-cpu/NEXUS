import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("productized model panel source", () => {
  it("does not expose user-facing provider credential controls in the right panel", () => {
    const source = readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("Providers / Model Vault");
    expect(source).not.toContain("DeepSeek API key");
    expect(source).not.toContain('type="password"');
    expect(source).not.toContain("/api/v1/providers/verify");
  });
});
