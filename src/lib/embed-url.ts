function withParams(inputUrl: URL, params: Record<string, string>) {
  const nextUrl = new URL(inputUrl.toString());

  Object.entries(params).forEach(([key, value]) => {
    nextUrl.searchParams.set(key, value);
  });

  return nextUrl.toString();
}

function getGoogleEmbeddableUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host === "docs.google.com") {
    const workspaceMatch = path.match(
      /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/,
    );

    if (workspaceMatch) {
      const [, type, id] = workspaceMatch;
      const mode = type === "presentation" ? "embed" : "preview";

      return `https://docs.google.com/${type}/d/${id}/${mode}`;
    }

    if (path.startsWith("/forms/")) {
      return withParams(url, { embedded: "true" });
    }
  }

  if (host === "drive.google.com") {
    const fileMatch = path.match(/^\/file\/d\/([^/]+)/);
    const openFileId = path === "/open" ? url.searchParams.get("id") : null;
    const fileId = fileMatch?.[1] ?? openFileId;

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }

  if (host === "www.google.com" || host === "google.com") {
    if (path.startsWith("/maps")) {
      return withParams(url, { output: "embed" });
    }

    if (path.startsWith("/search")) {
      return withParams(url, { igu: "1" });
    }

    if (path === "/" || path === "") {
      return "https://www.google.com/webhp?igu=1";
    }
  }

  return null;
}

export function getEmbeddableUrl(inputUrl: string): string {
  if (!inputUrl) {
    return "";
  }

  try {
    const url = new URL(inputUrl);
    const host = url.hostname.toLowerCase();
    const googleUrl = getGoogleEmbeddableUrl(url);

    if (googleUrl) {
      return googleUrl;
    }

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      let videoId = "";
      const playlistId = url.searchParams.get("list") ?? "";

      if (host.includes("youtu.be")) {
        videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      } else if (url.searchParams.has("v")) {
        videoId = url.searchParams.get("v") ?? "";
      } else if (url.pathname.startsWith("/embed/")) {
        return inputUrl;
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
      } else if (url.pathname.startsWith("/live/")) {
        videoId = url.pathname.split("/live/")[1]?.split("/")[0] ?? "";
      }

      if (!videoId && playlistId) {
        return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(
          playlistId,
        )}`;
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}` : inputUrl;
    }

    if (host.includes("twitch.tv")) {
      const parts = url.pathname.split("/").filter(Boolean);

      if (parts.length > 0) {
        const channel = parts[0];
        const parent =
          typeof window === "undefined"
            ? "localhost"
            : window.location.hostname || "localhost";

        return `https://player.twitch.tv/?channel=${encodeURIComponent(
          channel,
        )}&parent=${encodeURIComponent(parent)}`;
      }
    }

    if (host.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();

      if (videoId && !Number.isNaN(Number(videoId))) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    return inputUrl;
  } catch {
    return inputUrl;
  }
}
