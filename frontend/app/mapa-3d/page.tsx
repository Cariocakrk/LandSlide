"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Map, AlertTriangle, MapPin, Layers, Activity, Mountain, Droplets } from 'lucide-react';
import { useTerrainStore, Sensor } from '@/store/terrainStore';
import { TerrainMesh, GisLayerMode } from '@/components/3d/TerrainMesh';
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
         className={`transition-all duration-300 pointer-events-auto cursor-pointer ${hovered ? 'scale-105 opacity-100 z-50' : 'scale-90 opacity-75'}`}
       >
          <div className="bg-black/85 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 shadow-2xl min-w-[170px] hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all font-sans">
             <div className="font-bold border-b border-white/20 pb-1 mb-2 text-xs flex items-center justify-between gap-1">
               <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-blue-400" /> {sensor.id}</span>
               <span className="text-[9px] px-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-mono uppercase tracking-wide">{sensor.riskLevelCode || 'GEO'}</span>
             </div>
             <div className="text-[11px] space-y-1 font-mono">
               <div>Fator Seg: <strong className={sensor.safetyFactor && sensor.safetyFactor < 1.3 ? "text-orange-400" : "text-emerald-400"}>{sensor.safetyFactor >= 99 ? 'Estável' : `FS ${sensor.safetyFactor}`}</strong></div>
               <div>Declividade: <strong className="text-white">{sensor.terrainInclination.toFixed(1)}°</strong></div>
               <div>Saturação: <strong className="text-white">{sensor.soilMoisture.toFixed(0)}%</strong></div>
               <div>Chuva 72h: <strong className="text-cyan-400">{sensor.rainVolume.toFixed(0)} mm</strong></div>
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
  const [activeLayer, setActiveLayer] = useState<GisLayerMode>('street');

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
      {/* Top Left: Elevation & Location Info */}
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

      {/* Top Right: GIS Scientific Layers Selector */}
      <div className="absolute top-6 right-6 z-10 bg-black/75 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2.5 animate-in slide-in-from-right duration-700">
        <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider px-1 font-bold flex items-center gap-1.5 border-b border-white/10 pb-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" /> Camadas Científicas GIS
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveLayer('street')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeLayer === 'street' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Map className="w-3.5 h-3.5" /> Ruas & Arruamento
          </button>
          <button
            onClick={() => setActiveLayer('slope')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeLayer === 'slope' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Declividade (CPRM)
          </button>
          <button
            onClick={() => setActiveLayer('contour')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeLayer === 'contour' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Mountain className="w-3.5 h-3.5" /> Curvas de Nível
          </button>
          <button
            onClick={() => setActiveLayer('drainage')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeLayer === 'drainage' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
          >
            <Droplets className="w-3.5 h-3.5" /> Drenagem Pluvial
          </button>
        </div>
      </div>

      <Canvas shadows camera={{ position: [15, 15, 15], fov: 50 }}>
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 20, 55]} />
        <ambientLight intensity={0.35} color="#0f172a" />
        <directionalLight castShadow position={[-15, 25, 15]} intensity={2.2} shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[15, -10, -15]} intensity={0.45} color="#38bdf8" />
        <PointLight color={colorHex} />
        
        {elevationMatrix ? (
            <TerrainMesh 
              matrix={elevationMatrix} 
              minElevation={minElevation} 
              maxElevation={maxElevation} 
              autoRotate={true} 
              onSelectSensor={setSelectedSensorId}
              layerMode={activeLayer}
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

      {/* Bottom Center: Scientific GIS Legend Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 text-xs font-mono text-gray-300 pointer-events-auto">
        {activeLayer === 'street' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Base:</span>
            <span>CartoDB Voyager / OpenStreetMap (Resolução SRTM 30m)</span>
          </div>
        )}
        {activeLayer === 'slope' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">CPRM / IPT:</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> <span>&lt;15° Estável</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> <span>15°-25° Atenção</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> <span>25°-35° Alto Risco</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> <span>&gt;35° Crítico (NBR 11682)</span></div>
          </div>
        )}
        {activeLayer === 'contour' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">LiDAR / SRTM:</span>
            <span>Isolinhas Topográficas a cada 10m de desnível</span>
            <span className="text-gray-500">|</span>
            <span>Cota: {minElevation}m a {maxElevation}m</span>
          </div>
        )}
        {activeLayer === 'drainage' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Hidrologia:</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> <span>Talvegues (Acúmulo de Fluxo)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> <span>Escoamento Intermediário</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> <span>Crista Divisora</span></div>
          </div>
        )}
      </div>

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
