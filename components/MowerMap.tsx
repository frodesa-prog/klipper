"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  Marker,
  Source,
  Layer,
  NavigationControl,
  type MapRef,
  type ViewStateChangeEvent,
  type MapMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Polygon } from "geojson";
import { BASE_PATH } from "@/lib/basePath";

const ACTIVITY_COLOR: Record<string, string> = {
  MOWING: "#22c55e",
  GOING_HOME: "#fb923c",
  CHARGING: "#3b82f6",
  PARKED_IN_CS: "#93c5fd",
  STOPPED_IN_GARDEN: "#facc15",
  NOT_APPLICABLE: "#9ca3af",
};

interface MowerPosition {
  mowerId: string;
  mowerName: string | null;
  activity: string;
  batteryPercent: number | null;
  latitude: number | null;
  longitude: number | null;
  polledAt: string | null;
}

interface Zone {
  id: string;
  name: string;
  type: "mowing_area" | "exclusion";
  coordinates: [number, number][][];
}

interface Props {
  mapTilerKey: string;
  initialLng: number;
  initialLat: number;
  initialZoom: number;
}

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };
type DrawStep = "idle" | "drawing" | "naming";

export default function MowerMap({ mapTilerKey, initialLng, initialLat, initialZoom }: Props) {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);

  const [positions, setPositions] = useState<MowerPosition[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [heatmapData, setHeatmapData] = useState<FeatureCollection>(EMPTY_FC);
  const [trackData, setTrackData] = useState<FeatureCollection>(EMPTY_FC);

  // Zone state
  const [zones, setZones] = useState<Zone[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [drawStep, setDrawStep] = useState<DrawStep>("idle");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [pendingType, setPendingType] = useState<"mowing_area" | "exclusion">("mowing_area");
  const [pendingName, setPendingName] = useState("");
  const [saving, setSaving] = useState(false);

  // Vertex editing state
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [editingCoords, setEditingCoords] = useState<[number, number][]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const fetchZones = useCallback(async () => {
    const res = await fetch(`${BASE_PATH}/api/zones`);
    const data: Zone[] = await res.json();
    setZones(data);
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const fetchPosition = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/mower-position`);
      setPositions(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchPosition();
    const id = setInterval(fetchPosition, 30_000);
    return () => clearInterval(id);
  }, [fetchPosition]);

  useEffect(() => {
    if (!showHeatmap) return;
    fetch(`${BASE_PATH}/api/positions?type=heatmap`).then((r) => r.json()).then(setHeatmapData).catch(() => {});
  }, [showHeatmap]);

  useEffect(() => {
    if (!showTrack) return;
    fetch(`${BASE_PATH}/api/positions?type=track`).then((r) => r.json()).then(setTrackData).catch(() => {});
  }, [showTrack]);

  const onMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      const { longitude, latitude, zoom } = e.viewState;
      const params = new URLSearchParams({
        lng: longitude.toFixed(6),
        lat: latitude.toFixed(6),
        zoom: zoom.toFixed(2),
      });
      router.replace(`/map?${params}`, { scroll: false });
    },
    [router]
  );

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      // Drawing mode: add vertex
      if (drawStep === "drawing") {
        const { lng, lat } = e.lngLat;
        setDrawPoints((prev) => [...prev, [lng, lat]]);
        return;
      }
      // Edit mode idle: click on zone fill to select for vertex editing
      if (editMode && drawStep === "idle" && !selectedZoneId) {
        const features = (e as unknown as { features?: { id: string }[] }).features;
        if (features && features.length > 0) {
          const clickedId = features[0].id;
          const zone = zones.find((z) => z.id === clickedId);
          if (zone) {
            setSelectedZoneId(zone.id);
            // Strip closing point from outer ring
            const ring = zone.coordinates[0] ?? [];
            setEditingCoords(ring.slice(0, -1) as [number, number][]);
          }
        }
      }
    },
    [drawStep, editMode, selectedZoneId, zones]
  );

  // Vertex drag handler
  const onVertexDrag = useCallback((idx: number, lng: number, lat: number) => {
    setEditingCoords((prev) =>
      prev.map((pt, i) => (i === idx ? [lng, lat] : pt))
    );
  }, []);

  async function saveVertexEdit() {
    if (!selectedZoneId || editingCoords.length < 3) return;
    setEditSaving(true);
    const coordinates = [[...editingCoords, editingCoords[0]]];
    await fetch(`${BASE_PATH}/api/zones/${selectedZoneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates }),
    });
    setEditSaving(false);
    setSelectedZoneId(null);
    setEditingCoords([]);
    fetchZones();
  }

  function cancelVertexEdit() {
    setSelectedZoneId(null);
    setEditingCoords([]);
  }

  function selectZoneForEdit(zone: Zone) {
    setSelectedZoneId(zone.id);
    const ring = zone.coordinates[0] ?? [];
    setEditingCoords(ring.slice(0, -1) as [number, number][]);
  }

  function startDrawing() {
    setDrawPoints([]);
    setDrawStep("drawing");
  }

  function undoLastPoint() {
    setDrawPoints((prev) => prev.slice(0, -1));
  }

  function finishDrawing() {
    if (drawPoints.length < 3) return;
    setPendingName("");
    setDrawStep("naming");
  }

  function cancelDraw() {
    setDrawPoints([]);
    setDrawStep("idle");
  }

  async function saveZone() {
    if (!pendingName.trim() || drawPoints.length < 3) return;
    setSaving(true);
    const coordinates = [[...drawPoints, drawPoints[0]]];
    await fetch(`${BASE_PATH}/api/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pendingName.trim(), type: pendingType, coordinates }),
    });
    setSaving(false);
    setDrawPoints([]);
    setDrawStep("idle");
    fetchZones();
  }

  async function deleteZone(id: string) {
    if (!confirm("Slett denne sonen?")) return;
    await fetch(`${BASE_PATH}/api/zones/${id}`, { method: "DELETE" });
    if (selectedZoneId === id) cancelVertexEdit();
    fetchZones();
  }

  function exitEditMode() {
    setEditMode(false);
    setDrawStep("idle");
    setDrawPoints([]);
    cancelVertexEdit();
  }

  // GeoJSON for saved zones (hide selected zone — shown via editingCoords instead)
  const zonesGeoJSON: FeatureCollection = {
    type: "FeatureCollection",
    features: zones
      .filter((z) => z.id !== selectedZoneId)
      .map((z) => ({
        type: "Feature",
        id: z.id,
        properties: { type: z.type, name: z.name },
        geometry: { type: "Polygon", coordinates: z.coordinates } as Polygon,
      })) as Feature[],
  };

  // Live preview of the zone being vertex-edited
  const editPreviewGeoJSON: FeatureCollection =
    editingCoords.length >= 3
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [[...editingCoords, editingCoords[0]]],
              },
            },
          ],
        }
      : EMPTY_FC;

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  // In-progress draw preview
  const previewLine: FeatureCollection =
    drawPoints.length >= 2
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: drawStep === "drawing" ? drawPoints : [...drawPoints, drawPoints[0]] },
            },
          ],
        }
      : EMPTY_FC;

  const previewFill: FeatureCollection =
    drawPoints.length >= 3
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [[...drawPoints, drawPoints[0]]] },
            },
          ],
        }
      : EMPTY_FC;

  const mapStyle = `https://api.maptiler.com/maps/satellite/style.json?key=${mapTilerKey}`;
  const cursor = drawStep === "drawing" ? "crosshair" : "grab";
  const interactiveLayers =
    editMode && drawStep === "idle" && !selectedZoneId
      ? ["zones-fill-exclusion", "zones-fill-mowing"]
      : [];

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: initialLng, latitude: initialLat, zoom: initialZoom }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        cursor={cursor}
        onMoveEnd={onMoveEnd}
        onClick={onMapClick}
        doubleClickZoom={drawStep !== "drawing"}
        interactiveLayerIds={interactiveLayers}
      >
        <NavigationControl position="bottom-left" />

        {/* Saved zones */}
        <Source id="zones" type="geojson" data={zonesGeoJSON}>
          <Layer id="zones-fill-exclusion" type="fill" filter={["==", ["get", "type"], "exclusion"]} paint={{ "fill-color": "#ef4444", "fill-opacity": 0.25 }} />
          <Layer id="zones-fill-mowing" type="fill" filter={["==", ["get", "type"], "mowing_area"]} paint={{ "fill-color": "#22c55e", "fill-opacity": 0.1 }} />
          <Layer id="zones-outline-exclusion" type="line" filter={["==", ["get", "type"], "exclusion"]} paint={{ "line-color": "#ef4444", "line-width": 2, "line-opacity": 0.8 }} />
          <Layer id="zones-outline-mowing" type="line" filter={["==", ["get", "type"], "mowing_area"]} paint={{ "line-color": "#22c55e", "line-width": 2, "line-dasharray": [4, 3], "line-opacity": 0.9 }} />
        </Source>

        {/* Vertex edit preview */}
        {selectedZoneId && editingCoords.length >= 3 && (
          <Source id="edit-preview" type="geojson" data={editPreviewGeoJSON}>
            <Layer
              id="edit-preview-fill"
              type="fill"
              paint={{
                "fill-color": selectedZone?.type === "exclusion" ? "#ef4444" : "#22c55e",
                "fill-opacity": 0.2,
              }}
            />
            <Layer
              id="edit-preview-outline"
              type="line"
              paint={{
                "line-color": selectedZone?.type === "exclusion" ? "#ef4444" : "#22c55e",
                "line-width": 2,
                "line-dasharray": [4, 3],
              }}
            />
          </Source>
        )}

        {/* Draggable vertex markers for selected zone */}
        {selectedZoneId &&
          editingCoords.map(([lng, lat], i) => (
            <Marker
              key={`vertex-${i}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              draggable
              onDragEnd={(e) => onVertexDrag(i, e.lngLat.lng, e.lngLat.lat)}
            >
              <span className="block w-4 h-4 rounded-full bg-yellow-400 border-2 border-gray-900 shadow-lg cursor-grab active:cursor-grabbing" />
            </Marker>
          ))}

        {/* Draw preview */}
        {drawPoints.length >= 2 && (
          <Source id="preview-line" type="geojson" data={previewLine}>
            <Layer id="preview-line-layer" type="line" paint={{ "line-color": "#ffffff", "line-width": 2, "line-dasharray": [3, 2] }} />
          </Source>
        )}
        {drawPoints.length >= 3 && (
          <Source id="preview-fill" type="geojson" data={previewFill}>
            <Layer id="preview-fill-layer" type="fill" paint={{ "fill-color": "#ffffff", "fill-opacity": 0.1 }} />
          </Source>
        )}

        {/* Draw vertex markers */}
        {drawStep === "drawing" &&
          drawPoints.map(([lng, lat], i) => (
            <Marker key={i} longitude={lng} latitude={lat} anchor="center">
              <span className="block w-3 h-3 rounded-full bg-white border-2 border-gray-800 shadow" />
            </Marker>
          ))}

        {/* Live mower markers */}
        {positions.map((p) => {
          if (p.latitude == null || p.longitude == null) return null;
          const color = ACTIVITY_COLOR[p.activity] ?? "#9ca3af";
          return (
            <Marker key={p.mowerId} longitude={p.longitude} latitude={p.latitude} anchor="center">
              <div className="relative flex items-center justify-center">
                {p.activity === "MOWING" && (
                  <span className="absolute inline-flex h-8 w-8 rounded-full opacity-60 animate-ping" style={{ backgroundColor: color }} />
                )}
                <span
                  className="relative inline-flex h-5 w-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                  title={`${p.mowerName ?? p.mowerId} — ${p.activity} — ${p.batteryPercent ?? "?"}%`}
                />
              </div>
            </Marker>
          );
        })}

        {/* Heatmap */}
        {showHeatmap && (
          <Source id="heatmap" type="geojson" data={heatmapData}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                "heatmap-weight": 1,
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 14, 1, 20, 3],
                "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,255,0)", 0.2, "#00bcd4", 0.5, "#4caf50", 0.8, "#ffeb3b", 1, "#f44336"],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 14, 8, 20, 20],
                "heatmap-opacity": 0.7,
              }}
            />
          </Source>
        )}

        {/* Track */}
        {showTrack && trackData.features.length > 0 && (
          <Source id="track" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: trackData.features.map((f) => (f.geometry as GeoJSON.Point).coordinates) }, properties: {} }}>
            <Layer id="track-layer" type="line" paint={{ "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.8 }} layout={{ "line-cap": "round", "line-join": "round" }} />
          </Source>
        )}
      </Map>

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {!editMode ? (
          <>
            <ToggleButton active={showHeatmap} onClick={() => setShowHeatmap((v) => !v)} label="Heatmap 90d" />
            <ToggleButton active={showTrack} onClick={() => setShowTrack((v) => !v)} label="Spor i dag" />
            <ToggleButton active={false} onClick={() => setEditMode(true)} label="Rediger soner" />
          </>
        ) : (
          <button onClick={exitEditMode} className="rounded-lg bg-white text-gray-900 px-3 py-2 text-sm font-medium shadow">
            Ferdig redigering
          </button>
        )}
      </div>

      {/* Vertex edit toolbar */}
      {selectedZoneId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 bg-gray-900 border border-gray-700 backdrop-blur rounded-xl px-4 py-3 items-center shadow-xl">
          <span className="text-white text-sm">Dra punktene for å justere sonen</span>
          <button
            onClick={saveVertexEdit}
            disabled={editSaving}
            className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-3 py-1.5 text-sm font-medium"
          >
            {editSaving ? "Lagrer…" : "Lagre"}
          </button>
          <button
            onClick={cancelVertexEdit}
            className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-sm"
          >
            Avbryt
          </button>
        </div>
      )}

      {/* Drawing toolbar */}
      {editMode && drawStep === "idle" && !selectedZoneId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 backdrop-blur rounded-xl px-4 py-3 items-center">
          <select
            value={pendingType}
            onChange={(e) => setPendingType(e.target.value as "mowing_area" | "exclusion")}
            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100"
          >
            <option value="mowing_area">Klippeområde</option>
            <option value="exclusion">Ekskludering (hus, bed…)</option>
          </select>
          <button onClick={startDrawing} className="rounded-lg bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-sm font-medium">
            Tegn polygon
          </button>
        </div>
      )}

      {/* Active drawing controls */}
      {drawStep === "drawing" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 backdrop-blur rounded-xl px-4 py-3 items-center">
          <span className="text-white text-sm">
            {drawPoints.length === 0 ? "Klikk på kartet for å legge til punkter" : `${drawPoints.length} punkt${drawPoints.length !== 1 ? "er" : ""}`}
          </span>
          <button onClick={undoLastPoint} disabled={drawPoints.length === 0} className="rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-3 py-1.5 text-sm">Angre</button>
          <button onClick={finishDrawing} disabled={drawPoints.length < 3} className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-3 py-1.5 text-sm font-medium">Fullfør</button>
          <button onClick={cancelDraw} className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-sm">Avbryt</button>
        </div>
      )}

      {/* Name zone form */}
      {drawStep === "naming" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 flex gap-3 items-center shadow-xl">
          <input
            autoFocus
            type="text"
            placeholder="Navn på sone (f.eks. Huset)"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveZone()}
            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100 w-56"
          />
          <button onClick={saveZone} disabled={saving || !pendingName.trim()} className="rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-3 py-1.5 text-sm font-medium">
            {saving ? "Lagrer…" : "Lagre"}
          </button>
          <button onClick={cancelDraw} className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-sm">Avbryt</button>
        </div>
      )}

      {/* Zone list */}
      {editMode && zones.length > 0 && drawStep === "idle" && !selectedZoneId && (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur rounded-xl px-4 py-3 space-y-2 max-w-xs">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Soner</p>
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: z.type === "exclusion" ? "#ef4444" : "#22c55e" }} />
                <span className="text-sm text-white">{z.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => selectZoneForEdit(z)} className="text-xs text-gray-400 hover:text-yellow-400 transition-colors">Rediger</button>
                <button onClick={() => deleteZone(z.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Slett</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live status badge */}
      {positions.map((p) => (
        <div key={p.mowerId} className="absolute bottom-4 right-4 rounded-xl bg-black/70 backdrop-blur px-4 py-3 text-sm text-white space-y-1">
          <p className="font-semibold">{p.mowerName ?? p.mowerId}</p>
          <p className="text-gray-300 text-xs">{p.activity} · {p.batteryPercent ?? "?"}% batteri</p>
          {p.polledAt && <p className="text-gray-500 text-xs">{new Date(p.polledAt).toLocaleTimeString("nb-NO")}</p>}
        </div>
      ))}
    </div>
  );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium shadow transition-colors ${active ? "bg-white text-gray-900" : "bg-black/60 text-white backdrop-blur hover:bg-black/80"}`}
    >
      {label}
    </button>
  );
}
