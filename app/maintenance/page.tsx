export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { mowerSnapshots, maintenanceEvents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import CollisionChart from "@/components/CollisionChart";
import AddMaintenanceForm from "@/components/AddMaintenanceForm";
import DeleteEventButton from "@/components/DeleteEventButton";

const BLADE_THRESHOLD_HOURS = 200;

const TYPE_LABELS: Record<string, string> = {
  BLADE_CHANGE: "Knivbladbytte",
  SERVICE: "Service",
  CLEANING: "Rengjøring",
  OTHER: "Annet",
};

async function getData() {
  // Latest snapshot with statistics
  const [latest] = await db
    .selectDistinctOn([mowerSnapshots.mowerId], {
      mowerId: mowerSnapshots.mowerId,
      mowerName: mowerSnapshots.mowerName,
      cuttingBladeUsageTime: mowerSnapshots.cuttingBladeUsageTime,
    })
    .from(mowerSnapshots)
    .orderBy(mowerSnapshots.mowerId, desc(mowerSnapshots.polledAt));

  // All maintenance events
  const events = await db
    .select()
    .from(maintenanceEvents)
    .orderBy(desc(maintenanceEvents.performedAt));

  // Collision trend from API
  const trendRes = await fetch(
    `${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/collision-trend`,
    { cache: "no-store" }
  );
  const trendData = trendRes.ok
    ? await trendRes.json()
    : { trend: [], alert: false, currentWeek: 0, avg: 0 };

  return { latest: latest ?? null, events, trendData };
}

export default async function MaintenancePage() {
  const { latest, events, trendData } = await getData();

  const bladeHours = latest?.cuttingBladeUsageTime
    ? Math.round(latest.cuttingBladeUsageTime / 3600)
    : null;
  const bladePercent = bladeHours != null
    ? Math.min(100, Math.round((bladeHours / BLADE_THRESHOLD_HOURS) * 100))
    : null;
  const lastBladeChange = events.find((e) => e.type === "BLADE_CHANGE");
  const daysSinceChange = lastBladeChange
    ? Math.floor(
        (Date.now() - new Date(lastBladeChange.performedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const mowerId = latest?.mowerId ?? "";

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vedlikehold</h1>
            <p className="text-gray-400 text-sm mt-1">{latest?.mowerName ?? "Automower 415X"}</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-200">← Hjem</a>
        </div>

        {/* Blade status */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Knivblad</h2>
            {bladePercent != null && bladePercent >= 90 && (
              <span className="rounded-full bg-red-900 text-red-300 text-xs px-3 py-1 font-medium">
                Bytt snart
              </span>
            )}
          </div>

          {bladeHours != null ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Brukstid</span>
                  <span className="font-medium">
                    {bladeHours} / {BLADE_THRESHOLD_HOURS} timer
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      bladePercent! >= 90
                        ? "bg-red-500"
                        : bladePercent! >= 70
                        ? "bg-yellow-400"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${bladePercent}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Dager siden siste bytte</p>
                  <p className="font-medium mt-0.5">
                    {daysSinceChange != null ? `${daysSinceChange} dager` : "Ikke registrert"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sist byttet</p>
                  <p className="font-medium mt-0.5">
                    {lastBladeChange
                      ? new Date(lastBladeChange.performedAt).toLocaleDateString("nb-NO")
                      : "—"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Ingen statistikkdata ennå — poll moweren for å hente data.</p>
          )}
        </section>

        {/* Collision trend */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Kollisjoner siste 12 uker</h2>
          {trendData.trend.length > 0 ? (
            <CollisionChart
              trend={trendData.trend}
              avg={trendData.avg}
              alert={trendData.alert}
            />
          ) : (
            <p className="text-sm text-gray-500">Ikke nok data ennå.</p>
          )}
        </section>

        {/* Maintenance log */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Hendelseslogg</h2>
            {mowerId && <AddMaintenanceForm mowerId={mowerId} />}
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Ingen hendelser registrert ennå.</p>
          ) : (
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Dato</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Notater</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, i) => (
                    <tr
                      key={event.id}
                      className={`border-b border-gray-800 last:border-0 ${
                        i % 2 === 0 ? "bg-gray-900" : "bg-gray-950"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-200">
                        {TYPE_LABELS[event.type] ?? event.type}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(event.performedAt).toLocaleDateString("nb-NO")}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{event.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <DeleteEventButton id={event.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
