import { chatRequestSchema } from "@/lib/chat-types";
import {
  ChatError,
  chatEventStream,
  getChatSnapshot,
  startChatTurn,
} from "@/lib/server/chat-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkOrigin(request: Request) {
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  ) {
    throw new ChatError(
      "Ask AI is available only through the local SentientOS address.",
      403,
    );
  }
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(request.url).origin)
  )
    throw new ChatError(
      "This request must come from the local SentientOS app.",
      403,
    );
}

function errorResponse(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ChatError
          ? error.message
          : "The conversation could not be loaded.",
    },
    {
      status: error instanceof ChatError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function streamResponse(request: Request) {
  return new Response(chatEventStream(request.signal), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function GET(request: Request) {
  try {
    checkOrigin(request);
    if (request.headers.get("accept")?.includes("text/event-stream"))
      return streamResponse(request);
    return Response.json(getChatSnapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new ChatError("Send a JSON message.", 415);
    }
    const reader = request.body?.getReader();
    if (!reader) throw new ChatError("Enter a message first.", 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64_000) {
          await reader.cancel();
          throw new ChatError(
            "That message is too long. Please shorten it.",
            413,
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ChatError("The message is not valid JSON.", 400);
    }
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success)
      throw new ChatError(
        "Send a message between 1 and 12,000 characters with a valid conversation identifier.",
        400,
      );
    startChatTurn(parsed.data);
    return streamResponse(request);
  } catch (error) {
    return errorResponse(error);
  }
}
