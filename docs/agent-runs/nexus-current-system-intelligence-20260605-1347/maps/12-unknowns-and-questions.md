# 12 Unknowns and Questions

| Area | Question | Follow-up |
| --- | --- | --- |
| Runtime visibility | Which static UI controls are actually visible for a given auth/workspace/session state? | Run localhost-only Browser/Chrome trace with isolated local Supabase or mocked env. |
| Daily logs/history | Do observability/system_events/usage_metrics/message history tables contain records for every day? | Requires read-only live Supabase audit or local database snapshot; production was intentionally untouched. |
| LINE Keep loop | Should codebase reports be sent to an external LINE Keep service? | Not performed because the privacy boundary forbids uploading repo maps externally without a narrower confirmation. |
| Interaction semantics | Which icon-only controls have accessible names at runtime? | Run localhost accessibility snapshot or axe-core audit after safe server setup. |
| Store symbol precision | Exact read/write ownership for every store action needs AST symbol graph. | Evaluate ts-morph or ast-grep reference-only, then run a local script if approved. |
| Supabase live behavior | Do local migration expectations match the live project exactly? | Requires explicit read-only Supabase audit, no writes. |
