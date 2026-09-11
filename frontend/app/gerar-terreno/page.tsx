"use client";

import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Mountain, AlertTriangle, ShieldCheck, Search, Loader2, Compass, Activity, Droplets } from "lucide-react";

import { useTerrainStore, generateOptimalSensors } from "@/store/terrainStore";
import { calculateSlope } from "@/lib/slopeCalculation";
import { TerrainMesh } from "@/components/3d/TerrainMesh";
import { apiFetch } from "@/lib/api";

const searchSchema = z.object({
  query: z.string().min(3, "Digite um CEP (8 dígitos) ou endereço completo (mínimo 3 caracteres).")
});

export default function GerarTerrenoPage() {
  const setTerrainData = useTerrainStore(state => state.setTerrainData);
  const location = useTerrainStore(state => state.location);
  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  const elevationMatrix = useTerrainStore(state => state.elevationMatrix);
  const minElevation = useTerrainStore(state => state.minElevation);
  const maxElevation = useTerrainStore(state => state.maxElevation);
  const reliefAmplitude = useTerrainStore(state => state.reliefAmplitude);
  const slopeData = useTerrainStore(state => state.slopeData);
  const globalRisk = useTerrainStore(state => state.globalRisk);
  const safetyFactor = useTerrainStore(state => state.safetyFactor);
  const riskLevelCode = useTerrainStore(state => state.riskLevelCode);
  const riskClassification = useTerrainStore(state => state.riskClassification);
  const geomorphology = useTerrainStore(state => state.geomorphology);
  const rainVolume = useTerrainStore(state => state.rainVolume);
  const setSensors = useTerrainStore(state => state.setSensors);
  const sensorsEnabled = useTerrainStore(state => state.sensorsEnabled);
  const setSensorsEnabled = useTerrainStore(state => state.setSensorsEnabled);

  const terrainData = elevationMatrix ? {
    location: location || "Localidade Mapeada",
    latitude: latitude || 0,
    longitude: longitude || 0,
    elevationMatrix,
    minElevation,
    maxElevation,
    reliefAmplitude
  } : null;

  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState("");

  // Reatividade: Gerar estações virtuais ao carregar nova malha DEM
  useEffect(() => {
    if (elevationMatrix && slopeData) {
      if (sensorsEnabled) {
        const optimalSensors = generateOptimalSensors(elevationMatrix, 5);
        setSensors(optimalSensors);
      } else {
        setSensors([]);
      }
    }
  }, [elevationMatrix, slopeData, sensorsEnabled, setSensors]);

  const { register, handleSubmit, formState: { errors } } = useForm<{ query: string }>({
    resolver: zodResolver(searchSchema)
  });

  const onSubmit = async (formData: { query: string }) => {
    setLoading(true);
    setErrorMSG("");

    const currentSensorsEnabled = useTerrainStore.getState().sensorsEnabled;
    useTerrainStore.getState().clearTerrain();
    useTerrainStore.getState().setSensorsEnabled(currentSensorsEnabled);

    try {
      const response = await apiFetch("/api/generate-terrain", {
        method: "POST",
        body: JSON.stringify({ query: formData.query })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar topografia real.");
      }

      const calculatedSlope = calculateSlope(
        result.elevationMatrix,
        useTerrainStore.getState().rainVolume,
        useTerrainStore.getState().soilSaturationPercent
      );
      setTerrainData(result, calculatedSlope);

      // Consulta imediatamente o clima e saturação real da coordenada
      await useTerrainStore.getState().fetchAndApplyWeather();
    } catch (err: unknown) {
      setErrorMSG(err instanceof Error ? err.message : "Erro ao gerar topografia real.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = () => {
    if (riskLevelCode === 'R4') return { label: "R4 • MUITO ALTO", color: "text-red-400", bg: "bg-red-500/20 border-red-500/40", icon: AlertTriangle };
    if (riskLevelCode === 'R3') return { label: "R3 • ALTO", color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/40", icon: AlertTriangle };
    if (riskLevelCode === 'R2') return { label: "R2 • MÉDIO", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40", icon: AlertTriangle };
    return { label: "R1 • BAIXO", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/40", icon: ShieldCheck };
  };

  const riskBadge = getRiskBadge();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full min-h-screen flex flex-col xl:flex-row gap-8 animate-in fade-in duration-700 font-sans">
      
      {/* Sidebar Formulário & Infos */}
      <div className="xl:w-1/3 flex flex-col gap-6">
        <header className="mb-2">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mountain className="w-8 h-8 text-indigo-500" />
            Topografia 3D Real (DEM)
          </h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Consulte a altimetria por radar (SRTM 30m) de qualquer CEP ou endereço brasileiro. O sistema processa o gradiente topográfico e calcula a estabilidade mecânica das encostas.
          </p>
        </header>

        {/* Input Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-bold mb-2 block uppercase tracking-wider">CEP ou Endereço Completo</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input 
                  {...register("query")}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-600 font-mono text-xs"
                  placeholder="Ex: 25680-195 ou Alto da Serra, Petrópolis"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
            {errors.query && <span className="text-red-400 text-xs mt-2 block font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {errors.query.message as string}</span>}
            {errorMSG && <span className="text-red-400 text-xs mt-2 block font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {errorMSG}</span>}
          </div>

          {/* Toggle de Estações Geotécnicas Virtuais */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Estações Geotécnicas</span>
              <span className="text-[10px] text-gray-500">Mapear pontos críticos na encosta</span>
            </div>
            <button
              type="button"
              onClick={() => setSensorsEnabled(!sensorsEnabled)}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${sensorsEnabled ? 'bg-indigo-600' : 'bg-white/10 border border-white/10'}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${sensorsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </form>

        {/* Diagnóstico Geológico Completo */}
        {terrainData && slopeData && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] text-indigo-400 font-mono uppercase font-bold">Laudo Geotécnico MDE</span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">{terrainData.location}</h2>
              <span className="text-xs text-gray-400 font-mono">{terrainData.latitude?.toFixed(4)}, {terrainData.longitude?.toFixed(4)}</span>
            </div>

            {/* Classificação CPRM */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${riskBadge.bg}`}>
              <div className="flex items-center gap-2.5">
                <riskBadge.icon className={`w-5 h-5 ${riskBadge.color}`} />
                <div>
                  <span className="text-[10px] uppercase font-bold opacity-75 block text-gray-300">Classificação Oficial</span>
                  <span className={`font-black text-sm tracking-wide ${riskBadge.color}`}>{riskBadge.label}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block font-mono">Fator Seg.</span>
                <span className="font-bold text-white text-sm">{safetyFactor >= 99 ? 'Estável' : `FS ${safetyFactor}`}</span>
              </div>
            </div>

            {/* Métricas do Relevo */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-gray-500 font-medium block">Altitude Máx / Mín</span>
                <span className="font-bold text-white text-sm">{terrainData.maxElevation.toFixed(0)}m / {terrainData.minElevation.toFixed(0)}m</span>
                <span className="text-[10px] text-indigo-400 mt-0.5 block">Desnível: {reliefAmplitude.toFixed(0)}m</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-gray-500 font-medium block">Declividade Média</span>
                <span className="font-bold text-white text-sm">{slopeData.meanSlope}°</span>
                <span className="text-[10px] text-amber-400 mt-0.5 block">Máxima: {slopeData.maxSlope}°</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-gray-500 font-medium block">Encostas Críticas</span>
                <span className="font-bold text-orange-400 text-sm">{slopeData.criticalAreasPercent}%</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">&ge; 25° de inclinação</span>
              </div>
              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <span className="text-gray-500 font-medium block">Chuva 72h Real</span>
                <span className="font-bold text-blue-400 text-sm">{rainVolume} mm</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Estação Meteorológica</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 leading-relaxed font-mono">
              <strong className="text-gray-300 block mb-1">Morfologia do Relevo:</strong>
              {geomorphology}. As cores da malha 3D refletem as faixas de ruptura em equilíbrio-limite calculadas pelo critério de Mohr-Coulomb.
            </div>
          </div>
        )}
      </div>

      {/* Renderizador 3D Real */}
      <div className="xl:w-2/3 h-[500px] xl:h-[auto] min-h-[500px] rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-black to-slate-900 relative shadow-2xl">
        {!terrainData && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500/50">
            <Mountain className="w-20 h-20 mb-4 opacity-20" />
            <p className="font-bold tracking-widest text-xs uppercase">Digite um CEP ou Endereço para gerar o MDE</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10 text-indigo-400">
            <Loader2 className="w-12 h-12 mb-3 animate-spin" />
            <p className="font-mono text-xs tracking-widest uppercase animate-pulse">Consultando Satélite e Mapeando Encostas...</p>
          </div>
        )}

        {terrainData && (
          <div className="absolute inset-0 cursor-move">
            <Canvas camera={{ position: [0, 8.5, 12.5], fov: 45 }}>
              <color attach="background" args={['#030712']} />
              <fog attach="fog" args={['#030712', 18, 40]} />
              
              {/* Iluminação Cartográfica Tática (Hillshading & Rim Lights) */}
              <ambientLight intensity={0.35} color="#0f172a" />
              <directionalLight position={[-15, 22, 15]} intensity={2.2} />
              <directionalLight position={[15, -5, -15]} intensity={0.45} color="#38bdf8" />
              <Environment preset="night" />

              <TerrainMesh
                matrix={terrainData.elevationMatrix}
                minElevation={terrainData.minElevation}
                maxElevation={terrainData.maxElevation}
                isCritical={riskLevelCode === 'R4'}
              />
              <OrbitControls enableZoom={true} enablePan={true} autoRotate={false} maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={28} />
            </Canvas>

            {/* Retículo Tático Superior Esquerdo */}
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-cyan-400 font-mono flex items-center gap-2 select-none shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
              <span>RADAR ORBITAL 3D // VIGILÂNCIA DE TALUDE</span>
            </div>

            {/* Marcador Norte Cartográfico Superior Direito */}
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-gray-400 font-mono flex items-center gap-1.5 select-none shadow-lg">
              <span className="text-cyan-400 font-black">N ▲</span>
              <span className="text-[9px] text-gray-500">AZ 315°</span>
            </div>

            {/* Legenda Geotécnica Inferior Esquerda */}
            <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[10px] text-gray-300 font-mono flex items-center gap-3.5 shadow-2xl select-none">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Estável (&lt;15°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block shadow-[0_0_8px_rgba(234,179,8,0.6)]" /> Atenção (15°-25°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> Alerta (25°-35°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> Ruptura (&gt;35°)</span>
            </div>

            {/* Selo Técnico Inferior Direito */}
            <div className="absolute bottom-4 right-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-wider shadow-2xl flex items-center gap-2 select-none">
              <span className="text-[9px] text-gray-400">RESOLUÇÃO:</span>
              <span className="font-bold text-cyan-400">SRTM-30M // CARTODB HD</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
