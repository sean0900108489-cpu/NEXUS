# V21 Composer Mode Layer

## Goal

The workspace bottom composer must support language and image generation from the same selected chatroom. Switching into image generation is an input mode change, not an agent role change and not an attachment action.

The target behavior is:

```text
Language mode:
  + menu shows Image generation
  submit routes to the selected chatroom language model
  assistant response is a text message

Image mode:
  + menu shows Language model
  submit routes to an image generation adapter
  assistant response is an image media message in the same chatroom
```

## Non Goals

- Do not convert the selected chatroom agent into an image agent.
- Do not require the user to switch operators or chatrooms before generating an image.
- Do not treat image generation as a file attachment.
- Do not attach image generation controls to the language reasoning domain.
- Do not persist generated images only as transient client-side data URLs.

## Current Starting Point

- `AgentMessage.media` already supports image/video media payloads.
- `MessageBubble` already renders `message.media` through `MediaArtifactPreview`.
- `/api/image-gen` and the image adapter layer already exist.
- The current `handleMediaGenerate` path is capability-gated to image/video agents, which is the wrong boundary for a same-chatroom composer mode.
- Attachment input actions are already split into local file upload and placeholder attachment lanes. They should stay attachment-only.

## Boundary Model

```text
agent capability = what the operator/chatroom role is configured to do
composer mode    = how the next input from the bottom composer is routed
attachment lane  = files/references compiled into prompt context
```

Composer mode can route a single prompt to image generation without changing the selected agent capability.

## State Contract

Use a per-chatroom state map:

```ts
type WorkspaceComposerMode = "language" | "image";

type WorkspaceComposerModeByAgentId = Record<string, WorkspaceComposerMode>;
```

When the selected agent changes, the composer reads that agent's mode. Missing entries default to `"language"`.

## Composer Actions Contract

Composer mode actions are not attachment actions. Keep them in a separate registry so future tools do not collapse into one overloaded `+` menu model.

```ts
type WorkspaceComposerActionId = "toggle-image-generation";
```

The action label is contextual:

```text
language mode -> Image generation
image mode    -> Language model
```

## Submit Routing Contract

```ts
if (composerMode === "image") {
  await onGenerateImageInChat(agent.id, prompt, imageSettings);
} else {
  await onSend(agent.id, prompt);
}
```

Attachments may still be packaged into the prompt manifest for language mode. Image mode should initially block or ignore prompt attachment ingestion until an image-capable compiler lane exists.

## Image Result Contract

Image generation writes back to the same `agent.messages` list:

```ts
const assistantMessage: AgentMessage = {
  id,
  role: "assistant",
  content: "Image generated.",
  createdAt,
  media: {
    type: "image",
    prompt,
    url,
    createdAt,
  },
};
```

The media URL should be durable. If a provider returns base64/data URL output, create an artifact record and use that recorded URL/reference as the message media source.

## Image Settings Contract

Image settings are mode-specific controls and should replace the reasoning selector while image mode is active.

```ts
type WorkspaceComposerImageSettings = {
  modelId: string;
  quality: "standard" | "high" | "ultra";
  aspectRatio: "1:1" | "16:9" | "9:16";
};
```

Provider adapters translate these product settings into provider payloads.

```text
OpenAI-like: product model id, provider model id, size, quality
Gemini/Nano Banana-like: model, aspectRatio, quality
Flux-like: model, width, height, steps
```

V21 keeps `img2` as the UI/product model id and maps it at the OpenAI adapter boundary to `gpt-image-2`. The adapter also maps the product quality labels into the current OpenAI GPT Image quality tiers:

```text
standard -> low
high -> medium
ultra -> high
```

The client image adapter should route through `/api/image-gen` even when the browser has no in-memory API key. The image route can use the browser-supplied Bearer token when the Global API Vault is unlocked in memory, or fall back to `OPENAI_API_KEY` on the server. This keeps raw API keys out of local workspace persistence while still allowing real image generation after a page reload.

## Persistence Contract

Generated media should be recorded as an artifact with metadata:

```ts
{
  type: "generated-image",
  sourceAgentId,
  sourceMessageId,
  metadata: {
    composerMode: "image",
    modelId,
    quality,
    aspectRatio,
    prompt
  }
}
```

The chat message can then reference `media.url` and future versions can add `media.artifactId` without changing the visible chat flow.

V21 stores generated image output with `type: "generated-image"` and writes the resulting `artifact.id` back into `message.media.artifactId`.

Generated assets have two download surfaces:

```text
chat media preview -> download the visible generated media
right dock 生成紀錄 -> fetch full artifact record, then download contentUrl/contentText
```

The right dock `生成紀錄` panel is a filtered generated-file asset ledger. It uses `artifact.type.startsWith("generated-")`, so future generated video/audio/image records can join the same area without changing the Artifact Vault panel.

## Graph Image Runtime Contract

The graph surface has its own image model node instead of borrowing chatroom composer state.

```text
input.text -> model.image
```

`model.image` owns the same product-level image settings used by the composer:

```ts
{
  modelId: "img2",
  quality: "standard" | "high" | "ultra",
  aspectRatio: "1:1" | "16:9" | "9:16"
}
```

Workflow Runtime Lite keeps the provider call behind a `callImage` boundary, parallel to `callLlm`. The node executor merges upstream `ContextPacket.rawText` with the node prompt add-on, calls the image adapter through `/api/image-gen`, records a `generated-image` artifact, then returns a `ContextPacket` with:

```text
rawText: Image generated + prompt/settings/artifact/image URL
metadata: nodeType, modelId, quality, aspectRatio, artifactId, mediaType
```

This keeps graph image generation on an independent lane while still sharing the same adapter and artifact persistence path as chatroom image mode.

## Implementation Order

1. Create composer mode types/actions/settings modules.
2. Add per-agent composer mode state in `NexusOps`.
3. Add contextual `+` action: Image generation / Language model.
4. Route submit by composer mode.
5. Add `handleComposerImageGenerate` that is not image-agent gated.
6. Add image settings controls in image mode.
7. Persist generated image output as an artifact and add tests/browser smoke.
8. Add Workflow Runtime Lite `model.image` with graph controls for model, quality, and aspect ratio.

## Dirty File Policy

This layer should only touch:

- `docs/v21-composer-mode-layer.md`
- `src/lib/composer/*`
- `src/lib/media/*` if provider mapping is extracted
- `src/components/nexus/nexus-ops.tsx`
- focused composer/media tests

Existing style-system or production shell dirty files should not be reformatted or normalized as part of this feature unless they directly block implementation.
