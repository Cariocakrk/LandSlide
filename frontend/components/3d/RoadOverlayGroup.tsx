"use client";

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';
import { useMemo } from 'react';

import { convertLatLngToWorld } from '@/lib/mapUtils';

// convertLatLngToTerrain removed in favor of mapUtils.convertLatLngToWorld

export function RoadOverlayGroup() {
  const roads = useTerrainStore(state => state.roads);
  const centerLat = useTerrainStore(state => state.latitude);
  const centerLon = useTerrainStore(state => state.longitude);

  const lines = useMemo(() => {
    if (!roads || roads.length === 0 || centerLat === null || centerLon === null) return [];

    return roads.map((road: any) => {
      const points: THREE.Vector3[] = [];

      road.coordinates.forEach((coord: number[]) => {
         const lat = coord[0];
         const lon = coord[1];
         const pos = convertLatLngToWorld(lat, lon, centerLat, centerLon, 10);
         // slightly above terrain to prevent z-fighting
         points.push(new THREE.Vector3(pos.x, 0.05, pos.z));
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Different road types get different colors/thicknesses if needed
      let color = 0x888888; // Default grey road
      if (['primary', 'motorway', 'trunk'].includes(road.type)) color = 0xaaaaaa;
      else if (['secondary', 'tertiary'].includes(road.type)) color = 0x666666;
      else if (['residential', 'service'].includes(road.type)) color = 0x444444;

      const material = new THREE.LineBasicMaterial({ 
        color, 
        linewidth: 1, // WebGL limits this to 1 usually, but semantic
        transparent: true,
        opacity: 0.7,
        depthWrite: false // Helps prevent z-fighting with terrain layer overlays
      });

      return { key: road.id, geometry, material };
    });
  }, [roads, centerLat, centerLon]);

  if (lines.length === 0) return null;

  return (
    <group 
      name="RoadOverlayGroup"
      onUpdate={(self) => {
        self.traverse(obj => {
          if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
            obj.renderOrder = 1000;
          }
        });
      }}
    >
      {lines.map(line => (
        <primitive key={line.key} object={new THREE.Line(line.geometry, line.material)} />
      ))}
    </group>
  );
}
