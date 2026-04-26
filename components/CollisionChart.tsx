"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface WeekPoint {
  week: string;
  collisions: number;
}

interface Props {
  trend: WeekPoint[];
  avg: number;
  alert: boolean;
}

export default function CollisionChart({ trend, avg, alert }: Props) {
  const data = trend.map((d) => ({
    ...d,
    label: new Date(d.week).toLocaleDateString("nb-NO", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="space-y-2">
      {alert && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          ⚠ Denne uken er kollisjonstallet mer enn dobbelt av gjennomsnittet — sjekk hagen for hindringer.
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#f3f4f6" }}
            itemStyle={{ color: "#fb923c" }}
          />
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#6b7280"
              strokeDasharray="4 4"
              label={{ value: "snitt", fill: "#6b7280", fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="collisions"
            stroke="#fb923c"
            strokeWidth={2}
            dot={{ fill: "#fb923c", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
