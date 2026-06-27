"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type ReactNode } from "react";

import { buildGlobalChatAttachmentReferences } from "@/features/composer-attachments/adapters/global-chat-attachments";
import type { ComposerAttachment } from "@/features/composer-attachments/shared/attachment-types";
import { NexusChatCanvas } from "@/components/nexus-home/NexusChatCanvas";
import { NexusInsufficientCreditsDialog } from "@/components/nexus-home/NexusInsufficientCreditsDialog";
import { NexusPromptComposer } from "@/components/nexus-home/NexusPromptComposer";
import { nexusHomeApi } from "@/lib/nexus-home/api";
import {
  InsufficientCreditsError,
  type GlobalMessage,
  type NexusModel,
  type WorkspaceShortcut,
} from "@/lib/nexus-home/types";

type ChatDetailPageProps = {
  params: Promise<{ id: string }>;
};

type ChatDetailStatus = "loading" | "ready" | "empty" | "unauthenticated" | "error";

export default function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = use(params);
  const [status, setStatus] = useState<ChatDetailStatus>("loading");
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceShortcut[]>([]);
  const [models, setModels] = useState<NexusModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<InsufficientCreditsError | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadConversation() {
      setStatus("loading");
      setNotice(null);

      const [messagesResult, workspacesResult, modelsResult] = await Promise.allSettled([
        nexusHomeApi.listGlobalMessages(id),
        nexusHomeApi.listWorkspaces(),
        nexusHomeApi.listModels(),
      ]);

      if (!mounted) return;

      if (messagesResult.status === "rejected") {
        if (messagesResult.reason?.status === 401) {
          setStatus("unauthenticated");
          return;
        }

        setStatus("error");
        setNotice(
          messagesResult.reason instanceof Error
            ? messagesResult.reason.message
            : "Conversation could not be loaded.",
        );
        return;
      }

      const nextMessages = messagesResult.value;
      const nextWorkspaces =
        workspacesResult.status === "fulfilled" ? workspacesResult.value : [];
      const nextModels = modelsResult.status === "fulfilled" ? modelsResult.value : [];

      setMessages(nextMessages);
      setWorkspaces(nextWorkspaces);
      setModels(nextModels);
      setSelectedModelId((current) => current || (nextModels[0]?.id ?? ""));
      setStatus(nextMessages.length ? "ready" : "empty");
    }

    loadConversation();

    return () => {
      mounted = false;
    };
  }, [id]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? models[0],
    [models, selectedModelId],
  );

  async function handleSend(content: string, attachments: ComposerAttachment[]) {
    if (!selectedModel?.id) {
      setNotice("Model catalog is unavailable. Refresh after signing in again.");
      return;
    }

    setIsSending(true);
    setCreditError(null);
    setNotice(null);

    const optimistic: GlobalMessage = {
      content,
      conversationId: id,
      createdAt: new Date().toISOString(),
      id: `local-${Date.now()}`,
      role: "user",
    };

    setMessages((current) => [...current, optimistic]);
    setStatus("ready");

    try {
      const result = await nexusHomeApi.sendGlobalMessage({
        attachments: buildGlobalChatAttachmentReferences(attachments),
        content,
        conversationId: id,
        modelId: selectedModel.id,
      });

      setMessages((current) => {
        const withoutOptimistic = current.filter((message) => message.id !== optimistic.id);

        return [
          ...withoutOptimistic,
          ...(result.userMessage ? [result.userMessage] : [optimistic]),
          ...(result.assistantMessage ? [result.assistantMessage] : []),
        ];
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        setCreditError(error);
      } else if ((error as { status?: number })?.status === 401) {
        setStatus("unauthenticated");
      } else {
        setMessages((current) => current.filter((message) => message.id !== optimistic.id));
        setNotice(
          error instanceof Error
            ? error.message
            : "NEXUS could not send this message. Retry from this chat.",
        );
      }

      throw error;
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="nexus-chat-detail-shell" data-state={status}>
      <header className="nexus-chat-detail-topbar">
        <div>
          <p className="nexus-kicker">Global Chat</p>
          <h1>Chat Detail</h1>
        </div>
        <nav aria-label="Chat detail navigation">
          <Link href="/" className="nexus-topbar-link">
            Home
          </Link>
          <Link href="/workspaces" className="nexus-topbar-link">
            Workspaces
          </Link>
        </nav>
      </header>

      {status === "loading" ? (
        <ChatDetailState className="chat-detail-loading" title="Loading conversation">
          Fetching this conversation from your global chat history.
        </ChatDetailState>
      ) : null}

      {status === "unauthenticated" ? (
        <ChatDetailState className="chat-detail-unauthenticated" title="Sign in required">
          <span>Open an authenticated session before viewing this conversation.</span>
          <Link href="/sign-in" className="nexus-btn-primary">
            Sign in
          </Link>
        </ChatDetailState>
      ) : null}

      {status === "error" ? (
        <ChatDetailState className="chat-detail-error" title="Conversation unavailable">
          {notice ?? "This conversation could not be loaded."}
        </ChatDetailState>
      ) : null}

      {status === "empty" ? (
        <ChatDetailState className="chat-detail-empty" title="No messages yet">
          This chat exists, but it does not have any messages yet.
        </ChatDetailState>
      ) : null}

      {status === "ready" ? (
        <NexusChatCanvas conversationId={id} messages={messages} workspaces={workspaces} />
      ) : null}

      {status === "ready" || status === "empty" ? (
        <section className="nexus-chat-detail-composer" aria-label="Continue this chat">
          {notice ? <p className="nexus-inline-error">{notice}</p> : null}
          {models.length ? (
            <NexusPromptComposer
              authenticated={true}
              disabled={isSending}
              models={models}
              onModelChange={setSelectedModelId}
              onNotify={setNotice}
              onSubmit={handleSend}
              selectedModelEstimate={selectedModel?.estimatedCredits ?? "Estimate unavailable"}
              selectedModelId={selectedModelId}
            />
          ) : (
            <p className="nexus-muted">
              Model catalog is unavailable. Refresh after signing in again.
            </p>
          )}
        </section>
      ) : null}

      {creditError ? (
        <NexusInsufficientCreditsDialog
          onChooseCheaperModel={(modelId) => {
            setSelectedModelId(modelId);
            setCreditError(null);
          }}
          onClose={() => setCreditError(null)}
          payload={creditError.payload}
        />
      ) : null}
    </main>
  );
}

function ChatDetailState({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className: string;
  title: string;
}) {
  return (
    <section className={`nexus-chat-detail-state ${className}`} aria-live="polite">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
