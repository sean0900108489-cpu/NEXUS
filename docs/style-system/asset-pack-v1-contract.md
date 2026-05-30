# NEXUS Asset Pack V1 Contract

Status: contract preparation only
Scope: asset metadata, safety boundaries, fallback, and budget planning
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

`NexusAssetPackV1` defines the safe metadata envelope for visual assets that a
future Skin Pack may reference by stable ID.

This contract exists because `NexusStyleManifestV1` intentionally rejects raw
URLs, `url(...)`, `data:`, `blob:`, local file paths, scripts, CSS imports, and
unbounded external references. That boundary remains correct.

Asset Pack V1 is not:

- a storage bucket schema
- a CDN policy
- a binary upload implementation
- a generated-asset durability system
- a database migration
- a production runtime loader

Generated, recoverable, or user-visible durable assets require Protocol 96
before implementation.

## 1. Contract Shape

Illustrative TypeScript shape:

```ts
type NexusAssetPackV1 = {
  kind: "nexus-asset-pack";
  schemaVersion: 1;
  id: string;
  slug: string;
  version: string;
  metadata: NexusAssetPackMetadataV1;
  assets: NexusAssetDescriptorV1[];
  fallback: NexusAssetPackFallbackV1;
  performanceBudget: NexusAssetPackPerformanceBudgetV1;
  compatibility: NexusAssetPackCompatibilityV1;
};
```

Required top-level fields:

- `kind`
- `schemaVersion`
- `id`
- `slug`
- `version`
- `metadata`
- `assets`
- `fallback`
- `performanceBudget`
- `compatibility`

## 2. Asset Descriptor

```ts
type NexusAssetDescriptorV1 = {
  id: string;
  type: NexusAssetTypeV1;
  role: NexusAssetRoleV1;
  loading: "critical" | "lazy" | "optional";
  mime: NexusAssetMimeV1;
  byteSize: number;
  dimensions?: {
    width: number;
    height: number;
    pixelRatio?: 1 | 2 | 3;
  };
  hash: {
    algorithm: "sha256";
    value: string;
  };
  source: NexusAssetSourceV1;
  fallbackAssetId?: string;
  alt?: string;
  tags?: string[];
};
```

Asset IDs must be:

- stable within the asset pack
- lowercase slugs, 3-96 chars
- unique in the pack
- free of workspace/user identifiers
- free of paths, query strings, credentials, secrets, and environment names

## 3. Supported Asset Types

```ts
type NexusAssetTypeV1 =
  | "texture"
  | "icon"
  | "avatar"
  | "frame"
  | "background"
  | "font-reference";
```

### Texture

Textures are decorative raster or vector-like visual materials used by approved
recipe slots.

```ts
type NexusTextureAssetV1 = NexusAssetDescriptorV1 & {
  type: "texture";
  role:
    | "panel-surface"
    | "workspace-grid"
    | "window-chrome"
    | "modal-backdrop"
    | "graph-background";
};
```

Rules:

- Must have dimensions.
- Must stay within image dimension and byte budgets.
- Must have a fallback or be optional.
- Must not be used to smuggle CSS selectors or scripts.

### Icon

Icons are small symbols used in buttons, badges, command rows, and status
surfaces.

```ts
type NexusIconAssetV1 = NexusAssetDescriptorV1 & {
  type: "icon";
  role:
    | "action"
    | "status"
    | "navigation"
    | "tool"
    | "decorative";
};
```

Rules:

- Prefer existing trusted icon libraries for runtime UI where available.
- Asset-pack icons may only map to visual slots.
- Icons must not replace button semantics, labels, roles, or keyboard behavior.

### Avatar

Avatars represent agents, profiles, or generated personas in visual surfaces.

```ts
type NexusAvatarAssetV1 = NexusAssetDescriptorV1 & {
  type: "avatar";
  role: "agent" | "profile" | "system" | "placeholder";
};
```

Rules:

- Must not encode private user identity unless a later privacy/persistence gate
  explicitly authorizes it.
