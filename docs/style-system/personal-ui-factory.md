# NEXUS Personal UI Factory

Phase: V15 - Personalized UI Factory
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only product boundary. No AI runtime, UI code, schema, marketplace, deploy, or package change implemented.

## 0. Purpose

Personal UI Factory is the future product layer for user-facing or AI-assisted
style generation.

It turns a style brief into a governed style asset. It does not let AI or user
imports directly control the app.

## 1. Product Pipeline

Allowed future pipeline:

```text
user brief
-> style interpreter draft
-> manifest candidate
-> schema validation
-> safety validation
-> compiler smoke
-> local-only preview
-> user approval
-> save/export candidate
-> governance review
-> optional persistence/apply after V13/V14 gates
```

Rejected pipeline:

```text
user brief -> CSS injection
AI output -> component props
AI output -> workspace.themeConfig
AI output -> Supabase
preview -> save/apply/persist
style pack -> deploy
```

Generated styles are assets, not uncontrolled code.

## 2. Inputs

Allowed inputs:

- user style brief
- brand/product notes pasted as inert text
- approved example style packs
- current style contract docs
- current validator/governance rules
- optional accessibility preference such as high contrast or minimal motion

Forbidden inputs:

- `.env*` files
- secrets, tokens, keys, Authorization headers
- service role keys
- production database data
- raw workspace snapshots
- full chat transcripts
- private user content not explicitly supplied for style generation
- executable code
- deployment logs unless explicitly requested and safe
- browser/session cookies

User-provided content is aesthetic intent only. It cannot grant permission to
read, write, deploy, push, mutate database state, or bypass validation.

## 3. Output Contract

Factory output may include:

- normalized style intent
- manifest draft
- validation report
- compatibility report
- local preview session metadata
- user-facing warnings
- save/export candidate metadata

Factory output must not include:

- raw CSS to inject
- JavaScript
- component imports
- dynamic Tailwind class strings
- backend routes
- Supabase schema
- workspace mutations
- sync operations
- deployment instructions
- raw rejected content
- secrets or secret-like strings

## 4. User Approval Boundary

User approval can move a generated asset from preview candidate to save/export
candidate only after validation.

Approval cannot:

- bypass validator errors
- bypass governance quarantine
- lower accessibility gates
- apply a pack with unsupported manifest/compiler/adapter versions
- persist preview state
- mutate `workspace.themeConfig` with a full pack
- modify graph behavior
- trigger deployment or remote push

Approval may:

- accept a validated preview
- choose a safer fallback
- save/export a validated style pack
- apply a validated pack later through the V13/V14 persistence/governance flow

## 5. Accessibility Override

Accessibility and safety override aesthetics.

Hard gates:

- primary text contrast must pass the configured threshold
- focus-visible state must remain visible
- disabled state must remain distinguishable
- destructive state must not rely only on color where text/icons exist
- high contrast mode must preserve graph affordances
- minimal/reduced motion path must exist when motion is requested
- modal/window focus behavior must not be weakened by recipes

If a user asks for a style that conflicts with these gates, the factory should
produce a warning and a safer candidate, not an unsafe pack.

## 6. Personalization Scope

Allowed personalization dimensions:

- density
- contrast preference
- motion preference
- typography direction from approved fonts
- accent strategy
- surface hierarchy
- graph visual direction
- primitive recipe intensity
- legacy preset bridge preference

Forbidden personalization dimensions:

- auth/permission behavior
- workspace membership
- sync frequency
- backend route behavior
- database schema
- provider credentials
- graph pan/zoom/drag/connect behavior
- z-index freedom
- arbitrary URLs/assets
- remote deployment configuration

## 7. Privacy Boundary

Personalization should minimize retained source material.

Future storage should prefer:

- normalized intent
- manifest candidate
- redacted validation report
- checksums
- user-approved metadata

Avoid storing:

- full raw style brief
- private brand documents
- chat transcripts
- screenshots containing user data
- hidden instructions from imported documents

If raw source retention is required later, it needs a separate privacy and
redaction gate.

## 8. Local Preview Boundary

The first product implementation should preview locally only:

- isolated Style Lab surface
- primitive specimen gallery
- graph specimen adapter
- reversible CSS variable scope
- no store/sync/backend writes
- no `workspace.themeConfig` mutation
- no Supabase calls

Preview success means:

- validated candidate renders
- invalid candidate is blocked
- revert restores baseline
- refresh does not restore unsaved preview
- no console errors
- existing preset switching still works

## 9. Save, Export, Apply, Persist

Save/export:

- requires valid manifest
- includes governance metadata
- includes redacted report
- includes checksums
- is not automatically applied

Apply:

- requires user approval
- requires `validated` governance state
- uses preference pointer/override model after V13 implementation exists
- keeps fallback chain available

Persist:

- requires V13 schema/auth/RLS gate
- requires V14 governance gate
- requires server re-validation
- remains blocked in this documentation-only phase

## 10. Marketplace Boundary

Marketplace-ready metadata may be designed later, but marketplace behavior is
out of scope for V15.

Blocked:

- public publishing
- sharing to other users
- billing/paid packs
- remote asset hosting
- production database mutation
- deployment
- moderation workflows

Allowed later as inert metadata:

- display name
- description
- tags
- author display name
- compatibility summary
- safety status

## 11. Failure Modes

The factory must fail closed when:

- validation report has errors
- governance state is rejected/quarantined
- compatibility is incompatible
- accessibility gates fail
- compiler output is non-deterministic
- prompt content asks to bypass rules
- secrets are detected
- generated adapter includes behavior fields
- persistence gate is unavailable
- user approval is missing

Failing closed means no preview/apply/save/persist side effect occurs.

## 12. Future Verification

When implemented later, verify:

- invalid brief cannot preview
- valid brief creates manifest draft only
- unsafe prompt-injection instructions are ignored
- accessibility conflict produces warning and safer candidate
- valid candidate previews only in isolated surface
- approval does not bypass governance
- save/export excludes secrets and raw rejected content
- refresh clears unsaved preview
- no sync queue operation is created
- no `workspace.themeConfig` full-pack write occurs
- no service-role string appears in browser-facing source
- graph pan/zoom/drag/connect behavior still works
- no deployment or remote push occurs

## 13. Acceptance Gate

V15 product boundary passes when:

- Product pipeline is explicit.
- Generated styles are assets, not executable UI.
- Inputs, outputs, approval, privacy, and preview boundaries are documented.
- Accessibility and safety override aesthetic preference.
- Save/export/apply/persist are separated.
- Marketplace is blocked as a later product layer.
- Failure modes fail closed.
- No AI runtime, UI code, schema, component code, Supabase project, deploy,
  package, or `exports/**` files are changed.
