"use client";

import { ArrowRight, RotateCw } from "lucide-react";

import { CardFan } from "@/components/card-fan";
import { Button } from "@/components/ui/button";
import type { Card } from "@/lib/types";

interface BriefingIntroProps {
  cards: Card[];
  dateLabel: string;
  greeting: string;
  loadError: string | null;
  onOpen: () => void;
  onRetry: () => void;
}

export function BriefingIntro({
  cards,
  dateLabel,
  greeting,
  loadError,
  onOpen,
  onRetry,
}: BriefingIntroProps) {
  const count = cards.length;
  const hasCards = count > 0;

  return (
    <main className="briefing-intro">
      <div className="briefing-intro__copy">
        <p className="eyebrow">{dateLabel}</p>
        <h1>{greeting}.</h1>
        <p className="briefing-intro__lead">
          {hasCards ? "Your briefing is ready." : "You’re caught up."}
        </p>
        <p className="briefing-intro__count">
          {hasCards
            ? `${count} ${count === 1 ? "thing" : "things"} worth knowing.`
            : "Nothing new needs your attention right now."}
        </p>
      </div>

      <div className={`briefing-intro__visual${hasCards ? "" : " briefing-intro__visual--empty"}`}>
        {hasCards ? (
          <CardFan cards={cards} />
        ) : (
          <div className="quiet-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="briefing-intro__actions">
        {loadError ? (
          <div className="state-notice" role="status">
            <span>{loadError}</span>
            <Button onClick={onRetry} size="sm" variant="ghost">
              <RotateCw className="size-3.5" />
              Try again
            </Button>
          </div>
        ) : null}

        <Button onClick={onOpen} size="lg">
          {hasCards ? "Open today’s briefing" : "View today"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </main>
  );
}
