# 05 State and Store Map

Primary evidence: [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) and [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts).

| Name | Kind | Category | UI transient | Domain truth | Server-derived | Supabase | Workflow | Graph | Risk | Line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| width | state | Graph / Canvas | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:130) |
| height | state | Graph / Canvas | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:131) |
| position | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:137) |
| startNodeId | state | Workflow Orchestration | - | yes | - | - | yes | yes | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:144) |
| error | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:148) |
| fetchedAt | state | Input / Ingestion | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:149) |
| loading | action | Visual / UI Layer | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:150) |
| resolve | action | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:168) |
| timeout | state | Input / Ingestion | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:169) |
| user | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:175) |
| globalApiKey | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:176) |
| globalBaseUrl | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:177) |
| isLocked | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:178) |
| providerCredentials | state | LLM Node | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:179) |
| apiKey | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:221) |
| liveVerifiedAt | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:224) |
| verificationStatus | state | Extension / Plugin Layer | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:225) |
| verificationError | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:226) |
| byId | state | Workflow Orchestration | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:238) |
| hasMore | state | Output / Report | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:239) |
| ids | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:240) |
| nextCursor | state | Output / Report | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:241) |
| artifacts | state | Workflow Orchestration | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:245) |
| options | state | Workflow Orchestration | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:246) |
| run | action | Workflow Orchestration | - | - | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:338) |
| execution | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:368) |
| contentSizeBytes | state | Output / Report | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:396) |
| contentUrl | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:397) |
| previewText | state | Input / Ingestion | yes | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:401) |
| sourceMessageId | state | Workflow Orchestration | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:402) |
| title | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:404) |
| version | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:407) |
| workspaceId | state | LLM Node | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:408) |
| cache | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:427) |
| records | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:428) |
| activeWorkspaceId | state | Input / Ingestion | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:468) |
| workspaces | state | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:469) |
| selectedAgentId | action | LLM Node | yes | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:470) |
| nextZIndex | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:471) |
| streamMode | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:472) |
| viewMode | state | LLM Node | yes | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:473) |
| isVaultManagerOpen | state | Settings / Configuration | yes | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:474) |
| authVault | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:475) |
| artifactVault | state | Output / Report | - | yes | yes | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:476) |
| historicalMessages | state | Agent Context | - | yes | yes | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:477) |
| promptsCache | state | Input / Ingestion | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:478) |
| notebooksCache | state | Agent Context | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:479) |
| deletedNotebooksCache | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:480) |
| notebookDrafts | state | Agent Context | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:481) |
| openNotebookIds | action | Agent Context | yes | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:482) |
| notebookWindowLayers | state | Agent Context | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:483) |
| transactionHistory | state | Unknown | - | yes | yes | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:484) |
| branchingStatus | state | Agent Context | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:485) |
| lastSavedAt | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:486) |
| lastImportError | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:487) |
| materializeDefaultWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:488) |
| saveWorkspaceSnapshot | action | Supabase Persistence | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:489) |
| createWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:490) |
| switchWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:491) |
| bindActiveWorkspaceToCloudSession | state | Supabase Persistence | - | yes | yes | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:492) |
| workspaceName | state | LLM Node | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:494) |
| renameWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:496) |
| exportActiveWorkspace | state | Supabase Persistence | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:497) |
| notebookRecovery | state | Agent Context | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:498) |
| importWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:500) |
| applyWorkspaceRecoveryState | state | Supabase Persistence | - | yes | - | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:501) |
| recovery | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:502) |
| spawnAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:504) |
| branchAgent | state | Agent Context | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:505) |
| sourceAgentId | state | Workflow Orchestration | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:506) |
| config | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:507) |
| saveCurrentCanvasAsMacro | action | Graph / Canvas | - | - | - | - | - | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:509) |
| instantiateMacro | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:510) |
| spawnMacro | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:511) |
| createCheckpoint | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:512) |
| restoreCheckpoint | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:513) |
| recordTransaction | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:514) |
| duplicateAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:515) |
| removeAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:516) |
| focusAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:517) |
| selectAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:518) |
| updateLayout | action | Visual / UI Layer | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:519) |
| updateAgentProfile | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:520) |
| updateAgentCallsign | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:521) |
| setAgentProfileLocked | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:522) |
| updateAgentMission | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:523) |
| updateAgentModel | action | LLM Node | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:524) |
| updateAgentModelSettings | action | LLM Node | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:525) |
| updateAgentTemplateProfile | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:526) |
| templateId | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:527) |
| profile | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:528) |
| login | action | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:530) |
| logout | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:531) |
| setGlobalApiKey | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:532) |
| setGlobalBaseUrl | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:533) |
| setProviderApiKey | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:534) |
| setProviderBaseUrl | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:535) |
| setProviderVerificationStatus | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:536) |
| providerId | state | LLM Node | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:537) |
| status | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:538) |
| lockProviderCredential | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:541) |
| unlockProviderCredential | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:542) |
| deleteProviderCredential | action | Extension / Plugin Layer | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:543) |
| lockVault | action | Settings / Configuration | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:544) |
| unlockVault | action | Settings / Configuration | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:545) |
| deleteApiKey | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:546) |
| updateThemeConfig | action | Visual / UI Layer | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:547) |
| updateBranchingSettings | action | Agent Context | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:548) |
| updateSandboxCode | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:549) |
| updateSandboxUrl | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:550) |
| saveArtifactToCloud | action | Output / Report | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:551) |
| fetchArtifactsFromCloud | action | Output / Report | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:552) |
| fetchHistoricalMessages | action | Agent Context | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:553) |
| setPromptsCache | action | Input / Ingestion | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:554) |
| addPromptToCache | action | Input / Ingestion | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:555) |
| updatePrompt | action | Input / Ingestion | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:556) |
| deletePrompt | action | Input / Ingestion | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:557) |
| setNotebooksCache | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:558) |
| toggleNotebookOpen | action | Agent Context | yes | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:559) |
| focusNotebookWindow | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:560) |
| createNotebook | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:561) |
| saveNotebookDraft | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:562) |
| clearNotebookDraft | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:563) |
| updateNotebook | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:564) |
| deleteNotebook | action | Agent Context | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:565) |
| updateMemoryBlock | action | Agent Context | - | - | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:566) |
| minimizeAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:567) |
| restoreAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:568) |
| toggleMaximizeAgent | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:569) |
| minimizeAll | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:570) |
| restoreAll | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:571) |
| arrangeAgents | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:572) |
| addMessage | action | Agent Context | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:573) |
| appendToMessage | action | Agent Context | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:574) |
| appendReasoningToMessage | action | Agent Context | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:575) |
| finishMessage | state | Agent Context | - | yes | yes | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:576) |
| agentId | state | LLM Node | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:577) |
| messageId | state | Agent Context | - | yes | yes | yes | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:578) |
| fallback | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:579) |
| interrupted | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:580) |
| setAgentStatus | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:582) |
| setStreamMode | action | Unknown | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:583) |
| setViewMode | action | Unknown | yes | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:584) |
| openVaultManager | action | Settings / Configuration | yes | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:585) |
| closeVaultManager | action | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:586) |
| updateGraphNodePosition | action | Graph / Canvas | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:587) |
| connectGraphAgents | action | Graph / Canvas | - | yes | - | - | - | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:588) |
| removeGraphEdges | action | Graph / Canvas | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:589) |
| addWorkflowRuntimeNode | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:590) |
| type | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:591) |
| updateWorkflowRuntimeNodeData | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:594) |
| nodeId | state | LLM Node | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:595) |
| data | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:596) |
| updateWorkflowRuntimeNodePosition | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:598) |
| connectWorkflowRuntimeNodes | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:602) |
| appendWorkflowRuntimeGroup | state | Workflow Orchestration | - | yes | - | - | yes | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:603) |
| runtimeLite | action | LLM Node | - | - | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:604) |
| replaceWorkflowRuntimeLite | action | Workflow Orchestration | - | yes | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:607) |
| removeWorkflowRuntimeNodes | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:608) |
| removeWorkflowRuntimeEdges | action | Workflow Orchestration | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:609) |
| pauseWorkflowRuntimeLiteFlow | action | Workflow Orchestration | - | yes | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:610) |
| runWorkflowRuntimeLiteFlow | action | Workflow Orchestration | - | yes | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:611) |
| retryWorkflowRuntimeTraceSync | action | Workflow Orchestration | - | yes | yes | yes | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:614) |
| updateAgentTelemetry | action | Agent Context | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:615) |
| clearAgentMessages | action | Agent Context | - | yes | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:616) |
| runTool | action | Extension / Plugin Layer | - | - | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:617) |
| resetWorkspace | action | Supabase Persistence | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:618) |
| graph | state | LLM Node | - | - | - | - | - | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:643) |
| lastError | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:657) |
| lastRunId | state | LLM Node | - | - | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:658) |
| nodes | action | LLM Node | - | yes | - | - | yes | yes | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:659) |
| inputSnapshot | state | Input / Ingestion | - | - | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:662) |
| outputSnapshot | state | LLM Node | - | - | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:663) |
| runs | action | Input / Ingestion | - | - | - | - | yes | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:666) |
| activeAgentId | state | LLM Node | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:672) |
| agents | action | LLM Node | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:673) |
| callsign | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:674) |
| capabilities | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:675) |
| id | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:676) |
| identity | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:677) |
| executionPrompt | state | Input / Ingestion | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:678) |
| layout | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:679) |
| maximized | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:680) |
| minimized | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:681) |
| mission | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:682) |
| profileLocked | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:683) |
| model | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:684) |
| modelSettings | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:685) |
| previousLayout | state | Supabase Persistence | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:686) |
| provider | state | LLM Node | - | yes | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:687) |
| name | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:692) |
| panels | state | LLM Node | yes | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:693) |
| settings | action | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:695) |
| autosave | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:696) |
| branchingSettings | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:697) |
| themeConfig | state | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:702) |
| pastState | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:717) |
| currentState | state | Unknown | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:718) |
| getItem | action | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:774) |
| setItem | action | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:802) |
| removeItem | action | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:819) |
| value | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:853) |
| defaultRetentionRatio | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:858) |
| sourceAgent | state | Workflow Orchestration | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:880) |
| timestamp | state | Supabase Persistence | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:881) |
| sourceAgentCallsign | state | Agent Context | - | yes | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:885) |
| mode | state | Input / Ingestion | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:886) |
| createdAt | action | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:887) |
| compressionConfig | state | Settings / Configuration | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:888) |
| workspace | state | Workflow Orchestration | - | yes | - | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:893) |
| reason | state | Workflow Orchestration | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:894) |
| snapshot | state | Workflow Orchestration | - | - | yes | yes | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:905) |
| blueprint | state | Graph / Canvas | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:917) |
| index | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:919) |
| zIndex | state | Agent Context | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:921) |
| supportedModels | state | LLM Node | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:941) |
| sandboxCode | state | Graph / Canvas | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:943) |
| sandboxUrl | state | Supabase Persistence | - | - | - | - | - | - | P3 localized/static | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:944) |
| accent | state | Graph / Canvas | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:946) |
| avatar | state | LLM Node | - | - | - | - | - | - | P2 shared state/action | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts:947) |
