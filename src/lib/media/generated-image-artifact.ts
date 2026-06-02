export function getGeneratedImageMimeType(url: string) {
  if (url.startsWith("data:image/svg+xml")) {
    return "image/svg+xml";
  }

  if (url.startsWith("data:image/webp")) {
    return "image/webp";
  }

  if (url.startsWith("data:image/jpeg") || url.startsWith("data:image/jpg")) {
    return "image/jpeg";
  }

  return "image/png";
}

export function getGeneratedImageUrlKind(url: string) {
  return url.startsWith("data:") ? "data-url" : "remote-url";
}
