"use client";

import { useState } from "react";

interface SessionRow {
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

interface Props {
  session: SessionRow;
  ongoing: boolean;
  duration: string;
}

export default function SessionItem({ session: s, ongoing, duration }: Props) {
  const [expanded, setExpanded] = useState(false);

  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";
  const startDate = new Date(s.started_at);
  const hasMap = s.min_lat != null && s.min_lng != null && s.max_lat != null && s.max_lng != null;

  const mapUrl = hasMap
    ? (() => {
        // Add ~80m padding around the bounding box for context
        const pad = 0.0008;
        const west  = (s.min_lng! - pad).toFixed(6);
        const south = (s.min_lat! - pad).toFixed(6);
        const east  = (s.max_lng! + pad).toFixed(6);
        const north = (s.max_lat! + pad).toFixed(6);
        return `https://api.maptiler.com/maps/satellite/static/${west},${south},${east},${north}/640x360.png?key=${mapTilerKey}`;
      })()
    : null;

  return (
    <div className="bg-gray-900">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-100">
            {startDate.toLocaleDateString("nb-NO", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Start:{" "}
            {startDate.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {s.zone_name && (
            <span
              className="rounded-full text-xs px-2.5 py-0.5 font-medium"
              style={{
                backgroundColor: s.zone_type === "exclusion" ? "#7f1d1d" : "#14532d",
                color: s.zone_type === "exclusion" ? "#fca5a5" : "#86efac",
              }}
            >
              {s.zone_name}
            </span>
          )}

          <span className="text-sm tabular-nums text-gray-300">{duration}</span>

          {ongoing ? (
            <span className="rounded-full bg-green-900 text-green-300 text-xs px-2.5 py-0.5 font-medium">
              Pågår
            </span>
          ) : (
            <span className="rounded-full bg-gray-800 border border-gray-700 text-gray-500 text-xs px-2.5 py-0.5">
              Fullført
            </span>
          )}

          <span className="text-gray-600 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4">
          {mapUrl ? (
            <div className="overflow-hidden rounded-lg border border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapUrl}
                alt="Kart for sesjonen"
                className="w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">Ingen GPS-data tilgjengelig for denne sesjonen.</p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            {s.snapshot_count} målinger ·{" "}
            {new Date(s.started_at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {new Date(s.ended_at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
