"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { Map, MapPin, Layers, Activity, Mountain, Droplets, Search, Loader2, CloudRain } from 'lucide-react';
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

  const [currentColor] = useState(new THREE.Color('#7A513A'));
  const targetColor = new THREE.Color(riskColor);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      currentColor.lerp(targetColor, delta * 2);
      material.color.copy(currentColor);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color={currentColor} roughness={0.85} metalness={0.1} wireframe={true} />
    </mesh>
  );
}

/**
 * Sistema Equilibrado de Chuva 3D:
 * Feixes finos e elegantes em queda livre, visíveis sem poluir a visualização da malha 3D.
 */
function ExpressiveRain({ active, isDark, heavy }: { active: boolean; isDark: boolean; heavy: boolean }) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const count = heavy ? 750 : 420;

  const { linePositions, velocities } = useMemo(() => {
    const lPos = new Float32Array(count * 6); // 2 vértices (x,y,z) por fio de chuva
    const vel = new Float32Array(count);

    let seed = 42;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const streakLen = heavy ? 0.52 : 0.36;
    const windX = heavy ? 0.06 : 0.03;

    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 24;
      const y = random() * 20 - 1;
      const z = (random() - 0.5) * 24;
      const v = (heavy ? 0.28 : 0.20) + random() * 0.14;

      vel[i] = v;

      // Vértice superior do feixe
      lPos[i * 6] = x - windX;
      lPos[i * 6 + 1] = y + streakLen;
      lPos[i * 6 + 2] = z;

      // Vértice inferior do feixe
      lPos[i * 6 + 3] = x;
      lPos[i * 6 + 4] = y;
      lPos[i * 6 + 5] = z;
    }

    return { linePositions: lPos, velocities: vel };
  }, [count, heavy]);

  useFrame(() => {
    if (!active || !linesRef.current) return;
    const streakLen = heavy ? 0.52 : 0.36;
    const windX = heavy ? 0.06 : 0.03;

    const lAttr = linesRef.current.geometry.attributes.position;
    const arr = lAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      let yBottom = arr[i * 6 + 4] - velocities[i];
      let xBottom = arr[i * 6 + 3] + windX * 0.1;

      if (yBottom < -2) {
        yBottom = 19;
        xBottom = ((i * 17) % 24) - 12;
      }

      arr[i * 6] = xBottom - windX;
      arr[i * 6 + 1] = yBottom + streakLen;
      arr[i * 6 + 3] = xBottom;
      arr[i * 6 + 4] = yBottom;
    }
    lAttr.needsUpdate = true;
  });

  if (!active) return null;

  const streakColor = isDark ? '#93B8D8' : '#4A789C';

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={streakColor}
        transparent
        opacity={heavy ? 0.42 : 0.28}
      />
    </lineSegments>
  );
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
    rainVolume,
    setTerrainData,
    setSensors,
    fetchAndApplyWeather
  } = useTerrainStore();

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<GisLayerMode>('slope');
  const [cepQuery, setCepQuery] = useState('25680-195');
  const [searchingCep, setSearchingCep] = useState(false);
  const [rainManualOverride, setRainManualOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quando o clima real mudar (busca de CEP ou botão Simular Chuva), sincroniza automaticamente a Chuva 3D
  useEffect(() => {
    setRainManualOverride(null);
  }, [location, isRainingNow, currentRainIntensity]);

  // Carrega automaticamente o relevo 3D real de Petrópolis (CEP 25680-195) caso ainda não esteja carregado
  useEffect(() => {
    let cancelled = false;
    async function loadDefaultPetropolisTerrain() {
      if (useTerrainStore.getState().elevationMatrix) return;
      setSearchingCep(true);
      try {
        const response = await apiFetch('/api/generate-terrain', {
          method: 'POST',
          body: JSON.stringify({ query: '25680-195' })
        });
        const result = await response.json();
        if (!cancelled && response.ok && result.elevationMatrix) {
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
        console.error('Erro ao carregar terreno padrão de Petrópolis:', err);
      } finally {
        if (!cancelled) setSearchingCep(false);
      }
    }
    loadDefaultPetropolisTerrain();
    return () => {
      cancelled = true;
    };
  }, [setTerrainData, setSensors, fetchAndApplyWeather]);

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
    if (globalRisk > 70) return "#A92626";
    if (globalRisk > 40) return "#C85A17";
    if (globalRisk > 15) return "#B47B1C";
    return "#3E7B52";
  }, [globalRisk]);

  const isHeavyRain = useMemo(() => {
    return currentRainIntensity >= 12 || rainVolume >= 80 || sensors.some(s => s.rainVolume >= 80);
  }, [currentRainIntensity, rainVolume, sensors]);

  const isActuallyRaining = isRainingNow || currentRainIntensity > 0;
  const showRainIn3D = rainManualOverride !== null ? rainManualOverride : isActuallyRaining;

  const isDark = mounted && theme === 'dark';
  const canvasBg = isDark ? '#181310' : '#EFEAE2';

  return (
    <div className="flex flex-col h-full w-full relative bg-[var(--background)] select-none">
      {/* Top Left: Elevation, Quick CEP Search & Location Info */}
      <div className="absolute top-6 left-6 z-20 theme-card backdrop-blur-xl p-5 rounded-2xl max-w-sm w-full space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
            <Map className="w-5 h-5 text-[var(--primary)]" /> Visão Topográfica 3D
          </h1>

          <button
            type="button"
            onClick={() => setRainManualOverride(!showRainIn3D)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              showRainIn3D
                ? 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/35'
                : 'theme-card-muted text-[var(--foreground-muted)]'
            }`}
            title="Ativar ou ocultar efeito de precipitação 3D sobre o relevo"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>{showRainIn3D ? 'Chuva 3D: ON' : 'Chuva 3D: OFF'}</span>
          </button>
        </div>

        {/* Busca Rápida por CEP direto no Mapa 3D */}
        <form onSubmit={handleQuickCepSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--foreground-muted)]" />
            <input
              type="text"
              value={cepQuery}
              onChange={(e) => setCepQuery(e.target.value)}
              placeholder="Digite o CEP (ex: 25680-195)"
              className="w-full theme-card-muted rounded-xl py-2 pl-8 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--primary)] select-text"
            />
          </div>
          <button
            type="submit"
            disabled={searchingCep}
            className="theme-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            {searchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {location ? (
          <div>
            <div className="flex items-center gap-1.5 text-[#2E6F40] dark:text-[#52B788] text-xs font-bold">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{location}</span>
            </div>
            {!sensorsEnabled && (
              <div className="text-[10px] text-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-md w-fit font-semibold mt-1.5">
                Monitoramento por Satélite (SRTM)
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--foreground-muted)] theme-card-muted p-2.5 rounded-xl leading-relaxed flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)] shrink-0" />
            <span>Carregando topografia 3D de Petrópolis (CEP 25680-195)...</span>
          </p>
        )}
        
        <div className="flex items-center justify-between gap-3 theme-card-muted p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
            <div>
              <div className="text-[10px] text-[var(--foreground-muted)] uppercase font-semibold">Risco Geral</div>
              <div className="text-lg font-extrabold font-mono text-[var(--foreground)]">{globalRisk}/100</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--foreground-muted)] uppercase font-semibold text-right">Estações</div>
            <div className="text-lg font-extrabold font-mono text-[var(--primary)] text-right">{sensorsEnabled ? sensors.length : 0}</div>
          </div>
        </div>
      </div>

      {/* Top Right: Camadas Científicas GIS + Painel Detalhado de Clima no Canto */}
      <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-3">
        <div className="theme-card backdrop-blur-xl p-3.5 rounded-2xl flex flex-col gap-2.5 w-[310px] sm:w-[340px]">
          <div className="text-[11px] text-[var(--foreground-muted)] font-semibold px-1 flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
            <Layers className="w-3.5 h-3.5 text-[var(--primary)]" /> Camadas de Análise do Relevo
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setActiveLayer('slope')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                activeLayer === 'slope'
                  ? 'theme-btn-primary shadow-xs'
                  : 'theme-card-muted text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" /> Declividade
            </button>
            <button
              onClick={() => setActiveLayer('contour')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                activeLayer === 'contour'
                  ? 'theme-btn-primary shadow-xs'
                  : 'theme-card-muted text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Mountain className="w-3.5 h-3.5 shrink-0" /> Isolinhas
            </button>
            <button
              onClick={() => setActiveLayer('drainage')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                activeLayer === 'drainage'
                  ? 'theme-btn-primary shadow-xs'
                  : 'theme-card-muted text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 shrink-0" /> Drenagem
            </button>
          </div>
        </div>

        <WeatherCornerHud />
      </div>

      <Canvas shadows camera={{ position: [12, 10, 12], fov: 45 }}>
        <color attach="background" args={[canvasBg]} />
        <fog attach="fog" args={[canvasBg, 22, 58]} />
        <ambientLight intensity={isDark ? 0.55 : 0.85} color="#FFF8F0" />
        <directionalLight castShadow position={[-15, 25, 15]} intensity={isDark ? 1.8 : 1.5} shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[15, 8, -15]} intensity={0.4} color="#D88B62" />
        
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

        <ExpressiveRain active={showRainIn3D} isDark={isDark} heavy={isHeavyRain} />

        <OrbitControls autoRotate autoRotateSpeed={0.25} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={7} maxDistance={32} />
      </Canvas>

      {/* Bottom Center: Scientific GIS Legend Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 theme-card backdrop-blur-xl px-5 py-2.5 rounded-full flex items-center gap-4 text-xs text-[var(--foreground)] pointer-events-auto">
        {activeLayer === 'slope' && (
          <div className="flex items-center gap-3.5">
            <span className="text-[11px] text-[var(--primary)] font-bold">CPRM / IPT:</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3E7B52]"></span> <span>&lt;15° Estável</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C98A27]"></span> <span>15°-25° Atenção</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C85A17]"></span> <span>25°-35° Alto Risco</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A92626]"></span> <span>&gt;35° Crítico (NBR 11682)</span></div>
          </div>
        )}
        {activeLayer === 'contour' && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--primary)] font-bold">Altimetria SRTM:</span>
            <span>Curvas de nível a cada 10m de desnível</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="font-mono">Cota: {minElevation}m a {maxElevation}m</span>
          </div>
        )}
        {activeLayer === 'drainage' && (
          <div className="flex items-center gap-3.5">
            <span className="text-[11px] text-[var(--primary)] font-bold">Hidrologia:</span>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2B6CB0]"></span> <span>Talvegues (Fluxo Principal)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4A89C7]"></span> <span>Escoamento Secundário</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8C6D58]"></span> <span>Crista Divisora</span></div>
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
