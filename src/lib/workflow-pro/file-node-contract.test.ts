import { describe, expect, it } from "vitest";

import { createWorkflowProFileNodeContract } from "./file-node-contract";

describe("Workflow Pro file node contract", () => {
  it("exposes the current no-op compiler as the first file node compiler lane", () => {
    const contract = createWorkflowProFileNodeContract();

    expect(contract.type).toBe("node.file");
    expect(contract.compiler).toEqual({
      id: "nexus-attachment-noop-compiler-v1",
      mode: "noop",
      version: "v1",
    });
    expect(contract.compilerManifest.schema).toBe(
      "nexus.attachmentCompilerManifest.v1",
    );
    expect(contract.compilerManifest.lanes.map((lane) => lane.id)).toEqual([
      "text",
      "image",
      "audio",
      "video",
      "archive",
      "document",
      "binary-reference",
    ]);
    expect(contract.compilerManifest.lanes.find((lane) => lane.id === "audio")).toMatchObject({
      defaultCompiler: {
        mode: "noop",
      },
      futureAdapters: expect.arrayContaining(["speech-to-text"]),
      status: "reserved",
    });
    expect(contract.targetCapabilities).toEqual(["chat", "image", "video"]);
    expect(contract.inputActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "local-file-upload",
          status: "implemented",
        }),
      ]),
    );
    expect(contract.acceptedMimeTypes).toContain("application/zip");
    expect(contract.packetAttachmentPolicy.output).toBe(
      "ContextPacket attachment reference",
    );
  });
});
