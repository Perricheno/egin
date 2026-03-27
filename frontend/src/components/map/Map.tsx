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
import * as turf from "@turf/turf";
import { lineString, length as turfLength, midpoint as turfMidpoint } from "@turf/turf";
// @ts-ignore
import { SnapPolygonMode, SnapLineMode, SnapPointMode, SnapDirectSelect } from "mapbox-gl-draw-snap-mode";
import { KZ_BOUNDS, KZ_CENTER, KZ_ZOOM } from "@/lib/kz-regions";
import { applyAutoTool, AutoToolType } from "@/lib/turf-tools";

type BaseMapMode = "simple" | "satellite";

interface MapProps {
  onGeometrySelected?: (geom: any) => void;
  drawModeActive?: boolean;
  rulerModeActive?: boolean;
  language: PlatformLanguage;
  showMeasurements: boolean;
  onPlotClick?: (plot: any) => void;
  onModeChange?: (mode: string) => void;
  onMeasurement?: (val: string | null) => void;
  massWandActive?: boolean;
  onProcessingStateChange?: (processing: boolean) => void;
  onNotification?: (msg: string, type: 'error' | 'success' | 'warning') => void;
}

export interface MapRef {
  refreshPlots: () => void;
  focusCurrentLocation: () => void;
  flyToRegion: (center: [number, number], zoom: number) => void;
  changeDrawMode: (mode: string) => void;
  deleteSelectedDraw: () => void;
  getSelectedGeometry: () => any;
  executeAutoTool: (tool: AutoToolType) => void;
}

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const Map = forwardRef<MapRef, MapProps>(
  ({ onGeometrySelected, drawModeActive, rulerModeActive, language, showMeasurements, onPlotClick, onModeChange, onMeasurement, massWandActive, onProcessingStateChange, onNotification }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const onGeometrySelectedRef = useRef(onGeometrySelected);
    const languageRef = useRef<PlatformLanguage>(language);
    const massWandActiveRef = useRef(massWandActive);
    const onProcessingStateChangeRef = useRef(onProcessingStateChange);
    const onNotificationRef = useRef(onNotification);
    const onModeChangeRef = useRef(onModeChange);

    const [baseMapMode, setBaseMapMode] = useState<BaseMapMode>("simple");
    const [isLayersOpen, setIsLayersOpen] = useState(false);
    const [boxPos, setBoxPos] = useState<{ start: {x:number, y:number}, current: {x:number, y:number} } | null>(null);
    const t = ui[language] || ui.ru;

    useEffect(() => { onNotificationRef.current = onNotification; }, [onNotification]);
    useEffect(() => { onModeChangeRef.current = onModeChange; }, [onModeChange]);

    useEffect(() => {
      onGeometrySelectedRef.current = onGeometrySelected;
    }, [onGeometrySelected]);

    useEffect(() => {
      languageRef.current = language;
    }, [language]);

    useEffect(() => {
      massWandActiveRef.current = massWandActive;
    }, [massWandActive]);

    useEffect(() => {
      onProcessingStateChangeRef.current = onProcessingStateChange;
    }, [onProcessingStateChange]);

    const shouldKeepSymbolLayer = (layer: maplibregl.LayerSpecification) => {
      const layerId = layer.id.toLowerCase();
      const sourceLayer = String((layer as { ["source-layer"]?: string })["source-layer"] ?? "").toLowerCase();
      const layerKey = `${sourceLayer} ${layerId}`;

      const isRoadShield = /(shield|route-number|road-number|highway-shield|motorway-shield|road_ref|ref_label|network)/i.test(layerKey);
      if (isRoadShield) return false;

      const isImportantLabel = /(road|street|highway|motorway|trunk|primary|secondary|tertiary|transportation_name|road_label|street_label|place|settlement|city|town|village|hamlet|suburb|neighbourhood|neighborhood|district|admin|boundary|country|state|region|province)/i.test(layerKey);
      const isNoisyLabel = /(poi|parking|park_?ing|building|house|address|housenumber|transit|bus|tram|subway|metro|station|platform|stop|rail|aeroway|airport|hospital|school|shop|retail|restaurant|fuel|hotel|museum|attraction|landmark|commercial|amenity)/i.test(layerKey);

      if (isNoisyLabel && !isImportantLabel) return false;
      return isImportantLabel;
    };

    const isTranslatableLabelLayer = (layer: maplibregl.LayerSpecification) => {
      const layerId = layer.id.toLowerCase();
      const sourceLayer = String((layer as { ["source-layer"]?: string })["source-layer"] ?? "").toLowerCase();
      const layerKey = `${sourceLayer} ${layerId}`;
      return /(place|settlement|city|town|village|hamlet|suburb|neighbourhood|neighborhood|district|road|street|highway|motorway|trunk|primary|secondary|tertiary|transportation_name|road_label|street_label|admin|boundary|country|state|region|province)/i.test(layerKey);
    };

    const formatDistance = (kilometers: number) => {
      if (kilometers >= 1) return `${kilometers.toFixed(2)} км`;
      return `${Math.round(kilometers * 1000)} м`;
    };

    const updateMeasurementLabels = () => {
      const map = mapRef.current;
      const draw = drawRef.current;

      if (!map || !draw) return;

      const source = map.getSource("measurement-labels") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const data = draw.getAll();
      const feature = data.features[data.features.length - 1];
      const labels: GeoJSON.Feature<GeoJSON.Point>[] = [];

      if (feature && (feature.geometry.type === "Polygon" || feature.geometry.type === "LineString")) {
        const coords = (feature.geometry as any).coordinates;
        const ring = feature.geometry.type === "Polygon" ? coords[0] : coords;

        if (Array.isArray(ring)) {
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
              properties: { label: formatDistance(kilometers) },
            });
          }
        }
      }
      source.setData({ type: "FeatureCollection", features: labels });
    };

    const applyMeasurementVisibility = () => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      if (!map.getLayer("measurement-labels-layer")) return;
      map.setLayoutProperty("measurement-labels-layer", "visibility", showMeasurements ? "visible" : "none");
    };

    const applyBaseMapMode = (mode: BaseMapMode) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const style = map.getStyle();
      const layers = style.layers ?? [];

      for (const layer of layers) {
        if (layer.id === "satellite-tiles") {
          map.setLayoutProperty(layer.id, "visibility", mode === "satellite" ? "visible" : "none");
          continue;
        }

        if (layer.id === "farm-plots-layer" || layer.id === "farm-plots-outline" || layer.id === "farm-plots-labels") continue;
        if (layer.id.startsWith("gl-draw-")) continue;
        if (layer.id === "measurement-labels-layer") continue;

        if (layer.type === "symbol") {
          const keepSymbolLayer = shouldKeepSymbolLayer(layer);
          map.setLayoutProperty(layer.id, "visibility", keepSymbolLayer ? "visible" : "none");
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

        const isRoadLayer = layer.type === "line" && /(road|street|path|bridge|transport|motorway|highway)/i.test(layer.id);
        const isBoundaryLayer = layer.type === "line" && /(boundary|admin|border)/i.test(layer.id);
        map.setLayoutProperty(layer.id, "visibility", isRoadLayer || isBoundaryLayer ? "visible" : "none");
      }
    };

    const applyMapLanguage = (selectedLanguage: PlatformLanguage) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const layers = map.getStyle().layers ?? [];
      const languageField = selectedLanguage === "ru"
          ? ["coalesce", ["get", "name:ru"], ["get", "name_ru"], ["get", "name"], ""]
          : selectedLanguage === "kk"
            ? ["coalesce", ["get", "name:kk"], ["get", "name_kk"], ["get", "name:kz"], ["get", "name"], ""]
            : ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name_int"], ["get", "name:latin"], ["get", "int_name"], ["get", "official_name:en"], ""];

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
        const response = await fetch("http://localhost:3008/farm-plots");
        if (!response.ok) return;
        const json = await response.json();
        if (!json.success) return;

        const features = json.data.map((plot: any) => {
            const geometry = typeof plot.geometry === "string" ? JSON.parse(plot.geometry) : plot.geometry;
            if (!geometry) return null;
            return {
              type: "Feature",
              properties: {
                id: plot.id,
                cropType: plot.cropType,
                title: plot.title,
                fillColor: plot.fillColor || null
              },
              geometry,
            };
          }).filter(Boolean);

        const source = map.getSource("farm-plots") as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData({ type: "FeatureCollection", features: features as any[] });
          return;
        }

        map.addSource("farm-plots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: features as any[] },
        });

        map.addLayer({
          id: "farm-plots-layer",
          type: "fill",
          source: "farm-plots",
          paint: {
            "fill-color": [
              "coalesce",
              ["get", "fillColor"],
              [
                "match",
                ["get", "cropType"],
                "Арбуз", "#2F6B3D", "Қарбыз", "#2F6B3D", "Watermelon", "#2F6B3D",
                "Картофель", "#C6A85E", "Картоп", "#C6A85E", "Potato", "#C6A85E",
                "Пшеница", "#A7B84B", "Бидай", "#A7B84B", "Wheat", "#A7B84B",
                "Кукуруза", "#D4A017", "Corn", "#D4A017",
                "Помидоры", "#C0392B", "Tomato", "#C0392B",
                "Лук", "#8E44AD", "Onion", "#8E44AD",
                "Морковь", "#E67E22", "Carrot", "#E67E22",
                "Подсолнечник", "#F1C40F", "Sunflower", "#F1C40F",
                "Рис", "#1ABC9C", "Rice", "#1ABC9C",
                "Ячмень", "#27AE60", "Barley", "#27AE60",
                "Хлопок", "#BDC3C7", "Cotton", "#BDC3C7",
                "Свёкла", "#9B59B6", "Beet", "#9B59B6",
                "#888"
              ]
            ],
            "fill-opacity": 0.4,
          },
        });

        map.addLayer({
          id: "farm-plots-outline",
          type: "line",
          source: "farm-plots",
          paint: { "line-color": "#244F2E", "line-width": 2.5, "line-opacity": 0.8 },
        });

        // Add labels
        map.addLayer({
          id: 'farm-plots-labels',
          type: 'symbol',
          source: 'farm-plots',
          layout: {
            'text-field': [
              'format',
              ['get', 'title'],
              { 'font-scale': 1.1 },
              '\n',
              ['get', 'cropType'],
              { 'font-scale': 0.8 }
            ],
            'text-size': 14,
            'text-anchor': 'center',
            'text-justify': 'center',
            'symbol-placement': 'point'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });

        map.on("click", "farm-plots-layer", (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          if (onPlotClick) {
            onPlotClick(props);
          } else {
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`<strong>${props.title}</strong><br/>${t?.culture || 'Культура'}: ${props.cropType}`)
              .addTo(map);
          }
        });
        
        map.on('mouseenter', 'farm-plots-layer', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'farm-plots-layer', () => {
          map.getCanvas().style.cursor = '';
        });

      } catch {
        console.warn("Farm plots are temporarily unavailable");
      }
    };

    const focusCurrentLocation = () => {
      const map = mapRef.current;
      if (!map) return;
      if (!navigator.geolocation) {
        if (onNotificationRef.current) onNotificationRef.current(t.browseNoGeo || 'No geoloc', 'error');
        else alert(t.browseNoGeo || 'No geoloc');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, essential: true });
        },
        () => { 
            if (onNotificationRef.current) onNotificationRef.current(t.noLocation || 'No loc', 'error');
            else alert(t.noLocation || 'No loc'); 
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    const handleZoomIn = () => mapRef.current?.zoomIn();
    const handleZoomOut = () => mapRef.current?.zoomOut();

    useImperativeHandle(ref, () => ({
      refreshPlots: () => { if (mapRef.current) fetchPlots(mapRef.current); },
      focusCurrentLocation,
      flyToRegion: (center: [number, number], zoom: number) => {
        mapRef.current?.flyTo({ center, zoom, essential: true, duration: 1500 });
      },
      changeDrawMode: (mode: string) => {
        if (drawRef.current) {
          if (mode === 'direct_select') {
            const selected = drawRef.current.getSelectedIds();
            if (selected.length > 0) drawRef.current.changeMode(mode, { featureId: selected[0] });
            else {
                if (onNotificationRef.current) onNotificationRef.current('Сначала выберите объект стрелкой для редактирования узлов', 'warning');
            }
          } else drawRef.current.changeMode(mode);
        }
      },
      deleteSelectedDraw: () => {
        if (drawRef.current) drawRef.current.trash();
        if (onMeasurement) onMeasurement(null);
      },
      getSelectedGeometry: () => {
        if (drawRef.current) {
           const data = drawRef.current.getSelected();
           if (data.features.length > 0) return data.features[0].geometry;
        }
        return null;
      },
      executeAutoTool: (tool: AutoToolType) => {
        if (!drawRef.current) return;
        const selected = drawRef.current.getSelected();
        if (selected.features.length === 0) {
          if (onNotificationRef.current) onNotificationRef.current('Сначала выделите объекты (Указателем) для применения инструмента.', 'warning');
          return;
        }
        const newFeatures = applyAutoTool(tool, selected.features);
        if (newFeatures && newFeatures.length > 0) {
          drawRef.current.trash(); // remove originals
          newFeatures.forEach(f => drawRef.current?.add(f));
        }
      }
    }));

    useEffect(() => {
      if (!mapContainer.current) return;
      if (mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: OPENFREEMAP_STYLE,
        center: KZ_CENTER,
        zoom: KZ_ZOOM,
        maxBounds: KZ_BOUNDS,
      });

      mapRef.current = map;

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        modes: {
          ...MapboxDraw.modes,
          draw_polygon: SnapPolygonMode,
          draw_line_string: SnapLineMode,
          draw_point: SnapPointMode,
          direct_select: SnapDirectSelect
        },
        userProperties: true, // Required for snap-mode
        // @ts-ignore - mapbox-gl-draw-snap-mode adds these custom properties
        snap: true,
        snapOptions: {
          snapPx: 15,
          snapToMidPoints: true
        },
        styles: mapboxGlDrawTheme as any,
      });

      drawRef.current = draw;
      map.addControl(draw as any, "bottom-right");

      map.on('draw.modechange', (e) => {
        if (onModeChange) onModeChange(e.mode);
      });

      const executeGlobalMeasurements = () => {
        if (!onMeasurement) return;
        const data = draw.getSelected();
        if (data.features.length === 0) {
          onMeasurement(null);
          return;
        }
        const feature = data.features[0];
        if (feature.geometry.type === 'Polygon') {
          const area = turf.area(feature);
          const hectares = area / 10000;
          onMeasurement(`${hectares.toFixed(2)} га`);
        } else if (feature.geometry.type === 'LineString') {
          const length = turf.length(feature, { units: 'kilometers' });
          onMeasurement(`${length.toFixed(2)} км`);
        } else if (feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates as number[];
          onMeasurement(`[${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`);
        } else {
          onMeasurement(null);
        }
      };

      map.on("load", () => {
        if (!map.getSource("satellite")) {
          map.addSource("satellite", {
            type: "raster",
            tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "Tiles © Esri",
          });
        }
        const firstLayerId = map.getStyle().layers?.[0]?.id;
        if (!map.getLayer("satellite-tiles")) {
          map.addLayer({
            id: "satellite-tiles", type: "raster", source: "satellite",
            minzoom: 0, maxzoom: 20, layout: { visibility: "none" },
            paint: { "raster-saturation": 0.1, "raster-contrast": 0.15 },
          }, firstLayerId);
        }

        if (!map.getSource("measurement-labels")) {
          map.addSource("measurement-labels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        }
        if (!map.getLayer("measurement-labels-layer")) {
          map.addLayer({
            id: "measurement-labels-layer", type: "symbol", source: "measurement-labels",
            layout: {
              "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, -0.6],
              "text-allow-overlap": true, "text-ignore-placement": true,
              visibility: showMeasurements ? "visible" : "none",
            },
            paint: { "text-color": "#FFFFFF", "text-halo-color": "#17311F", "text-halo-width": 2, },
          });
        }

        applyMapLanguage(languageRef.current);
        applyBaseMapMode(baseMapMode);
        applyMeasurementVisibility();
        fetchPlots(map);
      });

      map.on("draw.create", () => {
        updateMeasurementLabels();
        executeGlobalMeasurements();
      });

      map.on("draw.update", () => {
        updateMeasurementLabels();
        executeGlobalMeasurements();
      });

      map.on("draw.render", () => {
        updateMeasurementLabels();
      });

      map.on("draw.selectionchange", () => {
        executeGlobalMeasurements();
      });

      map.on("draw.delete", () => {
        updateMeasurementLabels();
        executeGlobalMeasurements();
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => { applyBaseMapMode(baseMapMode); }, [baseMapMode]);
    useEffect(() => { applyMapLanguage(language); }, [language]);
    useEffect(() => { applyMeasurementVisibility(); }, [showMeasurements]);

    useEffect(() => {
      const map = mapRef.current;
      const canvas = map?.getCanvas();
      if (!map || !canvas) return;
      
      if (massWandActive) {
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        canvas.style.cursor = 'crosshair';
      } else {
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.doubleClickZoom.enable();
        canvas.style.cursor = drawModeActive ? "crosshair" : "";
      }
    }, [drawModeActive, massWandActive]);

    const handleWandClick = async (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const rect = mapContainer.current?.getBoundingClientRect();
        if (!rect || !mapRef.current) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const clickedLngLat = mapRef.current.unproject([x, y]);

        if (onProcessingStateChangeRef.current) onProcessingStateChangeRef.current(true);
        if (onNotificationRef.current) onNotificationRef.current('Локализация поля в кадастре OSM...', 'warning');

        try {
            const point = turf.point([clickedLngLat.lng, clickedLngLat.lat]);
            const buffered = turf.buffer(point, 0.05, { units: 'kilometers' });
            const bbox = turf.bbox(buffered);
            const [w, s, eB, n] = bbox;

            const query = `[out:json][timeout:25];(way["landuse"~"farmland|meadow|orchard|vineyard|allotments|residential|commercial|industrial"](${s},${w},${n},${eB});relation["landuse"~"farmland|meadow|orchard|vineyard|allotments|residential|commercial|industrial"](${s},${w},${n},${eB});way["natural"~"grassland|scrub|wood"](${s},${w},${n},${eB});relation["natural"~"grassland|scrub|wood"](${s},${w},${n},${eB}););out geom;`;
            
            let res: any;
            let success = false;
            for (let i = 0; i < 3; i++) {
                try {
                    res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
                    if (res.ok) { success = true; break; }
                } catch (err) {}
                if (!success && i < 2) await new Promise(r => setTimeout(r, 1500));
            }
            if (!success || !res) throw new Error("API Max Retries");

            const data = await res.json();
            let targetFeature: any = null;
            
            if (data && data.elements && data.elements.length > 0) {
                const ways = data.elements.filter((el: any) => el.type === 'way');
                
                for (const element of ways) {
                    if (!element.geometry) continue;
                    const coords = element.geometry.map((p: any) => [p.lon, p.lat]);
                    if (coords.length < 3) continue;
                    if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
                        coords.push([...coords[0]]);
                    }
                    const poly = turf.polygon([coords]);
                    
                    if (turf.booleanPointInPolygon(point, poly)) {
                        targetFeature = poly;
                        break;
                    }
                }
                
                if (!targetFeature && ways.length > 0) {
                   const element = ways[0];
                   const coords = element.geometry.map((p: any) => [p.lon, p.lat]);
                   coords.push([...coords[0]]);
                   targetFeature = turf.polygon([coords]);
                }

                if (targetFeature && drawRef.current) {
                    drawRef.current.add(targetFeature);
                }
            }
            
            if (targetFeature) {
                if (onNotificationRef.current) onNotificationRef.current(`Поле успешно определено!`, 'success');
            } else {
                if (onNotificationRef.current) onNotificationRef.current('В данной точке полей в базе OSM не найдено.', 'warning');
            }
        } catch (err) {
            console.error(err);
            if (onNotificationRef.current) onNotificationRef.current('Сбой запроса Overpass после 3 попыток.', 'error');
        } finally {
            if (onProcessingStateChangeRef.current) onProcessingStateChangeRef.current(false);
            if (onModeChangeRef.current) onModeChangeRef.current('simple_select');
            if (drawRef.current) drawRef.current.changeMode('simple_select');
        }
    };

    return (
      <div className="relative h-full w-full">
        {massWandActive && (
          <div
            className="absolute inset-0 z-10 cursor-crosshair select-none"
            onClick={handleWandClick}
          />
        )}
        <div ref={mapContainer} className="h-full w-full" />
        <div className="absolute bottom-40 left-6 z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] lg:left-[120px] lg:bottom-10">
          <button
            type="button"
            onClick={() => setIsLayersOpen((open) => !open)}
            className="flex w-32 flex-col overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-md border border-white/20 transition-all active:scale-95"
          >
            <div className={`h-20 w-full ${baseMapMode === "satellite" ? "bg-[radial-gradient(circle_at_30%_30%,#56714b,transparent_35%),linear-gradient(135deg,#1d2a1d_0%,#415d3b_25%,#8a7b5c_55%,#2d3629_100%)]" : "bg-[linear-gradient(135deg,#d7ead6_0%,#eef5e8_42%,#bcd7b8_42%,#dcead8_100%)]" }`} />
            <div className="px-4 py-3 text-left">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B3D]/45">{t?.layers || 'Слои'}</div>
              <div className="mt-2 text-[0.92rem] leading-tight font-black text-[#2F6B3D] break-words">
                {baseMapMode === "simple" ? (t?.simple || 'Схема') : (t?.satellite || 'Спутник')}
              </div>
            </div>
          </button>
          {isLayersOpen && (
            <div className="mt-3 flex w-48 flex-col gap-2 rounded-[1.5rem] bg-white/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <button
                type="button" onClick={() => { setBaseMapMode("simple"); setIsLayersOpen(false); }}
                className={`rounded-[1.1rem] px-4 py-3 text-left text-sm font-black transition-colors ${baseMapMode === "simple" ? "bg-[#2F6B3D] text-white" : "bg-[#F5F9F4] text-[#2F6B3D] hover:bg-[#E6F0E2]"}`}
              >
                {t?.simpleMap || 'Обычная карта'}
              </button>
              <button
                type="button" onClick={() => { setBaseMapMode("satellite"); setIsLayersOpen(false); }}
                className={`rounded-[1.1rem] px-4 py-3 text-left text-sm font-black transition-colors ${baseMapMode === "satellite" ? "bg-[#2F6B3D] text-white" : "bg-[#F5F9F4] text-[#2F6B3D] hover:bg-[#E6F0E2]"}`}
              >
                {t?.satelliteMap || 'Спутник'}
              </button>
            </div>
          )}
        </div>

        <div className="absolute right-6 top-24 z-20 overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md">
          <button type="button" onClick={handleZoomIn} className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10">
            +
          </button>
          <div className="mx-3 h-px bg-black/10" />
          <button type="button" onClick={handleZoomOut} className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10">
            -
          </button>
        </div>
      </div>
    );
  },
);

Map.displayName = "Map";
export default Map;
