"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { AskAiSheet } from "@/components/ask-ai-sheet";
import { BriefingFeed } from "@/components/briefing-feed";
import { BriefingIntro } from "@/components/briefing-intro";
import { MemorySheet } from "@/components/memory-sheet";
import { StatusIndicator } from "@/components/status-indicator";
import { Toaster } from "@/components/ui/sonner";
import { cardSchema, type Card, type IntelligenceStatus } from "@/lib/types";

type Stage = "intro" | "feed";

interface SentientAppProps {
  dateLabel: string;
  greeting: string;
  initialCards: Card[];
  initialLoadError: string | null;
  initialStatus: IntelligenceStatus;
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function isStatus(value: unknown): value is IntelligenceStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return ["latestUpdateAt", "cardsUpdatedAt", "memoryUpdatedAt"].every(
    (key) => status[key] === null || typeof status[key] === "string",
  );
}

export function SentientApp({
  dateLabel,
  greeting,
  initialCards,
  initialLoadError,
  initialStatus,
}: SentientAppProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [cards, setCards] = useState(initialCards);
  const [loadError, setLoadError] = useState(initialLoadError);
  const [status, setStatus] = useState(initialStatus);
  const [activeSheet, setActiveSheet] = useState<"memory" | "chat" | null>(null);
  const cardsRefreshSequence = useRef(0);

  async function refreshStatus() {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const result: unknown = await response.json();
      if (response.ok && isStatus(result)) setStatus(result);
    } catch {
      // Ambient status should never interrupt the briefing.
    }
  }

  async function refreshCards() {
    const sequence = ++cardsRefreshSequence.current;
    try {
      const response = await fetch("/api/cards", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(await apiError(response, "Today’s briefing could not be refreshed."));
      }
      const result: unknown = await response.json();

      if (!result || typeof result !== "object" || !("cards" in result)) {
        throw new Error("The local cards response was not valid.");
      }

      const parsed = cardSchema.array().safeParse((result as { cards: unknown }).cards);
      if (!parsed.success) throw new Error("The local cards response was not valid.");

      const warning =
        "warning" in result && typeof (result as { warning: unknown }).warning === "string"
          ? (result as { warning: string }).warning
          : null;

      if (sequence !== cardsRefreshSequence.current) return;
      setCards(parsed.data);
      setLoadError(warning);
      await refreshStatus();
    } catch (error) {
      if (sequence !== cardsRefreshSequence.current) return;
      setLoadError(
        error instanceof Error ? error.message : "Today’s briefing could not be refreshed.",
      );
    }
  }

  async function dismissCard(card: Card) {
    const originalIndex = cards.findIndex((candidate) => candidate.id === card.id);
    setCards((current) => current.filter((candidate) => candidate.id !== card.id));

    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "The card could not be marked done."));
      }

      await refreshStatus();
    } catch (error) {
      setCards((current) => {
        if (current.some((candidate) => candidate.id === card.id)) return current;
        const restored = [...current];
        restored.splice(Math.min(Math.max(originalIndex, 0), restored.length), 0, card);
        return restored;
      });

      toast.error("Couldn’t mark that done", {
        description:
          error instanceof Error ? error.message : "Your local cards were left unchanged.",
      });
    }
  }

  return (
    <div className="sentient-shell">
      <header className={`app-header app-header--${stage}`}>
        <Brand />
        {stage === "feed" ? (
          <div className="app-header__actions">
            <StatusIndicator status={status} />
            <MemorySheet open={activeSheet === "memory"} onOpenChange={(open) => setActiveSheet(open ? "memory" : null)} />
            <AskAiSheet open={activeSheet === "chat"} onOpenChange={(open) => setActiveSheet(open ? "chat" : null)} onStateChange={() => void refreshCards()} />
          </div>
        ) : null}
      </header>

      {stage === "feed" ? (
        <BriefingFeed
          cards={cards}
          dateLabel={dateLabel}
          greeting={greeting}
          loadError={loadError}
          onDismiss={(card) => void dismissCard(card)}
          onRetry={() => void refreshCards()}
        />
      ) : (
        <BriefingIntro
          cards={cards}
          dateLabel={dateLabel}
          greeting={greeting}
          loadError={loadError}
          onOpen={() => setStage("feed")}
          onRetry={() => void refreshCards()}
        />
      )}
      <Toaster />
    </div>
  );
}
