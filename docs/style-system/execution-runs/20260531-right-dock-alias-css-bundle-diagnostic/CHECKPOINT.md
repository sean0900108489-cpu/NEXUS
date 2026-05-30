# Right Dock Alias CSS Bundle Diagnostic

## Scope

This was a diagnostic pass for the right floating dock token alias spike. It did not add a new alias, did not start TopBar work, and did not change production behavior.

## Preflight

- Branch: `codex/v18-style-pack-contract-prep`
- Starting HEAD: `401054d`
- Initial `git status --short`: clean.
- Read:
  - `src/app/globals.css`
  - `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
  - `src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`
  - `docs/style-system/execution-runs/20260531-right-floating-dock-token-alias-browser-confirmation/CHECKPOINT.md`

## Source Check

Result: confirmed.

- `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx` contains the stable rail class:
  - `.nexus-right-floating-dock-rail`
- `src/app/globals.css` contains the scoped selector:
  - `.nexus-shell .nexus-right-floating-dock-rail`
- `src/app/globals.css` contains all intended aliases:
  - `--nexus-right-dock-bg`
  - `--nexus-right-dock-border`
  - `--nexus-right-dock-shadow`
  - `--nexus-right-dock-blur`
  - `--nexus-right-dock-radius`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx` already asserts the stable frame class and source-level CSS aliases, so no test strengthening was needed.

## Build / Output Check

Result: confirmed for production build output.

- `npm run build`: passed.
- Post-build `.next` search found `nexus-right-floating-dock-rail` in production output.
- Post-build `.next` search found `--nexus-right-dock-bg` in production CSS output.
- Extracted production CSS rule:

```css
.nexus-shell .nexus-right-floating-dock-rail{background:var(--nexus-right-dock-bg,var(--nexus-panel-bg,#020617e6));border-color:var(--nexus-right-dock-border,var(--nexus-panel-border,#67e8f940));border-radius:var(--nexus-right-dock-radius,var(--nexus-panel-radius,0));box-shadow:var(--nexus-right-dock-shadow,var(--nexus-panel-shadow,0 18px 60px #00000073, 0 0 32px #22d3ee24));-webkit-backdrop-filter:blur(var(--nexus-right-dock-blur,var(--nexus-panel-blur,var(--glass-blur))))!important;backdrop-filter:blur(var(--nexus-right-dock-blur,var(--nexus-panel-blur,var(--glass-blur))))!important}
```

## Runtime Check

Result: partially confirmed; runtime loaded stylesheet remains stale.

Using the existing local dev server at `http://localhost:3000/`:

- Authenticated NexusOps UI rendered.
- `main.nexus-shell` exists.
- `.nexus-right-floating-dock-rail` exists.
- The rail matches `.nexus-shell .nexus-right-floating-dock-rail`.
- Runtime computed baseline styles were readable.
- Runtime loaded stylesheet after reload:
  - `http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__0.yklto._.css`
- Runtime stylesheet scan found:
  - `.nexus-right-floating-dock-rail`: no
  - `--nexus-right-dock-bg`: no
  - `--nexus-right-dock-border`: no
  - `--nexus-right-dock-shadow`: no
  - `--nexus-right-dock-blur`: no
  - `--nexus-right-dock-radius`: no
- Direct `curl` of that loaded stylesheet also found no right-dock selector or alias.

Diagnosis: source and production build output are correct, and the runtime DOM selector is correct. The existing dev server is serving a stale CSS bundle that does not include the latest `globals.css` rule. This does not point to a selector typo or source issue.

## Fix Decision

No source fix was made.

- No class mismatch was found.
- No CSS selector typo was found.
- No test gap was found in the focused frame test.
- Because source and production build output are correct, changing `globals.css` would be churn rather than a fix.

## Verification

- `git diff --check`: passed.
- `npm run test -- src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`: passed, 7 tests.
- `npm run typecheck`: passed.
- `npm run lint -- src/components/nexus/nexus-ops-right-floating-dock-frame.tsx src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx src/app/globals.css`: passed with one expected warning that `src/app/globals.css` is ignored by the ESLint configuration.
- `npm run build`: passed.
- `.next` search after build:
  - `nexus-right-floating-dock-rail`: found.
  - `--nexus-right-dock-bg`: found.

## Alias Visual Confirmation Status

Still blocked for the currently running dev server.

The alias rule is present in source and production build output, and the target DOM selector matches at runtime. However, the existing dev server's loaded stylesheet does not include the alias rule, so browser visual confirmation against that server should not be considered valid until the server serves the latest CSS bundle.

## Forbidden Boundaries Held

- No production behavior changed.
- No `src/**` source files were modified.
- No TopBar, LeftDock, Workspace, React Flow, graph, store, sync, backend, Supabase, API, package/config/deploy, or `exports/**` files were modified.
- No push or deploy performed.

## Recommendation

Do not proceed to TopBar token alias adoption from this runtime state. First restart or otherwise refresh the local dev server so it serves a stylesheet containing `.nexus-shell .nexus-right-floating-dock-rail` and the `--nexus-right-dock-*` aliases, then rerun browser visual apply/revert confirmation.
