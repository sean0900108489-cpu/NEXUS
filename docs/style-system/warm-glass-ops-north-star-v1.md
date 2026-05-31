# Warm Glass Ops North Star V1

Status: V19 60-to-80 design target and coverage anchor

Branch:

- `codex/v19-production-shell-style-upgrade`

## Visual Goal

NEXUS Warm Glass Ops is the next north star skin for the V19 production shell.
It aims for an Apple / VisionOS-adjacent operations surface: warm frosted glass,
desert atelier calm, soft enterprise command-center chrome, and restrained
operational density.

The target is not a production skin apply. It is a safe authoring, Render Plan,
Production Bridge, and Style Lab coverage target for the 60-to-80 phase.

## Mood And Constraints

Target mood:

- frosted glass panels
- warm neutral palette
- sand, clay, pearl, smoke, and muted bronze
- soft blur and low-contrast shadows
- gentle rounded window chrome
- calm agent cards
- right metrics panel
- top segmented navigation
- restrained icons
- professional command center

Constraints:

- keep the skin data-only
- preserve production behavior boundaries
- use V2 Skin Pack tokens and review-only metadata
- use Render Plan and Production Bridge reporting for readiness
- keep Style Lab preview non-persistent and isolated

## Token Direction

Warm Glass Ops should bias tokens toward:

- `surface.app`: deep warm umber / smoke
- `surface.shell`: translucent clay-brown glass
- `surface.workspace`: dark sand-brown command field
- `surface.panel`: pearl glass with restrained opacity
- `surface.panelMuted`: soft sand glass
- `surface.raised`: brighter pearl glass
- `text.primary`: pearl
- `text.secondary`: warm linen
- `text.muted`: low-contrast taupe
- `accent.primary`: muted bronze
- `accent.primaryStrong`: brighter bronze
- `accent.secondary`: soft cyan-green for limited status emphasis
- `border.subtle`: low-contrast pearl line
- `border.glow`: restrained bronze glow
- `shadow.panel`: low-contrast warm depth
- `radius.surface`: rounded shell chrome
- `blur.glass`: soft but budget-bounded glass blur
- `workspace.gridPrimary`, `workspace.gridSecondary`, `workspace.wash`: quiet
  sand/bronze field structure

## Current Production Support

The current V19 production skinning surface can support the north star through:

- `.nexus-panel`
- `.nexus-glass`
- `.nexus-workspace`
- `.nexus-right-floating-dock-rail`
- `.nexus-top-bar-frame`
- `.nexus-message-bubble` and role classes
- `.nexus-agent-window`
- `.nexus-drag-handle`
- `.nexus-command-palette-shell`
- `.nexus-agent-branch-modal-shell`
- `.nexus-datapad-shell`
- `/style-lab` Production Chrome Smoke harness

These surfaces can approximate the reference through warm panel color, soft
border, muted bronze accent, rounded chrome, glass blur, and gentle shadow.

## Missing Surfaces And Capabilities

The current system cannot honestly reproduce every reference-image feature.
Known missing pieces:

- background image or atmospheric desert atelier scene
- asset/background pipeline for packaged or generated imagery
- right metrics panel recipe beyond the right dock rail
- agent card recipe distinct from full AgentWindow chrome
- top segmented navigation recipe for behavior-bearing controls
- typography scale cleanup and font application policy
- restrained icon system or asset pack
- layout preset/page shell arrangement for command-center composition
- authenticated production `/` smoke for live AgentWindow, CommandPalette,
  modal, Datapad, and active right-panel states

## Do Not Fake

Do not represent unsupported capabilities by smuggling them into V2 Skin Packs.

- no raw CSS
- no selectors
- no style tags
- no JavaScript
- no event handlers
- no remote image URL in accepted production payload
- no `url(...)`
- no base64 image payload
- no local file path
- no asset/background production runtime apply
- no layout behavior
- no z-index, pointer-events, focus, drag, resize, or React Flow behavior
- no store, backend, Supabase, API, sync, database, or workspace writes
- no runtime token persistence

## Current Loop Deliverables

Loop 01 establishes:

- this north star document
- `warmGlassOpsSkinPackV2Fixture`
- a pure production alias coverage report
- a Style Lab `Warm Glass Ops Coverage` panel
- focused tests for validation, Render Plan, bridge coverage, unsupported gaps,
  and runtime-boundary safety

## 60-To-80 Interpretation

Warm Glass Ops moves V19 from alias collection toward outcome-driven readiness.
The important question becomes:

> Which parts of the desired design can the current Render Plan and Production
> Bridge actually drive, and which parts are still honest gaps?

The first 60-to-80 loop should improve answer quality, not production runtime
scope.

## Production Alias Bridge Expansion Status

Loop `20260531-v19-warm-glass-ops-production-alias-bridge-expansion` upgrades
Warm Glass from mostly fallback-driven production alias evidence to direct
Bridge Plan output for the already adopted shell/content/chrome alias families.

Direct bridge output now covers:

- panel primitive aliases
- glass primitive aliases
- workspace aliases
- right dock rail aliases
- TopBar chrome aliases
- message bubble and role background aliases
- AgentWindow chrome aliases
- CommandPalette shell aliases
- modal shell aliases
- Datapad shell aliases

This does not change production runtime behavior. It only means the accepted
Warm Glass fixture can compile into a preview/readiness Bridge Plan that emits
those production alias variables directly. Production apply, persistence,
assets, layout presets, authenticated runtime smoke, and background image
integration remain separate gates.
