"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Plane, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';
import { CloudRain, Sun, Cloud, CloudLightning, ThermometerSnowflake } from 'lucide-react';

const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code >= 1 && code <= 3) return Cloud;
  if (code === 45 || code === 48) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return ThermometerSnowflake;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95 && code <= 99) return CloudLightning;
  return Cloud;
};

// Approximated conversion from degrees to local 10x10 ThreeJS coordinates
function convertLatLngToTerrain(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  gridWidth: number,
  gridHeight: number
) {
  const latRatio = (lat - centerLat) * 111000;
  const lonRatio = (lon - centerLon) * 111000 * Math.cos(centerLat * (Math.PI / 180));
  const scale = gridWidth / 1600; 
  return {
    x: lonRatio * scale,
    z: -latRatio * scale 
  };
}

// Convert LatLng to OSM Tile index
function latLngToTile(lat: number, lng: number, zoom: number) {
  const x = Math.floor(
    ((lng + 180) / 360) * Math.pow(2, zoom)
  );

  const y = Math.floor(
    ((1 - Math.log(
      Math.tan(lat * Math.PI / 180) +
      1 / Math.cos(lat * Math.PI / 180)
    ) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );

  return { x, y };
}

export function TerrainMesh({ matrix, minElevation, maxElevation, isCritical, autoRotate = true }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const overlayMeshRef = useRef<THREE.Mesh>(null);
  const overlayMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sensors = useTerrainStore(state => state.sensors);
  const centerLat = useTerrainStore(state => state.latitude);
  const centerLon = useTerrainStore(state => state.longitude);
  const globalRisk = useTerrainStore(state => state.globalRisk);
  const weatherData = useTerrainStore(state => state.weatherData);
  
  const [sensorPositions, setSensorPositions] = useState<Record<string, THREE.Vector3>>({});

  // Fetch Texture
  const zoom = 16;
  const { x, y } = (centerLat !== null && centerLon !== null) 
     ? latLngToTile(centerLat, centerLon, zoom) 
     : { x: null, y: null };

  const tileUrl = (x !== null && y !== null)
     ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`
     : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/36881/24227"; // Fallback urca

  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      tileUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      (err) => console.warn("Failed to load satellite texture, rendering blank mesh.", err)
    );
  }, [tileUrl]);

  // Deformar a malha
  useEffect(() => {
    if (planeRef.current && matrix) {
      const geometry = planeRef.current.geometry as THREE.PlaneGeometry;
      const vertices = geometry.attributes.position.array;
      
      const rows = matrix.length;
      const cols = matrix[0].length;
      const overlayColors = [];
      const colorInstance = new THREE.Color();

      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const r = Math.floor(j / cols);
        const c = j % cols;
        
        if (r >= rows || c >= cols) {
          overlayColors.push(0, 0, 0);
          continue; 
        }

        const elevation = matrix[r][c];

        // Calcular a inclinação (angulação aproximada baseada na diferença de altura com viziho de baixo r+1)
        let slope = 0;
        if (r < rows - 1) {
           const heightDiff = Math.abs(elevation - matrix[r+1][c]);
           // Assumindo que a distância horizontal entre pontos grid é ~16m na proporção 10x10 atual
           const dist = 16; 
           slope = Math.atan(heightDiff / dist) * (180 / Math.PI);
        }

        // PlaneGeometry nativo tem vértices em X e Y, com Z = 0.
        // Queremos que Y seja a altura, então passamos o Y antigo para o Z, e aplicamos a elevação no Y.
        const originalY = vertices[i + 1];
        vertices[i + 1] = elevation * 0.05;
        vertices[i + 2] = -originalY; // Invertendo Y do plano 2D para virar o Depth no 3D

        // Definindo a cor do overlay transparente baseado em risco do terreno pontual
        if (slope > 25) {
          colorInstance.setRGB(1.0, 0.0, 0.0); // Red
        } else if (slope > 15) {
          colorInstance.setRGB(1.0, 1.0, 0.0); // Yellow
        } else if (slope > 0) {
          colorInstance.setRGB(0.0, 0.5, 0.0); // Muted Green
        } else {
          colorInstance.setRGB(0.0, 0.0, 0.0); // Black/Invisible
        }
        overlayColors.push(colorInstance.r, colorInstance.g, colorInstance.b);
      }
      
      geometry.computeVertexNormals();
      // OBRIGATÓRIO PARA RAYCASTER: atualizar caixas de contorno
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      planeRef.current.updateMatrixWorld(true);

      // Se temos o mesh do overlay, também atualizamos a geometria lá ou copiamos
      if (overlayMeshRef.current) {
        // Garantimos que a geometria do overlay pegue os pontos deformados e o mapa de cor dele
        if (!overlayMeshRef.current.geometry || overlayMeshRef.current.geometry.uuid !== geometry.uuid) {
           overlayMeshRef.current.geometry = geometry;
        }
        overlayMeshRef.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(overlayColors, 3));
      }

    }
  }, [matrix, minElevation, maxElevation, isCritical]);

  // Posicionar os sensores visualmente via Raycaster após deformação
  useEffect(() => {
    if (!planeRef.current || sensors.length === 0) return;

    // Aguardar o frame de update da geometria para o Raycaster ler a malha deformada
    setTimeout(() => {
       if (!planeRef.current) return;
       
       const raycaster = new THREE.Raycaster();
       const downDirection = new THREE.Vector3(0, -1, 0);
       const updatedPositions: Record<string, THREE.Vector3> = {};

       const sensorRadius = 0.15; // Usado no Sphere args=[0.15]
       const sensorHeight = sensorRadius * 2;

       sensors.forEach((s) => {
          // Origem local (sempre paralela à malha, independente da rotação em andamento do grupo vindo do useFrame)
          const localOrigin = new THREE.Vector3(s.position.x, 1000, s.position.y);
          const localDirection = new THREE.Vector3(0, -1, 0);

          // Raycaster requer vetores no World Space, então convertemos mantendo o rastreio
          const originWorld = planeRef.current!.localToWorld(localOrigin.clone());
          
          // O vetor direção no World Space é calculado pegando um segundo ponto abaixo dele no Local Space, e traduzindo
          // para calcularmos exatamente a flecha geométrica apontada para a malha em translação
          const pointBelowLocal = localOrigin.clone().add(localDirection);
          const pointBelowWorld = planeRef.current!.localToWorld(pointBelowLocal);
          const directionWorld = pointBelowWorld.sub(originWorld).normalize();

          raycaster.set(originWorld, directionWorld);

          const intersects = raycaster.intersectObject(planeRef.current!);

          if (intersects.length > 0) {
             const intersect = intersects[0];
             const point = intersect.point.clone(); // World space point

             // Ajuste Avançado: Usar a normal da face para apoiar perfeitamente na ladeira
             if (intersect.face) {
                 const normal = intersect.face.normal.clone();
                 normal.transformDirection(planeRef.current!.matrixWorld);
                 
                 // Adiciona a metade da altura exata projetada na normal do triângulo
                 point.add(normal.multiplyScalar(sensorHeight / 2));
             } else {
                 // Fallback vertical simples
                 point.y += (sensorHeight / 2);
             }

             // Conversão de volta para o Local Space garante que eles rotacionem junto com a Malha no Grupo Pai
             planeRef.current!.worldToLocal(point);

             updatedPositions[s.id] = point;
          }
       });

       setSensorPositions(updatedPositions);

    }, 50);

  }, [sensors, matrix, centerLat, centerLon]);

  useFrame(({ clock }) => {
    if (groupRef.current && autoRotate) {
       groupRef.current.rotation.y -= 0.001; // Rotaciona o grupo todo (Malha + Sensores)
    }

    if (overlayMatRef.current) {
       // Animação "breathing" de pulso dependendo do risco
       const time = clock.elapsedTime;
       const speed = globalRisk > 80 ? 4 : 1.5;
       const baseOpacity = globalRisk > 80 ? 0.6 : 0.3;
       
       const pulse = baseOpacity + (Math.sin(time * speed) * 0.15);
       overlayMatRef.current.opacity = pulse;
    }
  });

  const getSensorColor = (risk: number) => {
    if (risk > 70) return "#ef4444";
    if (risk > 40) return "#f97316";
    if (risk > 15) return "#eab308";
    return "#10b981";
  };

  const currentCode = weatherData?.current?.weatherCode;
  const WeatherIcon = currentCode !== undefined ? getWeatherIcon(currentCode) : null;
  const isRaining = currentCode >= 51 && currentCode <= 67 || currentCode >= 80 && currentCode <= 82 || currentCode >= 95;

  return (
    <group ref={groupRef}>
      {WeatherIcon && (
         <Html position={[0, 8, 0]} center scale={1.5} className="pointer-events-none">
            <div className={`p-4 rounded-full backdrop-blur-md border border-white/20 shadow-2xl ${isRaining ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white'}`}>
              <WeatherIcon className={`w-10 h-10 ${isRaining ? 'animate-bounce' : 'animate-pulse'}`} />
            </div>
         </Html>
      )}

      {/* Base Texturada do OSM */}
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          map={texture}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Risk Overlay Translucido (usa mesma geom depois do useEffect) */}
      <mesh ref={overlayMeshRef} position={[0, 0.02, 0]}>
         {/* O material tem blending aditivo pra somar com o brilho da textura */}
         <meshBasicMaterial 
           ref={overlayMatRef} 
           vertexColors={true} 
           transparent={true} 
           opacity={0.4} 
           depthWrite={false} 
           blending={THREE.AdditiveBlending}
         />
      </mesh>
      
      {/* Sensores ancorados visualmente pelo Raycaster */}
      {sensors.map((s) => {
         const pos = sensorPositions[s.id];
         if (!pos) return null; // Esconde enquanto não ancorar

         return (
            <Sphere 
              key={s.id} 
              args={[0.15, 16, 16]} 
              position={[pos.x, pos.y, pos.z]}
            >
              <meshStandardMaterial 
                color={getSensorColor(s.localRisk)} 
                emissive={getSensorColor(s.localRisk)} 
                emissiveIntensity={s.localRisk > 70 ? 2 : 0.5} 
              />
            </Sphere>
         );
      })}
    </group>
  );
}
