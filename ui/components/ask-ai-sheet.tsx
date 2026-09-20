"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleAlert,
  Compass,
  Copy,
  ExternalLink,
  Globe2,
  LoaderCircle,
  MessageCircle,
  RotateCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSentientChat } from "@/hooks/use-sentient-chat";
import type { ChatMessage } from "@/lib/chat-types";

const suggestions = [
  {
    icon: Compass,
    title: "Find my focus",
    prompt: "Look at my current cards. What should I focus on first, and why?",
  },
  {
    icon: BookOpen,
    title: "What do you remember?",
    prompt: "What do you remember about me? Give me a short summary.",
  },
  {
    icon: Globe2,
    title: "Take the next step",
    prompt:
      "Look at my briefing and suggest something you could help me do in the browser. Don’t take action yet.",
  },
];

function ChatReply({ message }: { message: ChatMessage }) {
  const user = message.role === "user";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn’t copy this message.");
    }
  }

  return (
    <Message
      align={user ? "end" : "start"}
      className={`chat-message chat-message--${message.role}`}
    >
      <MessageContent>
        {!user ? (
          <MessageHeader>
            <Image
              src="/brand/sentient-logo.webp"
              width={25}
              height={25}
              alt=""
              className="chat-message__avatar"
            />
            <span>Sentient</span>
          </MessageHeader>
        ) : (
          <span className="sr-only">You</span>
        )}

        {message.activities.length > 0 ? (
          <div className="chat-activities" aria-label="Agent activity">
            {message.activities.map((activity) => (
              <Marker
                key={activity.id}
                className={`chat-activity chat-activity--${activity.status}`}
                role={activity.status === "running" ? "status" : undefined}
              >
                <MarkerIcon>
                  {activity.status === "running" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : activity.status === "error" ? (
                    <CircleAlert />
                  ) : (
                    <Check />
                  )}
                </MarkerIcon>
                <MarkerContent>
                  {activity.label}
                  {activity.status === "error" ? " · didn’t complete" : ""}
                </MarkerContent>
              </Marker>
            ))}
          </div>
        ) : null}

        {message.content ? (
          user ? (
            <div className="chat-message__bubble">{message.content}</div>
          ) : (
            <div className="chat-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                      <ExternalLink
                        aria-hidden="true"
                        className="inline size-3"
                      />
                    </a>
                  ),
                  img: ({ alt }) => (
                    <span>{alt ? `[Image: ${alt}]` : "[Image]"}</span>
                  ),
                  table: ({ children }) => (
                    <div className="chat-table">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
        ) : null}

        {message.status === "working" ? (
          <Marker role="status" className="chat-working">
            <MarkerIcon>
              <LoaderCircle className="animate-spin" />
            </MarkerIcon>
            <MarkerContent>
              {message.activities.some(
                (activity) => activity.status === "running",
              )
                ? "On it. You can leave this panel open or come back."
                : "Thinking it through…"}
            </MarkerContent>
          </Marker>
        ) : null}

        {message.error ? (
          <p className="chat-message__error" role="alert">
            <CircleAlert className="size-4" />
            {message.error}
          </p>
        ) : null}

        {!user && message.content && message.status !== "working" ? (
          <button
            type="button"
            className="chat-copy"
            onClick={() => void copy()}
            aria-label={copied ? "Copied response" : "Copy response"}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </MessageContent>
    </Message>
  );
}

interface AskAiSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: () => void;
}

export function AskAiSheet({
  open,
  onOpenChange,
  onStateChange,
}: AskAiSheetProps) {
  const { snapshot, error, connecting, pendingMessage, send, reconnect } =
    useSentientChat(open, onStateChange);
  const [draft, setDraft] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const busy = Boolean(snapshot?.busy || pendingMessage);
  const messages = snapshot?.messages ?? [];
  const canSend = Boolean(
    snapshot && !busy && !connecting && !error && draft.trim(),
  );

  function submit() {
    if (!canSend) return;
    const message = draft.trim();
    setDraft("");
    void send(message).then((accepted) => {
      if (!accepted) setDraft((current) => current || message);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="ask-ai-trigger">
          <MessageCircle className="size-4" />
          Ask AI
          {busy ? (
            <span
              className="ask-ai-trigger__busy"
              aria-label="Task in progress"
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="ask-ai-sheet"
        closeLabel="Close Ask AI"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          textarea.current?.focus();
        }}
      >
        <SheetHeader className="ask-ai-sheet__header">
          <div className="ask-ai-sheet__heading">
            <SheetTitle>Ask Sentient</SheetTitle>
            <span className="chat-session-label">Your conversation</span>
          </div>
          <SheetDescription>
            A little context. A useful answer. A next step taken care of.
          </SheetDescription>
        </SheetHeader>

        <MessageScrollerProvider
          key={messages.length || pendingMessage ? "thread" : "welcome"}
          defaultScrollPosition={
            messages.length || pendingMessage ? "end" : "start"
          }
        >
          <MessageScroller>
            <MessageScrollerViewport aria-label="Conversation with Sentient">
              <MessageScrollerContent
                className="chat-thread"
                aria-live="polite"
                aria-busy={busy}
              >
                {messages.length === 0 && !pendingMessage ? (
                  <div className="chat-welcome">
                    <div className="chat-welcome__portrait">
                      <Image
                        src="/brand/sentient-logo.webp"
                        width={72}
                        height={72}
                        alt=""
                      />
                    </div>
                    <p className="chat-welcome__eyebrow">
                      A little help, right here
                    </p>
                    <h3>
                      From knowing
                      <br />
                      to doing.
                    </h3>
                    <p>
                      Make sense of your briefing, remember something useful, or
                      let Sentient help with a task in your browser.
                    </p>
                    <div className="chat-suggestions">
                      {suggestions.map(({ icon: Icon, title, prompt }) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                            textarea.current?.focus();
                          }}
                        >
                          <Icon className="size-4" />
                          <span>{title}</span>
                          <ArrowUpRight className="size-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {messages.map((message) => (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <ChatReply message={message} />
                  </MessageScrollerItem>
                ))}
                {pendingMessage ? (
                  <MessageScrollerItem messageId="pending">
                    <ChatReply
                      message={{
                        id: "pending",
                        role: "user",
                        content: pendingMessage,
                        status: "complete",
                        activities: [],
                        error: null,
                      }}
                    />
                    <Marker role="status" className="chat-working mt-5">
                      <MarkerIcon>
                        <LoaderCircle className="animate-spin" />
                      </MarkerIcon>
                      <MarkerContent>Connecting to Sentient…</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="chat-composer-area">
          {error ? (
            <div className="chat-connection-error" role="alert">
              <p>{error}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={connecting}
                onClick={() => void reconnect()}
              >
                <RotateCw className="size-3.5" />
                Reconnect
              </Button>
            </div>
          ) : null}
          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Textarea
              ref={textarea}
              aria-label="Message Sentient"
              placeholder="Ask anything, or tell me what to do…"
              value={draft}
              maxLength={12_000}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <div className="chat-composer__bottom">
              <span>
                {busy
                  ? "Working · you can write your next message"
                  : connecting
                    ? "Connecting…"
                    : "Shift + Enter for a new line"}
              </span>
              <Button
                size="icon"
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </form>
          <p className="chat-composer__note">
            Uses your configured AI model. Browser tasks open on this device.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
