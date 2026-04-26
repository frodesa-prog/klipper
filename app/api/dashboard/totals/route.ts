import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// Latest cumulative counters — one row per mower
export async function GET() {
  const rows = await db
    .selectDistinctOn([mowerSnapshots.mowerId], {
      mowerId: mowerSnapshots.mowerId,
      mowerName: mowerSnapshots.mowerName,
      totalCuttingTime: mowerSnapshots.totalCuttingTime,
      totalChargingTime: mowerSnapshots.totalChargingTime,
      totalRunningTime: mowerSnapshots.totalRunningTime,
      totalDrivenDistance: mowerSnapshots.totalDrivenDistance,
      numberOfChargingCycles: mowerSnapshots.numberOfChargingCycles,
      numberOfCollisions: mowerSnapshots.numberOfCollisions,
    })
    .from(mowerSnapshots)
    .orderBy(mowerSnapshots.mowerId, desc(mowerSnapshots.polledAt));

  return NextResponse.json(rows[0] ?? null);
}
