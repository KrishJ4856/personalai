import { NextResponse } from "next/server";

import { readCards, StateFileError } from "@/lib/server/state-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await readCards();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof StateFileError
        ? error.message
        : "The local cards could not be read.";
    const status = error instanceof StateFileError ? error.status : 500;

    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
