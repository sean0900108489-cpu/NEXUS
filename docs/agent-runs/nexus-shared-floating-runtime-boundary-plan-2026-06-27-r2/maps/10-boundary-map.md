# R2 Boundary Map

## Current Boundaries To Preserve

### Workspace Shell

Current files:

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-panels.tsx`
- `src/components/nexus/nexus-chrome.tsx`
- `src/components/nexus/workspace-chat-composer-shell.tsx`

Responsibilities to keep in Workspace shell:

- Workspace route surface and stage.
- Workspace bounds provider.
- Top bar, left dock, right dock, bottom composer.
- Workspace auth/session/recovery/sync orchestration.
- Workspace context and selected workspace/agent affordances.
- Opening entry points, but not app internals.

Responsibilities to remove over time:

- Hardcoded app content rendering for new floating apps.
- Window lifecycle implementation details for new non-agent apps.
- Cross-app business logic.

### Floating Runtime

Current source to learn from:

- `src/kernel/window/window-types.ts`
- `src/kernel/window/window-store.ts`
- `src/kernel/window/WindowFrame.tsx`
- `src/kernel/window/WindowManager.tsx`
- `src/kernel/window/window-layout.ts`

Target responsibilities:

- Floating window instance model.
- Lifecycle: open, close, focus, minimize, restore, maximize, move, resize.
- Layout constraints and restore semantics.
- Generic frame/chrome with app content slot.
- Host-agnostic manager that receives host adapter dependencies.

Non-responsibilities:

- Workspace auth/session.
- Agent messages.
- Notes/feed/forum business logic.
- Capability permission decisions.
- Supabase access.

### Floating App Registry

Current source to learn from:

- `src/kernel/window/window-registry.ts`
- `src/kernel/window/default-window-apps.ts`
- `src/kernel/capabilities/*`

Target responsibilities:

- App definitions.
- Component lookup.
- Metadata: title, scope, sizing, singleton/multiple behavior, icon, capabilities, archetype, lifecycle.

Non-responsibilities:

- Runtime state.
- Permission enforcement.
- Automatic product assembly.
- Data fetching.

### Feature Folders

Current examples:

- `src/features/feed/`
- `src/features/notes/`
- `src/features/forum/`
- `src/features/artifact-library/`
- `src/features/artifacts/`
- `src/features/profiles/`
- `src/features/developer/`

Target responsibilities:

- Feature UI and app content.
- Feature API/client/state.
- Feature tests.
- Resource bridge usage where needed.

Non-responsibilities:

- Window drag/resize/focus implementation.
- Workspace shell layout.
- Global registry mutation outside app registration.

## Target Folder Structure

The later implementation should create a new runtime namespace rather than expanding `src/kernel/window` in-place:

```text
src/runtime/floating/
  core/
    floating-window-types.ts
    floating-window-layout.ts
    floating-window-lifecycle.ts
    floating-window-store-contract.ts
  registry/
    floating-app-types.ts
    floating-app-registry.ts
    default-floating-apps.ts
  react/
    FloatingWindowFrame.tsx
    FloatingWindowManager.tsx
    FloatingWindowErrorBoundary.tsx
  adapters/
    workspace-floating-host.ts
    desktop-floating-host.ts
  index.ts
```

Rationale:

- `src/kernel/window` currently carries the `/desktop` POC vocabulary.
- `src/runtime/floating` better matches the corrected product direction.
- Adapters can wrap existing `/desktop` and Workspace state before any migration.

## Shared Type Shape

Future generic type:

```ts
type FloatingWindowKind = string;

type FloatingWindowScope =
  | "account"
  | "workspace"
  | "resource"
  | "system"
  | "public";

type FloatingWindowLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type FloatingWindowInstance = {
  id: string;
  kind: FloatingWindowKind;
  title: string;
  scope: FloatingWindowScope;
  resourceId?: string;
  workspaceId?: string;
  layout: FloatingWindowLayout;
  previousLayout?: FloatingWindowLayout;
  minimized: boolean;
  maximized: boolean;
  createdAt: string;
  updatedAt: string;
  state?: Record<string, unknown>;
};
```

Key differences from current `/desktop` `NexusWindow`:

- Add `resource` scope.
- Add `previousLayout` so maximize/restore preserves the safer Workspace behavior.
- Keep `state` opaque and serializable.
- Keep `kind` string-like so app definitions can move before every kind is enumerated.

## Host Adapter Contract

Future runtime should depend on a host adapter instead of directly using `nexus-store` or localStorage:

```ts
type FloatingHostAdapter = {
  hostId: "workspace" | "desktop";
  getBounds: () => { width: number; height: number };
  getWindows: () => FloatingWindowInstance[];
  openWindow: (input: FloatingOpenWindowInput) => string;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  moveWindow: (windowId: string, x: number, y: number) => void;
  resizeWindow: (windowId: string, width: number, height: number) => void;
  updateWindowState: (windowId: string, state: Record<string, unknown>) => void;
  updateWindowTitle: (windowId: string, title: string) => void;
};
```

Workspace adapter:

- Initially wraps `nexus-store` for agent windows only where needed.
- Adds a new lightweight registry-window slice only after R3 begins.
- Uses Workspace bounds from `NexusOps`.
- Persists through existing Zustand/IndexedDB path.

Desktop adapter:

- Initially wraps `useWindowStore`.
- Can keep localStorage persistence until a later hardening phase.
- Uses desktop bounds from `NexusDesktopShell`.

## Frame Boundary

`FloatingWindowFrame` should own:

- Outer positioned frame.
- Focus capture.
- Drag/resize handles.
- Generic close/minimize/maximize/restore controls.
- Title display.
- App content slot.

It should not own:

- App toolbar actions such as branch, save artifact, lock sandbox interaction, copy transcript, upload attachment.
- Feature data loading.
- Workspace right dock or bottom composer.

Workspace-specific app toolbars should render inside the app slot or app-specific titlebar accessory slots, not inside the runtime core.

## Registry Boundary

Future `FloatingAppDefinition` should follow the vault direction:

```ts
type FloatingAppDefinition = {
  kind: string;
  title: string;
  scope: "account" | "workspace" | "resource" | "system" | "public";
  component: ComponentType<FloatingAppProps>;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  singleton?: boolean;
  allowMultiple?: boolean;
  icon?: string;
  capabilities?: NexusCapabilityKind[];
  archetype?: NexusProductArchetypeKind;
  lifecycle?: "active" | "demo" | "internal" | "legacy" | "planned";
};
```

Changes from current `/desktop` registry:

- Use `Floating*` names instead of Window OS names.
- Add `resource` scope.
- Keep metadata-only behavior.
- Let Workspace and `/desktop` register from the same app definition source after the bridge exists.

