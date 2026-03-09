"use client";

import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Mountain, AlertTriangle, ShieldCheck, Search, Loader2 } from "lucide-react";

import { useTerrainStore, generateOptimalSensors } from "@/store/terrainStore";
import { calculateSlope } from "@/lib/slopeCalculation";
import { TerrainMesh } from "@/components/3d/TerrainMesh";
import { FloodRiskModule } from "@/components/3d/FloodRiskModule";
import { RoadOverlayGroup } from "@/components/3d/RoadOverlayGroup";

const cepSchema = z.object({
  cep: z.string().min(8, "CEP deve ter 8 dígitos").max(9, "Formato inválido")
});

export default function GerarTerrenoPage() {

  const setTerrainData = useTerrainStore(state => state.setTerrainData);
  const location = useTerrainStore(state => state.location);
  const latitude = useTerrainStore(state => state.latitude);
  const longitude = useTerrainStore(state => state.longitude);
  const elevationMatrix = useTerrainStore(state => state.elevationMatrix);
  const minElevation = useTerrainStore(state => state.minElevation);
  const maxElevation = useTerrainStore(state => state.maxElevation);
  const slopeData = useTerrainStore(state => state.slopeData);
  const globalRisk = useTerrainStore(state => state.globalRisk);

  const terrainData = elevationMatrix ? {
     location,
     latitude,
     longitude,
     elevationMatrix,
     minElevation,
     maxElevation
  } : null;

  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(cepSchema)
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMSG("");
    useTerrainStore.getState().clearTerrain();

    try {
      const response = await fetch("http://localhost:3001/api/generate-terrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: data.cep })
      });

      if (!response.ok) {
         const text = await response.text();
         let errorMessage = "Erro ao gerar terreno.";
         try {
            const errJson = JSON.parse(text);
            if (errJson.error) errorMessage = errJson.error;
         } catch {
            errorMessage = `Erro na API: ${response.status} (Serviço indisponível ou rota inválida)`;
            console.error("API response not JSON:", text.substring(0, 200));
         }
         throw new Error(errorMessage);
      }

      const result = await response.json();

      const calculatedSlope = calculateSlope(result.elevationMatrix);
      setTerrainData(result, calculatedSlope);
    } catch (err: any) {
      console.error("[FRONTEND] API error detected, applying client-side fallback:", err.message);
      setErrorMSG(`A API falhou (${err.message}). Carregando terreno de fallback procedural para demonstração.`);
      useTerrainStore.getState().applyFallbackTerrain();
    } finally {
      setLoading(false);
    }
  };

  const getRiskStatus = () => {
    if (!slopeData) return null;
    if (globalRisk > 70 || slopeData.meanSlope > 25 || slopeData.criticalAreas > 40) return { label: "CRÍTICO", color: "text-red-500", bg: "bg-red-500/20", icon: AlertTriangle };
    if (globalRisk > 40 || slopeData.meanSlope > 15) return { label: "ALERTA", color: "text-orange-500", bg: "bg-orange-500/20", icon: AlertTriangle };
    if (globalRisk > 10 || slopeData.meanSlope > 8) return { label: "ATENÇÃO", color: "text-yellow-500", bg: "bg-yellow-500/20", icon: AlertTriangle };
    return { label: "SEGURO", color: "text-emerald-500", bg: "bg-emerald-500/20", icon: ShieldCheck };
  };

  const RiskStatus = getRiskStatus();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full min-h-screen flex flex-col xl:flex-row gap-8 animate-in fade-in duration-700">
      
      {/* Sidebar Formulário & Infos */}
      <div className="xl:w-1/3 flex flex-col gap-6">
        <header className="mb-4">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Mountain className="w-8 h-8 text-indigo-500" />
            Topografia via CEP
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Gere o modelo 3D altimétrico real da sua região inserindo um CEP válido. O sistema aplicará as leis da física computacional para prever desabamentos preventivamente com base na inclinação geográfica.
          </p>
        </header>

        {/* Informação Academica */}
        <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-xl text-sm text-indigo-200">
          <strong className="block text-indigo-400 mb-1">Diferencial Preventivo (TCC)</strong>
          Em regiões com forte histórico de deslizamentos pluviais (como Petrópolis-RJ e São Sebastião-SP), algoritmos de modelagem de encostas (Slope Calculation) detectariam antecipadamente bolsões de risco acima de 30° graus. Digite um CEP serrano para simular.
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
          <label className="text-sm text-gray-400 font-semibold mb-2 block uppercase tracking-wider">Insira o CEP do Local</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input 
                {...register("cep")}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-600 font-mono"
                placeholder="Ex: 25680-000"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
          {errors.cep && <span className="text-red-400 text-xs mt-2 block font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {errors.cep.message as string}</span>}
          {errorMSG && <span className="text-red-400 text-xs mt-2 block font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {errorMSG}</span>}
        </form>

        {/* Dados Pós-Pesquisa */}
        {terrainData && slopeData && RiskStatus && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
             <h2 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">{terrainData.location}</h2>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Lat / Lng</span>
                  <span className="font-mono text-sm text-gray-300">{terrainData.latitude?.toFixed(4)}, {terrainData.longitude?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Altitude Pico</span>
                  <span className="font-bold text-indigo-400">{terrainData.maxElevation.toFixed(0)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Inclinação Média</span>
                  <span className="font-bold text-gray-200">{slopeData.meanSlope}° Graus</span>
                </div>
                
                <div className="pt-4 border-t border-white/10 mt-2">
                   <span className="text-gray-500 text-xs uppercase tracking-wider font-bold block mb-2">Classificação Topográfica</span>
                   <div className={`flex items-center gap-3 p-3 rounded-lg border ${RiskStatus.bg.replace('/20', '/30')} ${RiskStatus.bg}`}>
                      <RiskStatus.icon className={`w-6 h-6 ${RiskStatus.color}`} />
                      <span className={`font-black tracking-widest ${RiskStatus.color}`}>{RiskStatus.label}</span>
                   </div>
                   {slopeData.criticalAreas > 0 && (
                     <p className="text-xs text-red-400/80 mt-2">Identificados {slopeData.criticalAreas} grids (áreas de 30m) com risco de avalanche ou desplacamento.</p>
                   )}
                </div>
             </div>
          </div>
        )}

      </div>

      {/* Renderizador 3D */}
      <div className="xl:w-2/3 h-[500px] xl:h-[auto] min-h-[500px] rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-black to-slate-900 relative shadow-2xl">
         
         {!terrainData && !loading && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500/50">
             <Mountain className="w-24 h-24 mb-4 opacity-20" />
             <p className="font-medium tracking-widest uppercase">Aguardando Coordenadas Mapeáveis</p>
           </div>
         )}
         
         {loading && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10 text-indigo-400">
             <Loader2 className="w-12 h-12 mb-4 animate-spin" />
             <p className="font-mono tracking-widest animate-pulse">SINTETIZANDO MALHA DEM...</p>
           </div>
         )}

         {terrainData && (
           <div className="absolute inset-0 cursor-move">
             <Canvas camera={{ position: [0, 8, 12], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <Environment preset="night" />
                <Suspense fallback={null}>
                  <TerrainMesh 
                     matrix={terrainData.elevationMatrix} 
                     minElevation={terrainData.minElevation} 
                     maxElevation={terrainData.maxElevation} 
                     isCritical={RiskStatus?.label === "CRÍTICO"}
                  />
                  <RoadOverlayGroup />
                  <FloodRiskModule />
                </Suspense>
                <OrbitControls enableZoom={true} enablePan={true} autoRotate={false} maxPolarAngle={Math.PI / 2.2} />
             </Canvas>
             <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-gray-500 font-mono tracking-wider">
               RENDERIZAÇÃO VIRTUAL WEBGL
             </div>
           </div>
         )}
      </div>

    </div>
  );
}
