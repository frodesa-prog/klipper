"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthPoint {
  month: string;
  cuttingHours: number;
  chargingHours: number;
  efficiency: number;
}

export default function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month).toLocaleDateString("nb-NO", { month: "short", year: "2-digit" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={formatted} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis yAxisId="hours" tick={{ fill: "#9ca3af", fontSize: 11 }} unit="t" />
        <YAxis yAxisId="pct" orientation="right" tick={{ fill: "#9ca3af", fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f3f4f6" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Bar yAxisId="hours" dataKey="cuttingHours" name="Klipper" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
        <Bar yAxisId="hours" dataKey="chargingHours" name="Lader" stackId="a" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="efficiency"
          name="Effektivitet %"
          stroke="#facc15"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
