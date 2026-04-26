import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { and, gte, isNotNull, desc } from "drizzle-orm";

// Returns GeoJSON for heatmap (90 days) or track (24h)
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "track";
  const hoursBack = type === "heatmap" ? 90 * 24 : 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const rows = await db
    .select({
      latitude: mowerSnapshots.latitude,
      longitude: mowerSnapshots.longitude,
      activity: mowerSnapshots.activity,
      polledAt: mowerSnapshots.polledAt,
    })
    .from(mowerSnapshots)
    .where(
      and(
        gte(mowerSnapshots.polledAt, since),
        isNotNull(mowerSnapshots.latitude),
        isNotNull(mowerSnapshots.longitude)
      )
    )
    .orderBy(desc(mowerSnapshots.polledAt));

  const features = rows
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [r.longitude!, r.latitude!],
      },
      properties: {
        activity: r.activity,
        polledAt: r.polledAt,
      },
    }));

  return NextResponse.json({ type: "FeatureCollection", features });
}
