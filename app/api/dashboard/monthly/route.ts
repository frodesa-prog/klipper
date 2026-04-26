import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { sql, gte, isNotNull, and } from "drizzle-orm";

// Monthly cutting + charging hours for the last 24 months (for YoY comparison).
// Uses MAX of cumulative counters per month, then computes month-over-month delta.
export async function GET() {
  const since = new Date();
  since.setMonth(since.getMonth() - 25); // 25 months back for delta

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${mowerSnapshots.polledAt})::date`.as("month"),
      maxCutting: sql<number>`max(${mowerSnapshots.totalCuttingTime})`.as("max_cutting"),
      maxCharging: sql<number>`max(${mowerSnapshots.totalChargingTime})`.as("max_charging"),
    })
    .from(mowerSnapshots)
    .where(
      and(
        gte(mowerSnapshots.polledAt, since),
        isNotNull(mowerSnapshots.totalCuttingTime)
      )
    )
    .groupBy(sql`date_trunc('month', ${mowerSnapshots.polledAt})`)
    .orderBy(sql`date_trunc('month', ${mowerSnapshots.polledAt})`);

  // Month-over-month deltas (seconds → hours)
  const monthly = rows.slice(1).map((row, i) => {
    const prev = rows[i];
    const cuttingHours = Math.max(0, Math.round((row.maxCutting - prev.maxCutting) / 3600));
    const chargingHours = Math.max(0, Math.round(((row.maxCharging ?? 0) - (prev.maxCharging ?? 0)) / 3600));
    const totalHours = cuttingHours + chargingHours;
    const efficiency = totalHours > 0 ? Math.round((cuttingHours / totalHours) * 100) : 0;
    return {
      month: row.month,
      cuttingHours,
      chargingHours,
      efficiency,
    };
  });

  return NextResponse.json(monthly.slice(-24));
}
