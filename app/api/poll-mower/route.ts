import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { listMowers } from "@/lib/husqvarna/client";
import { persistSnapshot } from "@/lib/husqvarna/persistSnapshot";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-poll-secret");
  if (secret !== env.POLL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mowers = await listMowers();
  await Promise.all(mowers.map(persistSnapshot));

  return NextResponse.json({ ok: true, polled: mowers.map((m) => m.id), count: mowers.length });
}
