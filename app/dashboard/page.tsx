export const dynamic = "force-dynamic";

import MonthlyChart from "@/components/MonthlyChart";
import ErrorFrequencyChart from "@/components/ErrorFrequencyChart";

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "http://localhost:3000";

async function getTotals() {
  const res = await fetch(`${BASE_URL}/api/dashboard/totals`, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

async function getMonthly() {
  const res = await fetch(`${BASE_URL}/api/dashboard/monthly`, { cache: "no-store" });
  return res.ok ? res.json() : [];
}

async function getErrors() {
  const res = await fetch(`${BASE_URL}/api/dashboard/errors`, { cache: "no-store" });
  return res.ok ? res.json() : [];
}

function hours(seconds: number | null) {
  if (seconds == null) return "—";
  return `${Math.round(seconds / 3600).toLocaleString("nb-NO")} t`;
}

function km(meters: number | null) {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

// Split monthly data into current and previous year for YoY
function splitYears(monthly: { month: string; cuttingHours: number; chargingHours: number; efficiency: number }[]) {
  const thisYear = new Date().getFullYear();
  const current = monthly.filter((m) => new Date(m.month).getFullYear() === thisYear);
  const previous = monthly.filter((m) => new Date(m.month).getFullYear() === thisYear - 1);
  return { current, previous };
}

export default async function DashboardPage() {
  const [totals, monthly, errors] = await Promise.all([getTotals(), getMonthly(), getErrors()]);
  const hasYoY = monthly.some(
    (m: { month: string }) => new Date(m.month).getFullYear() === new Date().getFullYear() - 1
  );

  const { current, previous } = splitYears(monthly);
  const currentYearCutting = current.reduce((s: number, m: { cuttingHours: number }) => s + m.cuttingHours, 0);
  const previousYearCutting = previous.reduce((s: number, m: { cuttingHours: number }) => s + m.cuttingHours, 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">{totals?.mowerName ?? "Automower 415X"}</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-200">← Hjem</a>
        </div>

        {/* Total counters */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold text-lg mb-4">Totalt alle tider</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Klippetid" value={hours(totals?.totalCuttingTime)} />
            <StatCard label="Ladetid" value={hours(totals?.totalChargingTime)} />
            <StatCard label="Total kjøretid" value={hours(totals?.totalRunningTime)} />
            <StatCard label="Distanse kjørt" value={km(totals?.totalDrivenDistance)} />
            <StatCard label="Ladesykluser" value={totals?.numberOfChargingCycles?.toLocaleString("nb-NO") ?? "—"} />
            <StatCard label="Kollisjoner" value={totals?.numberOfCollisions?.toLocaleString("nb-NO") ?? "—"} />
          </div>
        </section>

        {/* Year-over-year summary */}
        {hasYoY && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="font-semibold text-lg mb-4">År-over-år klippetimer</h2>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500">{new Date().getFullYear() - 1}</p>
                <p className="text-2xl font-bold mt-1">{previousYearCutting} t</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{new Date().getFullYear()} (hittil)</p>
                <p className="text-2xl font-bold mt-1">{currentYearCutting} t</p>
              </div>
              {previousYearCutting > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Endring</p>
                  <p className={`text-2xl font-bold mt-1 ${currentYearCutting >= previousYearCutting ? "text-green-400" : "text-red-400"}`}>
                    {currentYearCutting >= previousYearCutting ? "+" : ""}
                    {Math.round(((currentYearCutting - previousYearCutting) / previousYearCutting) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Monthly chart */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Månedlig oversikt</h2>
          {monthly.length > 0 ? (
            <MonthlyChart data={monthly} />
          ) : (
            <p className="text-sm text-gray-500">Ikke nok data ennå — trenger data fra minst 2 måneder.</p>
          )}
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-green-500" /> Klipper (timer)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-500" /> Lader (timer)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-yellow-400" /> Effektivitet (%)</span>
          </div>
        </section>

        {/* Error frequency */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Feilkoder siste 12 måneder</h2>
          {errors.length > 0 ? (
            <ErrorFrequencyChart data={errors} />
          ) : (
            <p className="text-sm text-gray-500 py-4">Ingen feilkoder registrert. Bra!</p>
          )}
        </section>

      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-800 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-100 mt-1">{value}</p>
    </div>
  );
}
