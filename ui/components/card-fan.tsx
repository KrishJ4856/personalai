"use client";

import type { CSSProperties } from "react";

import { VisualTile } from "@/components/visual-tile";
import type { Card } from "@/lib/types";

export function CardFan({ cards }: { cards: Card[] }) {
  const visibleCards = cards.slice(0, 7);
  const midpoint = (visibleCards.length - 1) / 2;

  return (
    <div aria-hidden="true" className="card-fan">
      {visibleCards.map((card, index) => {
        const offset = index - midpoint;
        const distance = Math.abs(offset);
        const curve = Math.pow(distance, 1.62) * 24;
        const style = {
          "--fan-offset": offset,
          "--fan-y": `${curve}px`,
          "--fan-rotate": `${offset * 3.8}deg`,
          "--fan-scale": Math.max(0.78, 1.04 - distance * 0.055),
          "--fan-z": Math.round(20 - distance * 2),
        } as CSSProperties;

        return (
          <div
            className={`fan-position${distance > 2.25 ? " fan-position--outer" : ""}`}
            key={card.id}
            style={style}
          >
            <VisualTile card={card} />
          </div>
        );
      })}
    </div>
  );
}
