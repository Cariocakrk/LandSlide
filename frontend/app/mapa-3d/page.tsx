"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Map, MapPin, Layers, Activity, Mountain, Droplets, Search, Loader2 } from 'lucide-react';
import { useTerrainStore, generateOptimalSensors } from '@/store/terrainStore';
import { TerrainMesh, GisLayerMode } from '@/components/3d/TerrainMesh';
import { SensorSidebar } from '@/components/3d/SensorSidebar';
import { WeatherCornerHud } from '@/components/3d/WeatherCornerHud';
import { calculateSlope } from '@/lib/slopeCalculation';
import { apiFetch } from '@/lib/api';
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
  const {
    location,
    elevationMatrix,
    minElevation,
    maxElevation,
    globalRisk,
    sensors,
    sensorsEnabled,
    isRainingNow,
    currentRainIntensity,
    setTerrainData,
    setSensors,
    fetchAndApplyWeather
  } = useTerrainStore();

  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<GisLayerMode>('slope');
  const [cepQuery, setCepQuery] = useState('');
  const [searchingCep, setSearchingCep] = useState(false);

  const handleQuickCepSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cepQuery.trim() || searchingCep) return;
    setSearchingCep(true);
    try {
      const response = await apiFetch('/api/generate-terrain', {
        method: 'POST',
        body: JSON.stringify({ query: cepQuery.trim() })
      });
      const result = await response.json();
      if (response.ok && result.elevationMatrix) {
        const calculatedSlope = calculateSlope(
          result.elevationMatrix,
          useTerrainStore.getState().rainVolume,
          useTerrainStore.getState().soilSaturationPercent
        );
        setTerrainData(result, calculatedSlope);
        if (useTerrainStore.getState().sensorsEnabled) {
          const optimalSensors = generateOptimalSensors(result.elevationMatrix, 5);
          setSensors(optimalSensors);
        }
        await fetchAndApplyWeather();
      }
    } catch (err) {
      console.error('Erro ao buscar CEP no Mapa 3D:', err);
    } finally {
      setSearchingCep(false);
    }
  };

  const colorHex = useMemo(() => {
    if (globalRisk > 70) return "#9b2c2c";
    if (globalRisk > 40) return "#f97316";
    if (globalRisk > 15) return "#eab308";
    return "#10b981";
  }, [globalRisk]);

  const isRaining = useMemo(() => {
    return isRainingNow || currentRainIntensity > 0 || sensors.some(s => s.rainVolume > 30);
  }, [isRainingNow, currentRainIntensity, sensors]);

  return (
    <div className="flex flex-col h-full w-full relative bg-black select-none">
      {/* Top Left: Elevation, Quick CEP Search & Location Info */}
      <div className="absolute top-6 left-6 z-10 bg-black/75 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl max-w-sm w-full animate-in slide-in-from-left duration-700 space-y-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" /> Visão Topográfica 3D
        </h1>

        {/* Busca Rápida por CEP direto no Mapa 3D */}
        <form onSubmit={handleQuickCepSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={cepQuery}
              onChange={(e) => setCepQuery(e.target.value)}
              placeholder="Digite o CEP (ex: 25680-195)"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-blue-500 select-text"
            />
          </div>
          <button
            type="submit"
            disabled={searchingCep}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            {searchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {location ? (
           <div>
             <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-widest font-bold">
                 <MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{location}</span>
             </div>
             {!sensorsEnabled && (
                <div className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md w-fit uppercase font-semibold font-mono tracking-wider mt-2">
                  📡 Sem Sensores (Via Satélite)
                </div>
             )}
           </div>
        ) : (
           <p className="text-xs text-yellow-500/80 bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20 leading-relaxed">
             Digite um CEP acima (ou na aba Topografia) para carregar o relevo 3D real da encosta e atualizar o clima local.
           </p>
        )}
        
        <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
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

      {/* Top Right: Camadas Científicas GIS + Painel Detalhado de Clima no Canto */}
      <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-3 animate-in slide-in-from-right duration-700">
        <div className="bg-black/75 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2.5 w-[310px] sm:w-[340px]">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider px-1 font-bold flex items-center gap-1.5 border-b border-white/10 pb-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Camadas Científicas do Relevo
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setActiveLayer('slope')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${activeLayer === 'slope' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" /> Declividade
            </button>
            <button
              onClick={() => setActiveLayer('contour')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${activeLayer === 'contour' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Mountain className="w-3.5 h-3.5 shrink-0" /> Isolinhas
            </button>
            <button
              onClick={() => setActiveLayer('drainage')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${activeLayer === 'drainage' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Droplets className="w-3.5 h-3.5 shrink-0" /> Drenagem
            </button>
          </div>
        </div>

        {/* Painel de Clima Atual Detalhado com base no CEP */}
        <WeatherCornerHud />
      </div>

      <Canvas shadows camera={{ position: [12, 10, 12], fov: 45 }}>
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

        <OrbitControls autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={7} maxDistance={32} />
      </Canvas>

      {/* Bottom Center: Scientific GIS Legend Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 text-xs font-mono text-gray-300 pointer-events-auto">
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
