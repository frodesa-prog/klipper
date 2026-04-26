import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceEvents } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const events = await db
    .select()
    .from(maintenanceEvents)
    .orderBy(desc(maintenanceEvents.performedAt));

  return NextResponse.json(events);
}

const createSchema = z.object({
  mowerId: z.string().min(1),
  type: z.enum(["BLADE_CHANGE", "SERVICE", "CLEANING", "OTHER"]),
  notes: z.string().optional(),
  performedAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [event] = await db
    .insert(maintenanceEvents)
    .values({
      ...parsed.data,
      notes: parsed.data.notes ?? null,
      performedAt: new Date(parsed.data.performedAt),
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
