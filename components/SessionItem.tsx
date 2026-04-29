"use client";

import { useState, useEffect } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { BASE_PATH } from "@/lib/basePath";

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

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

export default function SessionItem({ session: s, ongoing, duration }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [trackCoords, setTrackCoords] = useState<[number, number][]>([]);
  const [trackLoading, setTrackLoading] = useState(false);

  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";
  const startDate = new Date(s.started_at);

  const hasPosition =
    s.min_lat != null && s.min_lng != null &&
    s.max_lat != null && s.max_lng != null;

  const centerLng = hasPosition ? (s.min_lng! + s.max_lng!) / 2 : 0;
  const centerLat = hasPosition ? (s.min_lat! + s.max_lat!) / 2 : 0;

  const mapLink = hasPosition
    ? `/map?lng=${centerLng.toFixed(6)}&lat=${centerLat.toFixed(6)}&zoom=18`
    : "/map";

  const mapStyle = `https://api.maptiler.com/maps/satellite/style.json?key=${mapTilerKey}`;

  // Fetch track when expanded (only once)
  useEffect(() => {
    if (!expanded || trackCoords.length > 0) return;
    setTrackLoading(true);
    fetch(
      `${BASE_PATH}/api/sessions/track?from=${encodeURIComponent(s.started_at)}&to=${encodeURIComponent(s.ended_at)}`
    )
      .then((r) => r.json())
      .then((data) => setTrackCoords(data.coordinates ?? []))
      .catch(() => {})
      .finally(() => setTrackLoading(false));
  }, [expanded, s.started_at, s.ended_at, trackCoords.length]);

  const trackGeoJSON: FeatureCollection =
    trackCoords.length >= 2
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: trackCoords },
            },
          ],
        }
      : EMPTY_FC;

  const startCoord = trackCoords[0] ?? null;
  const endCoord = trackCoords[trackCoords.length - 1] ?? null;

  // Pad bounding box for initial map view
  const pad = 0.00005;
  const mapBounds: [[number, number], [number, number]] | undefined = hasPosition
    ? [
        [s.min_lng! - pad, s.min_lat! - pad],
        [s.max_lng! + pad, s.max_lat! + pad],
      ]
    : undefined;

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
        <div className="px-5 pb-4 space-y-2">
          {hasPosition ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-700" style={{ height: 260 }}>
              {trackLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/60">
                  <span className="text-xs text-gray-400">Laster spor…</span>
                </div>
              )}
              <Map
                initialViewState={
                  mapBounds
                    ? { bounds: mapBounds, fitBoundsOptions: { padding: 8 } }
                    : { longitude: centerLng, latitude: centerLat, zoom: 17 }
                }
                style={{ width: "100%", height: "100%" }}
                mapStyle={mapStyle}
                interactive={false}
              >
                {/* GPS track */}
                <Source id="track" type="geojson" data={trackGeoJSON}>
                  <Layer
                    id="track-line"
                    type="line"
                    paint={{ "line-color": "#22c55e", "line-width": 2.5, "line-opacity": 0.95 }}
                    layout={{ "line-cap": "round", "line-join": "round" }}
                  />
                </Source>

                {/* Start marker (green) */}
                {startCoord && (
                  <Marker longitude={startCoord[0]} latitude={startCoord[1]} anchor="center">
                    <span className="block w-3 h-3 rounded-full bg-green-400 border-2 border-white shadow" title="Start" />
                  </Marker>
                )}

                {/* End marker (red) — only if session is finished */}
                {endCoord && !ongoing && endCoord !== startCoord && (
                  <Marker longitude={endCoord[0]} latitude={endCoord[1]} anchor="center">
                    <span className="block w-3 h-3 rounded-full bg-red-400 border-2 border-white shadow" title="Slutt" />
                  </Marker>
                )}
              </Map>

              <a
                href={mapLink}
                className="absolute bottom-2 right-2 rounded-lg bg-black/70 text-white text-xs px-3 py-1.5 hover:bg-black/90 transition-colors"
              >
                Åpne i kart →
              </a>
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">Ingen GPS-data tilgjengelig for denne sesjonen.</p>
          )}

          <p className="text-xs text-gray-600">
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
