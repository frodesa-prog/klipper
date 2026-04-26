import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { sql, gte, isNotNull, ne, and } from "drizzle-orm";

// Error code frequency grouped by code, last 12 months
export async function GET() {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const rows = await db
    .select({
      errorCode: mowerSnapshots.errorCode,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(mowerSnapshots)
    .where(
      and(
        gte(mowerSnapshots.polledAt, since),
        isNotNull(mowerSnapshots.errorCode),
        ne(mowerSnapshots.errorCode, 0)
      )
    )
    .groupBy(mowerSnapshots.errorCode)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return NextResponse.json(rows);
}
