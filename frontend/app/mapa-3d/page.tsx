"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Map, AlertTriangle, MapPin } from 'lucide-react';
import { useTerrainStore, Sensor } from '@/store/terrainStore';
import { TerrainMesh } from '@/components/3d/TerrainMesh';
import { SensorSidebar } from '@/components/3d/SensorSidebar';
import { AnimatePresence } from 'framer-motion';

function Terrain({ riskColor }: { riskColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 30, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2 + Math.sin(x * 0.1 + z * 0.2) * 4;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const [currentColor] = useState(new THREE.Color('#1f2937'));
  const targetColor = new THREE.Color(riskColor);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      currentColor.lerp(targetColor, delta * 2);
      material.color.copy(currentColor);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color={currentColor} roughness={0.8} metalness={0.2} wireframe={true} />
    </mesh>
  );
}

function Rain({ isRaining }: { isRaining: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 2000;
  
  const [positions, velocities] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count);
    let seed = 1;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for(let i=0; i<count; i++){
      p[i*3] = (random() - 0.5) * 30;
      p[i*3+1] = random() * 20;
      p[i*3+2] = (random() - 0.5) * 30;
      v[i] = 0.1 + random() * 0.3;
    }
    return [p, v];
  }, []);

  useFrame(() => {
    if(!isRaining) return;
    if(particlesRef.current) {
      const positionsAttr = particlesRef.current.geometry.attributes.position;
      for(let i=0; i<count; i++){
        let y = positionsAttr.getY(i);
        y -= velocities[i];
        if(y < -5) y = 20;
        positionsAttr.setY(i, y);
      }
      positionsAttr.needsUpdate = true;
    }
  });

  if(!isRaining) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#60a5fa" transparent opacity={0.6} />
    </points>
  );
}

function SensorNode({ sensor, onSelect }: { sensor: Sensor; onSelect: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Html position={[sensor.position.x, sensor.position.y + 1, sensor.position.z]} center>
       <div 
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}
         onClick={() => onSelect(sensor.id)}
         className={`transition-all duration-300 pointer-events-auto cursor-pointer ${hovered ? 'scale-105 opacity-100 z-50' : 'scale-90 opacity-60'}`}
       >
          <div className="bg-black/85 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 shadow-2xl min-w-[150px] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
             <div className="font-bold border-b border-white/20 pb-1 mb-2 text-sm flex items-center justify-between gap-1">
               <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-blue-400" /> {sensor.id}</span>
               <span className="text-[9px] px-1.5 bg-white/10 rounded text-gray-400 font-mono uppercase tracking-wide">IoT</span>
             </div>
             <div className="text-xs space-y-1">
               <div>Risco Local: <strong className="text-white">{sensor.localRisk}/100</strong></div>
               <div>Umidade: <strong className="text-white">{sensor.soilMoisture.toFixed(0)}%</strong></div>
               <div>Inclinação: <strong className="text-white">{sensor.terrainInclination.toFixed(0)}°</strong></div>
               <div>Vibração: <strong className="text-white">{sensor.vibration.toFixed(0)} Hz</strong></div>
             </div>
             <div className="mt-2 text-[9px] text-blue-400 text-center uppercase tracking-wider font-bold">
               Clique para Inspecionar
             </div>
          </div>
       </div>
    </Html>
  );
}

function PointLight({ color }: { color: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const targetColor = new THREE.Color(color);
  
  useFrame((state, delta) => {
    if (lightRef.current) {
      lightRef.current.color.lerp(targetColor, delta * 2);
    }
  });

  return <pointLight ref={lightRef} position={[0, -2, 0]} intensity={500} distance={50} />;
}

export default function Mapa3D() {
  const { location, elevationMatrix, minElevation, maxElevation, globalRisk, sensors, sensorsEnabled } = useTerrainStore();
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  const colorHex = useMemo(() => {
    if (globalRisk > 70) return "#9b2c2c";
    if (globalRisk > 40) return "#f97316";
    if (globalRisk > 15) return "#eab308";
    return "#10b981";
  }, [globalRisk]);

  const isRaining = useMemo(() => {
    return sensors.some(s => s.rainVolume > 30);
  }, [sensors]);

  return (
    <div className="flex flex-col h-full w-full relative bg-black">
      <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-left duration-700">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" /> Visão Topográfica
        </h1>
        {location ? (
           <div className="mb-4">
             <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-widest font-bold">
                 <MapPin className="w-4 h-4" /> {location}
             </div>
             {!sensorsEnabled && (
                <div className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md w-fit uppercase font-semibold font-mono tracking-wider mt-2">
                  📡 Sem Sensores (Via Satélite)
                </div>
             )}
           </div>
        ) : (
           <p className="text-sm text-yellow-500/80 mb-4 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
             Terreno procedural padrão rodando. Para visualizar o relevo real da sua cidade e habilitar os sensores, gere o mapa na aba de Topografia.
           </p>
        )}
        
        <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
          <div className="flex gap-3">
             <div className="w-4 h-4 rounded-full shadow-inner ring-2 ring-black flex-shrink-0 transition-colors duration-1000 mt-1" style={{ backgroundColor: colorHex }} />
             <div>
                <div className="text-xs text-gray-400 uppercase font-semibold">Risco Geral</div>
                <div className="text-lg font-black text-white">{globalRisk}/100</div>
             </div>
          </div>
          <div>
             <div className="text-xs text-gray-400 uppercase font-semibold text-right">Sensores</div>
             <div className="text-lg font-black text-blue-400 text-right">{sensorsEnabled ? sensors.length : 0}</div>
          </div>
        </div>
      </div>

      <Canvas shadows camera={{ position: [15, 15, 15], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.1} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={2.5} shadow-mapSize={[2048, 2048]} />
        <PointLight color={colorHex} />
        
        {elevationMatrix ? (
            <TerrainMesh 
              matrix={elevationMatrix} 
              minElevation={minElevation} 
              maxElevation={maxElevation} 
              autoRotate={true} 
              onSelectSensor={setSelectedSensorId}
            />
        ) : (
            <Terrain riskColor={colorHex} />
        )}

        <Rain isRaining={isRaining} />
        
        {/* Render Floating Info Tooltips for each sensor */}
        {sensorsEnabled && sensors.map(s => (
           <SensorNode key={s.id} sensor={s} onSelect={setSelectedSensorId} />
        ))}

        <OrbitControls autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={10} maxDistance={40} />
      </Canvas>

      {/* Telemetry Detail Sidebar */}
      <AnimatePresence>
        {selectedSensorId && (
          <SensorSidebar
            sensorId={selectedSensorId}
            onClose={() => setSelectedSensorId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
