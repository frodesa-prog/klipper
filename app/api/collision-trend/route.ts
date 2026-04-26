import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { sql, gte, isNotNull, and } from "drizzle-orm";

// Returns weekly collision deltas for the last 12 weeks.
// numberOfCollisions is a cumulative counter, so we take MAX per week
// and compute week-over-week difference.
export async function GET() {
  const since = new Date(Date.now() - 13 * 7 * 24 * 60 * 60 * 1000); // 13 weeks back for delta

  const rows = await db
    .select({
      week: sql<string>`date_trunc('week', ${mowerSnapshots.polledAt})::date`.as("week"),
      maxCollisions: sql<number>`max(${mowerSnapshots.numberOfCollisions})`.as("max_collisions"),
    })
    .from(mowerSnapshots)
    .where(
      and(
        gte(mowerSnapshots.polledAt, since),
        isNotNull(mowerSnapshots.numberOfCollisions)
      )
    )
    .groupBy(sql`date_trunc('week', ${mowerSnapshots.polledAt})`)
    .orderBy(sql`date_trunc('week', ${mowerSnapshots.polledAt})`);

  // Compute week-over-week delta
  const trend = rows.slice(1).map((row, i) => {
    const prev = rows[i];
    const delta = Math.max(0, row.maxCollisions - prev.maxCollisions);
    return { week: row.week, collisions: delta };
  });

  // Last 12 weeks
  const last12 = trend.slice(-12);

  // Alert if current week > 2× average of previous weeks
  const avg =
    last12.slice(0, -1).reduce((s, r) => s + r.collisions, 0) /
    Math.max(1, last12.length - 1);
  const current = last12.at(-1)?.collisions ?? 0;
  const alert = last12.length > 1 && current > 2 * avg;

  return NextResponse.json({ trend: last12, alert, currentWeek: current, avg: Math.round(avg) });
}
