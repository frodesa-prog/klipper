import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { and, gte, lte, isNotNull, eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const rows = await db
    .select({ longitude: mowerSnapshots.longitude, latitude: mowerSnapshots.latitude })
    .from(mowerSnapshots)
    .where(
      and(
        eq(mowerSnapshots.activity, "MOWING"),
        gte(mowerSnapshots.polledAt, new Date(from)),
        lte(mowerSnapshots.polledAt, new Date(to)),
        isNotNull(mowerSnapshots.latitude),
        isNotNull(mowerSnapshots.longitude),
      )
    )
    .orderBy(asc(mowerSnapshots.polledAt));

  const coordinates = rows.map((r) => [r.longitude!, r.latitude!] as [number, number]);
  return NextResponse.json({ coordinates });
}
