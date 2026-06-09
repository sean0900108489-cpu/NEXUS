# Source 038 - reports__dependency-boundary__extension-layer-risk.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: 4225ef9d-e453-4dc9-b534-284fd9d86cd1
- title: reports__dependency-boundary__extension-layer-risk.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 1508
- token_count: 3561
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/4225ef9d-e453-4dc9-b534-284fd9d86cd1
- source_added_timestamp: 2026-06-05T05:51:12.957816Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/reports/dependency-boundary/extension-layer-risk.md
- local_mirror_estimated_word_count: 3245

## Local Mirror Content

```md
# Extension Layer Risk

| Source | Signals | Risk |
| --- | --- | --- |
| [src/app/api/image-gen/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.test.ts) | provider | not indicated by coarse scan |
| [src/app/api/image-gen/route.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.ts) | adapter, provider | possible hard-coded branching around extension concept |
| [src/app/api/predictive-intel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/predictive-intel/route.ts) | commandRegistry, provider, registry | possible hard-coded branching around extension concept |
| [src/app/api/v1/agents/[agentId]/tasks/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/agents/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/memory-compress/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/deployment/checks/latest/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/latest/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/deployment/checks/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/run/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts) | featureFlags, provider | possible hard-coded branching around extension concept |
| [src/app/api/v1/observability/metrics/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/metrics/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/providers/status/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/status/route.test.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/providers/verify/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/verify/route.ts) | adapter, provider, registry | possible hard-coded branching around extension concept |
| [src/app/api/v1/tools/[toolId]/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tools/[toolId]/run/route.ts) | toolRegistry | not indicated by coarse scan |
| [src/app/api/v1/workflows/groups/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/groups/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/v1/workflows/runtime-trace/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/runtime-trace/route.ts) | provider | not indicated by coarse scan |
| [src/app/api/workflow-pro/brain-draft/route.ts](/Users/sean/Documents/FreeChat/src/app/api/workflow-pro/brain-draft/route.ts) | provider | not indicated by coarse scan |
| [src/app/layout.tsx](/Users/sean/Documents/FreeChat/src/app/layout.tsx) | provider | not indicated by coarse scan |
| [src/app/page.test.tsx](/Users/sean/Documents/FreeChat/src/app/page.test.tsx) | registry, slot | not indicated by coarse scan |
| [src/app/page.tsx](/Users/sean/Documents/FreeChat/src/app/page.tsx) | provider | not indicated by coarse scan |
| [src/app/style-lab/page.tsx](/Users/sean/Documents/FreeChat/src/app/style-lab/page.tsx) | provider | not indicated by coarse scan |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx) | registry | not indicated by coarse scan |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx) | commandRegistry | not indicated by coarse scan |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx) | commandRegistry | not indicated by coarse scan |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts) | commandRegistry, panelInjection | not indicated by coarse scan |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | nodeTypes, panelInjection, provider, registry | possible hard-coded branching around extension concept |
| [src/components/nexus/nexus-ops-extraction-map.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-extraction-map.test.ts) | adapter, commandRegistry, dynamicImport, panelInjection | not indicated by coarse scan |
| [src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx) | panelInjection, provider | not indicated by coarse scan |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | adapter, commandRegistry, dynamicImport, panelInjection, provider, registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/components/nexus/nexus-production-style-layer-contract.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-style-layer-contract.test.ts) | adapter, panelInjection | not indicated by coarse scan |
| [src/components/nexus/nexus-theme-panel-live-style-controls.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-theme-panel-live-style-controls.test.ts) | adapter, panelInjection | not indicated by coarse scan |
| [src/components/nexus/nexus-workspace-chat-composer-shell.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-chat-composer-shell.test.ts) | adapter, panelInjection, registry | not indicated by coarse scan |
| [src/components/nexus/nexus-workspace-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-primitive.test.ts) | nodeTypes, panelInjection | not indicated by coarse scan |
| [src/components/nexus/nexus-workspace-style-payload-export-import.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-style-payload-export-import.test.ts) | adapter | not indicated by coarse scan |
| [src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx) | panelInjection, registry | not indicated by coarse scan |
| [src/components/nexus/workflow-pro/workflow-pro-surface.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.tsx) | nodeTypes, panelInjection, provider, registry, slot | possible hard-coded branching around extension concept |
| [src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts) | commandRegistry, panelInjection | not indicated by coarse scan |
| [src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts) | commandRegistry, panelInjection | not indicated by coarse scan |
| [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | adapter, commandRegistry, panelInjection, provider, slot | possible hard-coded branching around extension concept |
| [src/components/style-engine/nexus-style-runtime-provider.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-runtime-provider.tsx) | provider | not indicated by coarse scan |
| [src/components/theme-provider.tsx](/Users/sean/Documents/FreeChat/src/components/theme-provider.tsx) | provider | not indicated by coarse scan |
| [src/lib/adapters/image-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.test.ts) | adapter | not indicated by coarse scan |
| [src/lib/adapters/image-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.ts) | adapter, commandRegistry, dynamicImport, provider | possible hard-coded branching around extension concept |
| [src/lib/adapters/memory-compression-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/memory-compression-adapter.ts) | commandRegistry, dynamicImport, registry, slot | possible hard-coded branching around extension concept |
| [src/lib/attachments/attachment-compiler-execution.test.ts](/Users/sean/Documents/FreeChat/src/lib/attachments/attachment-compiler-execution.test.ts) | adapter, slot | not indicated by coarse scan |
| [src/lib/attachments/attachment-compiler-execution.ts](/Users/sean/Documents/FreeChat/src/lib/attachments/attachment-compiler-execution.ts) | adapter, registry | possible hard-coded branching around extension concept |
| [src/lib/attachments/attachment-compiler-registry.test.ts](/Users/sean/Documents/FreeChat/src/lib/attachments/attachment-compiler-registry.test.ts) | adapter, registry, slot | not indicated by coarse scan |
| [src/lib/attachments/attachment-compiler-registry.ts](/Users/sean/Documents/FreeChat/src/lib/attachments/attachment-compiler-registry.ts) | adapter | not indicated by coarse scan |
| [src/lib/backend/api/agent-stream-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/agent-stream-service.ts) | adapter, provider | possible hard-coded branching around extension concept |
| [src/lib/backend/api/api-contract.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-contract.test.ts) | featureFlags, provider, registry | not indicated by coarse scan |
| [src/lib/backend/api/api-errors.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-errors.ts) | provider, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/api/memory-compress-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/memory-compress-service.ts) | commandRegistry, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/artifacts/artifact-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-service.test.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/contracts/feature-flags.ts](/Users/sean/Documents/FreeChat/src/lib/backend/contracts/feature-flags.ts) | featureFlags, provider | not indicated by coarse scan |
| [src/lib/backend/contracts/layering.ts](/Users/sean/Documents/FreeChat/src/lib/backend/contracts/layering.ts) | adapter | not indicated by coarse scan |
| [src/lib/backend/deployment/deployment-api.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-api.test.ts) | featureFlags, registry | not indicated by coarse scan |
| [src/lib/backend/deployment/deployment-check-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-check-service.ts) | featureFlags, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/deployment/deployment-services.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-services.test.ts) | featureFlags, provider, registry, slot | not indicated by coarse scan |
| [src/lib/backend/deployment/environment-validator.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/environment-validator.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/deployment/feature-flag-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/feature-flag-service.ts) | featureFlags, provider | possible hard-coded branching around extension concept |
| [src/lib/backend/deployment/registry-consistency-checker.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/registry-consistency-checker.ts) | registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/backend/history/message-history-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-history-service.test.ts) | adapter | not indicated by coarse scan |
| [src/lib/backend/image-generation/generated-image-asset-storage.ts](/Users/sean/Documents/FreeChat/src/lib/backend/image-generation/generated-image-asset-storage.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/observability/observability-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/observability-service.test.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/observability/observability-types.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/observability-types.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/observability/usage-metrics-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/usage-metrics-repository.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/observability/workflow-group-records.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/workflow-group-records.test.ts) | nodeTypes | not indicated by coarse scan |
| [src/lib/backend/observability/workflow-group-records.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/workflow-group-records.ts) | nodeTypes | not indicated by coarse scan |
| [src/lib/backend/observability/workflow-runtime-events.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/workflow-runtime-events.test.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/primitives/errors.ts](/Users/sean/Documents/FreeChat/src/lib/backend/primitives/errors.ts) | registry | not indicated by coarse scan |
| [src/lib/backend/primitives/metadata.ts](/Users/sean/Documents/FreeChat/src/lib/backend/primitives/metadata.ts) | provider, registry | not indicated by coarse scan |
| [src/lib/backend/primitives/redaction.ts](/Users/sean/Documents/FreeChat/src/lib/backend/primitives/redaction.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/runtime/agent-runtime-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-repository.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/runtime/agent-runtime-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-service.ts) | provider, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/runtime/agent-runtime.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime.test.ts) | adapter, featureFlags, provider | not indicated by coarse scan |
| [src/lib/backend/runtime/provider-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/provider-adapter.ts) | adapter, featureFlags, provider, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/security/permission-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/permission-service.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/security/secret-boundary-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/secret-boundary-service.ts) | provider | not indicated by coarse scan |
| [src/lib/backend/security/security-services.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/security-services.test.ts) | adapter, provider | possible hard-coded branching around extension concept |
| [src/lib/backend/security/workspace-identity-repair-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/workspace-identity-repair-service.ts) | adapter | not indicated by coarse scan |
| [src/lib/backend/tools/index.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/index.ts) | adapter, registry | not indicated by coarse scan |
| [src/lib/backend/tools/tool-execution-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-execution-service.ts) | adapter, registry, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/backend/tools/tool-execution.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-execution.test.ts) | commandRegistry, registry, toolRegistry | not indicated by coarse scan |
| [src/lib/backend/tools/tool-executor-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-executor-adapter.ts) | adapter, provider, registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/backend/tools/tool-permission-gate.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-permission-gate.ts) | toolRegistry | not indicated by coarse scan |
| [src/lib/backend/tools/tool-permission-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-permission-repository.ts) | toolRegistry | not indicated by coarse scan |
| [src/lib/backend/tools/tool-registry-validator.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-registry-validator.ts) | adapter, registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/backend/tools/tool-run-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-run-repository.ts) | toolRegistry | not indicated by coarse scan |
| [src/lib/backend/workspace/workspace-snapshot-serializer.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-snapshot-serializer.ts) | panelInjection, provider, registry | possible hard-coded branching around extension concept |
| [src/lib/backend/workspace/workspace-snapshot-validator.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-snapshot-validator.ts) | nodeTypes, registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/backend/workspace/workspace-state.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state.test.ts) | featureFlags, provider, registry | not indicated by coarse scan |
| [src/lib/composer/composer-mode-layer.test.ts](/Users/sean/Documents/FreeChat/src/lib/composer/composer-mode-layer.test.ts) | adapter, provider, registry | not indicated by coarse scan |
| [src/lib/media/image-api-credential.ts](/Users/sean/Documents/FreeChat/src/lib/media/image-api-credential.ts) | provider | not indicated by coarse scan |
| [src/lib/media/image-generation-adapter-map.test.ts](/Users/sean/Documents/FreeChat/src/lib/media/image-generation-adapter-map.test.ts) | adapter, provider | not indicated by coarse scan |
| [src/lib/media/image-generation-adapter-map.ts](/Users/sean/Documents/FreeChat/src/lib/media/image-generation-adapter-map.ts) | provider | not indicated by coarse scan |
| [src/lib/mock-stream.test.ts](/Users/sean/Documents/FreeChat/src/lib/mock-stream.test.ts) | provider | not indicated by coarse scan |
| [src/lib/nexus-defaults.ts](/Users/sean/Documents/FreeChat/src/lib/nexus-defaults.ts) | adapter, panelInjection, provider, registry | not indicated by coarse scan |
| [src/lib/nexus-registry.ts](/Users/sean/Documents/FreeChat/src/lib/nexus-registry.ts) | adapter, provider, registry, slot, toolRegistry | possible hard-coded branching around extension concept |
| [src/lib/nexus-types.ts](/Users/sean/Documents/FreeChat/src/lib/nexus-types.ts) | adapter, featureFlags, nodeTypes, panelInjection, provider, registry, toolRegistry | not indicated by coarse scan |
| [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | adapter, slot | possible hard-coded branching around extension concept |
| [src/lib/style-engine/accessibility.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/accessibility.test.ts) | adapter, commandRegistry, panelInjection | not indicated by coarse scan |
| [src/lib/style-engine/compiler.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/compiler.test.ts) | adapter, commandRegistry, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/compiler.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/compiler.ts) | adapter, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/exchange.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/exchange.test.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/exchange.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/exchange.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/governance.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/governance.test.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/governance.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/governance.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/index.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/index.ts) | adapter, registry | not indicated by coarse scan |
| [src/lib/style-engine/intent-normalizer.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/intent-normalizer.test.ts) | adapter, dynamicImport, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/intent-normalizer.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/intent-normalizer.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/manifest.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/manifest.ts) | adapter, commandRegistry, panelInjection | not indicated by coarse scan |
| [src/lib/style-engine/presets.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/presets.test.ts) | adapter, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/presets.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/presets.ts) | adapter, commandRegistry, panelInjection | not indicated by coarse scan |
| [src/lib/style-engine/preview.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/preview.test.ts) | commandRegistry, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/preview.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/preview.ts) | adapter | not indicated by coarse scan |
| [src/lib/style-engine/react-flow-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/react-flow-adapter.test.ts) | adapter, panelInjection | possible hard-coded branching around extension concept |
| [src/lib/style-engine/react-flow-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/react-flow-adapter.ts) | adapter, panelInjection | not indicated by coarse scan |
| [src/lib/style-engine/v2-authoring-context.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-authoring-context.ts) | adapter, panelInjection, registry | not indicated by coarse scan |
| [src/lib/style-engine/v2-contracts.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-contracts.ts) | adapter, commandRegistry, panelInjection, registry, slot | not indicated by coarse scan |
| [src/lib/style-engine/v2-fixtures.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-fixtures.ts) | adapter, commandRegistry, panelInjection, registry, slot | not indicated by coarse scan |
| [src/lib/style-engine/v2-layout-boundary.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-layout-boundary.test.ts) | commandRegistry, slot | possible hard-coded branching around extension concept |
| [src/lib/style-engine/v2-layout-boundary.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-layout-boundary.ts) | commandRegistry, registry, slot | possible hard-coded branching around extension concept |
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
