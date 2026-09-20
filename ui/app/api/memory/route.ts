import { NextResponse } from "next/server";

import {
  readMemoryDocument,
  saveMemory,
  StateFileError,
} from "@/lib/server/state-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const memory = await readMemoryDocument();

    return new Response(memory.content, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/markdown; charset=utf-8",
        ETag: memory.etag,
      },
    });
  } catch (error) {
    const message =
      error instanceof StateFileError
        ? error.message
        : "Long-term memory could not be read.";
    const status = error instanceof StateFileError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_100_000) {
      throw new StateFileError(
        "Memory is too large to save from this editor.",
        413,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new StateFileError("The memory update is not valid JSON.", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("content" in body) ||
      typeof body.content !== "string"
    ) {
      throw new StateFileError("Memory must be Markdown text.", 400);
    }

    const etag = await saveMemory(body.content, request.headers.get("if-match"));

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          ETag: etag,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof StateFileError
        ? error.message
        : "Long-term memory could not be saved.";
    const status = error instanceof StateFileError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
