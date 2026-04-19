"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { PlatformLanguage, ui } from "@/lib/i18n";
import { KZ_CENTER, KZ_ZOOM } from "@/lib/kz-regions";
import { apiUrl } from "@/lib/api";
import { MapRef } from "./Map";

// Вспомогательный компонент для отрисовки полигонов в React-стиле для Google Maps
const Polygon = (props: { paths: any[], options: any, onClick?: () => void }) => {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      ...props.options,
      paths: props.paths,
      map: map,
    });

    if (props.onClick) {
      polygon.addListener("click", props.onClick);
    }

    polygonRef.current = polygon;

    return () => {
      polygon.setMap(null);
      google.maps.event.clearInstanceListeners(polygon);
    };
  }, [map, props.paths]); // Перерисовываем при изменении путей

  return null;
};

interface GoogleMapProps {
  language: PlatformLanguage;
  onPlotClick?: (plot: any) => void;
}

const GoogleMapComponent = forwardRef<MapRef, GoogleMapProps>(
  ({ language, onPlotClick }, ref) => {
    const [plots, setPlots] = useState<any[]>([]);
    const mapRef = useRef<google.maps.Map | null>(null);
    const t = ui[language] || ui.ru;

    // Track API usage once per session/mount
    useEffect(() => {
      const incrementUsage = async () => {
        try {
          await fetch(apiUrl("/api-usage/increment/google_maps"), { method: "POST" });
        } catch (e) {}
      };
      incrementUsage();
    }, []);

    const fetchPlots = async () => {
      try {
        const token = localStorage.getItem("agro_token");
        if (!token) return;

        const response = await fetch(apiUrl("/farm-plots"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await response.json();
        if (json.success) setPlots(json.data);
      } catch (err) {
        console.error("Google Maps: Failed to fetch plots", err);
      }
    };

    useEffect(() => {
      fetchPlots();
    }, []);

    useImperativeHandle(ref, () => ({
      refreshPlots: fetchPlots,
      focusCurrentLocation: () => {
        if (navigator.geolocation && mapRef.current) {
          navigator.geolocation.getCurrentPosition((pos) => {
            mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            mapRef.current?.setZoom(15);
          });
        }
      },
      flyToRegion: (center, zoom) => {
        mapRef.current?.panTo({ lat: center[1], lng: center[0] });
        mapRef.current?.setZoom(zoom);
      },
      changeDrawMode: (mode) => {
        console.warn("DrawingManager not yet implemented for Google Maps Sandbox");
      },
      deleteSelectedDraw: () => {},
      getSelectedGeometry: () => null,
      executeAutoTool: () => {}
    }));

    return (
      <APIProvider apiKey={"YOUR_GOOGLE_MAPS_API_KEY"}>
        <div className="h-full w-full relative">
          <Map
            defaultCenter={{ lat: KZ_CENTER[1], lng: KZ_CENTER[0] }}
            defaultZoom={KZ_ZOOM}
            mapId={"bf19558667822d69"} // Пример Map ID для векторных карт
            disableDefaultUI={true}
            onLoad={(map) => { mapRef.current = map; }}
            mapTypeId={"satellite"} // По умолчанию агрономы любят спутник
          >
            {plots.map((plot) => {
              const geom = typeof plot.geometry === "string" ? JSON.parse(plot.geometry) : plot.geometry;
              if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return null;
              
              // Обработка простого полигона
              const paths = geom.type === "Polygon" 
                ? geom.coordinates[0].map((coord: any) => ({ lat: coord[1], lng: coord[0] }))
                : geom.coordinates[0][0].map((coord: any) => ({ lat: coord[1], lng: coord[0] }));

              return (
                <Polygon
                  key={plot.id}
                  paths={paths}
                  options={{
                    fillColor: plot.fillColor || "#2F6B3D",
                    fillOpacity: 0.45,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 1.5,
                  }}
                  onClick={() => onPlotClick?.(plot)}
                />
              );
            })}
          </Map>

          {/* UI Controls */}
          <div className="absolute right-6 top-24 z-20 flex flex-col overflow-hidden rounded-[1.5rem] bg-white/92 shadow-xl backdrop-blur-md">
            <button 
              onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) + 1)}
              className="h-14 w-14 text-2xl hover:bg-black/5 active:bg-black/10 transition-colors"
            >
              +
            </button>
            <div className="mx-3 h-px bg-black/10" />
            <button 
              onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) - 1)}
              className="h-14 w-14 text-2xl hover:bg-black/5 active:bg-black/10 transition-colors"
            >
              -
            </button>
          </div>

          <div className="absolute left-6 bottom-10 z-20">
             <button 
                onClick={() => {
                    const currentType = mapRef.current?.getMapTypeId();
                    mapRef.current?.setMapTypeId(currentType === 'satellite' ? 'roadmap' : 'satellite');
                }}
                className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-xs font-bold text-[#2F6B3D] uppercase tracking-wider border border-white/20"
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
