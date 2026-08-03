import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, RefreshCw, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import coachMark from "@/assets/coach-mark.png";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useCoachContext, type CoachContext } from "@/hooks/use-coach-context";
import { buildInsights, buildSuggestedPrompts, TONE_CLASS } from "@/lib/utils/coach-insights";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "neetos.ai-coach.conversation.v1";

export const Route = createFileRoute("/_authenticated/ai-coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — NEET OS" },
      { name: "description", content: "Daily plans, weak-chapter detection and score projections from your own tracked data." },
      { property: "og:title", content: "AI Coach — NEET OS" },
      { property: "og:description", content: "Daily plans, weak-chapter detection and score projections from your own tracked data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiCoachPage,
});

function loadStored(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UIMessage[];
    return Array.isArray(parsed) ? parsed.filter((m) => m && Array.isArray(m.parts)) : [];
  } catch {
    return [];
  }
}

function AiCoachPage() {
  const { context, isLoading, isError, hasAnyData } = useCoachContext();
  const [initialMessages] = useState<UIMessage[]>(() => loadStored());
  const contextRef = useRef<CoachContext | null>(context);
  contextRef.current = context;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages: outgoing }) => ({
          body: { messages: outgoing, context: contextRef.current },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages, regenerate, clearError } = useChat({
    id: "neetos-ai-coach",
    messages: initialMessages,
    transport,
    onError: (err) => {
      const message = err.message || "";
      if (/402|credit/i.test(message)) toast.error("AI credits are exhausted. Add credits to continue coaching.");
      else if (/429|rate/i.test(message)) toast.error("Too many requests right now. Try again in a moment.");
      else toast.error("The coach could not answer. Please retry.");
    },
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  // One continuous conversation, persisted in this browser only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "streaming") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)));
    } catch {
      /* storage full or blocked — chat still works in-memory */
    }
  }, [messages, status]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (status === "ready") focusInput();
  }, [status, focusInput]);

  const ask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      clearError();
      void sendMessage({ text: trimmed });
      setInput("");
      focusInput();
    },
    [busy, clearError, sendMessage, focusInput],
  );

  const clearChat = () => {
    setMessages([]);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    focusInput();
  };

  const insights = context ? buildInsights(context) : [];
  const suggestions = context ? buildSuggestedPrompts(context) : [];

  return (
    <>
      <PageHeader
        title="AI Coach"
        description="Advice grounded in your own planner, mocks, revision, mistakes and habits."
        actions={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={clearChat}>
              <Trash2 className="mr-1.5 size-4" aria-hidden />
              Clear conversation
            </Button>
          ) : null
        }
      />

      {isError ? (
        <ErrorState description="Some of your study data could not be loaded, so coaching may be incomplete." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="flex min-h-[70vh] flex-col lg:col-span-8" aria-label="Coach conversation">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <Conversation className="min-h-[45vh] flex-1">
              <ConversationContent className="gap-4">
                {messages.length === 0 ? (
                  <div className="mx-auto max-w-md py-10 text-center">
                    <img
                      src={coachMark}
                      alt="NEET OS AI Coach"
                      width={72}
                      height={72}
                      loading="lazy"
                      className="mx-auto size-16 rounded-2xl"
                    />
                    <h2 className="mt-4 text-subheading font-semibold text-foreground">Your coach is ready</h2>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {hasAnyData
                        ? "Ask anything about your syllabus, mocks, revision or routine. Every answer is grounded in your tracked data."
                        : "Log a study block, mark chapter progress or finish a mock — the more you track, the sharper the coaching gets."}
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => {
                  const text = message.parts
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("")
                    .trim();
                  if (!text) return null;
                  return (
                    <Message key={message.id} from={message.role}>
                      {message.role === "assistant" ? (
                        <div className="flex w-full gap-3">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Bot className="size-4" aria-hidden />
                          </span>
                          <MessageResponse className="min-w-0 flex-1">{text}</MessageResponse>
                        </div>
                      ) : (
                        <MessageContent className="bg-primary text-primary-foreground">
                          <span className="sr-only">
                            <User className="size-4" aria-hidden />
                            You:
                          </span>
                          {text}
                        </MessageContent>
                      )}
                    </Message>
                  );
                })}

                {status === "submitted" ? (
                  <div className="flex items-center gap-3 px-1">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="size-4" aria-hidden />
                    </span>
                    <Shimmer className="text-caption">Reading your data…</Shimmer>
                  </div>
                ) : null}

                {error ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-caption text-foreground">
                    <span className="min-w-0 flex-1">The coach could not finish that answer.</span>
                    <Button size="sm" variant="outline" onClick={() => void regenerate()}>
                      <RefreshCw className="mr-1.5 size-4" aria-hidden />
                      Retry
                    </Button>
                  </div>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="border-t border-border p-3">
              {suggestions.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2" aria-label="Suggested prompts">
                  {suggestions.slice(0, messages.length === 0 ? 6 : 3).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => ask(s)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-caption text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}

              <PromptInput
                onSubmit={(_message, event) => {
                  event.preventDefault();
                  ask(input);
                }}
              >
                <PromptInputTextarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your coach — e.g. “What should I revise tonight?”"
                />
                <PromptInputFooter className="justify-end">
                  <PromptInputSubmit status={status} disabled={!input.trim() && !busy} />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </Card>
        </section>

        <aside className="space-y-3 lg:col-span-4" aria-label="Context-aware insights">
          {isLoading && !context ? (
            <LoadingSkeleton rows={4} height="h-24" />
          ) : insights.length === 0 ? (
            <EmptyState
              title="No insights yet"
              description="Track a few study sessions and one mock test to unlock personalised coaching insights."
            />
          ) : (
            insights.map((insight) => (
              <Card key={insight.id} className={cn("border p-4", TONE_CLASS[insight.tone])}>
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {insight.category}
                </p>
                <h3 className="mt-1 text-body font-semibold text-foreground">{insight.title}</h3>
                <p className="mt-1 text-caption text-muted-foreground">{insight.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => ask(insight.prompt)}>
                    Ask coach
                  </Button>
                  {insight.link ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={insight.link.to}>{insight.link.label}</Link>
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </aside>
      </div>
    </>
  );
}
