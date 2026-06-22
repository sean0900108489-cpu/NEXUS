/** Build multimodal content parts from attachments and user text. */

import type { ComposerAttachmentReference } from "./attachment-types";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export type ChatMessage =
  | { role: "user" | "assistant" | "system"; content: string }
  | { role: "user" | "assistant" | "system"; content: ChatContentPart[] };

/** Build multimodal content parts from user text and attachment references.
 *  Preserves text-only path: if no image attachments, returns plain string content. */
export function buildMultimodalContentParts(input: {
  userText: string;
  attachments: ComposerAttachmentReference[];
}): string | ChatContentPart[] {
  const images = input.attachments.filter((a) => a.kind === "image");
  const nonImages = input.attachments.filter((a) => a.kind !== "image");

  // Text-only path: no images → return plain string
  if (!images.length) {
    if (!nonImages.length) return input.userText;

    // Non-image attachments: add descriptive reference
    const attachmentDescriptions = nonImages.map(
      (a) => `[Attachment: ${a.filename} (${a.mimeType})]`,
    ).join("\n");

    return `${input.userText}\n\n${attachmentDescriptions}`;
  }

  // Multimodal path: build content parts array
  const parts: ChatContentPart[] = [];

  // User text as first part
  if (input.userText.trim()) {
    parts.push({ type: "text", text: input.userText });
  }

  // Image parts
  for (const image of images) {
    // Use signed URL if available, otherwise storageKey reference
    const url = image.storageKey ?? "";
    if (url) {
      parts.push({ type: "image_url", image_url: { url, detail: "auto" } });
    }
  }

  // Non-image attachment references as text part
  if (nonImages.length) {
    const refs = nonImages.map(
      (a) => `[Attachment: ${a.filename} (${a.mimeType})]`,
    ).join("\n");
    parts.push({ type: "text", text: refs });
  }

  return parts;
}

/** Check if a chat message content is a content parts array (multimodal). */
export function isMultimodalContent(content: unknown): content is ChatContentPart[] {
  return Array.isArray(content) && content.some((part) => part?.type === "image_url");
}

/** Check if a chat message content array contains images. */
export function hasImageParts(parts: ChatContentPart[]): boolean {
  return parts.some((p) => p.type === "image_url");
}

/** Convert a ChatMessage to a simple { role, content: string } message for text-only paths. */
export function toTextOnlyMessage(message: ChatMessage): { role: "user" | "assistant" | "system"; content: string } {
  if (typeof message.content === "string") return { role: message.role, content: message.content };

  const textParts = message.content
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("\n");

  return { role: message.role, content: textParts };
}
