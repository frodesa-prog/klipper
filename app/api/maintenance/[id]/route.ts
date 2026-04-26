import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(maintenanceEvents).where(eq(maintenanceEvents.id, id));
  return new NextResponse(null, { status: 204 });
}
