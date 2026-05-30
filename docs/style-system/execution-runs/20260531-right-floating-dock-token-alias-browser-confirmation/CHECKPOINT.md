# Right Floating Dock Token Alias Browser Confirmation

## Scope

This was a verification-only follow-up for commit `a475b71`.

No source files, package/config/deploy files, Supabase files, or exports were modified. The browser pass used the existing local dev server at `http://localhost:3000/` and did not log in, submit credentials, persist preview state, or mutate workspace data.

## Preflight

- Branch: `codex/v18-style-pack-contract-prep`
- HEAD: `a475b71`
- `a475b71` is present in the current branch history.
- Initial `git status --short`: clean.
- Existing local dev server responded at `http://localhost:3000/`.

## Browser Confirmation

- Authenticated session available: yes.
- NexusOps UI visible: yes.
- Right floating dock visible: yes.
- `.nexus-right-floating-dock-rail` DOM element exists: yes.
- Baseline computed rail styles were readable:
  - Background: `oklab(0.17359 -0.00837383 -0.0217823 / 0.9)`
  - Border: `oklab(0.797103 -0.114086 -0.0700009 / 0.25)`
  - Shadow: existing cyberpunk shadow stack.
  - Backdrop blur: `blur(8px)`.
- Right dock Providers toggle smoke: passed; the toggle opened and closed without mutating workspace data.
- Browser console errors: 0.

## Alias Probe Result

Result: blocked / not confirmed.

The current authenticated page bundle did not expose the right-dock alias CSS rule during the browser pass. A read-only stylesheet scan of the loaded page after reload found:

- `.nexus-right-floating-dock-rail` selector in loaded CSS: no
- `--nexus-right-dock-bg`: no
- `--nexus-right-dock-border`: no
- `--nexus-right-dock-shadow`: no
- `--nexus-right-dock-blur`: no
- `--nexus-right-dock-radius`: no

Local source still contains the expected frame class and alias declarations, but the running dev bundle did not reflect those CSS rules during this confirmation pass. Because the loaded CSS did not include the alias selector, the visual alias confirmation could not be marked as passed.

The Chrome extension read-only evaluate sandbox allowed DOM/computed-style reads but did not allow direct `style.setProperty` mutation. A bookmarklet attempt to apply temporary root variables was also blocked or ignored by Chrome; root inline style remained empty afterward. No temporary variables were persisted.

## Revert Result

Result: not confirmed.

Because the alias variables could not be reliably applied to the loaded page and the loaded CSS bundle did not include the alias rule, there was no valid changed state to revert from. Baseline styles remained intact.

## Verification

- `git diff --check`: passed.
- `git diff --name-only`: empty before staging because the checkpoint was a new untracked file.
- `git status --short`: only this checkpoint directory was listed before staging.

## Forbidden Boundaries Held

- No `src/**` files modified.
- No package/config/deploy files modified.
- No Supabase/database/migration files modified.
- No `exports/**` files modified.
- No push or deploy performed.
- No credentials submitted.
- No workspace data mutated.

## Recommendation

Do not proceed to TopBar token alias adoption based on this pass. First rerun browser confirmation against a dev server that serves the latest CSS bundle, or add a future explicitly allowed diagnostic path that can prove temporary production-frame alias application and revert without touching workspace persistence.
