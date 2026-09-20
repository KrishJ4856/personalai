"use client";

import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AskSentient({ onAsk }: { onAsk: (message: string) => void }) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();

    if (!value) return;

    onAsk(value);
    setMessage("");
  }

  return (
    <section className="ask-sentient" aria-labelledby="ask-sentient-title">
      <div className="ask-sentient__heading">
        <div>
          <p className="eyebrow" id="ask-sentient-title">
            A thought for Sentient
          </p>
          <p>Ask a question or add context for a future briefing.</p>
        </div>
        <span className="coming-next">
          <Sparkles className="size-3" />
          Coming next
        </span>
      </div>

      <form className="ask-sentient__composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="ask-sentient-input">
          Ask Sentient or tell it something
        </label>
        <input
          autoComplete="off"
          id="ask-sentient-input"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask Sentient or tell it something…"
          value={message}
        />
        <Button
          aria-label="Send to Sentient"
          disabled={!message.trim()}
          size="icon"
          type="submit"
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </section>
  );
}
