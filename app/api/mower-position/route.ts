import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { listMowers } from "@/lib/husqvarna/client";
import { persistSnapshot } from "@/lib/husqvarna/persistSnapshot";

export async function GET() {
  try {
    const mowers = await listMowers();
    await Promise.all(mowers.map(persistSnapshot));
  } catch {
    // Return stale DB data if Husqvarna API is down
  }

  const rows = await db
    .selectDistinctOn([mowerSnapshots.mowerId], {
      mowerId: mowerSnapshots.mowerId,
      mowerName: mowerSnapshots.mowerName,
      activity: mowerSnapshots.activity,
      state: mowerSnapshots.state,
      batteryPercent: mowerSnapshots.batteryPercent,
      latitude: mowerSnapshots.latitude,
      longitude: mowerSnapshots.longitude,
      polledAt: mowerSnapshots.polledAt,
    })
    .from(mowerSnapshots)
    .orderBy(mowerSnapshots.mowerId, desc(mowerSnapshots.polledAt));

  return NextResponse.json(rows);
}
