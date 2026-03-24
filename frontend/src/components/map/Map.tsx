"use client";

import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { mapboxGlDrawTheme } from "./draw-theme";
import { PlatformLanguage, ui } from "@/lib/i18n";
import { lineString, length as turfLength, midpoint as turfMidpoint } from "@turf/turf";

type BaseMapMode = "simple" | "satellite";

interface MapProps {
  onGeometrySelected?: (geom: any) => void;
  drawModeActive?: boolean;
  language: PlatformLanguage;
  showMeasurements: boolean;
}

export interface MapRef {
  refreshPlots: () => void;
  focusCurrentLocation: () => void;
}

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const Map = forwardRef<MapRef, MapProps>(
  ({ onGeometrySelected, drawModeActive, language, showMeasurements }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const onGeometrySelectedRef = useRef(onGeometrySelected);
    const languageRef = useRef<PlatformLanguage>(language);
    const [baseMapMode, setBaseMapMode] = useState<BaseMapMode>("simple");
    const [isLayersOpen, setIsLayersOpen] = useState(false);
    const t = ui[language];

    useEffect(() => {
      onGeometrySelectedRef.current = onGeometrySelected;
    }, [onGeometrySelected]);

    useEffect(() => {
      languageRef.current = language;
    }, [language]);

    const shouldKeepSymbolLayer = (layer: maplibregl.LayerSpecification) => {
      const layerId = layer.id.toLowerCase();
      const sourceLayer = String((layer as { ["source-layer"]?: string })["source-layer"] ?? "").toLowerCase();
      const layerKey = `${sourceLayer} ${layerId}`;

      const isRoadShield =
        /(shield|route-number|road-number|highway-shield|motorway-shield|road_ref|ref_label|network)/i.test(
          layerKey,
        );

      if (isRoadShield) {
        return false;
      }

      const isImportantLabel =
        /(road|street|highway|motorway|trunk|primary|secondary|tertiary|transportation_name|road_label|street_label|place|settlement|city|town|village|hamlet|suburb|neighbourhood|neighborhood|district|admin|boundary|country|state|region|province)/i.test(
          layerKey,
        );

      const isNoisyLabel =
        /(poi|parking|park_?ing|building|house|address|housenumber|transit|bus|tram|subway|metro|station|platform|stop|rail|aeroway|airport|hospital|school|shop|retail|restaurant|fuel|hotel|museum|attraction|landmark|commercial|amenity)/i.test(
          layerKey,
        );

      if (isNoisyLabel && !isImportantLabel) {
        return false;
      }

      return isImportantLabel;
    };

    const isTranslatableLabelLayer = (layer: maplibregl.LayerSpecification) => {
      const layerId = layer.id.toLowerCase();
      const sourceLayer = String((layer as { ["source-layer"]?: string })["source-layer"] ?? "").toLowerCase();
      const layerKey = `${sourceLayer} ${layerId}`;

      return /(place|settlement|city|town|village|hamlet|suburb|neighbourhood|neighborhood|district|road|street|highway|motorway|trunk|primary|secondary|tertiary|transportation_name|road_label|street_label|admin|boundary|country|state|region|province)/i.test(
        layerKey,
      );
    };

    const formatDistance = (kilometers: number) => {
      if (kilometers >= 1) {
        return `${kilometers.toFixed(2)} км`;
      }

      return `${Math.round(kilometers * 1000)} м`;
    };

    const updateMeasurementLabels = () => {
      const map = mapRef.current;
      const draw = drawRef.current;

      if (!map || !draw) return;

      const source = map.getSource("measurement-labels") as
        | maplibregl.GeoJSONSource
        | undefined;

      if (!source) return;

      const data = draw.getAll();
      const feature = data.features[data.features.length - 1];
      const labels: GeoJSON.Feature<GeoJSON.Point>[] = [];

      if (
        feature?.geometry?.type === "Polygon" &&
        Array.isArray(feature.geometry.coordinates?.[0])
      ) {
        const ring = feature.geometry.coordinates[0];

        for (let index = 0; index < ring.length - 1; index += 1) {
          const start = ring[index];
          const end = ring[index + 1];

          if (!Array.isArray(start) || !Array.isArray(end)) continue;

          const segment = lineString([start, end]);
          const mid = turfMidpoint(start, end);
          const kilometers = turfLength(segment, { units: "kilometers" });

          labels.push({
            type: "Feature",
            geometry: mid.geometry,
            properties: {
              label: formatDistance(kilometers),
            },
          });
        }
      }

      source.setData({
        type: "FeatureCollection",
        features: labels,
      });
    };

    const applyMeasurementVisibility = () => {
      const map = mapRef.current;

      if (!map || !map.isStyleLoaded()) return;
      if (!map.getLayer("measurement-labels-layer")) return;

      map.setLayoutProperty(
        "measurement-labels-layer",
        "visibility",
        showMeasurements ? "visible" : "none",
      );
    };

    const applyBaseMapMode = (mode: BaseMapMode) => {
      const map = mapRef.current;

      if (!map || !map.isStyleLoaded()) return;

      const style = map.getStyle();
      const layers = style.layers ?? [];

      for (const layer of layers) {
        if (layer.id === "satellite-tiles") {
          map.setLayoutProperty(
            layer.id,
            "visibility",
            mode === "satellite" ? "visible" : "none",
          );
          continue;
        }

        if (layer.id === "farm-plots-layer") {
          continue;
        }

        if (layer.id.startsWith("gl-draw-")) {
          continue;
        }

        if (layer.id === "measurement-labels-layer") {
          continue;
        }

        if (layer.type === "symbol") {
          const keepSymbolLayer = shouldKeepSymbolLayer(layer);

          map.setLayoutProperty(
            layer.id,
            "visibility",
            keepSymbolLayer ? "visible" : "none",
          );

          if (keepSymbolLayer) {
            try {
              map.setLayoutProperty(layer.id, "text-allow-overlap", true as any);
              map.setLayoutProperty(layer.id, "text-ignore-placement", true as any);
            } catch {}
          }

          continue;
        }

        if (mode === "simple") {
          map.setLayoutProperty(layer.id, "visibility", "visible");
          continue;
        }

        const layerType = layer.type;
        const isRoadLayer =
          layerType === "line" &&
          /(road|street|path|bridge|transport|motorway|highway)/i.test(
            layer.id,
          );
        const isBoundaryLayer =
          layerType === "line" &&
          /(boundary|admin|border)/i.test(layer.id);
        const keepVisible = isRoadLayer || isBoundaryLayer;

        map.setLayoutProperty(
          layer.id,
          "visibility",
          keepVisible ? "visible" : "none",
        );
      }
    };

    const applyMapLanguage = (selectedLanguage: PlatformLanguage) => {
      const map = mapRef.current;

      if (!map || !map.isStyleLoaded()) return;

      const layers = map.getStyle().layers ?? [];
      const languageField =
        selectedLanguage === "ru"
          ? [
              "coalesce",
              ["get", "name:ru"],
              ["get", "name_ru"],
              ["get", "name"],
              "",
            ]
          : selectedLanguage === "kk"
            ? [
                "coalesce",
                ["get", "name:kk"],
                ["get", "name_kk"],
                ["get", "name:kz"],
                ["get", "name_kk"],
                ["get", "name"],
                "",
              ]
            : [
                "coalesce",
                ["get", "name:en"],
                ["get", "name_en"],
                ["get", "name_int"],
                ["get", "name:latin"],
                ["get", "int_name"],
                ["get", "official_name:en"],
                "",
              ];

      for (const layer of layers) {
        if (layer.type !== "symbol") continue;
        if (!isTranslatableLabelLayer(layer)) continue;

        try {
          const currentField = map.getLayoutProperty(layer.id, "text-field");
          if (currentField !== undefined) {
            map.setLayoutProperty(layer.id, "text-field", languageField as any);
          }
        } catch {}
      }
    };

    const fetchPlots = async (map: maplibregl.Map) => {
      try {
        const response = await fetch("http://localhost:3000/farm-plots");

        if (!response.ok) return;

        const json = await response.json();

        if (!json.success) return;

        const features = json.data
          .map((plot: any) => {
            const geometry =
              typeof plot.geometry === "string"
                ? JSON.parse(plot.geometry)
                : plot.geometry;

            if (!geometry) return null;

            return {
              type: "Feature",
              properties: {
                id: plot.id,
                cropType: plot.cropType,
                title: plot.title,
              },
              geometry,
            };
          })
          .filter(Boolean);

        const source = map.getSource("farm-plots") as
          | maplibregl.GeoJSONSource
          | undefined;

        if (source) {
          source.setData({
            type: "FeatureCollection",
            features: features as any[],
          });
          return;
        }

        map.addSource("farm-plots", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: features as any[],
          },
        });

        map.addLayer({
          id: "farm-plots-layer",
          type: "fill",
          source: "farm-plots",
          paint: {
            "fill-color": [
              "match",
              ["get", "cropType"],
              "Арбуз",
              "#2F6B3D",
              "Картофель",
              "#C6A85E",
              "Пшеница",
              "#A7B84B",
              "#888",
            ],
            "fill-opacity": 0.35,
            "fill-outline-color": "#244F2E",
          },
        });

        map.on("click", "farm-plots-layer", (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>${props.title}</strong><br/>${t.culture}: ${props.cropType}`,
            )
            .addTo(map);
        });
      } catch {
        console.warn("Farm plots are temporarily unavailable");
      }
    };

    const focusCurrentLocation = () => {
      const map = mapRef.current;

      if (!map) return;

      if (!navigator.geolocation) {
        alert(t.browseNoGeo);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          map.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 15,
            essential: true,
          });
        },
        () => {
          alert(t.noLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    };

    const handleZoomIn = () => {
      mapRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
      mapRef.current?.zoomOut();
    };

    useImperativeHandle(ref, () => ({
      refreshPlots: () => {
        if (mapRef.current) {
          fetchPlots(mapRef.current);
        }
      },
      focusCurrentLocation,
    }));

    useEffect(() => {
      if (!mapContainer.current) return;
      if (mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: OPENFREEMAP_STYLE,
        center: [76.8512, 43.222],
        zoom: 10,
      });

      mapRef.current = map;

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        styles: mapboxGlDrawTheme as any,
      });

      drawRef.current = draw;
      map.addControl(draw as any, "bottom-right");

      map.on("load", () => {
        if (!map.getSource("satellite")) {
          map.addSource("satellite", {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          });
        }

        const firstLayerId = map.getStyle().layers?.[0]?.id;
        if (!map.getLayer("satellite-tiles")) {
          map.addLayer(
            {
              id: "satellite-tiles",
              type: "raster",
              source: "satellite",
              minzoom: 0,
              maxzoom: 20,
              layout: {
                visibility: "none",
              },
              paint: {
                "raster-saturation": 0.1,
                "raster-contrast": 0.15,
              },
            },
            firstLayerId,
          );
        }

        if (!map.getSource("measurement-labels")) {
          map.addSource("measurement-labels", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          });
        }

        if (!map.getLayer("measurement-labels-layer")) {
          map.addLayer({
            id: "measurement-labels-layer",
            type: "symbol",
            source: "measurement-labels",
            layout: {
              "text-field": ["get", "label"],
              "text-size": 12,
              "text-offset": [0, -0.6],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              visibility: showMeasurements ? "visible" : "none",
            },
            paint: {
              "text-color": "#FFFFFF",
              "text-halo-color": "#17311F",
              "text-halo-width": 2,
            },
          });
        }

        applyMapLanguage(languageRef.current);
        applyBaseMapMode(baseMapMode);
        applyMeasurementVisibility();
        fetchPlots(map);
      });

      map.on("draw.create", () => {
        const data = draw.getAll();
        if (data.features.length > 0 && onGeometrySelectedRef.current) {
          updateMeasurementLabels();
          onGeometrySelectedRef.current(
            data.features[data.features.length - 1].geometry,
          );
          draw.deleteAll();
          updateMeasurementLabels();
        }
      });

      map.on("draw.update", () => {
        const data = draw.getAll();
        updateMeasurementLabels();
        if (data.features.length > 0 && onGeometrySelectedRef.current) {
          onGeometrySelectedRef.current(
            data.features[data.features.length - 1].geometry,
          );
        }
      });

      map.on("draw.render", () => {
        updateMeasurementLabels();
      });

      map.on("draw.delete", () => {
        updateMeasurementLabels();
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      applyBaseMapMode(baseMapMode);
    }, [baseMapMode]);

    useEffect(() => {
      applyMapLanguage(language);
    }, [language]);

    useEffect(() => {
      applyMeasurementVisibility();
    }, [showMeasurements]);

    useEffect(() => {
      const canvas = mapRef.current?.getCanvas();
      if (canvas) {
        canvas.style.cursor = drawModeActive ? "crosshair" : "";
      }

      if (drawRef.current && drawModeActive) {
        drawRef.current.changeMode("draw_polygon");
      } else {
        updateMeasurementLabels();
      }
    }, [drawModeActive]);

    return (
      <div className="relative h-full w-full">
        <div ref={mapContainer} className="h-full w-full" />

        <div className="absolute bottom-32 left-6 z-20">
          <button
            type="button"
            onClick={() => setIsLayersOpen((open) => !open)}
            className="flex w-32 flex-col overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-md"
            aria-label={t.layers}
          >
            <div
              className={`h-20 w-full ${
                baseMapMode === "satellite"
                  ? "bg-[radial-gradient(circle_at_30%_30%,#56714b,transparent_35%),linear-gradient(135deg,#1d2a1d_0%,#415d3b_25%,#8a7b5c_55%,#2d3629_100%)]"
                  : "bg-[linear-gradient(135deg,#d7ead6_0%,#eef5e8_42%,#bcd7b8_42%,#dcead8_100%)]"
              }`}
            />
            <div className="px-4 py-3 text-left">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B3D]/45">
                {t.layers}
              </div>
              <div className="mt-2 text-[0.92rem] leading-tight font-black text-[#2F6B3D] break-words">
                {baseMapMode === "simple" ? t.simple : t.satellite}
              </div>
            </div>
          </button>

          {isLayersOpen && (
            <div className="mt-3 flex w-48 flex-col gap-2 rounded-[1.5rem] bg-white/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setBaseMapMode("simple");
                  setIsLayersOpen(false);
                }}
                className={`rounded-[1.1rem] px-4 py-3 text-left text-sm font-black transition-colors ${
                  baseMapMode === "simple"
                    ? "bg-[#2F6B3D] text-white"
                    : "bg-[#F5F9F4] text-[#2F6B3D] hover:bg-[#E6F0E2]"
                }`}
              >
                {t.simpleMap}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBaseMapMode("satellite");
                  setIsLayersOpen(false);
                }}
                className={`rounded-[1.1rem] px-4 py-3 text-left text-sm font-black transition-colors ${
                  baseMapMode === "satellite"
                    ? "bg-[#2F6B3D] text-white"
                    : "bg-[#F5F9F4] text-[#2F6B3D] hover:bg-[#E6F0E2]"
                }`}
              >
                {t.satelliteMap}
              </button>
            </div>
          )}
        </div>

        <div className="absolute right-6 top-24 z-20 overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10"
            aria-label="Zoom in"
          >
            +
          </button>

          <div className="mx-3 h-px bg-black/10" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10"
            aria-label="Zoom out"
          >
            -
          </button>
        </div>
      </div>
    );
  },
);

Map.displayName = "Map";

export default Map;
