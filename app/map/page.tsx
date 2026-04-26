import { Suspense } from "react";
import { env } from "@/env";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import MowerMap from "@/components/MowerMap";

async function getInitialPosition() {
  const rows = await db
    .selectDistinctOn([mowerSnapshots.mowerId], {
      latitude: mowerSnapshots.latitude,
      longitude: mowerSnapshots.longitude,
    })
    .from(mowerSnapshots)
    .orderBy(mowerSnapshots.mowerId, desc(mowerSnapshots.polledAt));

  const first = rows.find((r) => r.latitude != null && r.longitude != null);
  return first ?? null;
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const hasUrlPosition = params.lat && params.lng;

  // Only fetch from DB if URL doesn't already have a position (bookmarks win)
  const dbPos = hasUrlPosition ? null : await getInitialPosition();

  const initialLng = parseFloat(params.lng ?? String(dbPos?.longitude ?? 10.75));
  const initialLat = parseFloat(params.lat ?? String(dbPos?.latitude ?? 59.91));
  const initialZoom = parseFloat(params.zoom ?? (dbPos ? "18" : "15"));

  return (
    <div className="w-screen h-screen bg-gray-950">
      <Suspense>
        <MowerMap
          mapTilerKey={env.NEXT_PUBLIC_MAPTILER_API_KEY}
          initialLng={initialLng}
          initialLat={initialLat}
          initialZoom={initialZoom}
        />
      </Suspense>
    </div>
  );
}
