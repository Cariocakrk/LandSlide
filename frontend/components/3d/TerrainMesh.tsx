"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AlertTriangle, Radio } from 'lucide-react';
import * as THREE from 'three';
import { useTerrainStore, GeotechnicalStation } from '@/store/terrainStore';

function buildSkirtGeometry(
  vertices: ArrayLike<number>,
  rows: number,
  cols: number,
  bottomY: number = -0.75
): THREE.BufferGeometry {
  const boundaryIndices: number[] = [];

  for (let c = 0; c < cols; c++) {
    boundaryIndices.push(0 * cols + c);
  }
  for (let r = 1; r < rows; r++) {
    boundaryIndices.push(r * cols + (cols - 1));
  }
  for (let c = cols - 2; c >= 0; c--) {
    boundaryIndices.push((rows - 1) * cols + c);
  }
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

    positions.push(Ax, Ay, Az);
    positions.push(Ax, bottomY, Az);
    positions.push(Bx, By, Bz);

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
  if (risk > 70) return "#B91C1C";
  if (risk > 40) return "#C85A17";
  if (risk > 15) return "#B47B1C";
  return "#2E6F40";
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

  useEffect(() => {
    if (planeRef.current && matrix) {
      const geometry = planeRef.current.geometry as THREE.PlaneGeometry;
      const vertices = geometry.attributes.position.array;
      const colors = [];
      const colorInstance = new THREE.Color();
      
      const rows = matrix.length;
      const cols = matrix[0].length;
      const range = maxElevation - minElevation || 1; 

      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const r = Math.floor(j / cols);
        const c = j % cols;
        
        if (r >= rows || c >= cols) {
           colors.push(0, 0, 0);
           continue; 
        }

        const elevation = matrix[r][c];
        const normalizedH = (elevation - minElevation) / range;

        const isWater = elevation <= 0 || (minElevation <= 0 && normalizedH < 0.03);
        const finalElevation = isWater ? minElevation : elevation;

        const vScale = Math.min(3.5, Math.max(0.9, range / 30));
        const normalizedY = ((finalElevation - minElevation) / range) * vScale;

        const width = 10;
        const height = 10;
        const nativeX = -width / 2 + c * (width / (cols - 1));
        const nativeY = height / 2 - r * (height / (rows - 1));

        vertices[i] = nativeX;
        vertices[i + 1] = normalizedY;
        vertices[i + 2] = -nativeY;
        
        const nextC = Math.min(cols - 1, c + 1);
        const prevC = Math.max(0, c - 1);
        const nextR = Math.min(rows - 1, r + 1);
        const prevR = Math.max(0, r - 1);

        const dzdx = (matrix[r][nextC] - matrix[r][prevC]) / ((nextC - prevC || 1) * 38);
        const dzdy = (matrix[nextR][c] - matrix[prevR][c]) / ((nextR - prevR || 1) * 38);
        const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

        if (isWater) {
          colorInstance.set('#3A6B88');
        } else if (layerMode === 'contour') {
          // Curvas de Nível em tons terrosos arquitetônicos
          const contourInterval = 10;
          const distToContour = Math.abs(elevation % contourInterval);
          const isMajorContour = Math.abs(elevation % (contourInterval * 5)) < 0.6;
          const isContourLine = distToContour < 0.45 || (contourInterval - distToContour) < 0.45;
          
          if (isMajorContour) {
            colorInstance.set('#2B1810');
          } else if (isContourLine) {
            colorInstance.set('#7A4B32');
          } else {
            // Gradiente hipsométrico em areia / terracota
            colorInstance.setHSL(0.08 - normalizedH * 0.03, 0.42, 0.72 - normalizedH * 0.32);
          }
        } else if (layerMode === 'drainage') {
          // Hidrologia e talvegues sobre base terrosa
          const laplacian = (matrix[nextR][c] + matrix[prevR][c] + matrix[r][nextC] + matrix[r][prevC] - 4 * elevation);
          if (laplacian > 0.35) {
            colorInstance.set('#2B6CB0'); // Talvegue principal
          } else if (laplacian > 0.12) {
            colorInstance.set('#4A89C7'); // Canal de drenagem secundário
          } else if (laplacian < -0.15) {
            colorInstance.set('#8C6D58'); // Crista divisora
          } else {
            colorInstance.set('#C4B3A3'); // Encosta intermediária
          }
        } else {
          // Suscetibilidade de Declividade em paleta geotécnica natural
          if (slopeDeg < 15) {
            colorInstance.set('#3E7B52'); // Verde Oliva - Estável (<15°)
          } else if (slopeDeg < 25) {
            colorInstance.set('#C98A27'); // Ocre - Moderado (15°-25°)
          } else if (slopeDeg < 35) {
            colorInstance.set('#C85A17'); // Terracota - Alto Risco (25°-35°)
          } else {
            colorInstance.set('#A92626'); // Carmim - Crítico / Ruptura (>35°)
          }
        }
        
        colors.push(colorInstance.r, colorInstance.g, colorInstance.b);
      }
      
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      planeRef.current.updateMatrixWorld(true);

      const skirt = buildSkirtGeometry(vertices, rows, cols, -0.65);
      setSkirtGeometry((prev) => {
        if (prev) prev.dispose();
        return skirt;
      });
    }
  }, [matrix, minElevation, maxElevation, isCritical, layerMode]);

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

  useFrame(() => {
    if (groupRef.current && autoRotate) {
       groupRef.current.rotation.y -= 0.0008;
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
      {/* 1. Superfície do Terreno */}
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          vertexColors 
          wireframe={false} 
          roughness={0.82}
          metalness={0.08}
        />
      </mesh>
      
      {/* 2. Malha Sutil de Engenharia */}
      {planeRef.current && (
        <mesh geometry={planeRef.current.geometry} position={[0, 0.004, 0]}>
          <meshBasicMaterial 
            wireframe 
            color={isCritical ? "#A92626" : "#5C3D2E"} 
            transparent 
            opacity={0.14} 
            depthTest={true}
          />
        </mesh>
      )}

      {/* 3. Pedestal Geológico em Tons de Solo / Rocha */}
      {skirtGeometry && (
        <group>
          <mesh geometry={skirtGeometry}>
            <meshStandardMaterial 
              color="#3B2316" 
              roughness={0.92} 
              metalness={0.05} 
              side={THREE.DoubleSide} 
            />
          </mesh>
          <mesh geometry={skirtGeometry}>
            <meshBasicMaterial 
              wireframe 
              color="#A85832" 
              transparent 
              opacity={0.18} 
            />
          </mesh>
          <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#2B1810" roughness={1.0} />
          </mesh>
        </group>
      )}

      {/* 4. Marco Topográfico Central */}
      {matrix && (
        <SurveyorCenterMarker 
          centerHeight={centerHeight} 
          centerElev={centerElev}
        />
      )}
      
      {/* 5. Estações Geotécnicas ancoradas na superfície */}
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

function SurveyorCenterMarker({ centerHeight, centerElev }: { centerHeight: number; centerElev: number }) {
  const [hovered, setHovered] = useState(false);

  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  const slopeData = useTerrainStore(state => state.slopeData);

  return (
    <group position={[0, 0, 0]}>
      {/* Base no Solo */}
      <group position={[0, centerHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#A85832" />
        </mesh>
        <mesh>
          <ringGeometry args={[0.13, 0.16, 32]} />
          <meshBasicMaterial color="#2B1810" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Haste Vertical */}
      <mesh position={[0, centerHeight + 0.34, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.65, 8]} />
        <meshBasicMaterial color="#2B1810" />
      </mesh>

      {/* Esfera Superior */}
      <mesh
        position={[0, centerHeight + 0.68, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#A85832" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Etiqueta Discreta */}
      <Html position={[0, centerHeight + 0.96, 0]} center zIndexRange={[4, 0]}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="select-none pointer-events-auto font-sans transition-all duration-200"
        >
          {!hovered ? (
            <div className="bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border-strong)] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] inline-block" />
              <span className="text-[10px] font-bold text-[var(--foreground)]">
                Marco Central • {centerElev.toFixed(0)}m
              </span>
            </div>
          ) : (
            <div className="bg-[var(--surface)]/98 backdrop-blur-xl border border-[var(--border-strong)] px-3.5 py-2.5 rounded-xl shadow-xl text-left min-w-[205px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5">
                <span className="text-[10px] font-bold text-[var(--primary)] uppercase">
                  Marco Topográfico
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-[var(--surface-muted)] text-[var(--foreground)] rounded">
                  SRTM 30m
                </span>
              </div>
              <div className="text-[11px] text-[var(--foreground-muted)] space-y-1">
                <div className="flex justify-between">
                  <span>Coordenada:</span>
                  <span className="text-[var(--foreground)] font-mono font-semibold">
                    {latitude ? `${latitude.toFixed(4)}°, ${longitude?.toFixed(4)}°` : 'Mapeando'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Altitude:</span>
                  <span className="text-[var(--foreground)] font-mono font-semibold">{centerElev.toFixed(0)}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Declividade:</span>
                  <span className="text-[var(--primary)] font-mono font-semibold">{slopeData?.meanSlope || 0}°</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

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
  const [hovered, setHovered] = useState(false);
  const colorHex = getSensorColor(sensor.localRisk);

  const badgeStyle =
    sensor.riskLevelCode === 'R4'
      ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
      : sensor.riskLevelCode === 'R3'
      ? 'border-[#C85A17] bg-[#C85A17] text-white'
      : sensor.riskLevelCode === 'R2'
      ? 'border-[#B47B1C] bg-[#B47B1C] text-white'
      : 'border-[var(--border-strong)] bg-[var(--surface)]/95 text-[var(--foreground)]';

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 0.16, 12]} />
        <meshStandardMaterial color="#2B1810" metalness={0.4} roughness={0.5} />
      </mesh>

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
          roughness={0.25}
          metalness={0.3}
        />
      </mesh>

      <Html position={[0, 0.38, 0]} center zIndexRange={[4, 0]}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(sensor.id);
          }}
          className="select-none pointer-events-auto cursor-pointer font-sans transition-all duration-200"
        >
          {!hovered ? (
            <div
              className={`px-2.5 py-0.5 rounded-full border shadow-md flex items-center gap-1.5 whitespace-nowrap hover:scale-105 transition-transform ${badgeStyle}`}
            >
              <Radio className="w-2.5 h-2.5" />
              <span className="text-[10px] font-bold">S{index}</span>
              <span className="text-[9px] opacity-85">• {sensor.riskLevelCode || 'R1'}</span>
            </div>
          ) : (
            <div className="bg-[var(--surface)]/98 backdrop-blur-xl text-[var(--foreground)] p-3 rounded-xl border border-[var(--border-strong)] shadow-xl min-w-[180px] z-50">
              <div className="font-bold border-b border-[var(--border)] pb-1.5 mb-2 text-xs flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                  {sensor.id}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[var(--primary-soft)] text-[var(--primary)] rounded font-bold">
                  {sensor.riskLevelCode || 'R1'}
                </span>
              </div>
              <div className="text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Fator Seg:</span>
                  <strong className="font-mono text-[var(--foreground)]">
                    {sensor.safetyFactor >= 99 ? 'Estável' : `FS ${sensor.safetyFactor}`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Declividade:</span>
                  <strong className="font-mono text-[var(--foreground)]">{sensor.terrainInclination.toFixed(1)}°</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Saturação:</span>
                  <strong className="font-mono text-[var(--foreground)]">{sensor.soilMoisture.toFixed(0)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--foreground-muted)]">Chuva 72h:</span>
                  <strong className="font-mono text-[var(--primary)]">{sensor.rainVolume.toFixed(0)} mm</strong>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-[var(--border)] text-[10px] text-[var(--primary)] text-center font-semibold">
                Clique para inspecionar
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
