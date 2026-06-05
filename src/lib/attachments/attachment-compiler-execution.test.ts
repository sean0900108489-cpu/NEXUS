import { describe, expect, it } from "vitest";

import { runAttachmentCompilerPipeline } from "./attachment-compiler-execution";

describe("attachment compiler execution", () => {
  it("creates an empty execution report when a file node has no attachments", async () => {
    const report = await runAttachmentCompilerPipeline({
      attachments: [],
      upstreamRawText: "Keep the upstream instruction.",
    });

    expect(report).toMatchObject({
      attachmentCount: 0,
      rawText: "Keep the upstream instruction.",
      schema: "nexus.attachmentCompilerExecution.v1",
      status: "empty",
    });
    expect(report.results).toEqual([]);
  });

  it("runs text attachments through the passthrough compiler boundary", async () => {
    const report = await runAttachmentCompilerPipeline({
      attachments: [
        {
          artifactId: "artifact-text",
          compilerId: "nexus-attachment-noop-compiler-v1",
          compilerVersion: "v1",
          contentKind: "text",
          mimeType: "text/plain",
          name: "brief.txt",
          rawArtifactId: "artifact-text",
          sizeBytes: 128,
        },
      ],
      upstreamRawText: "Summarize the uploaded brief.",
    });

    expect(report.status).toBe("processed");
    expect(report.rawText).toBe("Summarize the uploaded brief.");
    expect(report.results[0]).toMatchObject({
      artifactId: "artifact-text",
      laneId: "text",
      packetPolicy: {
        packageAs: "text",
        rawTextBehavior: "passthrough",
      },
      status: "passthrough",
    });
  });

  it("keeps archive and media inputs reference-only while preserving future adapter slots", async () => {
    const report = await runAttachmentCompilerPipeline({
      attachments: [
        {
          artifactId: "artifact-zip",
          compilerId: "nexus-attachment-noop-compiler-v1",
          compilerVersion: "v1",
          contentKind: "binary",
          mimeType: "application/zip",
          name: "source.zip",
          rawArtifactId: "artifact-zip",
          sizeBytes: 4096,
        },
        {
          artifactId: "artifact-audio",
          compilerId: "nexus-attachment-noop-compiler-v1",
          compilerVersion: "v1",
          contentKind: "binary",
          mimeType: "audio/wav",
          name: "voice.wav",
          rawArtifactId: "artifact-audio",
          sizeBytes: 8192,
        },
      ],
      upstreamRawText: "Use references safely.",
    });

    expect(report.lanes.map((lane) => lane.id)).toEqual(["archive", "audio"]);
    expect(report.results).toEqual([
      expect.objectContaining({
        futureAdapters: expect.arrayContaining(["zip-expand"]),
        laneId: "archive",
        status: "reference-only",
      }),
      expect.objectContaining({
        futureAdapters: expect.arrayContaining(["speech-to-text"]),
        laneId: "audio",
        status: "reference-only",
      }),
    ]);
    expect(report.displayText).toContain("archive/reference-only x1");
    expect(report.displayText).toContain("audio/reference-only x1");
  });
});
