"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCheck, RotateCw } from "lucide-react";

import { BriefingCard } from "@/components/briefing-card";
import { Button } from "@/components/ui/button";
import type { Card } from "@/lib/types";

interface BriefingFeedProps {
  cards: Card[];
  dateLabel: string;
  greeting: string;
  loadError: string | null;
  onDismiss: (card: Card) => void;
  onRetry: () => void;
}

export function BriefingFeed({
  cards,
  dateLabel,
  greeting,
  loadError,
  onDismiss,
  onRetry,
}: BriefingFeedProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="briefing-feed">
      <div className="briefing-feed__column">
        <header className="briefing-feed__header">
          <p className="eyebrow">{dateLabel}</p>
          <h1>{greeting}.</h1>
          <p>
            {cards.length > 0
              ? `Here ${cards.length === 1 ? "is" : "are"} ${cards.length} ${cards.length === 1 ? "thing" : "things"} worth knowing.`
              : "You’ve seen everything Sentient prepared for now."}
          </p>
        </header>

        {loadError ? (
          <div className="feed-notice" role="status">
            <span>{loadError}</span>
            <Button onClick={onRetry} size="sm" variant="ghost">
              <RotateCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        ) : null}

        <section className="briefing-list" aria-live="polite" aria-label="Today’s briefing">
          <AnimatePresence initial={false} mode="popLayout">
            {cards.map((card, index) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 44, scale: 0.985 }}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                key={card.id}
                layout
                transition={{
                  delay: reduceMotion ? 0 : Math.min(index * 0.045, 0.18),
                  duration: reduceMotion ? 0 : 0.32,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: reduceMotion ? 0 : 0.38 },
                }}
              >
                <BriefingCard card={card} onDone={() => onDismiss(card)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {cards.length === 0 ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="caught-up"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            >
              <span className="caught-up__icon">
                <CheckCheck className="size-5" />
              </span>
              <h2>You’re caught up.</h2>
              <p>New useful signals will appear here after the next intelligence update.</p>
            </motion.div>
          ) : null}
        </section>

        {/* Ask Sentient is intentionally parked until the conversation backend is ready. */}
        <footer className="briefing-footer">Private by design · Files stay local</footer>
      </div>
    </main>
  );
}
