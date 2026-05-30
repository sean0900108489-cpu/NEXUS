import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createNexusSkinPackAuthoringContextV1,
  getNexusSkinPackIssueRepairHintV1,
  validateNexusSkinPackV2,
} from "@/lib/style-engine";

describe("NEXUS Skin Pack V2 authoring context", () => {
  it("provides valid minimal and pixel workshop examples", () => {
    const context = createNexusSkinPackAuthoringContextV1();
    const minimal = JSON.parse(context.minimalJson) as unknown;
    const pixelWorkshop = JSON.parse(context.pixelWorkshopJson) as unknown;

    expect(validateNexusSkinPackV2(minimal).accepted).toBe(true);
    expect(validateNexusSkinPackV2(pixelWorkshop).accepted).toBe(true);
    expect(context.promptTemplate).toContain(
      "Use this skeleton, only replace allowed values.",
    );
    expect(context.contextText).toContain("Token-only preview scope");
    expect(context.forbiddenOutputs.join(" ")).toContain("raw CSS");
    expect(context.reviewOnlyFields.join(" ")).toContain("assets");
  });

  it("explains common rejected issue codes without exposing payload data", () => {
    expect(
      getNexusSkinPackIssueRepairHintV1("stylePack.invalidManifestPayload"),
    ).toContain("V1 manifest");
    expect(
      getNexusSkinPackIssueRepairHintV1("contract.forbiddenBehaviorField"),
    ).toContain("Remove");
    expect(getNexusSkinPackIssueRepairHintV1("unknown.future")).toContain(
      "accepted fixture shape",
    );
  });

  it("keeps the authoring context helper pure and local", () => {
    const source = readFileSync(
      new URL("v2-authoring-context.ts", import.meta.url),
      "utf8",
    );
    const forbidden = [
      /from\s+["']@\/components\//,
      /from\s+["']@\/app\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@supabase\//,
      /from\s+["']@xyflow\//,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
      /\bfetch\s*\(/,
    ];

    for (const pattern of forbidden) {
      expect(source, `v2-authoring-context.ts should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
