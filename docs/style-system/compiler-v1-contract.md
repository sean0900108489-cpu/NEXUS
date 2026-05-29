# NEXUS Compiler V1 Contract

Phase: V4 - Pure Compiler
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure compiler contract. Current implementation is local-only and side-effect-free.

## Implementation Evidence

- `CP-129 - Pure Compiler React Flow Adapter Output V1` made the pure compiler emit deterministic React Flow visual adapter output and report `adapterCoverage.reactFlow` as `complete`.
- `CP-130 - Post Compiler React Flow Adapter Output Phase Gate` passed full local verification after that compiler change.
- Current implementation remains pure data output: no DOM writes, store writes, sync, backend, Supabase, deployment, or `exports/**` paths are part of compiler execution.
- Production component migration and durable persistence remain outside this compiler contract.

## 0. Purpose

The V1 compiler turns a validated `NexusStyleManifestV1` into deterministic,
side-effect-free style output.

It must be pure:

```text
same safe manifest + same compiler version -> same compiled output
```

It must not:

- write DOM styles
- call React hooks
- import components
- mutate `workspace.themeConfig`
- touch Zustand store
- write localStorage or IndexedDB
- enqueue sync
- call Supabase
- call Vercel
- call GitHub
- deploy
- generate Tailwind class strings
- accept raw CSS or JavaScript

## 1. Inputs

The compiler may receive:

- a safe manifest accepted by validator rules
- compiler version
- legacy bridge map
- style contract registry
- recipe registry
- adapter registry

The compiler may not receive:

- raw user prompt
- raw AI draft
- imported style document
- unvalidated manifest candidate
- workspace state
- active agent state
- auth state
- API keys or env vars
- Supabase records
- route handlers

## 2. Output Shape

Implemented TypeScript direction:

```ts
type NexusCompiledStyleV1 = {
  compilerVersion: "nexus-style-compiler-v1";
  manifestId: string;
  manifestChecksum: string;
  cssVariables: Record<string, string>;
  legacyCssVariables: Record<string, string>;
  recipes: {
    panel: Record<string, string>;
    button: Record<string, Record<string, string>>;
    input: Record<string, Record<string, string>>;
    badge: Record<string, Record<string, string>>;
    window: Record<string, string>;
    modal: Record<string, string>;
    dock: Record<string, string>;
  };
  adapters: {
    reactFlow?: NexusReactFlowStyleAdapterV1;
    nextThemes?: {
      dataTheme?: "cyberpunk" | "apple" | "tesla" | "terminal";
      colorScheme: "dark" | "light";
    };
  };
  report: NexusCompilerReportV1;
};
```

## 3. Compiler Report

```ts
type NexusCompilerReportV1 = {
  accepted: true;
  warnings: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  emittedVariableCount: number;
  legacyBridgeUsed: boolean;
  adapterCoverage: {
    reactFlow: "none" | "partial" | "complete";
  };
};
```

Reports must be display-safe and must not echo secrets, raw imported documents,
or large source payloads.

## 4. CSS Variable Emission Rules

New variables must use a namespaced form:

```text
--nexus-surface-app
--nexus-surface-panel
--nexus-text-primary
--nexus-accent-primary
--nexus-border-subtle
--nexus-shadow-panel
--nexus-radius-surface
--nexus-graph-edge-default-stroke
```

Compiler may also emit legacy bridge variables:

```text
--bg-base
--panel-bg
--text-main
--theme-primary
--border-subtle
--shadow-panel
--surface-radius
```

Legacy bridge rule:

Bridge variables may mirror semantic outputs while migration is incomplete.
They must not delete or reinterpret the existing `data-theme` presets until a
later coverage gate proves compatibility.

## 5. Recipe Compilation Rules

Compiler maps manifest recipes into component recipe variables.

Example output direction:

```json
{
  "button": {
    "default": {
      "--nexus-button-surface": "var(--nexus-surface-panel-muted)",
      "--nexus-button-text": "var(--nexus-text-secondary)",
      "--nexus-button-border": "var(--nexus-border-subtle)"
    },
    "focus": {
      "--nexus-button-focus-ring": "var(--nexus-border-focus)"
    }
  }
}
```

Recipe compiler must not emit:

- `className`
- event handlers
- layout class strings
- `aria-*`
- `role`
- `tabIndex`
- `style={{ ... }}`
- z-index
- pointer-events
- drag or resize config

## 6. React Flow Adapter Compilation Rules

Compiler may emit visual adapter values only:

- node surface/border/text
- edge stroke/glow
- handle fill/border/glow
- background grid color/gap/size
- minimap mask/node fallback
- controls surface/border/icon

Compiler must not emit:

- `nodesDraggable`
- `onNodeDragStop`
- `onConnect`
- `deleteKeyCode`
- `interactionWidth`
- hit path width
- handle ids
- node ids
- edge ids
- pan/zoom config
- arbitrary selectors

See `docs/style-system/react-flow-style-boundary.md`.

## 7. Preview Boundary

Compiled output is still inert data.

It may be passed later to:

- a local-only preview controller
- a scoped CSS variable injector
- an isolated primitive specimen gallery
- a graph specimen adapter

It must not be written to:

- `workspace.themeConfig`
- `NexusWorkspace`
- `ActiveUiStateSnapshot`
- `WorkspaceCloudSnapshotPayload`
- local workspace persistence
- Supabase
- `workspace_state_entities`
- sync operations

## 8. Determinism Requirements

The compiler must:

- sort emitted variables deterministically
- produce a stable manifest checksum
- produce stable warnings for the same input
- avoid timestamps in compiled output
- avoid random ids
- avoid reading system state
- avoid reading browser state
- avoid reading current theme from DOM

## 9. Error Boundary

The compiler assumes input is already validator-approved.

If called with invalid input anyway, it should fail closed:

- return a typed error result, or
- throw a controlled compiler error in tests

It must not partially emit output for unsafe manifests.

## 10. Future Test Plan

When V4 implementation begins, add focused unit tests only:

- same manifest produces same output
- legacy cyberpunk compiles to expected variables
- soft OS sample compiles without cyberpunk-specific token names
- raw CSS cannot reach compiler because validator rejects it
- compiler emits no DOM/store/backend side effects
- React Flow adapter output excludes protected behavior fields

No browser test is required for pure compiler implementation until preview/provider code exists.

## 11. Acceptance Gate

V4 contract passes when:

- Inputs are validated manifest data and registries only.
- Outputs are deterministic compiled objects and reports only.
- DOM, store, sync, backend, Supabase, deploy, and remote actions are forbidden.
- Dynamic Tailwind class generation is forbidden.
- React Flow adapter output is visual-only.
- Preview remains local-only and separate from persistence.
- No runtime code, schema, package, deploy, or `exports/**` files are changed.
