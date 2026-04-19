"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { APIProvider, Map, MapControl, ControlPosition } from "@vis.gl/react-google-maps";
import { PlatformLanguage, ui } from "@/lib/i18n";
import { KZ_CENTER, KZ_ZOOM } from "@/lib/kz-regions";
import { apiUrl } from "@/lib/api";
import { MapRef } from "./Map"; // Re-use interface

interface GoogleMapProps {
  language: PlatformLanguage;
  onPlotClick?: (plot: any) => void;
  // ... other props can be added to match MapProps
}

const GoogleMapComponent = forwardRef<MapRef, GoogleMapProps>(
  ({ language, onPlotClick }, ref) => {
    const [plots, setPlots] = useState<any[]>([]);
    const t = ui[language] || ui.ru;
    const mapRef = useRef<google.maps.Map | null>(null);

    // Track API call
    useEffect(() => {
        fetch(apiUrl("/api-usage/increment/google_maps"), { method: "POST" }).catch(() => {});
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
        console.error("Failed to fetch plots for Google Maps", err);
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
      changeDrawMode: () => {}, // To be implemented with DrawingManager
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
            mapId={"DEMO_MAP_ID"} // Required for some features
            onCameraChanged={(ev) => {
                // can be used for debugging
            }}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {/* Render Plots using Data Layer or Markers/Polygons */}
            {plots.map((plot) => {
                const geom = typeof plot.geometry === "string" ? JSON.parse(plot.geometry) : plot.geometry;
                if (!geom || geom.type !== "Polygon") return null;
                
                const paths = geom.coordinates[0].map((coord: any) => ({
                    lat: coord[1],
                    lng: coord[0]
                }));

                return (
                    <google.maps.Polygon
                        key={plot.id}
                        paths={paths}
                        options={{
                            fillColor: plot.fillColor || "#2F6B3D",
                            fillOpacity: 0.4,
                            strokeColor: "#244F2E",
                            strokeWeight: 2
                        }}
                        onClick={() => onPlotClick?.(plot)}
                    />
                );
            })}
          </Map>

          {/* Simple Zoom Controls to match UI */}
          <div className="absolute right-6 top-24 z-20 overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md flex flex-col">
            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) + 1)} className="h-16 w-16 text-2xl font-light text-[#3F3F46] hover:bg-black/5">+</button>
            <div className="mx-3 h-px bg-black/10" />
            <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 10) - 1)} className="h-16 w-16 text-2xl font-light text-[#3F3F46] hover:bg-black/5">-</button>
          </div>
        </div>
      </APIProvider>
    );
  }
);

GoogleMapComponent.displayName = "GoogleMapComponent";
export default GoogleMapComponent;
