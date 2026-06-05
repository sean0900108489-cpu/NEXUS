# Live Evidence Mandatory Gate

This gate prevents a report from claiming that a product behavior works when it
was only inferred from source code.

## Verdict Tiers

| Tier | Meaning | Allowed Claim |
|---|---|---|
| `static-only` | Source, docs, schemas, or tests were read, but no real surface was operated. | Possible, designed, or statically supported |
| `local-live` | A local API, script, or dev server was exercised. | Locally observed |
| `browser-live` | Browser, Chrome, or Computer Use operated the UI or current page. | User-visible behavior observed |
| `computer-use-live` | Computer Use operated the actual visible UI with mouse/keyboard style actions and recorded the action sequence. | Strong user-visible behavior observed |
| `account-live` | More than one account or role class was exercised. | Account parity observed |
| `deployment-live` | Preview or production deployment was exercised. | Deployment behavior observed |
| `blocked` | Live evidence was required but unavailable. | Not verified; blocked by named prerequisite |
| `not-yet-verified` | The agent did not run the necessary live step. | Must not claim working behavior |

## Mandatory Live Evidence Claims

A claim needs live evidence when it says any of the following:

- a user can complete a workflow
- a button, panel, node, route, import, export, download, or history item works
- a generated image, artifact, file, or output is retrievable
- an account role can or cannot perform an action
- a long-running workflow is alive, recoverable, or durable
- local, preview, and production behave the same

## Computer Use Screen Evidence Rule

For Workflow Pro UI, graph, node, composer, generated history, download,
workflow execution, account permission, import/export, or any claim that a user
can complete a visible task, **Computer Use is the default required evidence
layer**.

Browser, Chrome, API, unit test, and static evidence are supporting evidence.
They do not replace Computer Use for a final user-visible verdict unless the
report explicitly marks the verdict as `blocked` and explains why Computer Use
could not be performed.

A valid screen evidence sequence must record:

- target URL or app surface
- visible starting state
- action sequence summary, using mouse/keyboard/UI operations
- at least three meaningful user steps for non-trivial workflows
- visible result or visible failure state
- screenshot path or screenshot availability note when safe
- request/run/artifact ids if the UI exposes or correlates them
- whether the same behavior was only inferred from code or actually observed

## Evidence Event Requirement

For every `verdict.added` event with:

```json
{
  "verdict": {
    "requiresLiveEvidence": true,
    "tier": "computer-use-live",
    "requiresComputerUseEvidence": true
  }
}
```

there must be at least one prior `live_evidence.added` event in
`events.ndjson`, the referenced evidence method must be `computer_use_live`, and
the verdict must reference it in `liveEvidenceRefs`.

## Acceptable Live Evidence

Use sanitized evidence only:

- Browser/Chrome URL and visible state summary
- Computer Use action sequence summary
- request id, trace id, run id, group id, output id, artifact id
- status code and sanitized error
- screenshot path if it contains no secrets
- reload/recovery observation

Do not store raw API keys, cookies, bearer tokens, private prompts, or raw
provider responses that may contain secrets.

## Blocked Verdict Format

If a live test cannot be run, the report must say:

```json
{
  "claim": "",
  "tier": "blocked",
  "missingPrerequisite": "",
  "safeNextStep": ""
}
```

Blocked is acceptable. Pretending static evidence is live evidence is not.
Browser/Chrome-only evidence is also not enough for a final UI usability verdict
when Computer Use was required.

## Real Provider Permission Rule

When configured provider credentials are available and the task asks whether an
LLM, image, audio, vision, artifact-generation, or provider-backed workflow
actually works, the agent is authorized to run real provider/API tests within the
project's configured budget and safety limits.

For provider-backed behavior:

- real provider/API evidence is preferred over mock evidence
- mock, dry-run, or static-only evidence may only support planning
- a final provider-backed verdict must not be based only on mock/dry-run output
- if the agent refuses or cannot use the configured provider, it must mark the
  verdict `blocked` and name the missing prerequisite or refusal reason
- reports, checkpoints, and events must describe the permission to use
  configured credentials, but must not print, persist, or copy raw secret values

This rule exists because avoiding the real provider can create a larger evidence
gap than spending a small, authorized amount of API budget.
