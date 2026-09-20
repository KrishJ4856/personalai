import { NextResponse } from "next/server";

import { deleteCard, StateFileError } from "@/lib/server/state-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteCard(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof StateFileError
        ? error.message
        : "The card could not be dismissed.";
    const status = error instanceof StateFileError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
