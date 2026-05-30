# Baseline Console Hydration Triage Before Next Token Alias

## Scope

Triage / classification only. No source, package/config/deploy, Supabase/database, or export files were modified.

## Preflight

- Branch confirmed: `codex/v18-style-pack-contract-prep`.
- Starting working tree was clean.
- No existing port 3000 listener was available, so one temporary `npm run dev` server was started for this triage pass.
- The temporary server was used only for browser/runtime inspection and should be stopped by the executor before final handoff.
- No login or credential entry was performed.

## Runtime Load Summary

- Fresh agent-controlled Chrome tab loaded `/` successfully.
- Auth gate did not block access.
- NexusOps shell was visible.
- Route-edge production page shell boundary was present.
- Right floating dock rail was present.
- Chrome extension dev log capture for the fresh agent-controlled tab reported no `error` / `warn` / `warning` entries during that load.
- The user-visible Chrome tab separately showed Chrome Translate active (`NEXUS // AI OPS` rendered as `NEXUS // AI 作戰`), which is relevant to the hydration mismatch classification below.

## Console / Runtime Findings

| Issue | Likely Cause | Source Evidence | Severity | Blocks next token alias? | Recommended Next Action |
| --- | --- | --- | --- | --- | --- |
| `https://cdn.example.com/nexus/bg-cyberpunk.webp` load failure | Active cyberpunk theme defines a remote placeholder background asset URL. No matching local `public/**` webp asset exists. | `src/app/globals.css:42` defines `--asset-background-image: url("https://cdn.example.com/nexus/bg-cyberpunk.webp")`; `.nexus-shell` uses `background: var(--shell-surface), var(--asset-background-image)` at `src/app/globals.css:246`; `rg --files public` found no matching `bg-cyberpunk.webp`. | Medium for strict smoke, low for UI operability. | Yes for strict `console errors = 0`; no for token alias visual behavior if recorded as known baseline. | Create a targeted asset-path fix prompt if console-clean production smoke is required. Low-risk options should be assessed separately: local placeholder asset, `none` fallback, or asset pack governance path. |
| Hydration mismatch: server `NEXUS // AI OPS` vs client `NEXUS // AI 作戰` | Chrome Translate translated visible page text before/during React hydration. This is browser-environment mutation, not evidence of token alias CSS breakage. | Previous confirmation DevTools showed a hydration diff from `NEXUS // AI OPS` to `NEXUS // AI 作戰`; current visible Chrome tab showed the Translate UI active and the page title/content translated to Traditional Chinese. A fresh agent-controlled tab without translation loaded with title `NEXUS // AI OPS` and no captured dev-log warning/error. | Medium for smoke validity, low for app/token alias behavior if testing in an untranslated tab. | Yes if smoke is run in a translated Chrome tab and requires console-clean hydration; no if smoke uses untranslated page state. | For future token alias smoke, use a non-translated tab/session or explicitly record translation as an external browser baseline condition. Do not attribute this to Style Engine token adoption without reproduction in an untranslated tab. |
| Existing workspace state `404` requests in dev server output | Workspace sync/state endpoint may not have a persisted state record for the active workspace IDs during local dev. The app recovered and showed `SYNCED` in the visible UI after reload. | Temporary dev server output included `GET /api/v1/workspaces/.../state 404`; visible UI later showed `SYNCED`. | Low for this token alias triage unless console surfaces it as an error in a future smoke. | Unknown for strict console if surfaced client-side; not observed as blocking UI in this pass. | Keep as incidental baseline note. Do not broaden this token alias triage into sync/backend work. |

## Classification

- The right dock alias confirmation remains valid.
- The asset error is a known baseline candidate caused by a remote placeholder URL in the active theme CSS, not by right dock token aliases.
- The hydration mismatch is most likely caused by Chrome Translate mutating page text, not by the current branch's token alias work.
- These issues appeared before any new token alias probe in this triage pass.
- They do not appear to block NexusOps UI usage or right dock visual alias behavior.
- They do block a strict `console errors = 0` smoke unless treated as known baseline or tested in an untranslated / console-clean context.

## Recommendation

- Proceed to a TopBar token-adoption assessment only if the next prompt explicitly accepts these as known baseline conditions or requires smoke in an untranslated tab.
- Pause implementation if the next gate requires strict `console errors = 0` in the currently translated Chrome user tab.
- If a fix is desired before further token adoption, create a narrow targeted fix prompt for:
  1. replacing or localizing the `bg-cyberpunk.webp` placeholder asset reference, and/or
  2. establishing a smoke rule that disables or avoids Chrome Translate for hydration-sensitive local verification.

## Stop Condition

Stop at docs-only triage. Do not continue into TopBar token alias, broader styling, source fixes, sync/backend work, or runtime token apply in this round.
