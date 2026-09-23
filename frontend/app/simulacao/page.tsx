"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CloudRain, 
  ShieldAlert, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Lock, 
  Sliders, 
  Mountain, 
  Layers, 
  Send,
  UserCheck,
  Compass,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { socket } from '@/lib/socket';
import { useTerrainStore } from '@/store/terrainStore';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { apiFetch } from '@/lib/api';
import { 
  SOIL_PRESETS, 
  calculateGeotechnicalStability, 
  GeotechnicalParameters 
} from '@/lib/geotechnicalEngine';
import { MohrCoulombChart } from '@/components/simulation/MohrCoulombChart';

export interface SimulationAlert {
  id: string;
  protocolCode: string;
  riskLevel: number;
  description: string;
  status: string;
  createdAt: string | Date;
}

export default function Simulacao() {
  const [loading, setLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState<SimulationAlert | null>(null);

  const { user, login } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Parâmetros do Estúdio Geotécnico Interativo
  const [slopeDeg, setSlopeDeg] = useState<number>(32);
  const [soilDepthM, setSoilDepthM] = useState<number>(2.5);
  const [saturationRatio, setSaturationRatio] = useState<number>(0.55);
  const [accumulatedRain72h, setAccumulatedRain72h] = useState<number>(80);
  const [lithologyKey, setLithologyKey] = useState<string>('coluvionar');
  const [injectedSuccess, setInjectedSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    socket.on('emergencyAlert', (alert: SimulationAlert) => {
      setActiveAlert(alert);
      try {
        const audio = new Audio('/alert.mp3');
        audio.play().catch(() => {});
      } catch {}
    });
    return () => { socket.off('emergencyAlert'); };
  }, []);

  // Cálculo geotécnico instantâneo em tempo real
  const geotechnicalCalculation = useMemo(() => {
    const params: GeotechnicalParameters = {
      slopeDeg,
      soilDepthM,
      saturationRatio,
      accumulatedRain72h,
      lithologyKey
    };
    return calculateGeotechnicalStability(params);
  }, [slopeDeg, soilDepthM, saturationRatio, accumulatedRain72h, lithologyKey]);

  // Acesso rápido de 1 clique para Avaliador / Banca
  const handleQuickDemoLogin = () => {
    login(
      {
        id: 'evaluator-demo-id',
        name: 'Avaliador de Engenharia / Banca',
        email: 'banca.geotecnica@defesacivil.gov.br',
        role: 'OPERATOR'
      },
      'mock-evaluator-token-2026'
    );
  };

  // Calibração dos sliders a partir dos cenários históricos
  const applyPresetScenario = async (mode: string) => {
    setLoading(true);
    try {
      if (mode === 'petropolis_2022') {
        setSlopeDeg(38);
        setSoilDepthM(2.8);
        setSaturationRatio(0.95);
        setAccumulatedRain72h(260);
        setLithologyKey('coluvionar');
      } else if (mode === 'sao_sebastiao_2023') {
        setSlopeDeg(42);
        setSoilDepthM(3.5);
        setSaturationRatio(1.0);
        setAccumulatedRain72h(320);
        setLithologyKey('coluvionar');
      } else if (mode === 'frente_fria') {
        setSlopeDeg(26);
        setSoilDepthM(2.0);
        setSaturationRatio(0.80);
        setAccumulatedRain72h(95);
        setLithologyKey('residual');
      } else if (mode === 'natural') {
        setSlopeDeg(18);
        setSoilDepthM(2.0);
        setSaturationRatio(0.20);
        setAccumulatedRain72h(0);
        setLithologyKey('residual');
      }

      const backendMode = 
        mode === 'petropolis_2022' ? 'critical_risk' :
        mode === 'sao_sebastiao_2023' ? 'saturated_soil' :
        mode === 'frente_fria' ? 'heavy_rain' : 'normal';

      await apiFetch('/api/simulation/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: backendMode })
      });
      
      const store = useTerrainStore.getState();
      if (mode === 'natural') {
        setActiveAlert(null);
        useTerrainStore.setState({ rainVolume: 0, soilSaturationPercent: 20 });
        store.restoreNormalConditions();
      } else if (mode === 'petropolis_2022') {
        useTerrainStore.setState({ rainVolume: 260, soilSaturationPercent: 95 });
        store.updateAllSensors({ rainVolume: 260, soilMoisture: 95, vibration: 12 });
      } else if (mode === 'sao_sebastiao_2023') {
        useTerrainStore.setState({ rainVolume: 320, soilSaturationPercent: 100 });
        store.updateAllSensors({ rainVolume: 320, soilMoisture: 100, vibration: 18 });
      } else if (mode === 'frente_fria') {
        useTerrainStore.setState({ rainVolume: 95, soilSaturationPercent: 80 });
        store.updateAllSensors({ rainVolume: 95, soilMoisture: 80, vibration: 2 });
      }
    } catch (e) {
      console.error('Erro ao disparar cenário:', e);
    } finally {
      setLoading(false);
    }
  };

  // Injetar os parâmetros físicos dos sliders no Gêmeo Digital 3D (Zustand Store)
  const handleInjectTo3D = () => {
    useTerrainStore.setState({
      rainVolume: accumulatedRain72h,
      soilSaturationPercent: Math.round(saturationRatio * 100),
      safetyFactor: geotechnicalCalculation.safetyFactor,
      riskLevelCode: geotechnicalCalculation.cprmClassification.code,
      riskClassification: geotechnicalCalculation.cprmClassification.name
    });

    useTerrainStore.getState().updateAllSensors({
      rainVolume: accumulatedRain72h,
      soilMoisture: Math.round(saturationRatio * 100),
      vibration: geotechnicalCalculation.safetyFactor < 1.0 ? 16 : 1.2
    });

    setInjectedSuccess(true);
    setTimeout(() => setInjectedSuccess(false), 3000);
  };

  const sendToCivilDefense = async () => {
    if (!activeAlert) return;
    try {
      await apiFetch(`/api/defense-protocols/${activeAlert.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: "Encaminhado" })
      });
      setActiveAlert((prev) => prev ? { ...prev, status: "Encaminhado" } : null);
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  const isOperator = user && user.role === 'OPERATOR';

  if (!isOperator) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020408] p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md bg-slate-950/80 border border-white/10 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center border-t-blue-500/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Lock className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase">Controle Operacional Geotécnico</h2>
          <p className="text-[10px] text-gray-400 font-mono tracking-widest mt-1 uppercase">Acesso Reservado à Defesa Civil & Avaliadores</p>
          
          <p className="text-xs text-gray-400 leading-relaxed mt-4 mb-6">
            O laboratório interativo permite forçar intempéries de mecânica dos solos e despachar alertas formais. Para fins de avaliação acadêmica ou demonstração técnica, utilize o botão abaixo para liberar o acesso instantâneo.
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={handleQuickDemoLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95 transition-all font-mono"
            >
              <UserCheck className="w-4 h-4" />
              Entrar em 1 Clique (Modo Avaliador / Banca)
            </button>

            <button
              onClick={() => setAuthOpen(true)}
              className="w-full py-2 text-[11px] font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Fazer login com credenciais próprias →
            </button>
          </div>
        </motion.div>

        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)} 
          message="Faça login como operador de monitoramento ou utilize o botão de Avaliador." 
        />
      </div>
    );
  }

  const { cprmClassification, safetyFactor, drivingShearStress, resistingShearStress, poreWaterPressure, sigmaEffective, sigmaNormalTotal } = geotechnicalCalculation;
  const isCollapse = safetyFactor < 1.0;

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 font-sans text-slate-100">
      {/* Top Banner de Protocolo */}
      <div className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono backdrop-blur-xl shadow-lg border-t-orange-500/30">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-orange-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span>ESTÚDIO DE SIMULAÇÃO PARAMÉTRICA (WHAT-IF LAB)</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">NORMA: <strong className="text-slate-200">ABNT NBR 11682 // TALUDE INFINITO</strong></span>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-gray-400 hidden sm:inline">EQUILÍBRIO LIMITE: <strong className="text-cyan-400">MOHR-COULOMB</strong></span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-gray-400">STATUS OPERACIONAL:</span>
          <strong className="text-emerald-400 font-bold">CALIBRAÇÃO ATIVA</strong>
        </div>
      </div>

      {/* Header Principal */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Laboratório Geotécnico de Ruptura
            </span>
            <span className="text-gray-600 font-mono text-xs">•</span>
            <span className="text-gray-400 font-mono text-[10px] uppercase tracking-wider">Mecânica dos Solos Aplicada</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-7 h-7 text-orange-500" />
            Parametrização Geotécnica & Previsão de Colapso
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
            Manipule variáveis físicas reais de encostas tropicais brasileiras. O motor calcula o <strong>Fator de Segurança (FS)</strong> e a <strong>Envoltória de Ruptura de Mohr-Coulomb</strong> instantaneamente.
          </p>
        </div>

        {/* Cenários Históricos de 1 Clique */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
          <span className="text-[9px] font-mono text-gray-500 uppercase block mr-1">Calibrações Rápidas:</span>
          <button
            onClick={() => applyPresetScenario('petropolis_2022')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Petrópolis 2022 (260mm)
          </button>
          <button
            onClick={() => applyPresetScenario('sao_sebastiao_2023')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            São Sebastião 2023 (320mm)
          </button>
          <button
            onClick={() => applyPresetScenario('frente_fria')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Frente Fria (95mm)
          </button>
          <button
            onClick={() => applyPresetScenario('natural')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Seco / Normal
          </button>
        </div>
      </header>

      {/* Grid Principal: Controles na Esquerda, Gráficos e Laudo na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda: Controles Paramétricos e Sliders */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl space-y-5 border-t-white/15">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Variáveis de Entrada do Talude
                </h3>
              </div>
              <span className="text-[10px] font-mono text-gray-500">ABNT NBR 11682</span>
            </div>

            {/* 1. Seleção de Litologia do Solo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-300 flex items-center justify-between">
                <span>Litologia e Mecânica do Solo:</span>
                <span className="text-cyan-400 font-bold">{SOIL_PRESETS[lithologyKey]?.name}</span>
              </label>
              <select
                value={lithologyKey}
                onChange={(e) => setLithologyKey(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {Object.values(SOIL_PRESETS).map((soil) => (
                  <option key={soil.id} value={soil.id} className="bg-slate-950 text-white">
                    {soil.name} (φ&#39;={soil.phiDeg}°, c&#39;={soil.cohesionKPa}kPa)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500 leading-tight">
                {SOIL_PRESETS[lithologyKey]?.description}
              </p>
            </div>

            {/* 2. Slider de Chuva Acumulada 72h */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Chuva Acumulada (72h):
                </span>
                <strong className="text-blue-400 text-sm">{accumulatedRain72h} mm</strong>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="5"
                value={accumulatedRain72h}
                onChange={(e) => setAccumulatedRain72h(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>0 mm (Seco)</span>
                <span className="text-amber-500">100 mm (Gatilho CEMADEN)</span>
                <span className="text-red-500">400 mm (Catástrofe)</span>
              </div>
            </div>

            {/* 3. Slider de Declividade da Encosta */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-yellow-400" /> Declividade da Encosta (β):
                </span>
                <strong className="text-yellow-400 text-sm">{slopeDeg}°</strong>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={slopeDeg}
                onChange={(e) => setSlopeDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>0° (Platô)</span>
                <span>25° (Atenção)</span>
                <span className="text-red-500">&gt; 35° (Risco Crítico)</span>
              </div>
            </div>

            {/* 4. Slider de Nível do Freático / Saturação */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> Razão de Saturação (m = hw/z):
                </span>
                <strong className="text-cyan-400 text-sm">{Math.round(saturationRatio * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(saturationRatio * 100)}
                onChange={(e) => setSaturationRatio(Number(e.target.value) / 100)}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>0% (Freático Profundo)</span>
                <span>50% (Manto Semi-saturado)</span>
                <span className="text-red-500">100% (Afloramento)</span>
              </div>
            </div>

            {/* 5. Slider de Profundidade da Ruptura */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-gray-300 flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-purple-400" /> Profundidade da Ruptura (z):
                </span>
                <strong className="text-purple-400 text-sm">{soilDepthM.toFixed(1)} m</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={soilDepthM}
                onChange={(e) => setSoilDepthM(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-500">
                <span>1.0 m (Raso)</span>
                <span>2.5 m (Médio)</span>
                <span>5.0 m (Profundo)</span>
              </div>
            </div>

            {/* Botão de Sincronização com o Modelo 3D */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleInjectTo3D}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Injetar no Gêmeo Digital 3D (Zustand)
              </button>
              {injectedSuccess && (
                <p className="text-[10px] font-mono text-emerald-400 text-center mt-2 flex items-center justify-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3" /> Condições aplicadas com sucesso à maquete 3D e sensores!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Gráfico de Mohr-Coulomb, Fator de Segurança e Memória de Cálculo */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card de Fator de Segurança & Classificação CPRM */}
          <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5 border-t-white/15">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-xl"
                style={{
                  backgroundColor: `${cprmClassification.color}15`,
                  borderColor: `${cprmClassification.color}40`,
                  color: cprmClassification.color
                }}
              >
                <span className="text-[10px] font-mono font-bold uppercase">CPRM</span>
                <span className="text-2xl font-black font-mono">{cprmClassification.code}</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Classificação Oficial</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs font-mono font-bold" style={{ color: cprmClassification.color }}>
                    {cprmClassification.name}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-white tracking-tight mt-0.5 flex items-baseline gap-2">
                  FS = {safetyFactor >= 99 ? 'Estável (Platô)' : safetyFactor.toFixed(2)}
                  <span className="text-xs font-mono font-normal text-gray-500">
                    {safetyFactor >= 1.5 ? '(Em conformidade com NBR 11682)' : '(Subcrítico / Instável)'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 max-w-md">
                  {cprmClassification.description}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto text-right font-mono bg-black/40 border border-white/5 p-3 rounded-xl min-w-[140px]">
              <span className="text-[9px] text-gray-500 uppercase block">Probabilidade Ruptura</span>
              <span className="text-2xl font-black font-mono" style={{ color: cprmClassification.color }}>
                {geotechnicalCalculation.ruptureRiskPercent}%
              </span>
              <span className="text-[9px] text-gray-500 block mt-0.5">Mecanismo Translacional</span>
            </div>
          </div>

          {/* Gráfico do Diagrama de Mohr-Coulomb */}
          <MohrCoulombChart calculation={geotechnicalCalculation} />

          {/* Memória de Cálculo Auditável da NBR 11682 */}
          <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Memória de Cálculo da Estabilidade de Taludes (ABNT NBR 11682)
                </h4>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400">
                AUDITÁVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase block">1. Tensão Normal Total (σ_n):</span>
                <div className="text-gray-300">
                  σ_n = γ_sat · z · cos²(β) = <strong className="text-white">{sigmaNormalTotal} kPa</strong>
                </div>
                <span className="text-[9px] text-gray-500 uppercase block pt-1">2. Poro-pressão de Água (u):</span>
                <div className="text-gray-300">
                  u = m · γ_w · z · cos²(β) = <strong className="text-cyan-400">{poreWaterPressure} kPa</strong>
                </div>
                <span className="text-[9px] text-gray-500 uppercase block pt-1">3. Tensão Normal Efetiva (σ&#39;):</span>
                <div className="text-gray-300">
                  σ&#39; = σ_n - u = <strong className="text-emerald-400">{sigmaEffective} kPa</strong>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase block">4. Tensão Cisalhante Atuante (τ_d):</span>
                <div className="text-gray-300">
                  τ_d = γ_sat · z · sin(β) · cos(β) = <strong className={isCollapse ? "text-red-400" : "text-white"}>{drivingShearStress} kPa</strong>
                </div>
                <span className="text-[9px] text-gray-500 uppercase block pt-1">5. Resistência Cisalhante Disponível (τ_r):</span>
                <div className="text-gray-300">
                  τ_r = c&#39; + σ&#39; · tan(φ&#39;) = <strong className="text-white">{resistingShearStress} kPa</strong>
                </div>
                <span className="text-[9px] text-gray-500 uppercase block pt-1">6. Fator de Segurança (FS):</span>
                <div className="text-gray-300">
                  FS = τ_r / τ_d = <strong className={isCollapse ? "text-red-400" : "text-emerald-400"}>{safetyFactor >= 99 ? 'Estável' : safetyFactor.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {isCollapse && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-3 text-xs font-mono text-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce flex-shrink-0" />
                  <span>
                    <strong>ALERTA DE COLAPSO ESTRUTURAL (FS &lt; 1.00):</strong> As tensões cisalhantes superam a resistência de atrito e coesão. Ruptura iminente de massa.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerta Flutuante de Emergência */}
      <AnimatePresence>
        {activeAlert && activeAlert.status !== "Encaminhado" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 right-10 bg-red-950/90 backdrop-blur-xl border border-red-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] z-50 max-w-sm font-sans"
          >
            <div className="flex items-center gap-3 text-red-500 font-bold text-lg mb-2">
              <AlertTriangle className="w-6 h-6 animate-ping" />
              ALERTA DE EVACUAÇÃO
            </div>
            <p className="text-red-100 text-sm mb-4">
              O modelo identificou colapso geotécnico iminente no setor monitorado.
            </p>
            <div className="bg-black/50 p-3 rounded-lg mb-4 text-xs font-mono text-red-200 border border-red-900/50">
              Protocolo: <strong>{activeAlert.protocolCode}</strong><br/>
              Severidade: CPRM R4 (Muito Alto)
            </div>
            <button 
              onClick={sendToCivilDefense}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-95 text-xs uppercase tracking-wider font-mono cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              Despachar Viaturas da Defesa Civil
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
