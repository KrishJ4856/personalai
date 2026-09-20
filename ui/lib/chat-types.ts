import { z } from "zod";

export const chatActivitySchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["running", "complete", "error"]),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  status: z.enum(["working", "complete", "error"]),
  activities: z.array(chatActivitySchema),
  error: z.string().nullable(),
});

export const chatSnapshotSchema = z.object({
  sessionId: z.string(),
  revision: z.number(),
  stateRevision: z.number(),
  busy: z.boolean(),
  messages: z.array(chatMessageSchema),
});

export const chatRequestSchema = z.object({
  sessionId: z.uuid(),
  requestId: z.uuid(),
  message: z.string().trim().min(1).max(12_000),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatSnapshot = z.infer<typeof chatSnapshotSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
