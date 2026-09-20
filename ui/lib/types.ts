import { z } from "zod";

export const cardSchema = z.object({
  id: z.string().refine((value) => value.trim().length > 0, {
    message: "id cannot be empty",
  }),
  createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "createdAt must be an ISO timestamp",
  }),
  title: z.string().refine((value) => value.trim().length > 0, {
    message: "title cannot be empty",
  }),
  body: z.string(),
  priority: z.enum(["low", "medium", "high"]),
});

export type Card = z.infer<typeof cardSchema>;

export interface CardsResponse {
  cards: Card[];
  invalidCount: number;
  warning: string | null;
}

export interface IntelligenceStatus {
  latestUpdateAt: string | null;
  cardsUpdatedAt: string | null;
  memoryUpdatedAt: string | null;
}
