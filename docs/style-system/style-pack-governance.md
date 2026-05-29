# NEXUS Style Pack Governance

Phase: V14 - Style Pack Governance
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure governance/exchange contract. Persistence schema, backend storage, marketplace, deploy, package publishing, and production apply integration are not implemented.

## Implementation Evidence

- `src/lib/style-engine/governance.ts` implements pure local review states, compatibility, permissions, validator/compiler/governance version metadata, redacted checksums, adapter coverage metadata, and preview variable count metadata for validated or warning style packs.
- `src/lib/style-engine/exchange.ts` implements pure text-safe export/import package normalization and redacted exchange review output, including validator version metadata while excluding the internal governance version.
- `src/lib/style-engine/governance.test.ts` and `src/lib/style-engine/exchange.test.ts` cover warning/validated/rejected states, conservative permissions, checksum shapes, validator version metadata, `adapterCoverage.reactFlow = complete`, `adapterCoverage.windowModal = complete`, preview variable counts, and unsafe value redaction.
- Governance remains local-only and pure. It does not create schema, write persistence, mutate `workspace.themeConfig`, touch sync queues, call backend routes, use Supabase/database, deploy, publish, or touch `exports/**`.

Known remaining gaps:

- Saved pack lifecycle storage, upgrade/downgrade migrations, marketplace review, and production apply policy are not implemented.

## 0. Purpose

Style pack governance defines how a saved style pack becomes trusted,
compatible, upgradeable, rejectable, and retireable.

Governance is not persistence. It sits above the V13 persistence model and
decides whether a persisted or imported style pack is safe to use.

## 1. Required Governance States

Every future saved style pack should have a lifecycle state:

| State | Meaning | Can preview? | Can apply? |
| --- | --- | --- | --- |
| `draft` | Imported or generated but not validated. | No | No |
| `validated` | Passed schema, safety, compiler, and accessibility gates. | Yes | Yes |
| `warning` | Safe to preview with documented degradation. | Yes | No by default |
| `rejected` | Unsafe or incompatible. | No | No |
| `deprecated` | Valid but superseded by a newer pack/version. | Yes | Existing workspaces only |
| `retired` | Removed from normal selection. | No new preview | Existing fallback only |
| `quarantined` | Previously accepted pack later failed a safety check. | No | No |

Only `validated` packs can be newly applied to a workspace.

## 2. Version Axes

Governance must track separate versions:

- `manifest_version`: style manifest schema version, starting at `1`
- `compiler_version`: compiler contract version used for generated output
- `validator_version`: validator rule version used for the safety decision
- `adapter_version`: React Flow/Tailwind/legacy bridge adapter contract version
- `pack_version`: user/library version of the style pack itself

Do not overload `schemaVersion` to mean all of these.

## 3. Compatibility Matrix

Future style packs must declare or derive compatibility:

| Axis | Required decision |
| --- | --- |
| Manifest | Does this app understand `manifest_version`? |
| Compiler | Can the current compiler compile it deterministically? |
| Tokens | Are all token groups present or safely defaulted? |
| Recipes | Are required primitive/window/modal recipes compatible? |
| React Flow | Is adapter output visual-only and compatible with current graph adapter? |
| Legacy bridge | Can current presets and `data-theme` behavior coexist? |
| Accessibility | Does text/focus/destructive/high-contrast behavior pass gates? |
| Persistence | Can the pack be stored separately from snapshots? |

Compatibility result:

```text
compatible
compatible_with_warnings
requires_upgrade
requires_downgrade
incompatible
```

`compatible_with_warnings` may preview, but applying it requires explicit product
policy in a later phase.

## 4. Safety Review Status

Each persisted style pack should carry a safety report summary:

- accepted/rejected status
- validator version
- compiler version
- manifest checksum
- normalized manifest checksum
- warning count
- error count
- accessibility result
- forbidden-content scan result
- React Flow adapter result
- persistence boundary result
- reviewer/source metadata

Reports must not store:

- full imported prompt text
- secrets
- environment variable values
- raw Authorization headers
- provider tokens
- production data
- raw CSS/JS rejected payloads

Store codes and redacted summaries, not unsafe source content.

