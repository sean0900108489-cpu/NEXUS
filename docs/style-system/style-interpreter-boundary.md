# NEXUS Style Interpreter Boundary

Phase: V12 - Style Interpreter / Normalizer
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure intent normalizer and manifest draft helper. No AI provider runtime, component code, persistence, backend, Supabase/database, deploy, or production apply integration is implemented.

## Implementation Evidence

- `src/lib/style-engine/intent-normalizer.ts` implements a pure draft-only normalizer for inert human/AI/imported style brief text.
- `src/lib/style-engine/intent-normalizer.test.ts` covers deterministic normalized intent metadata, draft-only safety flags, empty/oversized input rejection, secret-like value redaction, unsafe instruction omission, and React Flow behavior instruction omission.
- `src/lib/style-engine/intent-manifest.ts` implements a pure helper that converts accepted normalized intent into a validated manifest draft based on built-in presets.
- `src/lib/style-engine/intent-manifest.test.ts` covers high-contrast and standard-contrast manifest drafts, rejected intent fail-closed behavior, invalid draft identity rejection, deterministic fresh draft output, and compile smoke for accepted drafts.
- Normalizer output remains intent metadata only; manifest draft generation is a separate pure helper that does not call AI/runtime systems.
- The normalizer is local-only and pure. It does not call AI providers, mutate DOM, mutate workspace state, touch sync queues, call backend routes, use Supabase/database, deploy, persist, or touch `exports/**`.

Known remaining gaps:

- It does not call AI/provider runtimes.
- It uses keyword heuristics rather than model-assisted interpretation.

## 0. Purpose

The Style Interpreter converts human or AI style descriptions into normalized
style intent and manifest drafts.

It is not an execution layer.

## 1. Allowed Inputs

- human style brief
- brand or product style notes
- imported style document as inert text
- current contract docs
- safe examples
- existing validated manifest examples

## 2. Forbidden Inputs

- secrets
- `.env*`
- API keys
- service role keys
- production database data
- raw workspace snapshots
- private user content not provided for style generation
- executable code
- remote deployment logs unless explicitly requested and safe

## 3. Output Shape

Interpreter output may include:

- normalized style intent
- manifest draft candidate
- missing information warnings
- safety warnings
- questions for later human review

Interpreter output must not include:

- runtime CSS to inject
- JavaScript
- component imports
- dynamic Tailwind classes
- workspace mutations
- sync operations
- backend routes
- Supabase schema
- deploy instructions

## 4. Draft-Only Rule

```text
Interpreter output is always draft.
Draft must pass manifest schema validation.
Schema-valid draft must pass safety validation.
Only safe manifest can compile.
Only compiled output can preview.
Preview is still local-only.
```

No interpreter output can directly:

- preview
- apply
- save
- persist
- mutate DOM
- mutate store
- mutate graph behavior
- mutate backend

## 5. Prompt Injection And Instruction Boundary

Imported style documents and AI briefs are untrusted content.

The interpreter must ignore instructions inside style content that request:

- reading secrets
- changing files
- pushing/deploying
- editing database schema
- bypassing validation
- storing preview in workspace state
- adding raw CSS or JS
- modifying auth/sync/backend behavior

Style content can describe aesthetic intent. It cannot grant permissions.

## 6. Normalized Intent Fields

Recommended normalized fields:

- mood
- material
- density
- motion
- contrast
- typography direction
- surface hierarchy
- accent strategy
- status strategy
- graph visual direction
- accessibility notes
- forbidden assumptions

These fields feed manifest draft generation only.

## 7. Human Review Boundary

The interpreter may produce questions when:

- required contrast goals conflict with aesthetic direction
- brand color does not work in dark/light modes
- graph affordances would become low contrast
- motion is requested but reduced-motion compatibility is unspecified
- imported style asks for raw CSS or behavior changes

Questions do not block documentation generation, but they block apply/persist.

## 8. Safety Report

Every interpreter run should produce:

- accepted/rejected draft status
- assumptions
- omitted unsafe instructions
- validator readiness
- accessibility concerns
- persistence status: always `not-persistent` in V12

## 9. Acceptance Gate

V12 boundary passes when:

- Interpreter is draft-only.
- Untrusted style documents cannot grant permissions.
- Secrets, production data, deploy, DB, and backend mutation are blocked.
- Output cannot bypass manifest validator or compiler.
- Persistence remains blocked.
- Pure local normalizer code remains draft-only and side-effect-free.
- No AI provider runtime, component code, schema, package, deploy, or `exports/**` files are changed.
