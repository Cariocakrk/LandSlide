import React, { useMemo, useEffect } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';
import { LocateFixed } from 'lucide-react';

import { convertLatLngToWorld } from '@/lib/mapUtils';

// convertLatLngToTerrain removed in favor of mapUtils.convertLatLngToWorld

export function FloodRiskModule() {
  const waterways = useTerrainStore(state => state.waterways);
  const centerLat = useTerrainStore(state => state.latitude);
  const centerLon = useTerrainStore(state => state.longitude);
  const activeModule = useTerrainStore(state => state.activeModule);
  const floodSensors = useTerrainStore(state => state.floodSensors);

  // Generate river line meshes
  const lines = useMemo(() => {
    if (activeModule !== 'flood' || !waterways || waterways.length === 0 || centerLat === null || centerLon === null) {
       return [];
    }

    const riverSegments: any[] = waterways.map((river: any) => {
      if (!river.coordinates || river.coordinates.length < 2) return null;

      const points: THREE.Vector3[] = [];
      const first = river.coordinates[0];
      const last = river.coordinates[river.coordinates.length - 1];
      const isClosed = first[0] === last[0] && first[1] === last[1];

      river.coordinates.forEach((coord: number[]) => {
         const lat = coord[0];
         const lon = coord[1];
         const pos = convertLatLngToWorld(lat, lon, centerLat, centerLon, 10);
         // slightly higher than roads to ensure visibility
         points.push(new THREE.Vector3(pos.x, 0.1, pos.z)); 
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
         color: 0x0077ff,
         linewidth: 2,
         depthTest: false // ensuring river lines cut through terrain if needed
      });

      return { key: river.id, geometry, material, isClosed };
    }).filter(Boolean);

    console.log(`[FloodRiskModule] Generated ${riverSegments.length} river segments`);
    return riverSegments;
  }, [waterways, activeModule, centerLat, centerLon]);
  
  useEffect(() => {
    if (activeModule === 'flood') {
      console.log(`[FloodRiskModule] Activated! Waterways: ${waterways.length}`);
    } else {
      console.log('[FloodRiskModule] Deactivated.');
    }
  }, [activeModule, waterways.length]);

  if (activeModule !== 'flood' || !floodSensors) return null;

  return (
    <group 
      name="FloodRiskGroup" 
      onUpdate={(self) => {
        self.traverse(obj => {
          if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
            obj.renderOrder = 1100;
          }
        });
      }}
    >
      {/* Rivers */}
      {lines.map((line: any) => {
         if (line.isClosed) {
            return (
              <lineLoop key={line.key} geometry={line.geometry} material={line.material} />
            );
         }
         return (
            <primitive key={line.key} object={new THREE.Line(line.geometry, line.material)} />
         );
      })}

      {/* Sensors */}
      {floodSensors.map((sensor: any) => {
        const pos = convertLatLngToWorld(sensor.lat, sensor.lng, centerLat as number, centerLon as number, 10);
        return (
          <Html key={sensor.id} position={[pos.x, 2.5, pos.z]} center className="pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md text-white p-2 rounded-lg border border-blue-500/30 shadow-2xl min-w-[140px] transition-all">
               <div className="font-bold border-b border-blue-500/30 pb-1 mb-1 text-xs flex items-center gap-1 text-blue-400">
                 <LocateFixed className="w-3 h-3" /> {sensor.riverName || 'Corpo d\'água'}
               </div>
               <div className="text-[10px] space-y-0.5 mt-2">
                 <div className="flex justify-between"><span>Nível D'água:</span> <span className="font-mono text-blue-300">{sensor.nivelAtual}m</span></div>
                 <div className="flex justify-between"><span>Risco Litoral:</span> <span className={`font-mono ${sensor.localRisk > 50 ? 'text-red-400' : 'text-emerald-400'}`}>{sensor.localRisk}/100</span></div>
               </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
