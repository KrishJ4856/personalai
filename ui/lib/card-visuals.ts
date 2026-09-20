import type { Card } from "@/lib/types";

export type CardKind = "task" | "link" | "event" | "discovery";

const URL_PATTERN = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[^\s]*)/i;
const EVENT_PATTERN =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;
const TASK_PATTERN = /\b(?:assignment|deadline|due|submit|complete|task|action|required)\b/i;

export function getCardKind(card: Card): CardKind {
  const text = `${card.title} ${card.body}`;

  if (card.priority === "high") return "task";
  if (URL_PATTERN.test(text)) return "link";
  if (TASK_PATTERN.test(text)) return "task";
  if (EVENT_PATTERN.test(text)) return "event";
  return "discovery";
}

export function getPriorityLabel(priority: Card["priority"]) {
  if (priority === "high") return "Needs attention";
  if (priority === "medium") return "Worth a look";
  return "For your radar";
}

export function getTemporalCue(card: Card) {
  const text = `${card.title}\n${card.body}`;
  const patterns = [
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,?\s+\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM))?/i,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM))?/i,
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM))?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
}

export function getVisualPalette(title: string) {
  let hash = 0;

  for (const character of title) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % 5;
}

const FALLBACK_VISUALS = [
  "/card-art/assignment.webp",
  "/card-art/attendance.webp",
  "/card-art/meditation.webp",
  "/card-art/drama.webp",
  "/card-art/groceries.webp",
] as const;

export function getVisualAsset(card: Card) {
  const text = `${card.title} ${card.body}`.toLowerCase();

  if (/assignment|deadline|classroom|course/.test(text)) {
    return "/card-art/assignment.webp";
  }

  if (/innovation|attendance|presence|form/.test(text)) {
    return "/card-art/attendance.webp";
  }

  if (/kriya|shambhavi|meditation|yoga|isha/.test(text)) {
    return "/card-art/meditation.webp";
  }

  if (/drama|theatre|theater|play|script/.test(text)) {
    return "/card-art/drama.webp";
  }

  if (/deal|grocery|spencer|store|rice|oil/.test(text)) {
    return "/card-art/groceries.webp";
  }

  return FALLBACK_VISUALS[getVisualPalette(card.title)];
}
