import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const parsed = z
    .object({
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).optional(),
      name: z.string().min(1).optional(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [zone] = await db
    .update(zones)
    .set(parsed.data)
    .where(eq(zones.id, id))
    .returning();

  return NextResponse.json(zone);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(zones).where(eq(zones.id, id));
  return new NextResponse(null, { status: 204 });
}
