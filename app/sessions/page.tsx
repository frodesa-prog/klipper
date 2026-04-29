export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import SessionsChart from "@/components/SessionsChart";
import SessionItem from "@/components/SessionItem";

export interface SessionRow {
  started_at: string;
  ended_at: string;
  snapshot_count: number;
  duration_seconds: number;
  zone_name: string | null;
  zone_type: string | null;
  min_lat: number | null;
  max_lat: number | null;
  min_lng: number | null;
  max_lng: number | null;
}

interface WeeklySummary {
  week: string;
  sessions: number;
  totalMinutes: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}t ${mins}min`;
}

function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `Uke ${weekNo}`;
}

export default async function SessionsPage() {
  const result = await db.execute(sql`
    WITH mowing_rows AS (
      SELECT
        polled_at,
        position,
        latitude,
        longitude,
        LAG(polled_at) OVER (ORDER BY polled_at) AS prev_polled_at
      FROM mower_snapshots
      WHERE activity = 'MOWING'
    ),
    with_session_start AS (
      SELECT
        polled_at,
        position,
        latitude,
        longitude,
        CASE
          WHEN prev_polled_at IS NULL
            OR EXTRACT(EPOCH FROM (polled_at - prev_polled_at)) > 600
          THEN 1 ELSE 0
        END AS is_session_start
      FROM mowing_rows
    ),
    with_session_id AS (
      SELECT
        polled_at,
        position,
        latitude,
        longitude,
        SUM(is_session_start) OVER (ORDER BY polled_at) AS session_id
      FROM with_session_start
    ),
    sessions AS (
      SELECT
        session_id,
        MIN(polled_at)                                                AS started_at,
        MAX(polled_at)                                                AS ended_at,
        COUNT(*)::int                                                 AS snapshot_count,
        EXTRACT(EPOCH FROM (MAX(polled_at) - MIN(polled_at)))::int    AS duration_seconds,
        (ARRAY_AGG(position ORDER BY polled_at)
          FILTER (WHERE position IS NOT NULL))[1]                     AS sample_pos,
        MIN(latitude)                                                 AS min_lat,
        MAX(latitude)                                                 AS max_lat,
        MIN(longitude)                                                AS min_lng,
        MAX(longitude)                                                AS max_lng
      FROM with_session_id
      GROUP BY session_id
    )
    SELECT
      s.started_at,
      s.ended_at,
      s.snapshot_count,
      s.duration_seconds,
      s.min_lat,
      s.max_lat,
      s.min_lng,
      s.max_lng,
      z.name  AS zone_name,
      z.type  AS zone_type
    FROM sessions s
    LEFT JOIN LATERAL (
      SELECT zn.name, zn.type
      FROM zones zn
      WHERE s.sample_pos IS NOT NULL
        AND ST_Within(
          s.sample_pos,
          ST_SetSRID(
            ST_GeomFromGeoJSON(
              jsonb_build_object(
                'type', 'Polygon',
                'coordinates', zn.coordinates
              )::text
            ),
            4326
          )
        )
      LIMIT 1
    ) z ON true
    ORDER BY s.started_at DESC
    LIMIT 200
  `);

  const sessions = result.rows as unknown as SessionRow[];

  const [latest] = await db
    .select({ activity: mowerSnapshots.activity })
    .from(mowerSnapshots)
    .orderBy(desc(mowerSnapshots.polledAt))
    .limit(1);

  const isCurrentlyMowing = latest?.activity === "MOWING";

  // Weekly aggregates
  const weeklyMap = new Map<string, WeeklySummary>();
  for (const s of sessions) {
    const label = getISOWeekLabel(new Date(s.started_at));
    const entry = weeklyMap.get(label) ?? { week: label, sessions: 0, totalMinutes: 0 };
    entry.sessions += 1;
    entry.totalMinutes += Math.round((s.duration_seconds ?? 0) / 60);
    weeklyMap.set(label, entry);
  }
  const weeklyData = Array.from(weeklyMap.values()).slice(0, 12).reverse();

  const thisWeekLabel = getISOWeekLabel(new Date());
  const thisWeek = weeklyMap.get(thisWeekLabel) ?? { week: thisWeekLabel, sessions: 0, totalMinutes: 0 };
  const totalSessions = sessions.length;
  const totalMinutesAll = sessions.reduce((sum, s) => sum + Math.round((s.duration_seconds ?? 0) / 60), 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Klippesesjoner</h1>
            <p className="text-gray-400 text-sm mt-1">Individuelle klipperunder oppdaget automatisk</p>
          </div>
          <a href="/" className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-100 transition-colors">
            ← Hjem
          </a>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Sesjoner denne uken" value={String(thisWeek.sessions)} />
          <StatCard label="Klippetid denne uken" value={formatDuration(thisWeek.totalMinutes * 60)} />
          <StatCard label="Totalt antall sesjoner" value={String(totalSessions)} />
          <StatCard label="Total klippetid" value={formatDuration(totalMinutesAll * 60)} />
        </div>

        {/* Weekly chart */}
        {weeklyData.length > 1 && <SessionsChart data={weeklyData} />}

        {/* Session list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Siste sesjoner</h2>

          {sessions.length === 0 && (
            <p className="text-gray-500 text-sm">Ingen klippesesjoner registrert ennå.</p>
          )}

          <div className="rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-800">
            {sessions.map((s, i) => (
              <SessionItem
                key={i}
                session={s}
                ongoing={i === 0 && isCurrentlyMowing}
                duration={formatDuration(s.duration_seconds ?? 0)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
    </div>
  );
}
