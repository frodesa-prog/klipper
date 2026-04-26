import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";
import { z } from "zod";

export async function GET() {
  const rows = await db.select().from(zones);
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["mowing_area", "exclusion"]),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [zone] = await db.insert(zones).values(parsed.data).returning();
  return NextResponse.json(zone, { status: 201 });
}
