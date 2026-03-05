"use client";

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';
import { LocateFixed } from 'lucide-react';

// Approximated conversion from degrees to local 10x10 ThreeJS coordinates
function convertLatLngToTerrain(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  gridWidth: number
) {
  const latRatio = (lat - centerLat) * 111000;
  const lonRatio = (lon - centerLon) * 111000 * Math.cos(centerLat * (Math.PI / 180));
  const scale = gridWidth / 1600; 
  return {
    x: lonRatio * scale,
    z: -latRatio * scale 
  };
}

export function FloodRiskModule() {
  console.log("[FLOOD] Módulo carregado");
  const { scene } = useThree();
  const waterways = useTerrainStore(state => state.waterways);
  const centerLat = useTerrainStore(state => state.latitude);
  const centerLon = useTerrainStore(state => state.longitude);
  const activeModule = useTerrainStore(state => state.activeModule);
  const floodSensors = useTerrainStore(state => state.floodSensors);
  
  useEffect(() => {
    console.log("[FLOOD] useEffect disparado");
    console.log("Módulo ativo:", activeModule);
    try {
      // Limpar linhas anteriores
      const oldLines = scene.children.filter(c => c.name === 'flood-waterway');
      oldLines.forEach(l => {
        scene.remove(l);
        if ((l as any).geometry) (l as any).geometry.dispose();
        if ((l as any).material) (l as any).material.dispose();
      });

      if (activeModule !== 'flood') {
         console.log("[FLOOD] Módulo inativo (activeModule !== 'flood'). Limpando overlays e aguardando...");
         return;
      }
      
      console.log("[FLOOD] Executando módulo de enchente");

      if (!waterways || waterways.length === 0 || centerLat === null || centerLon === null) {
         console.log("[FLOOD] Aguardando dados geográficos (waterways, lat, lon)...");
         return;
      }

      let waterBodiesCount = waterways.length;
      let linesCreated = 0;

      waterways.forEach((river: any) => {
        if (!river.coordinates || river.coordinates.length < 2) return;

        const points: THREE.Vector3[] = [];
        
        // Verifica se é loop fechado (lago/baía)
        const first = river.coordinates[0];
        const last = river.coordinates[river.coordinates.length - 1];
        const isClosed = first[0] === last[0] && first[1] === last[1];

        river.coordinates.forEach((coord: number[]) => {
           const lat = coord[0];
           const lon = coord[1];
           const pos = convertLatLngToTerrain(lat, lon, centerLat, centerLon, 10);
           // Se não houver função para obter altura local do terreno: 
           // Temporariamente usar y = 2 para validação visual.
           points.push(new THREE.Vector3(pos.x, 2, pos.z));
        });

        const firstPoint = points[0];
        console.log(`[FLOOD] Centro geográfico usado: ${centerLat}, ${centerLon}`);
        console.log(`[FLOOD] Escala usada: 10/1600`);
        console.log(`[FLOOD] Conversão para mundo 3D - Primeiro ponto: X=${firstPoint.x.toFixed(4)}, Y=${firstPoint.y}, Z=${firstPoint.z.toFixed(4)}`);

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x0077ff });
        
        let linhaAgua;
        if (isClosed) {
           linhaAgua = new THREE.LineLoop(geometry, material);
        } else {
           linhaAgua = new THREE.Line(geometry, material);
        }
        
        linhaAgua.name = 'flood-waterway';
        scene.add(linhaAgua);
        linesCreated++;
        
        console.log(`[FLOOD] Linha adicionada à cena com sucesso`);
        console.log(`[FLOOD] Total de linhas renderizadas: ${linesCreated}`);
      });

      console.log(`[FLOOD] Sensores criados: ${floodSensors.length}`);

      // Output de diagnóstico original da etapa anterior:
      console.log(`Corpos d’água encontrados: ${waterBodiesCount}`);
      console.log(`Linhas criadas totais: ${linesCreated}`);
      console.log(`Adicionados à cena com sucesso.`);

      return () => {
        try {
          const cleanUp = scene.children.filter(c => c.name === 'flood-waterway');
          cleanUp.forEach(l => {
             scene.remove(l);
             if ((l as any).geometry) (l as any).geometry.dispose();
             if ((l as any).material) (l as any).material.dispose();
          });
        } catch (err) {
          console.error(`[FLOOD ERROR] Falha ao limpar linhas da cena:`, err);
        }
      };
    } catch (error) {
        console.error(`[FLOOD ERROR] Falha crítica na execução do FloodRiskModule:`, error);
    }
  }, [waterways, activeModule, centerLat, centerLon, scene]);

  if (activeModule !== 'flood' || !floodSensors) return null;

  return (
    <>
      {floodSensors.map((sensor: any) => {
        const pos = convertLatLngToTerrain(sensor.lat, sensor.lng, centerLat as number, centerLon as number, 10);
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
    </>
  );
}
