# V23 Planning Pack

This folder contains planning-only artifacts for the next NEXUS upgrade.
The primary HTML report is now a 30-page forecast plus a ranked UI concept
appendix designed for human reading, engineering handoff, LLM continuation, and
img2 visual exploration.

Scope:

- No source runtime implementation.
- No database migration.
- No Vercel deployment.
- No Supabase mutation.

Purpose:

- Convert the corrected Workflow Brain idea into a concrete V23 planning map.
- Define the command rounds before implementation begins.
- Keep planning files separate from product source code.
- Extend the existing Sean-facing V22 report with the new direction.

Primary files:

- `v23-planning-report.html`
- `v23-strategy-report.md`
- `v23-command-rounds.md`
- `v23-planning-manifest.json`
- `v23-research-notes.md`
- `v23-self-review-qna.md`
- `v23-verification-summary.json`
- `v23-completion-report.md`

Recommended reading order:

1. `v23-planning-report.html` for the 30-page Sean-facing forecast.
2. `v23-strategy-report.md` for the engineering reasoning.
3. `v23-command-rounds.md` for the predicted loop structure.
4. `v23-planning-manifest.json` for LLM handoff.
5. `v23-research-notes.md` for source links and fit decisions.
6. `v23-self-review-qna.md` for the final design-pressure test.
7. `v23-completion-report.md` for completion status and next entry point.

UI concept appendix:

- `v23-planning-report.html#ui-concepts`
- 10 ranked smart UI interface concepts.
- Each concept includes score, layout intent, NEXUS fit, and an img2-ready
  prompt.
- Includes `NEXUS Brain Boot Prompt v1` for keeping different LLM sessions
  aligned with the current workflow state.
