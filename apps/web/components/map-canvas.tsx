"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawSessionUndoRedo,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { FeatureCollection, Polygon, Position } from "geojson";
import {
  LocateFixed,
  Maximize,
  Layers,
  PenTool,
  MousePointer2,
  Undo2,
  Trash2,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Field, Geometry } from "@/lib/types";
import { Button } from "./ui";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = {
  fields: Field[];
  selected?: string;
  onSelect?: (id: string) => void;
  onPoint?: (lat: number, lon: number) => void;
  editing?: boolean;
  initialGeometry?: Geometry | null;
  onGeometry?: (g: Geometry | null) => void;
  compact?: boolean;
};
export default function MapCanvas({
  fields,
  selected,
  onSelect,
  onPoint,
  editing = false,
  initialGeometry,
  onGeometry,
  compact = false,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    draw = useRef<TerraDraw | null>(null),
    callbacks = useRef({ onSelect, onPoint, onGeometry, editing });
  const [ready, setReady] = useState(false),
    [mode, setMode] = useState("view"),
    [showAdmin, setShowAdmin] = useState(false),
    [showFields, setShowFields] = useState(true),
    [layersOpen, setLayersOpen] = useState(false),
    [search, setSearch] = useState(""),
    [results, setResults] = useState<
      { name: string; lat: number; lon: number }[]
    >([]),
    [error, setError] = useState(""),
    [coords, setCoords] = useState(""),
    [tileError, setTileError] = useState(false);
  useEffect(() => {
    callbacks.current = { onSelect, onPoint, onGeometry, editing };
  }, [onSelect, onPoint, onGeometry, editing]);
  const fit = useCallback(() => {
    if (!map.current || !fields.length) return;
    const chosen = fields.find((f) => f.id === selected);
    const target = chosen ? [chosen] : fields;
    const b = new maplibregl.LngLatBounds();
    target.forEach((f) => {
      const polygons =
        f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates;
      polygons.forEach((p) =>
        p[0].forEach((c) => b.extend(c as [number, number])),
      );
    });
    map.current.fitBounds(b, {
      padding: compact ? 35 : 80,
      maxZoom: 14,
      duration: 600,
    });
  }, [fields, selected, compact]);
  useEffect(() => {
    if (!container.current) return;
    maplibregl.setWorkerUrl("/vendor/maplibre-gl/maplibre-gl-worker.mjs");
    const m = new maplibregl.Map({
      container: container.current,
      center: [68.5, 49.2],
      zoom: 4.3,
      maxZoom: 18,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e8ecdf" },
          },
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: { "raster-saturation": -0.7, "raster-opacity": 0.82 },
          },
        ],
      },
    });
    map.current = m;
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    m.once("style.load", () => {
      m.addSource("fields", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "selected"], true],
            "#cc8b40",
            "#4d8060",
          ],
          "fill-opacity": 0.28,
        },
      });
      m.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "selected"], true],
            "#a56721",
            "#28543e",
          ],
          "line-width": 2.5,
        },
      });
      m.addSource("admin", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "admin-line",
        type: "line",
        source: "admin",
        paint: {
          "line-color": "#7b6c9c",
          "line-width": 1.5,
          "line-dasharray": [4, 2],
        },
      });
      const d = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
        undoRedo: { sessionLevel: new TerraDrawSessionUndoRedo() },
        modes: [
          new TerraDrawPolygonMode({
            pointerDistance: 25,
            styles: {
              fillColor: "#b28a43",
              outlineColor: "#87621d",
              closingPointWidth: 10,
            },
          }),
          new TerraDrawSelectMode({
            pointerDistance: 28,
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: {
                    draggable: true,
                    midpoints: true,
                    deletable: true,
                  },
                },
              },
            },
            styles: { selectionPointWidth: 9, midPointWidth: 7 },
          }),
        ],
      });
      d.start();
      d.setMode("static");
      draw.current = d;
      const sync = () => {
        const polygons = d
          .getSnapshot()
          .filter((f) => f.geometry.type === "Polygon");
        const g =
          polygons.length > 1
            ? {
                type: "MultiPolygon" as const,
                coordinates: polygons.map(
                  (f) => (f.geometry as Polygon).coordinates,
                ),
              }
            : (polygons[0]?.geometry as Geometry | undefined);
        callbacks.current.onGeometry?.(g || null);
      };
      d.on("change", sync);
      d.on("finish", () => {
        d.setMode("select");
        setMode("select");
        sync();
      });
      setReady(true);
    });
    m.on("click", (e) => {
      setCoords(`${e.lngLat.lat.toFixed(5)}° N, ${e.lngLat.lng.toFixed(5)}° E`);
      if (callbacks.current.editing) return;
      const fs = m.getLayer("fields-fill")
        ? m.queryRenderedFeatures(e.point, { layers: ["fields-fill"] })
        : [];
      if (fs.length) callbacks.current.onSelect?.(String(fs[0].properties.id));
      else callbacks.current.onPoint?.(e.lngLat.lat, e.lngLat.lng);
    });
    m.on("error", (e) => {
      if (e.error?.message) setTileError(true);
    });
    return () => {
      draw.current?.stop();
      draw.current = null;
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("fields") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: fields.map((f) => ({
        type: "Feature",
        properties: { id: f.id, name: f.name, selected: f.id === selected },
        geometry: f.geometry,
      })),
    });
    fit();
  }, [ready, fields, selected, fit]);
  useEffect(() => {
    if (!ready || !draw.current) return;
    const d = draw.current;
    d.clear();
    if (editing) {
      if (initialGeometry) {
        const polys =
          initialGeometry.type === "Polygon"
            ? [initialGeometry.coordinates]
            : initialGeometry.coordinates;
        d.addFeatures(
          polys.map((coordinates) => ({
            id: crypto.randomUUID(),
            type: "Feature",
            properties: { mode: "polygon" },
            geometry: {
              type: "Polygon",
              coordinates: coordinates as Position[][],
            },
          })),
        );
        d.setMode("select");
        setMode("select");
      } else {
        d.setMode("polygon");
        setMode("polygon");
      }
    } else {
      d.setMode("static");
      setMode("view");
    }
  }, [ready, editing, initialGeometry]);
  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setLayoutProperty(
      "fields-fill",
      "visibility",
      showFields ? "visible" : "none",
    );
    map.current.setLayoutProperty(
      "fields-line",
      "visibility",
      showFields ? "visible" : "none",
    );
  }, [ready, showFields]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    let gone = false;
    async function load() {
      if (!m) return;
      if (!showAdmin) {
        (m.getSource("admin") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
        return;
      }
      const b = m.getBounds();
      try {
        const fc = await api<FeatureCollection>(
          `/admin/boundaries?level=${m.getZoom() > 7 ? 2 : 1}&west=${b.getWest()}&east=${b.getEast()}&south=${b.getSouth()}&north=${b.getNorth()}`,
        );
        if (!gone) (m.getSource("admin") as GeoJSONSource)?.setData(fc);
      } catch {
        if (!gone) setError("Границы временно недоступны");
      }
    }
    void load();
    m.on("moveend", load);
    return () => {
      gone = true;
      m.off("moveend", load);
    };
  }, [ready, showAdmin]);
  async function find(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{
        results?: { name: string; lat: number; lon: number }[];
        message?: string;
      }>("/geocode?q=" + encodeURIComponent(search));
      setResults(data.results || []);
      if (!data.results?.length) setError(data.message || "Ничего не найдено");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function locate() {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        map.current?.flyTo({
          center: [p.coords.longitude, p.coords.latitude],
          zoom: 13,
        }),
      () => setError("Геолокация недоступна или не разрешена"),
      { timeout: 8000 },
    );
  }
  return (
    <div className={`map-wrap ${compact ? "compact" : ""}`}>
      <div ref={container} className="map-canvas" data-testid="map-canvas" />
      {!compact && (
        <>
          <form className="map-search" onSubmit={find}>
            <Search size={18} />
            <input
              aria-label="Поиск места"
              placeholder="Область, район или населённый пункт"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              minLength={3}
            />
            <button aria-label="Найти место" type="submit">
              Найти
            </button>
            {results.length > 0 && (
              <div className="map-results">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      map.current?.flyTo({ center: [r.lon, r.lat], zoom: 11 });
                      setResults([]);
                    }}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="map-actions">
            <button
              title="Показать все поля"
              aria-label="Показать все поля"
              onClick={fit}
            >
              <Maximize size={18} />
            </button>
            <button
              title="Моё местоположение"
              aria-label="Моё местоположение"
              onClick={locate}
            >
              <LocateFixed size={18} />
            </button>
            <button
              title="Слои карты"
              aria-label="Слои карты"
              onClick={() => setLayersOpen(!layersOpen)}
            >
              <Layers size={18} />
            </button>
            {layersOpen && (
              <div className="map-layer-panel">
                <label>
                  <input
                    type="checkbox"
                    checked={showFields}
                    onChange={(e) => setShowFields(e.target.checked)}
                  />{" "}
                  Мои поля
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showAdmin}
                    onChange={(e) => setShowAdmin(e.target.checked)}
                  />{" "}
                  Границы HDX 2023
                </label>
              </div>
            )}
          </div>
          {editing && (
            <div className="drawing-bar">
              <Button
                variant={mode === "polygon" ? "primary" : "secondary"}
                onClick={() => {
                  draw.current?.setMode("polygon");
                  setMode("polygon");
                }}
              >
                <PenTool size={17} /> Рисовать
              </Button>
              <Button
                variant={mode === "select" ? "primary" : "secondary"}
                onClick={() => {
                  draw.current?.setMode("select");
                  setMode("select");
                }}
              >
                <MousePointer2 size={17} /> Вершины
              </Button>
              <Button
                variant="secondary"
                title="Отменить действие"
                aria-label="Отменить действие"
                onClick={() => draw.current?.undo()}
              >
                <Undo2 size={17} />
              </Button>
              <Button
                variant="secondary"
                title="Очистить контур"
                aria-label="Очистить контур"
                onClick={() => draw.current?.clear()}
              >
                <Trash2 size={17} />
              </Button>
            </div>
          )}
          <div className="map-coordinates">
            {coords || "Щёлкните на карту — узнайте, что здесь"}
            {tileError && (
              <span> · Подложка может загружаться с задержкой</span>
            )}
          </div>
          {error && (
            <button className="map-error" onClick={() => setError("")}>
              {error} ×
            </button>
          )}
        </>
      )}
      {!ready && <div className="map-loading">Загрузка карты…</div>}
    </div>
  );
}
