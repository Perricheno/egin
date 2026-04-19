"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { PlatformLanguage, ui } from "@/lib/i18n";
import { KZ_CENTER, KZ_ZOOM } from "@/lib/kz-regions";
import { apiUrl } from "@/lib/api";
import { MapRef } from "./Map";

// --- Вспомогательный компонент для полигонов ---
const Polygon = ({ paths, options, onClick }: { paths: any[], options: any, onClick?: () => void }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({ ...options, paths, map });
    if (onClick) polygon.addListener("click", onClick);
    return () => {
      polygon.setMap(null);
      google.maps.event.clearInstanceListeners(polygon);
    };
  }, [map, paths, options, onClick]);
  return null;
};

// --- Компонент управления рисованием ---
const DrawingManager = ({ mode, onGeometrySelected }: { mode: string, onGeometrySelected: (geom: any) => void }) => {
  const map = useMap();
  const drawingLib = useMapsLibrary("drawing");
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const currentShapeRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !drawingLib) return;

    const dm = new drawingLib.DrawingManager({
      drawingMode: null,
      drawingControl: false, // Мы управляем кнопками сами
      polygonOptions: {
        fillColor: "#2F6B3D",
        fillOpacity: 0.45,
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    dm.setMap(map);
    drawingManagerRef.current = dm;

    google.maps.event.addListener(dm, "overlaycomplete", (event: any) => {
        if (currentShapeRef.current) currentShapeRef.current.setMap(null);
        currentShapeRef.current = event.overlay;
        dm.setDrawingMode(null); // Stop drawing after completion

        // Convert to GeoJSON
        if (event.type === "polygon") {
            const paths = event.overlay.getPath();
            const coords = [];
            for (let i = 0; i < paths.getLength(); i++) {
                const xy = paths.getAt(i);
                coords.push([xy.lng(), xy.lat()]);
            }
            coords.push(coords[0]); // Close polygon
            onGeometrySelected({ type: "Polygon", coordinates: [coords] });
        }
    });

    return () => {
        dm.setMap(null);
        if (currentShapeRef.current) currentShapeRef.current.setMap(null);
    };
  }, [map, drawingLib]);

  useEffect(() => {
    if (!drawingManagerRef.current) return;
    
    let googleMode: any = null;
    if (mode === 'draw_polygon') googleMode = google.maps.drawing.OverlayType.POLYGON;
    else if (mode === 'draw_line_string') googleMode = google.maps.drawing.OverlayType.POLYLINE;
    else if (mode === 'draw_point') googleMode = google.maps.drawing.OverlayType.MARKER;

    drawingManagerRef.current.setDrawingMode(googleMode);
  }, [mode]);

  return null;
};

// --- Основной компонент ---
interface GoogleMapProps {
  language: PlatformLanguage;
  onPlotClick?: (plot: any) => void;
  onGeometrySelected?: (geom: any) => void;
}

const GoogleMapComponent = forwardRef<MapRef, GoogleMapProps>(
  ({ language, onPlotClick, onGeometrySelected }, ref) => {
    const [plots, setPlots] = useState<any[]>([]);
    const [drawMode, setDrawMode] = useState<string>("");
    const mapRef = useRef<google.maps.Map | null>(null);
    const t = ui[language] || ui.ru;

    useEffect(() => {
      fetch(apiUrl("/api-usage/increment/google_maps"), { method: "POST" }).catch(() => {});
      fetchPlots();
    }, []);

    const fetchPlots = async () => {
      try {
        const token = localStorage.getItem("agro_token");
        const res = await fetch(apiUrl("/farm-plots"), { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setPlots(json.data);
      } catch (err) { console.error(err); }
    };

    useImperativeHandle(ref, () => ({
      refreshPlots: fetchPlots,
      focusCurrentLocation: () => {
        navigator.geolocation.getCurrentPosition((pos) => {
          mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          mapRef.current?.setZoom(15);
        });
      },
      flyToRegion: (center, zoom) => {
        mapRef.current?.panTo({ lat: center[1], lng: center[0] });
        mapRef.current?.setZoom(zoom);
      },
      changeDrawMode: (mode) => setDrawMode(mode),
      deleteSelectedDraw: () => setDrawMode(""),
      getSelectedGeometry: () => null,
      executeAutoTool: () => {}
    }));

    return (
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
        <div className="h-full w-full relative">
          <Map
            defaultCenter={{ lat: KZ_CENTER[1], lng: KZ_CENTER[0] }}
            defaultZoom={KZ_ZOOM}
            mapId={"bf19558667822d69"}
            disableDefaultUI={true}
            onTilesLoaded={(ev) => { if (!mapRef.current) mapRef.current = ev.map; }}
            mapTypeId={"satellite"}
          >
            <DrawingManager 
                mode={drawMode} 
                onGeometrySelected={(geom) => onGeometrySelected?.(geom)} 
            />
            {plots.map((plot) => {
              const geom = typeof plot.geometry === "string" ? JSON.parse(plot.geometry) : plot.geometry;
              if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return null;
              const paths = geom.type === "Polygon" 
                ? geom.coordinates[0].map((c: any) => ({ lat: c[1], lng: c[0] }))
                : geom.coordinates[0][0].map((c: any) => ({ lat: c[1], lng: c[0] }));

              return (
                <Polygon
                  key={plot.id}
                  paths={paths}
                  options={{ fillColor: plot.fillColor || "#2F6B3D", fillOpacity: 0.4, strokeColor: "#FFF", strokeWeight: 1 }}
                  onClick={() => onPlotClick?.(plot)}
                />
              );
            })}
          </Map>

          {/* UI Controls */}
          <div className="absolute right-6 top-24 z-20 flex flex-col rounded-[1.5rem] bg-white/95 shadow-2xl backdrop-blur-md">
            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) + 1)} className="h-14 w-14 text-2xl hover:bg-black/5">+</button>
            <div className="mx-3 h-px bg-black/10" />
            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) - 1)} className="h-14 w-14 text-2xl hover:bg-black/5">-</button>
          </div>
          
          <div className="absolute left-6 bottom-10 z-20">
             <button 
                onClick={() => {
                    const ct = mapRef.current?.getMapTypeId();
                    mapRef.current?.setMapTypeId(ct === 'satellite' ? 'roadmap' : 'satellite');
                }}
                className="px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl text-xs font-black text-[#2F6B3D] uppercase border border-white/40"
             >
                {t?.layers || 'Слои'}
             </button>
          </div>
        </div>
      </APIProvider>
    );
  }
);

GoogleMapComponent.displayName = "GoogleMapComponent";
export default GoogleMapComponent;
