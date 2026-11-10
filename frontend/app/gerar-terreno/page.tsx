"use client";

import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Mountain, AlertTriangle, ShieldCheck, Search, Loader2 } from "lucide-react";

import { useTerrainStore, generateOptimalSensors } from "@/store/terrainStore";
import { calculateSlope } from "@/lib/slopeCalculation";
import { TerrainMesh } from "@/components/3d/TerrainMesh";
import { WeatherCornerHud } from "@/components/3d/WeatherCornerHud";
import { apiFetch } from "@/lib/api";

const searchSchema = z.object({
  query: z.string().min(3, "Digite um CEP (8 dígitos) ou endereço completo (mínimo 3 caracteres).")
});

export default function GerarTerrenoPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const setTerrainData = useTerrainStore(state => state.setTerrainData);
  const location = useTerrainStore(state => state.location);
  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  const elevationMatrix = useTerrainStore(state => state.elevationMatrix);
  const minElevation = useTerrainStore(state => state.minElevation);
  const maxElevation = useTerrainStore(state => state.maxElevation);
  const reliefAmplitude = useTerrainStore(state => state.reliefAmplitude);
  const slopeData = useTerrainStore(state => state.slopeData);
  const safetyFactor = useTerrainStore(state => state.safetyFactor);
  const riskLevelCode = useTerrainStore(state => state.riskLevelCode);
  const geomorphology = useTerrainStore(state => state.geomorphology);
  const rainVolume = useTerrainStore(state => state.rainVolume);
  const setSensors = useTerrainStore(state => state.setSensors);
  const sensorsEnabled = useTerrainStore(state => state.sensorsEnabled);
  const setSensorsEnabled = useTerrainStore(state => state.setSensorsEnabled);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carrega automaticamente Petrópolis (CEP 25680-195) caso nenhum relevo esteja carregado
  useEffect(() => {
    let cancelled = false;
    async function ensurePetropolisLoaded() {
      if (useTerrainStore.getState().elevationMatrix) return;
      setLoading(true);
      try {
        const response = await apiFetch("/api/generate-terrain", {
          method: "POST",
          body: JSON.stringify({ query: "25680-195" })
        });
        const result = await response.json();
        if (!cancelled && response.ok && result.elevationMatrix) {
          const calculatedSlope = calculateSlope(
            result.elevationMatrix,
            useTerrainStore.getState().rainVolume,
            useTerrainStore.getState().soilSaturationPercent
          );
          setTerrainData(result, calculatedSlope);
          await useTerrainStore.getState().fetchAndApplyWeather();
        }
      } catch {
        // Ignora silenciosamente se falhar no boot inicial
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    ensurePetropolisLoaded();
    return () => {
      cancelled = true;
    };
  }, [setTerrainData]);

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

      await useTerrainStore.getState().fetchAndApplyWeather();
    } catch (err: unknown) {
      setErrorMSG(err instanceof Error ? err.message : "Erro ao gerar topografia real.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = () => {
    if (riskLevelCode === 'R4') return { label: "R4 • MUITO ALTO", color: "text-[#B91C1C]", bg: "bg-[#B91C1C]/12 border-[#B91C1C]/35", icon: AlertTriangle };
    if (riskLevelCode === 'R3') return { label: "R3 • ALTO", color: "text-[#C85A17]", bg: "bg-[#C85A17]/12 border-[#C85A17]/35", icon: AlertTriangle };
    if (riskLevelCode === 'R2') return { label: "R2 • MÉDIO", color: "text-[#B47B1C]", bg: "bg-[#B47B1C]/12 border-[#B47B1C]/35", icon: AlertTriangle };
    return { label: "R1 • ESTÁVEL", color: "text-[#2E6F40] dark:text-[#52B788]", bg: "bg-[#2E6F40]/12 border-[#2E6F40]/30", icon: ShieldCheck };
  };

  const riskBadge = getRiskBadge();
  const isDark = mounted && theme === 'dark';
  const canvasBg = isDark ? '#181310' : '#EFEAE2';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full min-h-screen flex flex-col xl:flex-row gap-8 font-sans text-[var(--foreground)]">
      {/* Sidebar Formulário & Infos */}
      <div className="xl:w-1/3 flex flex-col gap-5">
        <header>
          <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider block mb-1">
            Mapeamento Altimétrico por Satélite
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <Mountain className="w-7 h-7 text-[var(--primary)]" />
            Consulta Topográfica (CEP)
          </h1>
          <p className="text-[var(--foreground-muted)] mt-2 text-xs md:text-sm leading-relaxed">
            Consulte a altimetria por radar (SRTM 30m) de qualquer CEP ou endereço brasileiro para processar a declividade e a estabilidade das encostas.
          </p>
        </header>

        {/* Input Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="theme-card p-5 rounded-2xl space-y-4">
          <div>
            <label className="text-xs text-[var(--foreground)] font-semibold mb-2 block">
              CEP ou Endereço Completo
            </label>
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--foreground-muted)]" />
                <input 
                  {...register("query")}
                  className="w-full theme-card-muted rounded-xl py-2.5 pl-9 pr-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--foreground-muted)] text-xs"
                  placeholder="Ex: 25680-195 ou Petrópolis, RJ"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="theme-btn-primary px-4 py-2.5 rounded-xl font-semibold shadow-xs flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            {errors.query && (
              <span className="text-[#B91C1C] text-xs mt-2 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {errors.query.message as string}
              </span>
            )}
            {errorMSG && (
              <span className="text-[#B91C1C] text-xs mt-2 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {errorMSG}
              </span>
            )}
          </div>

          {/* Toggle de Estações Geotécnicas Virtuais */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--foreground)]">Estações Geotécnicas</span>
              <span className="text-[11px] text-[var(--foreground-muted)]">Posicionar sondas nos pontos de maior declive</span>
            </div>
            <button
              type="button"
              onClick={() => setSensorsEnabled(!sensorsEnabled)}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                sensorsEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-300 ${
                  sensorsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </form>

        {/* Diagnóstico Geológico Completo */}
        {terrainData && slopeData && (
          <div className="theme-card rounded-2xl p-5 space-y-4">
            <div className="border-b border-[var(--border)] pb-3">
              <span className="text-[11px] text-[var(--primary)] font-semibold uppercase">Diagnóstico Topográfico MDE</span>
              <h2 className="text-base font-bold text-[var(--foreground)] mt-0.5">{terrainData.location}</h2>
              <span className="text-xs text-[var(--foreground-muted)] font-mono">
                {terrainData.latitude?.toFixed(4)}°, {terrainData.longitude?.toFixed(4)}°
              </span>
            </div>

            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${riskBadge.bg}`}>
              <div className="flex items-center gap-2.5">
                <riskBadge.icon className={`w-5 h-5 ${riskBadge.color}`} />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--foreground-muted)] block">Classificação ABNT / CPRM</span>
                  <span className={`font-extrabold text-sm ${riskBadge.color}`}>{riskBadge.label}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--foreground-muted)] block">Fator Seg.</span>
                <span className="font-bold font-mono text-[var(--foreground)] text-sm">
                  {safetyFactor >= 99 ? 'Estável' : `FS ${safetyFactor}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="theme-card-muted p-3 rounded-xl">
                <span className="text-[var(--foreground-muted)] text-[11px] block">Altitude Máx / Mín</span>
                <span className="font-bold font-mono text-[var(--foreground)] text-sm">
                  {terrainData.maxElevation.toFixed(0)}m / {terrainData.minElevation.toFixed(0)}m
                </span>
                <span className="text-[10px] text-[var(--primary)] font-medium mt-0.5 block">
                  Desnível: {reliefAmplitude.toFixed(0)}m
                </span>
              </div>
              <div className="theme-card-muted p-3 rounded-xl">
                <span className="text-[var(--foreground-muted)] text-[11px] block">Declividade Média</span>
                <span className="font-bold font-mono text-[var(--foreground)] text-sm">{slopeData.meanSlope}°</span>
                <span className="text-[10px] text-[#B47B1C] font-medium mt-0.5 block">Máxima: {slopeData.maxSlope}°</span>
              </div>
              <div className="theme-card-muted p-3 rounded-xl">
                <span className="text-[var(--foreground-muted)] text-[11px] block">Vertentes Íngremes</span>
                <span className="font-bold font-mono text-[#C85A17] text-sm">{slopeData.criticalAreasPercent}%</span>
                <span className="text-[10px] text-[var(--foreground-muted)] mt-0.5 block">&ge; 25° de inclinação</span>
              </div>
              <div className="theme-card-muted p-3 rounded-xl">
                <span className="text-[var(--foreground-muted)] text-[11px] block">Chuva Acumulada 72h</span>
                <span className="font-bold font-mono text-[var(--foreground)] text-sm">{rainVolume} mm</span>
                <span className="text-[10px] text-[var(--foreground-muted)] mt-0.5 block">Telemetria local</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--foreground-muted)] leading-relaxed">
              <strong className="text-[var(--foreground)] block mb-0.5">Geomorfologia:</strong>
              {geomorphology}. As cores da maquete 3D indicam as faixas de suscetibilidade calculadas pelo modelo de Mohr-Coulomb.
            </div>
          </div>
        )}
      </div>

      {/* Renderizador 3D Real */}
      <div className="xl:w-2/3 h-[550px] xl:h-auto min-h-[550px] rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface-muted)] relative shadow-md">
        {!terrainData && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--foreground-muted)] p-6 text-center">
            <Mountain className="w-16 h-16 mb-3 text-[var(--primary)] opacity-40" />
            <p className="font-semibold text-sm text-[var(--foreground)]">Nenhum terreno carregado</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Informe um CEP ou endereço no formulário ao lado para gerar a maquete topográfica 3D.
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface)]/80 backdrop-blur-md z-10 text-[var(--primary)]">
            <Loader2 className="w-10 h-10 mb-3 animate-spin" />
            <p className="font-semibold text-xs">Processando altimetria SRTM e meteorologia local...</p>
          </div>
        )}

        {terrainData && (
          <div className="absolute inset-0 cursor-move">
            <Canvas camera={{ position: [0, 8.5, 12.5], fov: 45 }}>
              <color attach="background" args={[canvasBg]} />
              <fog attach="fog" args={[canvasBg, 20, 46]} />
              <ambientLight intensity={isDark ? 0.55 : 0.85} color="#FFF8F0" />
              <directionalLight position={[-15, 22, 15]} intensity={isDark ? 1.8 : 1.5} />
              <directionalLight position={[15, 8, -15]} intensity={0.4} color="#D88B62" />

              <TerrainMesh
                matrix={terrainData.elevationMatrix}
                minElevation={terrainData.minElevation}
                maxElevation={terrainData.maxElevation}
                isCritical={riskLevelCode === 'R4'}
                layerMode="slope"
              />
              <OrbitControls enableZoom={true} enablePan={true} autoRotate={false} maxPolarAngle={Math.PI / 2.1} minDistance={6} maxDistance={28} />
            </Canvas>

            <div className="absolute top-4 left-4 theme-card backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] text-[var(--foreground)] font-semibold flex items-center gap-2 select-none">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] inline-block" />
              <span>Maquete Topográfica 3D (SRTM 30m)</span>
            </div>

            <div className="absolute top-4 right-4 z-20">
              <WeatherCornerHud compact />
            </div>

            <div className="absolute bottom-4 left-4 theme-card backdrop-blur-md px-3.5 py-2 rounded-xl text-[11px] text-[var(--foreground)] flex items-center gap-3.5 select-none">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3E7B52] inline-block" /> Estável (&lt;15°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C98A27] inline-block" /> Atenção (15°-25°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C85A17] inline-block" /> Alerta (25°-35°)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A92626] inline-block" /> Crítico (&gt;35°)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
