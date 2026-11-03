"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AlertTriangle, Radio } from 'lucide-react';
import * as THREE from 'three';
import { useTerrainStore, GeotechnicalStation } from '@/store/terrainStore';

// Helper to build a closed geological bedrock pedestal (skirt geometry)
function buildSkirtGeometry(
  vertices: ArrayLike<number>,
  rows: number,
  cols: number,
  bottomY: number = -0.75
): THREE.BufferGeometry {
  const boundaryIndices: number[] = [];

  // Top edge (r = 0, c = 0 -> cols-1)
  for (let c = 0; c < cols; c++) {
    boundaryIndices.push(0 * cols + c);
  }
  // Right edge (c = cols-1, r = 1 -> rows-1)
  for (let r = 1; r < rows; r++) {
    boundaryIndices.push(r * cols + (cols - 1));
  }
  // Bottom edge (r = rows-1, c = cols-2 -> 0)
  for (let c = cols - 2; c >= 0; c--) {
    boundaryIndices.push((rows - 1) * cols + c);
  }
  // Left edge (c = 0, r = rows-2 -> 1)
  for (let r = rows - 2; r >= 1; r--) {
    boundaryIndices.push(r * cols + 0);
  }

  const numPoints = boundaryIndices.length;
  const positions: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const nextI = (i + 1) % numPoints;

    const idxA = boundaryIndices[i];
    const idxB = boundaryIndices[nextI];

    const Ax = vertices[idxA * 3];
    const Ay = vertices[idxA * 3 + 1];
    const Az = vertices[idxA * 3 + 2];

    const Bx = vertices[idxB * 3];
    const By = vertices[idxB * 3 + 1];
    const Bz = vertices[idxB * 3 + 2];

    // Triangle 1: TopA, BottomA, TopB
    positions.push(Ax, Ay, Az);
    positions.push(Ax, bottomY, Az);
    positions.push(Bx, By, Bz);

    // Triangle 2: TopB, BottomA, BottomB
    positions.push(Bx, By, Bz);
    positions.push(Ax, bottomY, Az);
    positions.push(Bx, bottomY, Bz);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

function getSensorColor(risk: number) {
  if (risk > 70) return "#ef4444";
  if (risk > 40) return "#f97316";
  if (risk > 15) return "#eab308";
  return "#10b981";
}

export type GisLayerMode = 'slope' | 'contour' | 'drainage';

interface TerrainMeshProps {
  matrix: number[][] | null;
  minElevation: number;
  maxElevation: number;
  isCritical?: boolean;
  autoRotate?: boolean;
  onSelectSensor?: (id: string) => void;
  layerMode?: GisLayerMode;
}

export function TerrainMesh({ 
  matrix, 
  minElevation, 
  maxElevation, 
  isCritical, 
  autoRotate = true, 
  onSelectSensor,
  layerMode = 'slope'
}: TerrainMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const sensors = useTerrainStore(state => state.sensors);
  const sensorsEnabled = useTerrainStore(state => state.sensorsEnabled);
  
  const [sensorPositions, setSensorPositions] = useState<Record<string, THREE.Vector3>>({});
  const [skirtGeometry, setSkirtGeometry] = useState<THREE.BufferGeometry | null>(null);
  const waterIndicesRef = useRef<number[]>([]);

  // Deformar a malha e mapear cores geotécnicas/topográficas (Native PlaneGeometry sem tiles externos)
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

        if (isWater) {
          colorInstance.setRGB(0.01, 0.52, 0.78);
        } else if (layerMode === 'contour') {
          // Isolinhas / Curvas de Nível Topográficas a cada 10 metros
          const contourInterval = 10;
          const distToContour = Math.abs(elevation % contourInterval);
          const isMajorContour = Math.abs(elevation % (contourInterval * 5)) < 0.6;
          const isContourLine = distToContour < 0.45 || (contourInterval - distToContour) < 0.45;
          
          if (isMajorContour) {
            colorInstance.setRGB(0.05, 0.08, 0.15); // Linha mestre de cota escura
          } else if (isContourLine) {
            colorInstance.setRGB(0.18, 0.26, 0.36); // Linha intermediária
          } else {
            // Gradiente hipsométrico de elevação
            colorInstance.setHSL(0.55 - normalizedH * 0.45, 0.7, 0.35 + normalizedH * 0.3);
          }
        } else if (layerMode === 'drainage') {
          // Análise hidrológica de talvegues e convergência de escoamento
          const laplacian = (matrix[nextR][c] + matrix[prevR][c] + matrix[r][nextC] + matrix[r][prevC] - 4 * elevation);
          if (laplacian > 0.35) {
            colorInstance.setRGB(0.02, 0.88, 0.98); // Talvegue principal (Ciano intenso)
          } else if (laplacian > 0.12) {
            colorInstance.setRGB(0.14, 0.52, 0.95); // Canal de drenagem secundário (Azul)
          } else if (laplacian < -0.15) {
            colorInstance.setRGB(0.28, 0.32, 0.38); // Crista divisora de águas (Cinza rochoso)
          } else {
            colorInstance.setRGB(0.12, 0.16, 0.22); // Encosta intermediária
          }
        } else {
          // Modo padrão 'slope': Mapeamento Geotécnico Real de Suscetibilidade da Encosta (CPRM/IPT/NBR 11682)
          if (slopeDeg < 15) {
            colorInstance.setRGB(0.13, 0.77, 0.36); // #22c55e Verde - Estável (<15°)
          } else if (slopeDeg < 25) {
            colorInstance.setRGB(0.92, 0.70, 0.03); // #eab308 Amarelo - Moderado (15°-25°)
          } else if (slopeDeg < 35) {
            colorInstance.setRGB(0.98, 0.45, 0.09); // #f97316 Laranja - Alto Risco (25°-35°)
          } else {
            colorInstance.setRGB(0.94, 0.27, 0.27); // #ef4444 Vermelho - Crítico / Ruptura (>35°)
          }
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

      // Gerar a base geológica volumétrica sólida (bedrock skirt)
      const skirt = buildSkirtGeometry(vertices, rows, cols, -0.65);
      setSkirtGeometry((prev) => {
        if (prev) prev.dispose();
        return skirt;
      });
    }
  }, [matrix, minElevation, maxElevation, isCritical, layerMode]);

  // Posicionar os sensores visualmente na superfície exata da malha 3D via Raycaster
  useEffect(() => {
    if (!planeRef.current || sensors.length === 0) return;

    setTimeout(() => {
       if (!planeRef.current) return;
       
       const raycaster = new THREE.Raycaster();
       const updatedPositions: Record<string, THREE.Vector3> = {};

       const sensorRadius = 0.12;
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

  const range = maxElevation - minElevation || 1;
  const centerElev = matrix && matrix.length > 0
    ? matrix[Math.floor(matrix.length / 2)][Math.floor(matrix[0].length / 2)]
    : minElevation;
  const vScale = Math.min(3.5, Math.max(0.9, range / 30));
  const centerHeight = ((centerElev - minElevation) / range) * vScale;

  return (
    <group ref={groupRef}>
      {/* 1. Terreno Sólido com Cores Geotécnicas e Topográficas Nativas */}
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          vertexColors 
          wireframe={false} 
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>
      
      {/* 2. Malha Topográfica Tática 3D (Wireframe Grid com linhas de relevo) */}
      {planeRef.current && (
        <mesh geometry={planeRef.current.geometry} position={[0, 0.005, 0]}>
          <meshBasicMaterial 
            wireframe 
            color={isCritical ? "#ef4444" : "#38bdf8"} 
            transparent 
            opacity={0.25} 
            depthTest={true}
          />
        </mesh>
      )}

      {/* 3. Bloco Geológico com Base de Rocha-Mãe Extrudada (Bedrock Pedestal) */}
      {skirtGeometry && (
        <group>
          {/* Paredes de rocha profunda do manto */}
          <mesh geometry={skirtGeometry}>
            <meshStandardMaterial 
              color="#070a12" 
              roughness={0.88} 
              metalness={0.2} 
              side={THREE.DoubleSide} 
            />
          </mesh>
          {/* Linhas de estratigrafia / grid tático da base */}
          <mesh geometry={skirtGeometry}>
            <meshBasicMaterial 
              wireframe 
              color="#0284c7" 
              transparent 
              opacity={0.2} 
            />
          </mesh>
          {/* Placa inferior de fechamento do bloco geológico */}
          <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#030508" roughness={1.0} />
          </mesh>
        </group>
      )}

      {/* 4. Varredura Laser Orbital (Lidar Scanline Sweep) */}
      {matrix && <LidarScanPlane />}

      {/* 5. Baliza de Sondagem Lidar no ponto central pesquisado */}
      {matrix && (
        <LidarSurveyorBeacon 
          centerHeight={centerHeight} 
          centerElev={centerElev}
        />
      )}
      
      {/* 6. Estações Geotécnicas Industriais ancoradas diretamente na superfície da encosta */}
      {sensorsEnabled && sensors.map((s, idx) => {
         const pos = sensorPositions[s.id];
         if (!pos) return null;

         return (
            <GeotechnicalStationProbe 
              key={s.id} 
              sensor={s} 
              index={idx + 1}
              position={pos} 
              onSelect={onSelectSensor} 
            />
         );
      })}
    </group>
  );
}

// Subcomponente 1: Varredura Laser Orbital Lidar
function LidarScanPlane() {
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (scanRef.current) {
      const t = state.clock.getElapsedTime();
      scanRef.current.position.z = Math.sin(t * 0.75) * 5.0;
    }
  });

  return (
    <mesh ref={scanRef} position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10.2, 0.08]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Subcomponente 2: Baliza de Sondagem Lidar Holográfica Compacta (só expande no hover)
function LidarSurveyorBeacon({ centerHeight, centerElev }: { centerHeight: number; centerElev: number }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  const slopeData = useTerrainStore(state => state.slopeData);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1Ref.current) {
      const s = 1 + (Math.sin(t * 3.5) + 1) * 0.25;
      ring1Ref.current.scale.set(s, s, 1);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= 0.02;
    }
    if (beaconRef.current) {
      beaconRef.current.rotation.y += 0.025;
      beaconRef.current.position.y = centerHeight + 0.75 + Math.sin(t * 2.5) * 0.04;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Alvo no Solo e Anéis Concéntricos */}
      <group position={[0, centerHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[0.06, 16]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
        <mesh ref={ring1Ref}>
          <ringGeometry args={[0.12, 0.16, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ring2Ref}>
          <ringGeometry args={[0.24, 0.28, 32]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Feixe Laser Vertical de Sondagem */}
      <mesh position={[0, centerHeight + 0.38, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.75, 8]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} />
      </mesh>

      {/* Baliza Holográfica Superior */}
      <group ref={beaconRef} position={[0, centerHeight + 0.75, 0]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
        >
          <octahedronGeometry args={[0.09]} />
          <meshStandardMaterial 
            color="#00f0ff" 
            emissive="#00f0ff" 
            emissiveIntensity={2.2} 
            roughness={0.1}
            metalness={0.9} 
          />
        </mesh>
      </group>

      {/* Etiqueta HUD do Alvo Central: Pílula discreta por padrão, expande ao passar o mouse */}
      <Html position={[0, centerHeight + 1.05, 0]} center>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="select-none pointer-events-auto font-mono transition-all duration-200"
        >
          {!hovered ? (
            <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="text-[9px] font-black text-cyan-300 tracking-wider">
                ALVO CENTRAL • {centerElev.toFixed(0)}m
              </span>
            </div>
          ) : (
            <div className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 px-3 py-2 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.4)] text-left min-w-[205px]">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1 mb-1.5">
                <span className="text-[9px] font-black text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                  LIDAR // ALVO CENTRAL
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  SRTM-30M
                </span>
              </div>
              <div className="text-[10px] text-gray-300 space-y-0.5 leading-tight">
                <div className="flex justify-between">
                  <span className="text-gray-500">COORD:</span>
                  <span className="text-cyan-200 font-bold">
                    {latitude ? `${latitude.toFixed(4)}°, ${longitude?.toFixed(4)}°` : 'MAPEANDO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">COTA Z:</span>
                  <span className="text-white font-bold">{centerElev.toFixed(0)}m NMM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">DECLIVIDADE:</span>
                  <span className="text-amber-300 font-bold">{slopeData?.meanSlope || 0}°</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// Subcomponente 3: Sonda Geotécnica ancorada na superfície com badge compacto (expande no hover)
function GeotechnicalStationProbe({
  sensor,
  index,
  position,
  onSelect
}: {
  sensor: GeotechnicalStation;
  index: number;
  position: THREE.Vector3;
  onSelect?: (id: string) => void;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const colorHex = getSensorColor(sensor.localRisk);
  const isHighRisk = sensor.localRisk > 70;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pulseRef.current) {
      const speed = isHighRisk ? 5.5 : 2.5;
      const s = 1 + (Math.sin(t * speed) + 1) * 0.35;
      pulseRef.current.scale.set(s, s, 1);
    }
  });

  const badgeBorderColor =
    sensor.riskLevelCode === 'R4'
      ? 'border-red-500/60 bg-red-950/90 text-red-200'
      : sensor.riskLevelCode === 'R3'
      ? 'border-orange-500/60 bg-orange-950/90 text-orange-200'
      : sensor.riskLevelCode === 'R2'
      ? 'border-yellow-500/60 bg-yellow-950/90 text-yellow-200'
      : 'border-emerald-500/50 bg-slate-950/90 text-emerald-300';

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Base Mecânica da Sonda (Cilindro de Liga Metálica) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 0.16, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Cúpula de Sensor com LED Óptico */}
      <mesh
        position={[0, 0.18, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(sensor.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={isHighRisk ? 2.5 : 1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Anel de onda sísmica/acústica no solo */}
      <mesh ref={pulseRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.09, 0.13, 24]} />
        <meshBasicMaterial
          color={colorHex}
          transparent
          opacity={isHighRisk ? 0.7 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pin / Card Ancorado Exatamente Acima do Sensor no Terreno */}
      <Html position={[0, 0.38, 0]} center zIndexRange={[20, 0]}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(sensor.id);
          }}
          className="select-none pointer-events-auto cursor-pointer font-mono transition-all duration-200"
        >
          {!hovered ? (
            /* Modo Compacto Limpo: não polui nem sobrepõe os outros sensores */
            <div
              className={`px-2 py-0.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-1.5 whitespace-nowrap hover:scale-110 transition-transform ${badgeBorderColor}`}
            >
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span className="text-[9px] font-black tracking-wider">S{index}</span>
              <span className="text-[8px] opacity-80">• {sensor.riskLevelCode || 'R1'}</span>
            </div>
          ) : (
            /* Modo Expandido ao passar o mouse: mostra todos os dados sem bagunça */
            <div className="bg-slate-950/95 backdrop-blur-xl text-white p-3 rounded-xl border border-blue-400/50 shadow-[0_10px_30px_rgba(0,0,0,0.9)] min-w-[175px] font-sans z-50">
              <div className="font-bold border-b border-white/15 pb-1.5 mb-2 text-xs flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-blue-300 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {sensor.id}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-mono uppercase">
                  {sensor.riskLevelCode || 'R1'}
                </span>
              </div>
              <div className="text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fator Seg:</span>
                  <strong className={sensor.safetyFactor && sensor.safetyFactor < 1.3 ? "text-orange-400" : "text-emerald-400"}>
                    {sensor.safetyFactor >= 99 ? 'Estável' : `FS ${sensor.safetyFactor}`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Declividade:</span>
                  <strong className="text-white">{sensor.terrainInclination.toFixed(1)}°</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Saturação:</span>
                  <strong className="text-white">{sensor.soilMoisture.toFixed(0)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chuva 72h:</span>
                  <strong className="text-cyan-400">{sensor.rainVolume.toFixed(0)} mm</strong>
                </div>
              </div>
              <div className="mt-2 pt-1 border-t border-white/10 text-[9px] text-cyan-400 text-center uppercase tracking-wider font-bold font-mono">
                Clique para Abrir Painel
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
