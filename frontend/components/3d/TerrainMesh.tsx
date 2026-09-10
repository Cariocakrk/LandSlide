"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import { MapPin } from 'lucide-react';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';

// Helper functions for OpenStreetMap Web Mercator projection & tile stitching
function lon2tile(lon: number, zoom: number): number {
  return (lon + 180) / 360 * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
}

function loadTileImage(x: number, y: number, z: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const subdomains = ['a', 'b', 'c', 'd'];
    const s = subdomains[Math.abs(x + y) % subdomains.length];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // CartoDB Voyager: mapa viário com ruas de alto contraste e nomes legíveis
    img.src = `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback 1: CartoDB dark_all
      const darkImg = new Image();
      darkImg.crossOrigin = 'anonymous';
      darkImg.src = `https://${s}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
      darkImg.onload = () => resolve(darkImg);
      darkImg.onerror = () => {
        // Fallback 2: OpenStreetMap
        const osmImg = new Image();
        osmImg.crossOrigin = 'anonymous';
        osmImg.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        osmImg.onload = () => resolve(osmImg);
        osmImg.onerror = () => resolve(null);
      };
    };
  });
}

async function generateStitchedMap(lat: number, lon: number, zoom: number = 15, size: number = 1024): Promise<HTMLCanvasElement> {
  const centerX = lon2tile(lon, zoom);
  const centerY = lat2tile(lat, zoom);

  const baseTileX = Math.floor(centerX) - 1;
  const baseTileY = Math.floor(centerY) - 1;

  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  const promises: Promise<{ img: HTMLImageElement | null; dx: number; dy: number }>[] = [];
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      promises.push(
        loadTileImage(baseTileX + dx, baseTileY + dy, zoom).then(img => ({ img, dx, dy }))
      );
    }
  }

  const loadedTiles = await Promise.all(promises);
  for (const { img, dx, dy } of loadedTiles) {
    if (img) {
      ctx.drawImage(img, dx * 256, dy * 256);
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Could not get output 2D context');

  const pixelOffsetX = (centerX - baseTileX) * 256;
  const pixelOffsetY = (centerY - baseTileY) * 256;

  const radians = (lat * Math.PI) / 180;
  const tileWidthMeters = (40075016 * Math.cos(radians)) / Math.pow(2, zoom);
  const gridWidthMeters = 1400; // ~1.4km de amplitude topográfica
  const numTilesCovered = gridWidthMeters / tileWidthMeters;
  const cropSize = Math.max(100, Math.min(768, Math.round(numTilesCovered * 256)));

  const startX = Math.max(0, Math.min(768 - cropSize, Math.round(pixelOffsetX - cropSize / 2)));
  const startY = Math.max(0, Math.min(768 - cropSize, Math.round(pixelOffsetY - cropSize / 2)));

  outCtx.drawImage(canvas, startX, startY, cropSize, cropSize, 0, 0, size, size);

  // Traçar grade topográfica elegante com linhas azuis translúcidas sobre o mapa viário
  outCtx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  outCtx.lineWidth = 1.5;
  const step = size / 24;
  for (let p = 0; p <= size; p += step) {
    outCtx.beginPath();
    outCtx.moveTo(p, 0);
    outCtx.lineTo(p, size);
    outCtx.stroke();

    outCtx.beginPath();
    outCtx.moveTo(0, p);
    outCtx.lineTo(size, p);
    outCtx.stroke();
  }

  return outCanvas;
}

interface TerrainMeshProps {
  matrix: number[][] | null;
  minElevation: number;
  maxElevation: number;
  isCritical?: boolean;
  autoRotate?: boolean;
  onSelectSensor?: (id: string) => void;
}

export function TerrainMesh({ matrix, minElevation, maxElevation, isCritical, autoRotate = true, onSelectSensor }: TerrainMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const sensors = useTerrainStore(state => state.sensors);
  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  
  const [sensorPositions, setSensorPositions] = useState<Record<string, THREE.Vector3>>({});
  const [streetTexture, setStreetTexture] = useState<THREE.CanvasTexture | null>(null);
  const waterIndicesRef = useRef<number[]>([]);

  // Hook dinâmico para gerar e costurar o mapa de ruas reais via canvas offscreen
  useEffect(() => {
    let active = true;
    let currentTexture: THREE.CanvasTexture | null = null;

    if (latitude !== null && longitude !== null) {
      generateStitchedMap(latitude, longitude, 15, 1024)
        .then((canvas) => {
          if (!active) return;
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          currentTexture = texture;
          setStreetTexture(texture);
        })
        .catch((err) => {
          console.error("Failed to stitch street map tiles:", err);
          if (active) setStreetTexture(null);
        });
    } else {
      setStreetTexture(null);
    }

    return () => {
      active = false;
      if (currentTexture) {
        currentTexture.dispose();
      }
    };
  }, [latitude, longitude]);

  // Deformar a malha e mapear cores (Native PlaneGeometry)
  useEffect(() => {
    if (planeRef.current && matrix) {
      const geometry = planeRef.current.geometry as THREE.PlaneGeometry;
      const vertices = geometry.attributes.position.array;
      const colors = [];
      const colorInstance = new THREE.Color();
      
      const rows = matrix.length;
      const cols = matrix[0].length;
      const range = maxElevation - minElevation || 1; 

      const waterIndices: number[] = [];

      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const r = Math.floor(j / cols);
        const c = j % cols;
        
        if (r >= rows || c >= cols) {
           colors.push(0, 0, 0);
           continue; 
        }

        const elevation = matrix[r][c];
        const range = maxElevation - minElevation || 1;
        const normalizedH = (elevation - minElevation) / range;

        // Se for oceano ou nível do mar real (elevação <= 0), achatamos a elevação
        const isWater = elevation <= 0 || (minElevation <= 0 && normalizedH < 0.03);
        if (isWater) {
          waterIndices.push(j);
        }
        const finalElevation = isWater ? minElevation : elevation;

        // Escala vertical proporcional e esteticamente clara do relevo (desnível em metros)
        const vScale = Math.min(3.5, Math.max(0.9, range / 30));
        const normalizedY = ((finalElevation - minElevation) / range) * vScale;

        // PlaneGeometry nativo tem dimensões 10x10. Calculamos matematicamente X e Y originais
        // com base nos índices de linha r e coluna c, tornando a deformação totalmente stateless e imune a re-renders.
        const width = 10;
        const height = 10;
        const nativeX = -width / 2 + c * (width / (cols - 1));
        const nativeY = height / 2 - r * (height / (rows - 1));

        vertices[i] = nativeX;
        vertices[i + 1] = normalizedY;
        vertices[i + 2] = -nativeY;
        
        // Cálculo geomorfométrico de declividade real por vértice (graus)
        const nextC = Math.min(cols - 1, c + 1);
        const prevC = Math.max(0, c - 1);
        const nextR = Math.min(rows - 1, r + 1);
        const prevR = Math.max(0, r - 1);

        const dzdx = (matrix[r][nextC] - matrix[r][prevC]) / ((nextC - prevC || 1) * 38);
        const dzdy = (matrix[nextR][c] - matrix[prevR][c]) / ((nextR - prevR || 1) * 38);
        const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

        // Mapeamento Geotécnico Real de Suscetibilidade da Encosta (CPRM/IPT):
        if (isWater) {
          colorInstance.setHSL(0.58, 1.0, 0.45);
        } else if (isCritical) {
          colorInstance.setHSL(slopeDeg > 20 ? 0.0 : 0.08, 1.0, 0.5);
        } else if (slopeDeg < 15) {
          colorInstance.setHSL(0.33, 0.9, 0.45);
        } else if (slopeDeg < 25) {
          colorInstance.setHSL(0.14, 1.0, 0.5);
        } else if (slopeDeg < 35) {
          colorInstance.setHSL(0.06, 1.0, 0.5);
        } else {
          colorInstance.setHSL(0.0, 1.0, 0.5);
        }
        
        colors.push(colorInstance.r, colorInstance.g, colorInstance.b);
      }
      
      waterIndicesRef.current = waterIndices;
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      planeRef.current.updateMatrixWorld(true);
    }
  }, [matrix, minElevation, maxElevation, isCritical]);

  // Atualizar textura de ruas no material do Three.js quando o CanvasTexture for gerado
  useEffect(() => {
    if (planeRef.current && planeRef.current.material) {
      const mat = planeRef.current.material as THREE.MeshStandardMaterial;
      mat.map = streetTexture;
      mat.needsUpdate = true;
    }
  }, [streetTexture]);

  // Posicionar os sensores visualmente via Raycaster após deformação
  useEffect(() => {
    if (!planeRef.current || sensors.length === 0) return;

    setTimeout(() => {
       if (!planeRef.current) return;
       
       const raycaster = new THREE.Raycaster();
       const updatedPositions: Record<string, THREE.Vector3> = {};

       const sensorRadius = 0.15;
       const sensorHeight = sensorRadius * 2;

       sensors.forEach((s) => {
          const localOrigin = new THREE.Vector3(s.position.x, 1000, s.position.y);
          const localDirection = new THREE.Vector3(0, -1, 0);

          const originWorld = planeRef.current!.localToWorld(localOrigin.clone());
          const pointBelowLocal = localOrigin.clone().add(localDirection);
          const pointBelowWorld = planeRef.current!.localToWorld(pointBelowLocal);
          const directionWorld = pointBelowWorld.sub(originWorld).normalize();

          raycaster.set(originWorld, directionWorld);

          const intersects = raycaster.intersectObject(planeRef.current!);

          if (intersects.length > 0) {
             const intersect = intersects[0];
             const point = intersect.point.clone();

             if (intersect.face) {
                 const normal = intersect.face.normal.clone();
                 normal.transformDirection(planeRef.current!.matrixWorld);
                 point.add(normal.multiplyScalar(sensorHeight / 2));
             } else {
                 point.y += (sensorHeight / 2);
             }

             planeRef.current!.worldToLocal(point);
             updatedPositions[s.id] = point;
          }
       });

       setSensorPositions(updatedPositions);
    }, 50);

  }, [sensors, matrix]);

  useFrame((state) => {
    if (groupRef.current && autoRotate) {
       groupRef.current.rotation.y -= 0.001;
    }

    if (planeRef.current && waterIndicesRef.current.length > 0) {
      const geometry = planeRef.current.geometry;
      const colorsAttr = geometry.getAttribute('color');
      if (colorsAttr) {
        const colors = colorsAttr.array as Float32Array;
        const time = state.clock.getElapsedTime();
        const cols = matrix?.[0]?.length || 64;
        const colorInstance = new THREE.Color();
        
        waterIndicesRef.current.forEach((j) => {
          const r = Math.floor(j / cols);
          const c = j % cols;
          const flowWave = Math.sin(time * 5.0 - (r + c) * 0.25);
          const pulse = 0.45 + flowWave * 0.20;
          colorInstance.setHSL(0.56 + Math.cos(time + r * 0.05) * 0.02, 1.0, pulse);
          
          colors[j * 3] = colorInstance.r;
          colors[j * 3 + 1] = colorInstance.g;
          colors[j * 3 + 2] = colorInstance.b;
        });
        
        colorsAttr.needsUpdate = true;
      }
    }
  });

  const getSensorColor = (risk: number) => {
    if (risk > 70) return "#ef4444";
    if (risk > 40) return "#f97316";
    if (risk > 15) return "#eab308";
    return "#10b981";
  };

  const range = maxElevation - minElevation || 1;
  const centerElev = matrix && matrix.length > 0
    ? matrix[Math.floor(matrix.length / 2)][Math.floor(matrix[0].length / 2)]
    : minElevation;
  const vScale = Math.min(3.5, Math.max(0.9, range / 30));
  const centerHeight = ((centerElev - minElevation) / range) * vScale;

  return (
    <group ref={groupRef}>
      {/* Terreno Sólido com Mapa Viário e Cores de Risco Geotécnico */}
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          vertexColors 
          map={streetTexture || undefined}
          wireframe={false} 
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* Malha Topográfica 3D (Wireframe Grid com linhas de relevo) */}
      {planeRef.current && (
        <mesh geometry={planeRef.current.geometry} position={[0, 0.006, 0]}>
          <meshBasicMaterial 
            wireframe 
            color={isCritical ? "#ef4444" : "#38bdf8"} 
            transparent 
            opacity={0.32} 
            depthTest={true}
          />
        </mesh>
      )}

      {/* Pin 3D destacado do endereço pesquisado no centro */}
      {matrix && <AddressPin centerHeight={centerHeight} />}
      
      {/* Sensores ancorados visualmente pelo Raycaster */}
      {sensors.map((s) => {
         const pos = sensorPositions[s.id];
         if (!pos) return null; // Esconde enquanto não ancorar

         return (
            <Sphere 
              key={s.id} 
              args={[0.15, 16, 16]} 
              position={[pos.x, pos.y, pos.z]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSensor?.(s.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
              }}
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

// Sub-componente AddressPin 3D flutuante premium
function AddressPin({ centerHeight }: { centerHeight: number }) {
  const pinRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (pinRef.current) {
      // Flutuação suave
      pinRef.current.position.y = centerHeight + 0.4 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1;
      // Rotação suave do cabeçote
      pinRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={pinRef} position={[0, centerHeight + 0.4, 0]}>
      {/* Cabeça do Pin - Esfera Neon Azul Brilhante */}
      <mesh castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color="#3b82f6" 
          emissive="#3b82f6" 
          emissiveIntensity={2} 
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      
      {/* Corpo do Pin - Cone apontado para baixo */}
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.04, 0.2, 16]} />
        <meshStandardMaterial 
          color="#3b82f6" 
          emissive="#3b82f6" 
          emissiveIntensity={1}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Anel Pulsante no Chão */}
      <mesh position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Tooltip flutuante 2D */}
      <Html position={[0, 0.5, 0]} center pointerEvents="none">
        <div className="bg-blue-600/90 backdrop-blur-md border border-blue-400/30 text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-2xl flex items-center gap-1.5 whitespace-nowrap select-none animate-bounce">
          <MapPin className="w-3 h-3 text-white" />
          <span>Local Pesquisado</span>
        </div>
      </Html>
    </group>
  );
}