- Must have alt text or a declared decorative role.
- Must have a fallback placeholder.

### Frame

Frames are visual chrome overlays or borders.

```ts
type NexusFrameAssetV1 = NexusAssetDescriptorV1 & {
  type: "frame";
  role: "window-frame" | "panel-frame" | "card-frame" | "avatar-frame";
};
```

Rules:

- Frames may change visual treatment only.
- Frames must not control drag handles, resize handles, hit areas, z-index, or
  focus order.

### Background

Backgrounds are visual workspace or panel backdrops.

```ts
type NexusBackgroundAssetV1 = NexusAssetDescriptorV1 & {
  type: "background";
  role: "workspace" | "panel" | "hero-preview" | "style-lab-specimen";
};
```

Rules:

- Backgrounds must respect byte and dimension limits.
- Backgrounds may not become an unbounded remote URL field.
- Style Lab specimen backgrounds do not authorize production app backgrounds.

### Font Reference

Font references describe approved font family names or future packaged font
asset IDs. They do not authorize arbitrary remote font loading.

```ts
type NexusFontReferenceAssetV1 = NexusAssetDescriptorV1 & {
  type: "font-reference";
  role: "interface" | "mono" | "display" | "accent";
  familyName: string;
  fallbackFamily: "sans" | "serif" | "mono" | "system";
};
```

Rules:

- V1 may reference approved local/system/font-provider family names only.
- V1 must not include `@font-face`, CSS imports, executable font loaders, or
  direct external font URLs.
- Font references must preserve readable fallbacks.

## 4. Roles

```ts
type NexusAssetRoleV1 =
  | "panel-surface"
  | "workspace-grid"
  | "window-chrome"
  | "modal-backdrop"
  | "graph-background"
  | "action"
  | "status"
  | "navigation"
  | "tool"
  | "decorative"
  | "agent"
  | "profile"
  | "system"
  | "placeholder"
  | "window-frame"
  | "panel-frame"
  | "card-frame"
  | "avatar-frame"
  | "workspace"
  | "panel"
  | "hero-preview"
  | "style-lab-specimen"
  | "interface"
  | "mono"
  | "display"
  | "accent";
```

Roles are visual placement hints. They are not component selectors, DOM
selectors, event handlers, or authorization scopes.

## 5. MIME Policy

```ts
type NexusAssetMimeV1 =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/svg+xml"
  | "font/woff2"
  | "application/font-reference+json";
```

Allowed with constraints:

- `image/png`
- `image/jpeg`
- `image/webp`
- sanitized `image/svg+xml` only after a dedicated sanitizer gate
- `font/woff2` only after packaged font handling is authorized
- `application/font-reference+json` for inert font metadata

Forbidden:

- HTML
- JavaScript
- CSS
- executable MIME types
- archive formats
- unknown binary blobs
- SVG with scripts, foreign objects, external references, event attributes, or
  embedded CSS imports

## 6. Source Policy

```ts
type NexusAssetSourceV1 =
  | {
      kind: "builtin";
      packagePath: string;
    }
  | {
      kind: "packaged";
      contentAddressedPath: string;
    }
  | {
      kind: "generated-reference";
      provenanceId: string;
      protocol96Required: true;
    }
  | {
      kind: "font-family-reference";
      familyName: string;
    };
```

Allowed source types:

- built-in local asset references controlled by the repo
- packaged content-addressed asset references
- generated references only as placeholders until Protocol 96
- inert font family references

Forbidden source types:

- direct `http://`, `https://`, `ftp://`, `file:`, `blob:`, or `data:` URLs
- executable loaders
- arbitrary local absolute paths
- user home directory paths
- private bucket/object paths
- paths containing secrets, auth tokens, signed URLs, or query strings
- source values that reveal workspace IDs or user IDs

## 7. Loading Classification

`loading` controls validation and degradation policy.

