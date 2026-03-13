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
      controls: {
        polygon: true,
        trash: true
      },
      styles: mapboxGlDrawTheme as any,
    });

    drawRef.current = draw;
    map.addControl(draw as any, 'bottom-right');

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
  }, [onGeometrySelected]);

  useEffect(() => {
    if (drawRef.current && drawModeActive) {
      drawRef.current.changeMode('draw_polygon');
    }
  }, [drawModeActive]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
});

export default Map;
