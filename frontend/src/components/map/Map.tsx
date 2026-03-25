"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { mapboxGlDrawTheme } from './draw-theme';
import * as turf from '@turf/turf';

interface MapProps {
  onPlotClick?: (plot: any) => void;
  onModeChange?: (mode: string) => void;
  onMeasurement?: (val: string | null) => void;
}

export interface MapRef {
  refreshPlots: () => void;
  changeDrawMode: (mode: string) => void;
  deleteSelectedDraw: () => void;
  getSelectedGeometry: () => any;
}

const Map = forwardRef<MapRef, MapProps>(({ onPlotClick, onModeChange, onMeasurement }, ref) => {
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
      const response = await fetch('http://localhost:3000/farm-plots');
      const json = await response.json();
      
      if (json.success) {
        const features = json.data.map((plot: any) => ({
          type: 'Feature',
          properties: {
            id: plot.id,
            cropType: plot.cropType,
            title: plot.title,
          },
          geometry: typeof plot.geometry === 'string' ? JSON.parse(plot.geometry) : plot.geometry
        }));

        const source = map.getSource('farm-plots') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: features
          });
        } else {
          map.addSource('farm-plots', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: features
            }
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
                'Пшеница', '#FFD700',
                'Кукуруза', '#228B22',
                'Хлопок', '#F0F8FF',
                'Яблоня', '#8B0000',
                '#888888'
              ],
              'fill-opacity': 0.6,
            }
          });

          map.addLayer({
            id: 'farm-plots-outline',
            type: 'line',
            source: 'farm-plots',
            paint: {
              'line-color': '#000000',
              'line-width': 2,
              'line-opacity': 0.8
            }
          });

          map.addLayer({
            id: 'farm-plots-labels',
            type: 'symbol',
            source: 'farm-plots',
            layout: {
              'text-field': [
                'format',
                ['get', 'title'],
                { 'font-scale': 1.1, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] },
                '\n',
                ['get', 'cropType'],
                { 'font-scale': 0.8, 'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'] }
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

          map.on('click', 'farm-plots-layer', (e) => {
             const props = e.features?.[0].properties;
             if (props) {
               if (onPlotClick) {
                 onPlotClick(props);
               } else {
                 new maplibregl.Popup()
                   .setLngLat(e.lngLat)
                   .setHTML(`<strong>${props.title}</strong><br/>Культура: ${props.cropType}`)
                   .addTo(map);
               }
             }
          });
          
          map.on('mouseenter', 'farm-plots-layer', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'farm-plots-layer', () => {
            map.getCanvas().style.cursor = '';
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
    },
    changeDrawMode: (mode: string) => {
      if (drawRef.current) {
        if (mode === 'direct_select') {
          const selected = drawRef.current.getSelectedIds();
          if (selected.length > 0) {
            drawRef.current.changeMode(mode, { featureId: selected[0] });
          } else {
            alert('Сначала выберите нарисованный объект стрелкой для редактирования узлов');
          }
        } else {
          drawRef.current.changeMode(mode);
        }
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
    }
  }));

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [76.8512, 43.2220],
      zoom: 10
    });

    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      styles: mapboxGlDrawTheme as any,
    });

    drawRef.current = draw;
    map.addControl(draw as any, 'bottom-right');

    map.on('draw.modechange', (e) => {
      if (onModeChange) onModeChange(e.mode);
    });

    const updateMeasurements = () => {
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
        onMeasurement(`Площадь: ${hectares.toFixed(2)} га`);
      } else if (feature.geometry.type === 'LineString') {
        const length = turf.length(feature, { units: 'kilometers' });
        onMeasurement(`Длина: ${length.toFixed(2)} км`);
      } else if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates as number[];
        onMeasurement(`Коорд: [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`);
      } else {
        onMeasurement(null);
      }
    };

    map.on('draw.selectionchange', updateMeasurements);
    map.on('draw.update', updateMeasurements);
    map.on('draw.create', updateMeasurements);

    map.on('load', () => {
      fetchPlots(map);
    });

    map.on('draw.create', (e) => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        if (onGeometrySelected) {
          onGeometrySelected(data.features[data.features.length - 1].geometry);
          draw.deleteAll(); // Clear drawing tools after selection
        }
      }
    });

    map.on('draw.update', (e) => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        if (onGeometrySelected) {
          onGeometrySelected(data.features[data.features.length - 1].geometry);
        }
      }
    });

    return () => {
      map.remove();
    };
  }, [onPlotClick, onModeChange, onMeasurement]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      <div className="absolute right-6 top-24 z-20 overflow-hidden rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10"
          aria-label="Приблизить карту"
        >
          +
        </button>

        <div className="mx-3 h-px bg-black/10" />

        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-16 w-16 items-center justify-center text-4xl font-light text-[#3F3F46] transition-colors hover:bg-black/5 active:bg-black/10"
          aria-label="Отдалить карту"
        >
          -
        </button>
      </div>
    </div>
  );
});

export default Map;
