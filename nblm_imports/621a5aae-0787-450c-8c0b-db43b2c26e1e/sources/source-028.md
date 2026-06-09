# Source 028 - reports__accessibility__agent-interface-audit.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: ecba21ae-aee1-4b31-ad7c-e5d627ef1aa5
- title: reports__accessibility__agent-interface-audit.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 1940
- token_count: 3780
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/ecba21ae-aee1-4b31-ad7c-e5d627ef1aa5
- source_added_timestamp: 2026-06-05T05:51:21.830188Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/accessibility/agent-interface-audit.md
- local_mirror_estimated_word_count: 3441

## Local Mirror Content

```md
# Agent Interface Accessibility Audit

Static-only audit found `274` interaction signals where a button/control label was not obvious from nearby static source. This is not a final accessibility score; it is an agent-understandability risk list. Full data: `button-label-risk.json`.

| Source | Event | Surface | Risk |
| --- | --- | --- | --- |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:162) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:164) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:174) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:216) | button | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:223) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:233) | button | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:240) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:462) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:473) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:135) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:137) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:168) | button | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:176) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:227) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:229) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:236) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:238) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:248) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:250) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:284) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:142) | button | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:154) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:156) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:38) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-agent-window-chrome-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-window-chrome-primitive.test.ts:11) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:7) | control-signal | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:9) | control-signal | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:23) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:42) | control-signal | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:68) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:69) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:90) | control-signal | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:96) | control-signal | Unknown | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:107) | control-signal | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:109) | control-signal | Unknown | icon/control may lack static accessible name |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:118) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:11) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:13) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:14) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:36) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:37) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:38) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:266) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:267) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:269) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:283) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:284) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:287) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:294) | control-signal | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:356) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:357) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:360) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:367) | control-signal | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:516) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:521) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:524) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:525) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:534) | onClick | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:535) | onClick | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:544) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:599) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:749) | control-signal | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:816) | control-signal | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:966) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:967) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1541) | control-signal | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1552) | onClick | Input / Ingestion | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1560) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1568) | onClick | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1576) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1584) | onClick | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1591) | onClick | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1602) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1650) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1654) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1661) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1669) | control-signal | Workflow Orchestration | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1966) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1968) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1977) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1983) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1986) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:1987) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:2080) | onClick | LLM Node | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:2244) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:2283) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:2285) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops-extraction-map.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-extraction-map.test.ts:103) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:12) | control-signal | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:383) | control-signal | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:878) | button | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:879) | button | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:886) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:887) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3261) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3505) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3753) | control-signal | Unknown | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3764) | control-signal | Unknown | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3899) | button | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3900) | button | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3905) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:3915) | control-signal | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4051) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4052) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4215) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4257) | onClick | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4264) | control-signal | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4284) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4312) | button | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4318) | onClick | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4365) | onClick | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4367) | onClick | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4405) | onClick | Supabase Persistence | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4426) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4430) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4434) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4439) | onClick | Graph / Canvas | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4444) | onClick | Agent Context | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4448) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx:4456) | onClick | Visual / UI Layer | icon/control may lack static accessible name |
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
