# V19 Production Skinning Next Stage Decision Brief

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

## Purpose

This brief defines possible next stages after V19 soft landing.

It does not choose an option automatically. The user should choose between the
real environment connection plan and the performance-layer optimization plan
first, because those two determine whether the next phase optimizes confidence
in a real workspace or the safety/performance of preview/application mechanics.

## Option A - 真實環境接合計劃

Goal:

- connect V19 skinning evidence to a real authenticated workspace without
  adding persistence or production apply first

Why now:

- production selectors/aliases exist for major surfaces
- Style Lab evidence is strong but not the same as live workspace evidence
- authenticated `/` smoke is the largest confidence gap

Why not now:

- requires access to an authenticated session
- live workspace smoke can accidentally mutate data if the checklist is loose
- should be designed before automation or implementation

First safe task:

- write an authenticated `/` smoke checklist and run it manually or with
  browser tooling only after confirming a safe session

Checklist should cover:

- RightDock rail
- TopBar frame
- Workspace
- MessageBubble role surfaces
- AgentWindow chrome and ToolbarIconButton selector
- CommandPalette shell open/close without executing commands
- AgentBranchModal shell open/close without submit
- Datapad shell open/close without save/delete/upload/download

Allowed files:

- docs/checkpoint first
- optional browser evidence artifact only if explicitly requested

Forbidden files:

- `src/**`
- store/sync/backend/Supabase/API
- production apply
- runtime token persistence
- login credential submission
- command execution
- modal submit
- Datapad save/delete/upload/download
- workspace mutation

Verification:

- browser evidence
- selector/computed-style checks where safe
- console review
- known baseline separation
- final `git status`

Stop condition:

- stop if auth is unavailable, a surface requires data mutation to reveal, or
  the smoke would execute behavior-bearing commands

Expected value:

- very high confidence gain for landing

Risk:

- medium operational risk, low code risk if kept docs/browser-only

## Option B - 效能層優化計劃

Goal:

- define budgets and scheduling constraints for future preview/apply mechanics
  before any production runtime apply is added

Why now:

- bridge variables are now numerous enough that apply cost matters
- future non-persistent preview and production apply paths need budgets before
  implementation
- performance planning can happen without touching production behavior

Why not now:

- there is no approved production apply path yet
- premature optimization could distract from authenticated smoke and user
  testing evidence

First safe task:

- create a performance budget document for Render Plan / Bridge Plan preview
  and future apply

Budget topics:

- render plan compile duration
- bridge variable count
- style variable apply count
- preview apply duration
- revert duration
- layout/recalc risk
- `requestAnimationFrame` or idle scheduling policy
- smoke performance metrics
- fail-closed behavior for oversized plans

Allowed files:

- docs
- pure style-engine tests only after plan approval

Forbidden files:

- production runtime apply
- token persistence
- production shell source
- package/config/deploy
- backend/store/API
- browser automation that mutates workspace state

Verification:

- docs diff check first
- later pure unit tests for budget helpers if approved

Stop condition:

- stop if the work requires implementing production apply, persistence, or
  changing runtime behavior

Expected value:

- high for future safety and V20 readiness

Risk:

- low as docs, medium if implementation starts too early

## Option C - Recipe Boundary Plan

Goal:

- turn Style Lab specimens into precise recipe boundaries that can later guide
  safe production selector/extraction work

Why now:

- right metrics, agent cards, segmented nav, and control chrome now exist as
  visible specimens
- moving them directly into production would be risky without recipe boundaries

Why not now:

- this is design/system work, not immediate real-environment confidence
- it does not answer authenticated production smoke gaps

First safe task:

- create recipe boundary docs for:
  - right metrics
  - agent cards
  - segmented nav
  - control chrome

Allowed files:

- docs
- optional Style Lab-only examples if a later task explicitly allows source

Forbidden files:

- production components
- `globals.css`
- production selector/alias changes
- behavior-bearing control edits
- store/backend/API

Verification:

- docs diff check
- later focused source guards only after a selector-first task is approved

Stop condition:

- stop if recipe work turns into production implementation, broad styling, or
  runtime behavior changes

Expected value:

- high design-system value; medium immediate landing value

Risk:

- low as docs, medium if rushed into production

## Option D - Asset/Layout Gate

Goal:

- decide whether Surface Style background scene, asset pipeline, and layout/page
  arrangement become V20/V21 work

Why now:

- the reference image depends heavily on background scene and command-center
  layout
- Style Lab currently simulates these without production apply

Why not now:

- asset and layout apply are explicitly out of V19 scope
- unsafe asset handling or layout behavior changes would create a large risk
  jump

First safe task:

- write a V20/V21 asset/layout gate proposal

Proposal should cover:

- accepted asset sources
- no remote URLs in production payloads
- image security and size limits
- generated/background asset review
- layout preset review-only versus apply modes
- page shell arrangement constraints
- rollback strategy

Allowed files:

- docs/specs only

Forbidden files:

- public/static asset changes
- copied reference image
- remote image URL references
- production background apply
- layout preset production apply
- production shell behavior
- package/config/deploy

Verification:

- docs diff check
- later security/performance review before any implementation

Stop condition:

- stop if implementation would copy images, load remote URLs, or alter
  production layout behavior

Expected value:

- very high visual value after gates exist

Risk:

- high if started as implementation under V19

## Decision Guidance

Recommended first decision:

- choose between Option A and Option B.

Choose Option A if:

- the next question is "does this work in a real authenticated workspace?"
- user/designer confidence is more important than apply-performance planning
- a safe authenticated session is available

Choose Option B if:

- the next question is "can future preview/apply be safe and bounded?"
- runtime apply or non-persistent preview is likely to be designed soon
- no authenticated session is available yet

Choose Option C if:

- the next question is "how do Style Lab specimens become production-ready
  recipes?"

Choose Option D only if:

- the user explicitly wants V20/V21 asset/layout planning and accepts that this
  is not V19 implementation.

Do not start any option automatically.

## Universal Hold Conditions

Stop and ask for a new scoped task if any next stage requires:

- production runtime apply
- token persistence
- backend/store/API writes
- Supabase/database/migrations
- command execution
- modal submit
- Datapad save/delete/upload/download
- React Flow or graph behavior changes
- drag/resize/focus/z-index/window/modal behavior changes
- copying or importing reference images
- remote image URLs in accepted production payloads
- broad production styling
