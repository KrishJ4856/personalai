"use client";

import { ExternalLink } from "lucide-react";

import { getCardKind, getPriorityLabel } from "@/lib/card-visuals";
import type { Card } from "@/lib/types";

const URL_TOKEN =
  /((?:(?:https?:\/\/|www\.)[^\s<>{}\[\]]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>{}\[\]]*)?))/gi;
const EXACT_URL =
  /^(?:(?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?)$/i;

function linkifyLine(line: string, lineIndex: number) {
  return line.split(URL_TOKEN).map((part, partIndex) => {
    if (!EXACT_URL.test(part)) {
      return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
    }

    const trailing = part.match(/[),.;!?]+$/)?.[0] ?? "";
    const cleanUrl = trailing ? part.slice(0, -trailing.length) : part;
    const href = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;

    return (
      <span key={`${lineIndex}-${partIndex}`}>
        <a className="body-link" href={href} rel="noreferrer" target="_blank">
          {cleanUrl}
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        {trailing}
      </span>
    );
  });
}

function CardBody({ body }: { body: string }) {
  const lines = body.split("\n");

  return (
    <div className="briefing-card__body">
      {lines.map((line, lineIndex) => (
        <span key={`${lineIndex}-${line}`}>
          {linkifyLine(line, lineIndex)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </div>
  );
}

export function BriefingCard({ card, onDone }: { card: Card; onDone: () => void }) {
  const kind = getCardKind(card);

  return (
    <article className={`briefing-card briefing-card--${kind} briefing-card--${card.priority}`}>
      <div className="briefing-card__content">
        <div className="briefing-card__topline">
          <div className="briefing-card__pills">
            <span className={`priority-pill priority-pill--${card.priority}`}>
              {card.priority} priority
            </span>
            <span className="attention-pill">{getPriorityLabel(card.priority)}</span>
          </div>
          <button
            aria-label={`Mark ${card.title} as done`}
            className="briefing-card__done"
            onClick={onDone}
            type="button"
          >
            Done
          </button>
        </div>

        <h2>{card.title}</h2>
        <CardBody body={card.body} />
      </div>
    </article>
  );
}
