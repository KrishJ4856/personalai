import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

import type { ChatMessage, ChatRequest, ChatSnapshot } from "@/lib/chat-types";

type SentientAgent = typeof import("../../../nova/nova-agent").agent;

interface ChatRuntime {
  snapshot: ChatSnapshot;
  agentPromise?: Promise<SentientAgent>;
  listeners: Set<() => void>;
}

// One local conversation and MCP connection, including across development HMR.
const localGlobal = globalThis as typeof globalThis & {
  sentientChat?: ChatRuntime;
};
const runtime = (localGlobal.sentientChat ??= {
  snapshot: {
    sessionId: randomUUID(),
    revision: 0,
    stateRevision: 0,
    busy: false,
    messages: [],
  },
  listeners: new Set(),
});

export class ChatError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function getChatSnapshot(): ChatSnapshot {
  return runtime.snapshot;
}

function notify() {
  runtime.snapshot.revision += 1;
  for (const listener of runtime.listeners) listener();
}

async function getAgent() {
  if (!runtime.agentPromise) {
    const root = existsSync(path.join(process.cwd(), "nova", "nova-agent.ts"))
      ? process.cwd()
      : path.resolve(process.cwd(), "..");
    config({ path: path.join(root, ".env"), quiet: true });

    const missing = [
      "OPENAI_API_KEY",
      "OPENAI_BASE_URL",
      "NOVA_ACT_API_KEY",
    ].filter((key) => !process.env[key]?.trim());
    if (missing.length) {
      throw new ChatError(
        `Ask AI needs ${missing.join(", ")} in the repository environment.`,
        503,
      );
    }

    runtime.agentPromise = import("../../../nova/nova-agent")
      .then((module) => module.agent)
      .catch(() => {
        runtime.agentPromise = undefined;
        throw new ChatError(
          "The agent could not start. Check the local server logs and configuration.",
          503,
        );
      });
  }
  return runtime.agentPromise;
}

function activityLabel(name: string) {
  const labels: Record<string, string> = {
    get_current_date_time: "Checking the date and time",
    list_cards: "Reading your briefing",
    add_card: "Adding a card",
    remove_card: "Removing a card",
    show_memory: "Reading memory",
    modify_memory: "Updating memory",
  };
  return labels[name] ?? "Working in the browser";
}

function safeError(error: unknown) {
  if (error instanceof ChatError) return error.message;
  if (error instanceof Error && "status" in error) {
    if (error.status === 401 || error.status === 403) {
      return "The model connection was denied. Check the server’s API credentials.";
    }
    if (error.status === 429)
      return "The model is busy. Please try again in a moment.";
  }
  return "The agent couldn’t finish this request. Some actions may already have completed. Check the conversation before asking it to try again.";
}

async function runTurn(message: string, reply: ChatMessage) {
  try {
    const agent = await getAgent();
    let modelText = "";
    let completedText = "";
    for await (const event of agent.stream(message)) {
      if (event.type === "beforeModelCallEvent") {
        completedText = reply.content;
        modelText = "";
      } else if (event.type === "modelStreamUpdateEvent") {
        const update = event.event;
        if (
          update.type === "modelContentBlockDeltaEvent" &&
          update.delta.type === "textDelta"
        ) {
          modelText += update.delta.text;
          reply.content = [completedText, modelText]
            .filter(Boolean)
            .join("\n\n");
          notify();
        }
      } else if (event.type === "afterModelCallEvent" && event.stopData) {
        // Also supports providers that emit a completed message without text deltas.
        const text = event.stopData.message.content
          .filter((block) => block.type === "textBlock")
          .map((block) => block.text)
          .join("\n");
        reply.content = [completedText, text].filter(Boolean).join("\n\n");
        notify();
      } else if (event.type === "beforeToolCallEvent") {
        reply.activities.push({
          id: event.toolUse.toolUseId,
          label: activityLabel(event.toolUse.name),
          status: "running",
        });
        notify();
      } else if (event.type === "afterToolCallEvent") {
        const activity = reply.activities.find(
          (item) => item.id === event.toolUse.toolUseId,
        );
        if (activity)
          activity.status =
            event.error || event.result.status === "error"
              ? "error"
              : "complete";
        if (
          ["add_card", "remove_card", "modify_memory"].includes(
            event.toolUse.name,
          )
        ) {
          runtime.snapshot.stateRevision += 1;
        }
        notify();
      }
    }
    reply.status = "complete";
    if (!reply.content.trim())
      reply.content = "Finished. You can check the activity above for details.";
  } catch (error) {
    reply.status = "error";
    reply.error = safeError(error);
    for (const activity of reply.activities) {
      if (activity.status === "running") activity.status = "error";
    }
  } finally {
    runtime.snapshot.busy = false;
    // Refresh even after a failure: a tool may have written state before failing.
    runtime.snapshot.stateRevision += 1;
    notify();
  }
}

export function startChatTurn(request: ChatRequest) {
  const snapshot = runtime.snapshot;
  if (request.sessionId !== snapshot.sessionId) {
    throw new ChatError(
      "The local agent restarted. Reconnect to begin a new conversation.",
      409,
    );
  }
  const existing = snapshot.messages.find(
    (message) => message.id === request.requestId,
  );
  if (existing) {
    if (existing.content !== request.message || existing.role !== "user") {
      throw new ChatError(
        "That message identifier has already been used.",
        409,
      );
    }
    return;
  }
  if (snapshot.busy)
    throw new ChatError(
      "Sentient is already working. Wait for the current task to finish.",
      409,
    );

  const reply: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    content: "",
    status: "working",
    activities: [],
    error: null,
  };
  snapshot.busy = true;
  snapshot.messages.push(
    {
      id: request.requestId,
      role: "user",
      content: request.message,
      status: "complete",
      activities: [],
      error: null,
    },
    reply,
  );
  notify();
  // The task belongs to the local server, not the HTTP connection. Disconnects do
  // not repeat side effects or interrupt Nova while the user completes a login.
  void runTurn(request.message, reply);
}

export function chatEventStream(signal: AbortSignal) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let pending: ReturnType<typeof setTimeout> | undefined;
      const close = (closeController = true) => {
        if (closed) return;
        closed = true;
        clearTimeout(pending);
        clearInterval(heartbeat);
        runtime.listeners.delete(schedule);
        signal.removeEventListener("abort", onAbort);
        if (closeController) controller.close();
      };
      const send = () => {
        pending = undefined;
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(runtime.snapshot)}\n\n`),
        );
        if (!runtime.snapshot.busy) close();
      };
      const schedule = () => {
        if (!pending) pending = setTimeout(send, 40);
      };
      const onAbort = () => close();
      cleanup = () => close(false);
      runtime.listeners.add(schedule);
      signal.addEventListener("abort", onAbort, { once: true });
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15_000);
      if (signal.aborted) close();
      else send();
    },
    cancel() {
      cleanup();
    },
  });
}
