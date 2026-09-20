import { SentientApp } from "@/components/sentient-app";
import { readCards, readStatus, StateFileError } from "@/lib/server/state-files";
import type { CardsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function getGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function Home() {
  const now = new Date();
  let cardsResult: CardsResponse = {
    cards: [],
    invalidCount: 0,
    warning: null,
  };
  let loadError: string | null = null;

  try {
    cardsResult = await readCards();
  } catch (error) {
    loadError =
      error instanceof StateFileError
        ? error.message
        : "Today's briefing could not be read.";
  }

  const status = await readStatus();
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <SentientApp
      dateLabel={`${weekday} · ${date}`}
      greeting={getGreeting(now)}
      initialCards={cardsResult.cards}
      initialLoadError={loadError ?? cardsResult.warning}
      initialStatus={status}
    />
  );
}
