/** Model capability guard — shared between client and server. */

export type ModelCapabilities = {
  text: boolean;
  vision: boolean;
  fileInput: boolean;
  pdfInput: boolean;
  imageGeneration: boolean;
  tools: boolean;
};

/** Check if a model can accept image attachments. */
export function canModelAcceptImages(capabilities: ModelCapabilities): boolean {
  return capabilities.vision === true;
}

/** Check if a model can accept file attachments (generic). */
export function canModelAcceptFiles(capabilities: ModelCapabilities): boolean {
  return capabilities.fileInput === true;
}

/** Result of guarding attachment-model compatibility. */
export type GuardImageAttachmentsResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/** Guard: do NOT allow image attachments with non-vision models. */
export function guardImageAttachments(
  hasImages: boolean,
  capabilities: ModelCapabilities,
): GuardImageAttachmentsResult {
  if (!hasImages) return { ok: true };

  if (!canModelAcceptImages(capabilities)) {
    return {
      ok: false,
      code: "model_not_vision_capable",
      message:
        "此模型不支援圖片理解，請切換支援 vision 的模型。",
    };
  }

  return { ok: true };
}

/** Assert that a model has the required capabilities. */
export function assertModelCapability(
  capabilities: ModelCapabilities,
  required: (keyof ModelCapabilities)[],
): { ok: true } | { ok: false; code: string; message: string } {
  for (const cap of required) {
    if (!capabilities[cap]) {
      return {
        ok: false,
        code: `missing_capability_${cap}`,
        message: `This model does not support the '${cap}' capability.`,
      };
    }
  }
  return { ok: true };
}

/** Build ModelCapabilities from a server-side model catalog entry. */
export function buildModelCapabilities(entry: {
  supports_vision?: boolean;
  supports_tools?: boolean;
  supports_file_input?: boolean;
  supports_pdf_input?: boolean;
  supports_image_generation?: boolean;
}): ModelCapabilities {
  return {
    text: true,
    vision: entry.supports_vision ?? false,
    fileInput: entry.supports_file_input ?? false,
    pdfInput: entry.supports_pdf_input ?? false,
    imageGeneration: entry.supports_image_generation ?? false,
    tools: entry.supports_tools ?? false,
  };
}
