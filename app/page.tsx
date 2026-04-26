import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

async function getLatestSnapshots() {
  // One row per mower_id — the most recent snapshot
  return db
    .selectDistinctOn([mowerSnapshots.mowerId], {
      mowerId: mowerSnapshots.mowerId,
      mowerName: mowerSnapshots.mowerName,
      state: mowerSnapshots.state,
      activity: mowerSnapshots.activity,
      batteryPercent: mowerSnapshots.batteryPercent,
      latitude: mowerSnapshots.latitude,
      longitude: mowerSnapshots.longitude,
      errorCode: mowerSnapshots.errorCode,
      polledAt: mowerSnapshots.polledAt,
    })
    .from(mowerSnapshots)
    .orderBy(mowerSnapshots.mowerId, desc(mowerSnapshots.polledAt));
}

const ACTIVITY_LABEL: Record<string, string> = {
  MOWING: "Klipper",
  GOING_HOME: "På vei hjem",
  CHARGING: "Lader",
  PARKED_IN_CS: "Parkert",
  STOPPED_IN_GARDEN: "Stoppet i hagen",
  NOT_APPLICABLE: "—",
};

const ACTIVITY_COLOR: Record<string, string> = {
  MOWING: "bg-green-500",
  GOING_HOME: "bg-orange-400",
  CHARGING: "bg-blue-500",
  PARKED_IN_CS: "bg-blue-300",
  STOPPED_IN_GARDEN: "bg-yellow-400",
  NOT_APPLICABLE: "bg-gray-400",
};

export default async function HomePage() {
  let snapshots: Awaited<ReturnType<typeof getLatestSnapshots>> = [];
  let dbError = false;

  try {
    snapshots = await getLatestSnapshots();
  } catch {
    dbError = true;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Klipper</h1>
            <p className="text-gray-400 text-sm mt-1">Husqvarna Automower 415X — overvåking</p>
          </div>
          <div className="flex gap-2">
            <a href="/map" className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 transition-colors">Kart →</a>
            <a href="/maintenance" className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 transition-colors">Vedlikehold →</a>
            <a href="/dashboard" className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 transition-colors">Dashboard →</a>
            <a href="/sessions" className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-100 transition-colors">Sesjoner →</a>
          </div>
        </div>

        {dbError && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            Kunne ikke koble til databasen. Sjekk at <code>DATABASE_URL</code> er satt i{" "}
            <code>.env.local</code>.
          </div>
        )}

        {!dbError && snapshots.length === 0 && (
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-sm text-gray-400">
            <p className="font-medium text-gray-200 mb-2">Ingen data ennå</p>
            <p>Kjør første poll for å hente status fra Husqvarna API:</p>
            <pre className="mt-3 rounded bg-gray-800 p-3 text-xs overflow-x-auto">
              {`curl -H "x-poll-secret: <POLL_SECRET>" http://localhost:3000/api/poll-mower`}
            </pre>
          </div>
        )}

        {snapshots.map((s) => {
          const activityColor = ACTIVITY_COLOR[s.activity] ?? "bg-gray-400";
          const activityLabel = ACTIVITY_LABEL[s.activity] ?? s.activity;
          const polledAt = s.polledAt
            ? new Date(s.polledAt).toLocaleString("nb-NO")
            : "—";

          return (
            <div
              key={s.mowerId}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{s.mowerName ?? s.mowerId}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{s.mowerId}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white ${activityColor}`}
                >
                  {activityLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Tilstand" value={s.state ?? "—"} />
                <Stat
                  label="Batteri"
                  value={s.batteryPercent != null ? `${s.batteryPercent}%` : "—"}
                />
                <Stat
                  label="Posisjon"
                  value={
                    s.latitude != null && s.longitude != null
                      ? `${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}`
                      : "Ukjent"
                  }
                />
                <Stat
                  label="Feilkode"
                  value={s.errorCode ? String(s.errorCode) : "Ingen"}
                />
              </div>

              <p className="text-xs text-gray-600">Sist oppdatert: {polledAt}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-800 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-100 mt-0.5">{value}</p>
    </div>
  );
}
