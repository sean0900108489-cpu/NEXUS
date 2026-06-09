---
name: nexus-component-prop-inventory
description: Use when cataloging current NEXUS React components, props, events, children, imports, exports, store hooks, API calls, rendered surfaces, and large-component risks without changing component code.
---

# Nexus Component Prop Inventory

## Purpose

Create a source-cited component catalog that helps humans and agents understand current component responsibilities and risk.

## Hard Boundaries

- Do not refactor components.
- Do not generate replacement components.
- Do not execute unsafe code-generation against source.
- AST tools are reference-only unless explicitly approved.

## Workflow

1. Scan component exports, named functions, props interfaces/types, hooks, event props, imports, and JSX usage.
2. Mark large components, presentation-only components, and components with mixed domain logic.
3. Flag files that need symbol-level follow-up instead of guessing.

## Priority Files

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/store/nexus-store.ts`

## Required Outputs

- `maps/04-component-inventory.md`
- `reports/component-inventory/component-catalog.json`
- `reports/component-inventory/large-component-risk.md`

