import { describe, expect, it } from "vitest";

import {
  createNexusStyleCanonicalJsonV1,
  createNexusStyleChecksumV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine checksum helpers", () => {
  it("canonicalizes object keys deterministically without changing array order", () => {
    const first = {
      tokens: {
        text: {
          primary: "#ffffff",
          muted: "#94a3b8",
        },
        surface: {
          panel: "#111827",
          app: "#030712",
        },
      },
      intent: ["operational", "glass"],
    };
    const second = {
      intent: ["operational", "glass"],
      tokens: {
        surface: {
          app: "#030712",
          panel: "#111827",
        },
        text: {
          muted: "#94a3b8",
          primary: "#ffffff",
        },
      },
    };

    expect(createNexusStyleCanonicalJsonV1(first)).toBe(
      createNexusStyleCanonicalJsonV1(second),
    );
    expect(createNexusStyleCanonicalJsonV1(first)).toContain(
      '"intent":["operational","glass"]',
    );
  });

  it("emits stable V1 checksums for equivalent values", () => {
    const first = {
      name: "Legacy Cyberpunk",
      tokens: {
        accent: {
          primary: "#67e8f9",
        },
      },
    };
    const second = {
      tokens: {
        accent: {
          primary: "#67e8f9",
        },
      },
      name: "Legacy Cyberpunk",
    };

    expect(createNexusStyleChecksumV1(first)).toBe(
      createNexusStyleChecksumV1(second),
    );
    expect(createNexusStyleChecksumV1(first)).toMatch(
      /^nexus-style-fnv1a32:[0-9a-f]{8}$/,
    );
  });
});