| Loading | Meaning | Failure behavior |
| --- | --- | --- |
| `critical` | Needed for the pack's core visual identity. | Use fallback or reject pack. |
| `lazy` | Loaded after initial preview/apply. | Omit until available; never block base UI. |
| `optional` | Enhancement only. | Omit silently with warning. |

Critical assets must be few, small, hashed, and fall back cleanly.

## 8. Safety Boundaries

Asset Pack V1 allows:

- stable asset IDs
- type, role, MIME, byte size, dimensions, hashes
- loading classification
- provenance IDs without raw source payloads
- fallback asset IDs
- accessibility metadata such as `alt`

Asset Pack V1 forbids:

- remote executable content
- unbounded external URLs
- data/blob/file URLs
- raw base64 payloads inside manifests or skin packs
- huge images outside budget
- scripts, HTML, CSS imports, inline event handlers, and arbitrary SVG
- secret, env, auth, bucket, signed URL, workspace, or local path leakage
- automatic network fetching on fallback
- asset-driven component behavior

## 9. Size And Dimension Budget

Initial static limits for contract planning:

| Asset kind | Critical byte target | Max bytes | Max dimensions |
| --- | ---: | ---: | --- |
| Icon | 8 KB | 32 KB | 256 x 256 |
| Avatar | 64 KB | 256 KB | 1024 x 1024 |
| Texture | 128 KB | 512 KB | 2048 x 2048 |
| Frame | 96 KB | 384 KB | 2048 x 2048 |
| Background | 256 KB | 1024 KB | 2560 x 1440 |
| Font reference metadata | 2 KB | 8 KB | n/a |

These are contract gates, not final production performance claims. Browser
timing, decode cost, CDN transfer, and real font loading belong to later
implementation gates.

## 10. Fallback

```ts
type NexusAssetPackFallbackV1 = {
  fallbackAssetPackId?: string;
  fallbackByType: Partial<Record<NexusAssetTypeV1, string>>;
  onMissingCritical: "reject-pack" | "use-fallback-asset";
  onMissingLazy: "omit-and-warn";
  onMissingOptional: "omit";
  onOversized: "reject-asset" | "use-fallback-asset";
  onUnsupportedMime: "reject-asset";
};
```

Fallback rules:

- Missing critical assets cannot trigger arbitrary remote fetch.
- Optional assets may be omitted with a warning.
- Fallbacks must reference known safe asset IDs.
- Asset fallback must not mutate the skin pack, workspace state, or database.
- Fallback must not hide quarantine/rejection status in governance reports.

## 11. Performance Budget

```ts
type NexusAssetPackPerformanceBudgetV1 = {
  maxTotalAssets: number;
  maxCriticalAssets: number;
  maxCriticalBytes: number;
  maxTotalBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  maxSvgBytes: number;
  maxFontReferences: number;
};
```

V2 contract-prep may define and test static metadata budgets. Full performance
validation is deferred until implementation has an authorized asset loader and
Protocol 96 decisions.

## 12. Compatibility

```ts
type NexusAssetPackCompatibilityV1 = {
  contractVersion: 1;
  skinPackIds?: string[];
  supportedManifestVersions: [1];
  supportedMimeTypes: NexusAssetMimeV1[];
  requiresProtocol96ForGeneratedAssets: boolean;
  result:
    | "compatible"
    | "compatible_with_warnings"
    | "requires_protocol_96"
    | "incompatible";
};
```

Compatibility must fail closed when:

- an asset type is unknown
- a MIME type is unsupported
- a hash is missing or malformed
- dimensions or bytes exceed budget
- a source leaks a path, secret, signed URL, or workspace/user identifier
- generated/recoverable durability is claimed without Protocol 96

## 13. Implementation Gate

The first implementation pass after this document may only add:

- pure types
- static validators
- safe/unsafe fixtures
- redacted reports
- unit tests

It may not add:

- production asset loading
- persistence or Supabase storage
- remote fetches
- generated asset recovery
- package/lockfile changes
- deploy config changes
- production UI application
- `exports/**` changes
