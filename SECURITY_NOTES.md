# Security Notes

## Dependency Audit Status

`npm audit` currently reports two moderate findings through Next.js' transitive PostCSS dependency:

- `postcss < 8.5.10`
- `next` via bundled/transitive `postcss`

The npm-proposed remediation path is `npm audit fix --force`, which would install a semver-major-incompatible Next.js version according to the audit output. That is not a safe L1 maintenance action, so it has not been applied.

## Current Mitigation

- API keys are managed per agent through the Settings sidebar and persisted in this browser workspace by explicit product choice.
- Each key is masked in the UI and sent to `/api/agent-stream` only as an `Authorization` header for that agent's dispatch.
- Missing per-agent API keys are treated as expected mock mode for those agents, not a runtime failure.
- React and React DOM were updated within the current major line.

## Follow-Up

Track the Next.js/PostCSS advisory and apply a normal Next.js patch or minor release when one is available for the current major line. Do not use `npm audit fix --force` without a deliberate framework migration review.
