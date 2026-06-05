# Workflow Pro API And Data Contract

## Frontend To Store

```ts
setViewMode("workflow-pro")
```

Must update:

- global `viewMode`
- active workspace `settings.viewMode`
- persisted local state
- cloud snapshot serialization

## Frontend To Runtime

Workflow Pro should not directly mutate runtimeLite in the first pass.

Use adapters:

```text
Workflow Pro UI state
  -> workflow contract draft
  -> runtimeLite adapter
  -> runtimeLite state patch
```

## File Node Data

```ts
type WorkflowFileNodeData = {
  label: string;
  acceptedMimeTypes: string[];
  compilerId: string;
  compilerMode: "noop" | "extract" | "ocr" | "transcode" | "custom";
  passThroughText: boolean;
  attachRawArtifact: boolean;
  attachCompiledArtifact: boolean;
};
```

## File Packet

```ts
type WorkflowFilePacket = {
  rawArtifactId: string;
  compiledArtifactId?: string;
  compilerId: string;
  compilerVersion: string;
  contentKind: "text" | "binary" | "reference";
  mimeType: string;
  name: string;
  sizeBytes: number;
  previewText?: string;
};
```

## API Routes Later

```text
POST /api/v1/workflow-pro/files
GET  /api/v1/workflow-pro/files/:fileId
POST /api/v1/workflow-pro/files/:fileId/compile
GET  /api/v1/workflow-pro/workflows/:workflowId/context-pack
POST /api/v1/workflow-pro/workflows/:workflowId/proposals
```

## Backend Integration

Do not build a separate asset system.

Use:

- `ArtifactService.createArtifact`
- artifact versions
- artifact references
- metadata for compiler and packet state

## Security

- API keys stay server-only.
- service role stays server-only.
- file artifacts are workspace-scoped.
- compiler outputs are stored as artifact versions or linked artifacts.
- zip extraction/custom compilers must later run in a safe sandbox boundary.

