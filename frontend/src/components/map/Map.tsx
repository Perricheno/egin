"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { mapboxGlDrawTheme } from './draw-theme';

interface MapProps {
  onGeometrySelected?: (geom: any) => void;
  drawModeActive?: boolean;
}

export interface MapRef {
  refreshPlots: () => void;
}

const Map = forwardRef<MapRef, MapProps>(({ onGeometrySelected, drawModeActive }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

    const fetchPlots = async (map: maplibregl.Map) => {
      try {
        const response = await fetch("http://localhost:3008/farm-plots");

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
            id: 'farm-plots-layer',
            type: 'fill',
            source: 'farm-plots',
            paint: {
              'fill-color': [
                'match',
                ['get', 'cropType'],
                'Арбуз', '#2F6B3D',
                'Картофель', '#C6A85E',
                '#888'
              ],
              'fill-opacity': 0.4,
              'fill-outline-color': '#000'
            }
          });

          map.on('click', 'farm-plots-layer', (e) => {
             const props = e.features?.[0].properties;
             if (props) {
               new maplibregl.Popup()
                 .setLngLat(e.lngLat)
                 .setHTML(`<strong>${props.title}</strong><br/>Культура: ${props.cropType}`)
                 .addTo(map);
             }
          });
        }
      }
    } catch (err) {
      console.error("Failed to load farm plots on map", err);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshPlots: () => {
      if (mapRef.current) {
        fetchPlots(mapRef.current);
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
      controls: {
        polygon: true,
        trash: true
      },
      styles: mapboxGlDrawTheme as any,
    });

    drawRef.current = draw;
    map.addControl(draw as any, 'bottom-right');

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
        if (data.features.length > 0) {
          updateMeasurementLabels();
          if (!rulerModeActive && onGeometrySelectedRef.current) {
            onGeometrySelectedRef.current(
              data.features[data.features.length - 1].geometry,
            );
            draw.deleteAll();
            updateMeasurementLabels();
          }
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
    };
  }, [onGeometrySelected]);

  useEffect(() => {
    if (drawRef.current && drawModeActive) {
      drawRef.current.changeMode('draw_polygon');
    }
  }, [drawModeActive]);

    return (
      <div className="relative h-full w-full">
        <div ref={mapContainer} className="h-full w-full" />

        <div className="absolute bottom-40 left-6 z-20">
          <button
            type="button"
            onClick={() => setIsLayersOpen((open) => !open)}
            className="flex w-32 flex-col overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-md border border-white/20 transition-all active:scale-95"
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
