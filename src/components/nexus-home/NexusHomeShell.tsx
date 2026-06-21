'use client';

import { useState } from 'react';
import { nexusHomeApi } from '@/lib/nexus-home/api';
import { intentChips } from '@/lib/nexus-home/mock-data';
import { InsufficientCreditsError, GlobalMessage } from '@/lib/nexus-home/types';
import { useNexusHomeData } from '@/lib/nexus-home/useNexusHomeData';
import { NexusChatCanvas } from './NexusChatCanvas';
import { NexusInsufficientCreditsDialog } from './NexusInsufficientCreditsDialog';
import { NexusPromptComposer } from './NexusPromptComposer';
import { NexusSidebar } from './NexusSidebar';

export function NexusHomeShell() {
  const homeData = useNexusHomeData();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [creditError, setCreditError] = useState<InsufficientCreditsError | null>(null);

  async function handleSend(content: string) {
    if (!content.trim()) return;

    setIsSending(true);
    setCreditError(null);

    const optimistic: GlobalMessage = {
      id: `local-${Date.now()}`,
      conversationId: conversationId ?? 'new',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);

    try {
      const result = await nexusHomeApi.sendGlobalMessage({
        conversationId,
        content,
        modelId: homeData.selectedModelId,
      });

      setConversationId(result.conversationId);
      setMessages((current) => {
        const withoutOptimistic = current.filter((message) => message.id !== optimistic.id);
        return [
          ...withoutOptimistic,
          ...(result.userMessage ? [result.userMessage] : [optimistic]),
          ...(result.assistantMessage ? [result.assistantMessage] : []),
        ];
      });
      await homeData.refreshRecentChats();
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        setCreditError(error);
        throw error;
      } else {
        setMessages((current) => [
          ...current,
          {
            id: `error-${Date.now()}`,
            conversationId: conversationId ?? 'new',
            role: 'system',
            content: 'NEXUS could not complete this run. Please retry or choose another model.',
            createdAt: new Date().toISOString(),
          },
        ]);
        throw error;
      }
    } finally {
      setIsSending(false);
    }
  }

  const selectedModel = homeData.models.find((model) => model.id === homeData.selectedModelId) ?? homeData.models[0];
  const hasConversation = messages.length > 0;

  return (
    <div className="nexus-home-shell">
      <NexusSidebar
        recentChats={homeData.recentChats}
        workspaces={homeData.workspaces}
        wallet={homeData.wallet}
      />

      <main className="nexus-home-main">
        <header className="nexus-topbar">
          <span className="nexus-status-pill">Commercial Home</span>
          <a className="nexus-topbar-link" href="/wallet">Wallet</a>
          <a className="nexus-topbar-link" href="/workspaces">Workspaces</a>
        </header>

        {hasConversation ? (
          <NexusChatCanvas
            conversationId={conversationId}
            messages={messages}
            workspaces={homeData.workspaces}
          />
        ) : (
          <section className="nexus-hero" aria-labelledby="nexus-home-title">
            <div className="nexus-orb" aria-hidden />
            <p className="nexus-kicker">AI Agent Workspace / Agent OS</p>
            <h1 id="nexus-home-title">Build, reason, and ship with NEXUS.</h1>
            <p className="nexus-subtitle">
              Start in global chat. Move real work into a workspace as an artifact, workflow, or agent task.
            </p>

            <div className="nexus-intent-chips" aria-label="Suggested intents">
              {intentChips.map((chip) => (
                <button key={chip} type="button" className="nexus-chip">
                  {chip}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="nexus-composer-dock" data-has-conversation={hasConversation}>
          <NexusPromptComposer
            disabled={isSending}
            models={homeData.models}
            selectedModelId={homeData.selectedModelId}
            onModelChange={homeData.setSelectedModelId}
            selectedModelEstimate={selectedModel?.estimatedCredits ?? 'Estimate unavailable'}
            onSubmit={handleSend}
          />
          <p className="nexus-footnote">
            Knowledge systems are parked for this commercial round. Home, wallet, workspace, and workflow are the active product path.
          </p>
        </div>

        {creditError ? (
          <NexusInsufficientCreditsDialog
            payload={creditError.payload}
            onClose={() => setCreditError(null)}
            onChooseCheaperModel={(modelId) => {
              homeData.setSelectedModelId(modelId);
              setCreditError(null);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
