"use client";

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTerrainStore } from '@/store/terrainStore';

// For development without a token, we handle the error gracefully or point to a free style if possible.
// Mapbox GL JS strictly requires a real token for Mapbox styles.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export function MapBase({ 
  viewState, 
  onViewStateChange 
}: { 
  viewState: { zoom: number, pitch: number, bearing: number },
  onViewStateChange?: (state: any) => void 
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { latitude, longitude } = useTerrainStore();

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Safely parse center coordinates, fallback to default center if none
    const centerLng = longitude !== null ? longitude : -43.195;
    const centerLat = latitude !== null ? latitude : -22.304;

    if (!map.current) {
      if (!MAPBOX_TOKEN) {
         console.warn("⚠️ Mapbox Token não encontrado em NEXT_PUBLIC_MAPBOX_TOKEN. O mapa base 2D não será carregado.");
         return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [centerLng, centerLat],
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing,
          interactive: false, // We disable interaction so ThreeJS OrbitControls handles all pan/scroll
          attributionControl: false // Hide default mapbox attribution to keep it clean
        });

        map.current.on('style.load', () => {
          // Enable 3D terrain on mapbox to make the underlying base look realistic
          map.current?.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });
          map.current?.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        });
        
        map.current.on('error', (e) => {
          console.error("Mapbox Error:", e);
        });
      } catch (err) {
        console.error("Mapbox initialization failed:", err);
      }
    } else {
       // Just update the center if it changes later via the Search Bar
       map.current.setCenter([centerLng, centerLat]);
    }

    return () => {
      // Ensure we clean up later if unmounted
      if (map.current) {
         // map.current.remove(); 
         // For React 18 StrictMode, uncommenting remove() can break fast refresh, keep it commented
      }
    };
  }, [latitude, longitude]);

  // Sync the mapbox camera with the OrbitControls state passed down as props
  useEffect(() => {
    if (map.current) {
       map.current.jumpTo({
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing
       });
    }
  }, [viewState]);

  return (
    <div 
       ref={mapContainer} 
       style={{ 
         position: 'absolute', 
         top: 0, 
         left: 0, 
         width: '100%', 
         height: '100%',
         zIndex: 0 
       }} 
    />
  );
}
