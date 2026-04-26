"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ErrorRow {
  errorCode: number;
  count: number;
}

export default function ErrorFrequencyChart({ data }: { data: ErrorRow[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: `Feil ${d.errorCode}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} width={60} />
        <Tooltip
          contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f3f4f6" }}
          itemStyle={{ color: "#f87171" }}
        />
        <Bar dataKey="count" name="Antall" fill="#f87171" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
