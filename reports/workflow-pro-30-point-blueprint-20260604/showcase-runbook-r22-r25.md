# Workflow Pro Showcase Runbook R22-R25

Generated: 2026-06-04T18:00:00+10:00

## Purpose

This runbook prepares a screen-operated Chrome demonstration for the latest Workflow Pro construction pass. It avoids adding new features during the demo. The goal is to prove the current system through visible UI actions and traceable evidence.

## Demo Mode

- Browser: Chrome
- Target: `http://localhost:3000/`
- API state: operator reports that the Chrome-side API key has been inserted
- Demo posture: prove what works, mark what remains planned, do not hide missing capability boundaries

## Showcase Order

### 1. Provider Readiness

Goal: confirm API vault is configured without exposing secrets.

Show:

- Providers panel
- `STREAM: LIVE`
- OpenAI-compatible base URL
- locked/masked API key state

Pass:

- key remains masked
- app remains interactive

### 2. Graph Canvas Control

Goal: prove the graph workspace is usable as a workflow surface.

Show:

- top graph actions: Add Input, Add LLM, Add File, Add Image, Add Output, Start All, Brain
- node delete buttons
- input node Start / Pause / Copy controls
- LLM model / reasoning / detail selectors
- image model quality / ratio selectors

Pass:

- graph remains visible
- existing workflow groups are not overwritten

### 3. Brain Workflow Generation

Goal: prove Graph Brain can turn a natural-language request into a new workflow group.

Prompt:

```text
我把圖填在 input 傳上之後，連接兩個不同且已經設定好提示詞的 LLM，最後給我答案。
```

Show:

- Brain request
- planner/compiler messages
- workflow JSON
- append result
- new group appearing on canvas

Pass:

- JSON validates
- append creates a new group, not a replacement

### 4. Image Workflow Generation

Goal: prove graph-level image model settings and generated asset path.

Prompt:

```text
Generate a 16:9 standard Y2K streetwear board focused on oversized wide pants, clean product styling, fashion design references, and clear downloadable final image asset.
```

Show:

- image node model = `img2`
- quality = `Standard`
- aspect ratio = `16:9`
- generated output in chat or graph output
- generated history / generated assets panel
- download action

Pass:

- real generated image appears, not placeholder
- generated asset can be reopened or downloaded

### 5. Attachment Compiler Boundary

Goal: prove file inputs cross the compiler boundary without pretending advanced compilers are complete.

Show:

- File Node
- no-op compiler label
- compiler note
- file node execution evidence if a workflow is run

Pass:

- file node carries references safely
- report says advanced adapters such as `zip-expand` and `speech-to-text` are future adapters

### 6. Ready-Parallel RuntimeLite Evidence

Goal: prove fan-out can now run as ready-node parallel batches at the runtime layer.

Show:

- existing fan-out workflow group
- Start group or Start All if safe
- local runtime evidence after run
- run group inspector

Pass:

- run completes or reports a truthful missing external capability
- runtime evidence updates
- no workflow timeout blocks long-running execution

### 7. Trace And Durable Evidence

Goal: prove observability does not rely on hidden local-only state.

Show:

- Trace panel
- Local Workflow Evidence
- Run Groups
- Group Inspector
- Durable Trace Match
- Durable Group Record
- Refresh behavior
- Resync Trace disabled/enabled state depending on selected run

Pass:

- selected group is inspectable
- durable state distinguishes `not-loaded` from `missing`
- no secret/raw prompt payload is displayed

## Screenshot Targets

1. Providers panel with locked key and live stream state.
2. Graph canvas with workflow groups and top controls.
3. Brain panel after JSON generation.
4. Image node settings: img2 / Standard / 16:9.
5. Generated image result and generated history/download control.
6. Trace panel Group Inspector with local and durable evidence.

## Current Known Limits To Say Out Loud

- explicit join node is not implemented yet
- audio transcription is not implemented yet
- zip expansion is not implemented yet
- native vision prompt reverse is not implemented yet
- workflow runtime is intentionally not time-limited
- the API key must remain masked and must not be copied into reports

## Stop Conditions

Stop the demo and report clearly if:

- the real image API returns permission/auth errors
- generated history records a placeholder instead of a real image
- a run fails due to role or workspace permission
- a trace write returns denied for a user that should have editor rights
- Chrome becomes unresponsive

## Final Demo Report Shape

After the screen demo, produce:

- pass/fail table
- screenshots or screenshot paths
- generated asset IDs/filenames, without API keys
- exact failures and next repair loop if any
- final score against the current Workflow Pro depth target
