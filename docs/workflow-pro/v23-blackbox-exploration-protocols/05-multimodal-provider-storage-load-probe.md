# Protocol 05: Multimodal Provider Storage Load Probe

## Mission

Explore LLM, image, audio, vision, storage, and high-branch workflow load without
assuming what is already implemented. The protocol must discover provider
bridges, media packet shape, storage policy, preview strategy, and load limits.

Target rigor: 89 / 100.

## Mandatory Protocol Controls

Before executing this protocol, read:

- `protocol-router.md`
- `events.schema.json`
- `live-evidence-gate.md`
- `checkpoint-template.md`

Every run must create `00-active-checkpoint.md` and `events.ndjson` before the
first scan. The first event must be `checkpoint.created`. Every phase must emit
`checkpoint.read` before `phase.started`, then emit evidence, inference,
contradiction, next-probe, and completion events as the work progresses. Any
claim that LLM, image, audio, vision, file, generated history, download, or
storage behavior works must satisfy the live evidence gate or be marked
`blocked` / `not-yet-verified`.

If configured provider credentials are available, provider-backed behavior must
be tested against the real provider before a final working verdict. Mock or
dry-run evidence is useful for planning, but it is not enough to prove provider
behavior works.

Before completion, run:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Black-Box Start Command

```txt
Run a black-box multimodal provider, storage, and load probe for /Users/sean/Documents/FreeChat.

Do not assume image, audio, or vision support is complete. Discover the real
bridge from source, tests, routes, storage, and safe UI/API probes. Real provider
tests may run when credentials are configured, but do not print, persist, or
copy secret values. Use sanitized ids, hashes, counts, and status codes only.

Before the first scan, create an active checkpoint:
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/00-active-checkpoint.md

Read the active checkpoint before every phase and branch. Provider, storage, and
load evidence must be appended as sanitized metadata while probes are running,
not reconstructed from memory later.
```

## Checkpoint Loop

Every phase uses this loop:

1. Read `00-active-checkpoint.md`.
2. Record which capability is being explored: LLM, image, vision, audio, file,
   storage, or branch load.
3. Run the smallest useful scan/probe.
4. Append sanitized provider/storage/load evidence immediately.
5. Append inference separately from evidence.
6. Append unsupported/planned/implemented classification.
7. Write the next command before moving to the next phase.

## Phase 1: Core Exploration

Inventory provider and media paths:
Read `00-active-checkpoint.md` first and record which provider tests are
allowed, blocked, or dry-run only.

```bash
rg -n "OpenAI|Responses|images|image|audio|vision|input_image|base64|data:image|blob|storage|bucket|artifact|provider|apiKey|runtime authorization|X-Nexus-Runtime-Authorization|model.image|model.llm|node.file" src scripts docs supabase
```

Core matrix:

```json
{
  "capability": "llm | image | vision | audio | video | file",
  "entryRoute": "",
  "runtimeNode": "",
  "packetShape": "unknown",
  "providerCredentialPath": "unknown",
  "storagePath": "unknown",
  "previewPolicy": "unknown",
  "durabilityPolicy": "unknown",
  "loadRisk": "unknown",
  "evidence": []
}
```

Checkpoint: `P05-core-multimodal-inventory`.

## Phase 2: Detail Exploration Branches

### Branch A: Provider Credential Boundary

Questions:

- Which credential is user identity?
- Which credential is provider runtime access?
- Can configured provider tests run without secret disclosure?
- Is provider use traceable without logging secret values?

Probe:

```bash
rg -n "OPENAI|API_KEY|provider|Authorization|X-Nexus-Runtime-Authorization|runtimeBearer|normalize.*ApiKey|secret|vault" src scripts docs
```

Checkpoint: `P05-provider-boundary`.

### Branch B: Media Packet And Vision Bridge

Questions:

- Does LLM receive only text, or multimodal parts?
- Can generated image artifact become a vision input?
- Does file node carry bytes, URL, metadata, or only a placeholder?
- What compiler boundary is present?

Probe:

```bash
rg -n "ContextPacket|allowedMedia|input_image|image_url|file.*compiler|attachment|node.file|artifactPolicy|generated-image|vision|reverse" src/lib src/app src/components
```

Checkpoint: `P05-media-packet-vision-bridge`.

### Branch C: Storage, Preview, And Browser Load

Questions:

- Are previews thumbnails or full-size base64?
- Where is original media stored?
- Is history capped, paginated, or lazy loaded?
- What happens with many branches?

Probe:

```bash
rg -n "thumbnail|preview|base64|data:image|lazy|history|generated|download|asset|storage|limit|pagination|hydrate" src
```

Checkpoint: `P05-storage-preview-load`.

## Phase 3: Collision Possibility Exploration

Required collisions:

- provider success but storage materialization fails
- image preview exists but durable asset missing
- file metadata exists but model never receives media bytes
- vision prompt claims image inspection without image input
- many branches overload UI previews
- user-supplied provider key gets mixed with Supabase auth

Checkpoint: `P05-multimodal-collision-map`.

## Phase 4: Suspicion Possibility Exploration

Generate at least 12 suspicion hypotheses:

| Suspicion | Capability | Evidence Needed | Probe | Load Impact | User Impact |
|---|---|---|---|---|---|

At least 3 must cover vision, 3 image generation, 3 storage, and 3 branch-count
load.

Checkpoint: `P05-suspicion-hypotheses`.

## Phase 5: Optional Load Probe

If safe and scoped, create a tiny controlled load probe:

- no destructive payloads
- no raw secret output
- no more than the agreed provider cost window
- record latency per stage
- record browser memory/preview behavior if available

If not safe, produce a dry-run load model instead.

## Completion Gate

Complete only when the report distinguishes:

- implemented capability
- planned boundary
- unsupported capability
- unsafe-to-test capability
- load risk
- storage risk
