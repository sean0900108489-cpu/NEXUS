---
name: nexus-current-system-report-os
description: Use when producing high-quality local HTML, Markdown, JSON, diagrams, and context-pack reports for NEXUS Current System Intelligence. Report style: premium product strategy map plus system control console, readable by humans and agents.
---

# Nexus Current System Report OS

## Purpose

Package current-system evidence into polished local reports without external hosting or secret exposure.

## Hard Boundaries

- Do not depend on external CDNs unless explicitly justified.
- Do not include secrets.
- Do not upload report assets.
- Do not claim runtime verification when only static analysis ran.

## Required Report Sections

- Hero / cover.
- Executive Summary.
- Feature Capability Map.
- Route and Page Map.
- UI Surface Map.
- Button and Interaction Map.
- Component Inventory.
- State and Store Map.
- Frontend Backend Coupling Map.
- Supabase Touchpoint Map.
- Extension Layer Map.
- Runtime Trace Map.
- Unknowns and Questions.
- Pre-Architecture Inputs.
- Next Round Gates.

## Required Outputs

- `index.html`
- `report.md`
- `machine-manifest.json`
- `completion-report.md`
- `assets/diagrams/current-system-map.png` or fallback SVG/HTML diagram
- `assets/diagrams/ui-surface-map.png` or fallback SVG/HTML diagram
- `assets/diagrams/button-interaction-map.png` or fallback SVG/HTML diagram
- `assets/diagrams/frontend-backend-coupling-map.png` or fallback SVG/HTML diagram
- `assets/diagrams/supabase-touchpoint-map.png` or fallback SVG/HTML diagram

