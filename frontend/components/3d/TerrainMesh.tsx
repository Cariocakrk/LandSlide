"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';

// Helper functions for OpenStreetMap Web Mercator projection & tile stitching
function lon2tile(lon: number, zoom: number): number {
  return (lon + 180) / 360 * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
}

function loadTileImage(x: number, y: number, z: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Prevent CORS security issues with WebGL textures
    // Using CartoDB Dark Matter (dark basemap) so streets are light lines on black
    // This allows us to make the street lines glow brilliantly using an emissive map!
    img.src = `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile: ${z}/${x}/${y}`));
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

  const promises: Promise<{ img: HTMLImageElement; dx: number; dy: number }>[] = [];
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      promises.push(
        loadTileImage(baseTileX + dx, baseTileY + dy, zoom).then(img => ({ img, dx, dy }))
      );
    }
  }

  const loadedTiles = await Promise.all(promises);
  for (const { img, dx, dy } of loadedTiles) {
    ctx.drawImage(img, dx * 256, dy * 256);
  }

  // Adicionar um overlay translúcido extremamente sutil (5% opacidade) sobre a textura escura.
  // Isso garante que a montanha continue muito escura, elegante e confortável,
  // enquanto as cores dos picos e ladeiras aparecem apenas como um leve sopro de cor
  // translúcido para facilitar a identificação da elevação tridimensional.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(0, 0, 768, 768);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Could not get output 2D context');

  const pixelOffsetX = (centerX - baseTileX) * 256;
  const pixelOffsetY = (centerY - baseTileY) * 256;

  // Physical scale alignment: Map the dynamic geographic size based on 30m resolution grid
  const radians = lat * Math.PI / 180;
  const tileWidthMeters = (40075016 * Math.cos(radians)) / Math.pow(2, zoom);
  const gridWidthMeters = 63 * 30; // 63 cells * 30 meters
  const numTilesCovered = gridWidthMeters / tileWidthMeters;
  const cropSize = Math.round(numTilesCovered * 256);

  const startX = pixelOffsetX - (cropSize / 2);
  const startY = pixelOffsetY - (cropSize / 2);

  outCtx.drawImage(canvas, startX, startY, cropSize, cropSize, 0, 0, size, size);
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

        // Se for corpo d'água (oceanos, praias ou vales de rios profundos), achatamos a elevação
        // para que a água fique perfeitamente plana, lisa e sem ruídos/pontas na renderização
        const isWater = normalizedH < 0.05;
        if (isWater) {
          waterIndices.push(j);
        }
        const finalElevation = isWater ? minElevation : elevation;

        // PlaneGeometry nativo tem dimensões 10x10. Calculamos matematicamente X e Y originais
        // com base nos índices de linha r e coluna c, tornando a deformação totalmente stateless e imune a re-renders.
        const width = 10;
        const height = 10;
        const nativeX = -width / 2 + c * (width / (cols - 1));
        const nativeY = height / 2 - r * (height / (rows - 1));

        vertices[i] = nativeX;
        vertices[i + 1] = finalElevation * 0.05;
        vertices[i + 2] = -nativeY;
        
        // Mapeamento de cor (Cores neon puras e saturadas para que as ruas emissivas brilhem intensamente
        // nas cores de risco corretas, enquanto o fundo preto da textura oculta o resto do relevo)
        if (isWater) {
          // Azul/Ciano brilhante para oceanos, praias e rios (completamente plano)
          colorInstance.setHSL(0.58, 1.0, 0.45);
        } else if (isCritical) {
          // Vermelho crítico puro
          colorInstance.setHSL(0.0, 1.0, 0.5);
        } else if (normalizedH < 0.3) {
          // Verde seguro puro
          colorInstance.setHSL(0.33, 1.0, 0.5);
        } else if (normalizedH < 0.7) {
          // Amarelo/Laranja de transição
          colorInstance.setHSL(0.08, 1.0, 0.5);
        } else {
          // Vermelho risco alto
          colorInstance.setHSL(0.0, 1.0, 0.5);
        }
        
        colors.push(colorInstance.r, colorInstance.g, colorInstance.b);
      }
      
      waterIndicesRef.current = waterIndices;
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      // OBRIGATÓRIO PARA RAYCASTER: atualizar caixas de contorno
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      planeRef.current.updateMatrixWorld(true);
    }
  }, [matrix, minElevation, maxElevation, isCritical]);

  // Posicionar os sensores visualmente via Raycaster após deformação
  useEffect(() => {
    if (!planeRef.current || sensors.length === 0) return;

    // Aguardar o frame de update da geometria para o Raycaster ler a malha deformada
    setTimeout(() => {
       if (!planeRef.current) return;
       
       const raycaster = new THREE.Raycaster();
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

  }, [sensors, matrix]);

  useFrame((state) => {
    if (groupRef.current && autoRotate) {
       groupRef.current.rotation.y -= 0.001; // Rotaciona o grupo todo (Malha + Sensores)
    }

    // Animates the river and ocean vertices with a gorgeous flowing pulse
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
          
          // Onda progressiva que simula o fluxo da água correndo tridimensionalmente pela malha
          const flowWave = Math.sin(time * 5.0 - (r + c) * 0.25);
          const pulse = 0.45 + flowWave * 0.20;
          
          // Azul ciano neon vibrante pulsante com variação sutil de matiz baseada na posição do grid
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

  return (
    <group ref={groupRef}>
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          vertexColors 
          map={streetTexture || undefined}
          emissiveMap={streetTexture || undefined}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={3.5}
          wireframe={false} 
          roughness={0.4}
          metalness={0.3}
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
