---
name: nexus-extension-layer-mapper
description: Use when identifying current NEXUS extension-layer signals: registries, plugin slots, dynamic imports, lazy loading, feature flags, workflow node registries, panel injection, command registries, tool registries, and provider/adapters.
---

# Nexus Extension Layer Mapper

## Purpose

Find where the current system already behaves like an extension layer and where behavior is still hard-coded.

## Hard Boundaries

- Do not introduce plugin architecture.
- Do not move current code into registries.
- Do not rename extension points.

## Search Targets

- `registry`, `registries`.
- `nodeTypes`.
- `dynamic import`.
- `React.lazy`.
- `feature flag`.
- `plugin`.
- `adapter`.
- `provider`.
- `slot`.
- `panel injection`.
- `command registry`.
- `tool registry`.
- `workflow node types`.

## Required Outputs

- `maps/08-extension-layer-map.md`
- `reports/dependency-boundary/extension-layer-risk.md`

