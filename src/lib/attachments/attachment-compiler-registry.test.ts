import { describe, expect, it } from "vitest";

import {
  createAttachmentCompilerLaneSummary,
  createAttachmentCompilerManifest,
  createNoopAttachmentCompilerMetadata,
  resolveAttachmentCompilerLane,
} from "./attachment-compiler-registry";

describe("attachment compiler registry", () => {
  it("exposes independent compiler lanes for text, image, audio, video, archive, document, and binary inputs", () => {
    const manifest = createAttachmentCompilerManifest();

    expect(manifest.schema).toBe("nexus.attachmentCompilerManifest.v1");
    expect(manifest.lanes.map((lane) => lane.id)).toEqual([
      "text",
      "image",
      "audio",
      "video",
      "archive",
      "document",
      "binary-reference",
    ]);
    expect(manifest.lanes.find((lane) => lane.id === "archive")).toMatchObject({
      defaultCompiler: {
        mode: "noop",
        output: "passthrough-reference",
      },
      futureAdapters: expect.arrayContaining(["zip-expand"]),
      packetPolicy: {
        packageAs: "asset-bundle",
        rawTextBehavior: "reference-only",
      },
    });
  });

  it("resolves MIME types into the lane that can later host a real compiler adapter", () => {
    expect(resolveAttachmentCompilerLane({ mimeType: "text/plain" }).id).toBe("text");
    expect(resolveAttachmentCompilerLane({ mimeType: "image/png" }).id).toBe("image");
    expect(resolveAttachmentCompilerLane({ mimeType: "audio/mpeg" }).id).toBe("audio");
    expect(resolveAttachmentCompilerLane({ mimeType: "video/mp4" }).id).toBe("video");
    expect(resolveAttachmentCompilerLane({ mimeType: "application/zip" }).id).toBe(
      "archive",
    );
    expect(resolveAttachmentCompilerLane({ mimeType: "application/pdf" }).id).toBe(
      "document",
    );
    expect(resolveAttachmentCompilerLane({ mimeType: "application/x-custom" }).id).toBe(
      "binary-reference",
    );
  });

  it("records noop compiler metadata with lane identity and future adapter slots", () => {
    const metadata = createNoopAttachmentCompilerMetadata({
      contentKind: "binary",
      fileName: "source.zip",
      lastModified: 1_717_171_717,
      mimeType: "application/zip",
      sizeBytes: 2048,
      source: "workspace-composer",
    });

    expect(metadata).toMatchObject({
      attachmentCompiler: {
        compilerId: "nexus-attachment-noop-compiler-v1",
        compilerVersion: "v1",
        laneId: "archive",
        mode: "noop",
        output: "passthrough-reference",
      },
      attachmentCompilerLane: {
        futureAdapters: expect.arrayContaining(["zip-expand"]),
        id: "archive",
      },
      attachmentInput: {
        fileName: "source.zip",
        mimeType: "application/zip",
      },
    });
  });

  it("summarizes lanes for runtime packets without carrying raw attachment payloads", () => {
    const summary = createAttachmentCompilerLaneSummary([
      { contentKind: "binary", mimeType: "image/png" },
      { contentKind: "binary", mimeType: "image/jpeg" },
      { contentKind: "binary", mimeType: "audio/wav" },
    ]);

    expect(summary).toHaveLength(2);
    expect(summary.map((lane) => lane.id)).toEqual(["image", "audio"]);
    expect(summary[0]).not.toHaveProperty("acceptedMimeTypes");
    expect(summary[0]).toMatchObject({
      defaultCompiler: {
        mode: "noop",
      },
      packetPolicy: {
        rawTextBehavior: "reference-only",
      },
    });
  });
});
