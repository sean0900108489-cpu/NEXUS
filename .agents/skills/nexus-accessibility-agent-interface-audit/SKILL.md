---
name: nexus-accessibility-agent-interface-audit
description: Use when auditing whether current NEXUS UI controls are understandable to humans and agents: button labels, icon-only aria-labels, accessibility tree visibility, roles, names, and interaction semantics.
---

# Nexus Accessibility Agent Interface Audit

## Purpose

Assess whether a human, Codex, or another agent can understand current UI controls from labels, roles, accessible names, and semantic structure.

## Hard Boundaries

- Do not redesign controls.
- Do not patch accessibility defects in this round.
- Do not run browser checks outside localhost.

## Focus

- Can an agent know what this button does?
- Can a user understand it?
- Can a report map the control back to source?
- Are icon-only buttons labeled?
- Are important controls visible in an accessibility snapshot?

## Required Outputs

- `reports/accessibility/agent-interface-audit.md`
- `reports/accessibility/button-label-risk.json`

