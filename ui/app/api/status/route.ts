import { NextResponse } from "next/server";

import { readStatus } from "@/lib/server/state-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await readStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