## 5. Checksum Rules

Use separate checksums:

| Checksum | Input |
| --- | --- |
| `source_checksum` | inert imported source when retained locally or server-side with redaction |
| `manifest_checksum` | submitted manifest before normalization |
| `normalized_manifest_checksum` | canonical normalized manifest |
| `compiled_output_checksum` | deterministic compiler output |
| `report_checksum` | redacted validation report |

Apply decisions should be based on normalized manifest and report checksums, not
human-readable names.

## 6. Upgrade And Downgrade

Upgrades may be needed when:

- manifest schema changes
- token names change
- recipe slots change
- adapter output changes
- accessibility gates become stricter
- legacy bridge variables are renamed

Downgrades may be needed when:

- a workspace restores on an older app version
- a pack was imported from a newer lab/export
- a new adapter cannot run in the current app

Upgrade/downgrade must be pure:

```text
old manifest + migration rule -> new manifest candidate + report
```

It must not:

- mutate workspace state
- write to Supabase
- apply preview
- change `workspace.themeConfig`
- change React Flow behavior
- call external services

Only a post-validation save/apply step can persist the upgraded result.

## 7. Rejection Rules

Reject immediately when a pack:

- fails manifest schema validation
- includes raw CSS, JavaScript, selectors, URLs, or dynamic Tailwind classes
- includes secrets or secret-like values
- attempts workspace/sync/backend/database/deploy mutation
- includes React Flow behavior fields
- removes required focus states
- fails required contrast gates
- targets unsupported manifest/compiler/adapter versions without a migration path
- cannot be separated from workspace snapshots

Rejected packs may keep a redacted report for review. They must not remain
available as apply candidates.

## 8. Deprecation, Retirement, And Quarantine

Deprecation:

- marks a pack as superseded
- preserves existing workspace references
- suggests an upgrade target
- blocks new use only if policy says so

Retirement:

- blocks new application
- keeps fallback behavior for existing workspaces
- must be reversible only through a new review

Quarantine:

- immediately blocks preview/apply
- is used for newly discovered safety issues
- should provide a fallback pack for every affected workspace
- should never delete the original record destructively

All three states should prefer additive status updates over destructive deletion.

## 9. Workspace Fallback Contract

Every applied style preference needs a fallback chain:

```text
current style pack
-> fallback style pack
-> built-in legacy preset
-> default legacy cyberpunk variables
```

Fallback must work when:

- pack is retired
- pack is quarantined
- manifest version is unsupported
- compiler fails
- adapter fails
- accessibility gate fails after policy update
- workspace restore happens before style persistence is hydrated

Fallback must not:

- write a new workspace snapshot automatically
- mutate `workspace.themeConfig`
- hide a failed safety state
- fetch external assets

## 10. Import And Export Governance

Import must run:

- parser
- manifest schema validation
- forbidden string scan
- secret scan
- checksum calculation
- compiler smoke
- accessibility minimums
- adapter compatibility check

Export may include:

- normalized manifest
- redacted validation report
- compatibility matrix
- checksums
- pack metadata

Export must not include:

- service role keys
- anon/publishable keys unless explicitly public config and required later
- workspace snapshots
- workspace membership data
- user private content
- rejected raw source content
- compiled CSS if policy has not approved it

## 11. Audit Events

Future governance events should include:

- pack imported
- pack validated
- pack rejected
- pack upgraded
- pack downgraded
- pack applied
- pack deprecated
- pack retired
- pack quarantined
- fallback activated

Audit payloads must be redacted and should store ids, checksums, statuses,
validator/compiler versions, and reason codes.

## 12. Acceptance Gate

V14 governance passes when:

- Style pack lifecycle states are explicit.
- Manifest/compiler/validator/adapter/pack versions are separated.
- Compatibility matrix is documented.
- Safety report and checksum rules are documented.
- Reject/upgrade/downgrade/deprecate/retire/quarantine behavior is defined.
- Fallback protects existing workspaces.
- Import/export boundaries exclude secrets, snapshots, raw rejected content, and
  production data.
- Pure local governance code remains side-effect-free.
- No schema, persistence, component code, Supabase project, deploy, package, or
  `exports/**` files are changed.
