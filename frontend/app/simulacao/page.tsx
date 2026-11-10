"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CloudRain, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Lock, 
  Sliders, 
  Mountain, 
  Layers, 
  Send,
  UserCheck,
  Compass,
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

  // Acesso rápido de 1 clique para Avaliador / Banca com token JWT válido do backend
  const handleQuickDemoLogin = async () => {
    try {
      const res = await apiFetch('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.token) {
        login(data.user, data.token);
        return;
      }
    } catch {
      // Fallback local caso o backend esteja offline
    }
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full" style={{ backgroundColor: 'var(--background)' }}>
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md theme-card p-8 rounded-2xl flex flex-col items-center"
        >
          <div className="w-14 h-14 rounded-2xl theme-card-muted flex items-center justify-center mb-4" style={{ color: 'var(--primary)' }}>
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wide uppercase" style={{ color: 'var(--foreground)' }}>
            Controle Operacional Geotécnico
          </h2>
          <p className="text-[10px] font-mono tracking-widest mt-1 uppercase" style={{ color: 'var(--foreground-muted)' }}>
            Acesso Reservado à Engenharia &amp; Avaliadores
          </p>
          
          <p className="text-xs leading-relaxed mt-4 mb-6" style={{ color: 'var(--foreground-muted)' }}>
            O laboratório interativo permite parametrizar cenários de mecânica dos solos e despachar alertas formais. Para fins de avaliação ou demonstração executiva, utilize o botão abaixo para liberar o acesso instantâneo.
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={handleQuickDemoLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl theme-btn-primary font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              Entrar em 1 Clique (Modo Avaliador)
            </button>

            <button
              onClick={() => setAuthOpen(true)}
              className="w-full py-2 text-[11px] font-medium transition-colors cursor-pointer"
              style={{ color: 'var(--foreground-muted)' }}
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
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 font-sans" style={{ color: 'var(--foreground)' }}>
      {/* Top Banner de Protocolo */}
      <div className="theme-card rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--primary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
            <span>ESTÚDIO DE SIMULAÇÃO PARAMÉTRICA (WHAT-IF LAB)</span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: 'var(--foreground-muted)' }}>NORMA: <strong style={{ color: 'var(--foreground)' }}>ABNT NBR 11682 // TALUDE INFINITO</strong></span>
          <span className="hidden sm:inline" style={{ color: 'var(--border)' }}>|</span>
          <span className="hidden sm:inline" style={{ color: 'var(--foreground-muted)' }}>EQUILÍBRIO LIMITE: <strong style={{ color: 'var(--primary)' }}>MOHR-COULOMB</strong></span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span style={{ color: 'var(--foreground-muted)' }}>STATUS OPERACIONAL:</span>
          <strong className="font-bold text-[#2E6F40]">CALIBRAÇÃO ATIVA</strong>
        </div>
      </div>

      {/* Header Principal */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full theme-card-muted text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
              <ShieldAlert className="w-3.5 h-3.5" /> Laboratório Geotécnico de Ruptura
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--border)' }}>•</span>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>Mecânica dos Solos Aplicada</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--foreground)' }}>
            <Sliders className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            Parametrização Geotécnica &amp; Previsão de Colapso
          </h1>
          <p className="text-xs md:text-sm mt-1 max-w-3xl leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
            Manipule variáveis físicas reais de encostas tropicais brasileiras. O motor calcula o <strong>Fator de Segurança (FS)</strong> e a <strong>Envoltória de Ruptura de Mohr-Coulomb</strong> instantaneamente.
          </p>
        </div>

        {/* Cenários Históricos de 1 Clique */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
          <span className="text-[10px] font-mono uppercase block mr-1" style={{ color: 'var(--foreground-muted)' }}>Calibrações Rápidas:</span>
          <button
            onClick={() => applyPresetScenario('petropolis_2022')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#B91C1C]/10 hover:bg-[#B91C1C]/20 text-[#B91C1C] border border-[#B91C1C]/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Petrópolis 2022 (260mm)
          </button>
          <button
            onClick={() => applyPresetScenario('sao_sebastiao_2023')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#C85A17]/10 hover:bg-[#C85A17]/20 text-[#C85A17] border border-[#C85A17]/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            São Sebastião 2023 (320mm)
          </button>
          <button
            onClick={() => applyPresetScenario('frente_fria')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#B47B1C]/10 hover:bg-[#B47B1C]/20 text-[#B47B1C] border border-[#B47B1C]/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Frente Fria (95mm)
          </button>
          <button
            onClick={() => applyPresetScenario('natural')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#2E6F40]/10 hover:bg-[#2E6F40]/20 text-[#2E6F40] border border-[#2E6F40]/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Seco / Normal
          </button>
        </div>
      </header>

      {/* Grid Principal: Controles na Esquerda, Gráficos e Laudo na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda: Controles Paramétricos e Sliders */}
        <div className="lg:col-span-5 space-y-5">
          <div className="theme-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                  Variáveis de Entrada do Talude
                </h3>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>ABNT NBR 11682</span>
            </div>

            {/* 1. Seleção de Litologia do Solo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center justify-between" style={{ color: 'var(--foreground)' }}>
                <span>Litologia e Mecânica do Solo:</span>
                <span className="font-mono font-bold" style={{ color: 'var(--primary)' }}>{SOIL_PRESETS[lithologyKey]?.name}</span>
              </label>
              <select
                value={lithologyKey}
                onChange={(e) => setLithologyKey(e.target.value)}
                className="w-full theme-card-muted rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none transition-colors"
                style={{ color: 'var(--foreground)' }}
              >
                {Object.values(SOIL_PRESETS).map((soil) => (
                  <option key={soil.id} value={soil.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
                    {soil.name} (φ&#39;={soil.phiDeg}°, c&#39;={soil.cohesionKPa}kPa)
                  </option>
                ))}
              </select>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--foreground-muted)' }}>
                {SOIL_PRESETS[lithologyKey]?.description}
              </p>
            </div>

            {/* 2. Slider de Chuva Acumulada 72h */}
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                  <CloudRain className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Chuva Acumulada (72h):
                </span>
                <strong className="font-mono text-sm" style={{ color: 'var(--primary)' }}>{accumulatedRain72h} mm</strong>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="5"
                value={accumulatedRain72h}
                onChange={(e) => setAccumulatedRain72h(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--border)', accentColor: 'var(--primary)' }}
              />
              <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
                <span>0 mm (Seco)</span>
                <span className="text-[#B47B1C]">100 mm (Gatilho CEMADEN)</span>
                <span className="text-[#B91C1C]">400 mm (Catástrofe)</span>
              </div>
            </div>

            {/* 3. Slider de Declividade da Encosta */}
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                  <Compass className="w-4 h-4 text-[#B47B1C]" /> Declividade da Encosta (β):
                </span>
                <strong className="font-mono text-sm text-[#B47B1C]">{slopeDeg}°</strong>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={slopeDeg}
                onChange={(e) => setSlopeDeg(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--border)', accentColor: '#B47B1C' }}
              />
              <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
                <span>0° (Platô)</span>
                <span>25° (Atenção)</span>
                <span className="text-[#B91C1C]">&gt; 35° (Risco Crítico)</span>
              </div>
            </div>

            {/* 4. Slider de Nível do Freático / Saturação */}
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                  <Activity className="w-4 h-4 text-[#2E6F40]" /> Razão de Saturação (m = hw/z):
                </span>
                <strong className="font-mono text-sm text-[#2E6F40]">{Math.round(saturationRatio * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(saturationRatio * 100)}
                onChange={(e) => setSaturationRatio(Number(e.target.value) / 100)}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--border)', accentColor: '#2E6F40' }}
              />
              <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
                <span>0% (Freático Profundo)</span>
                <span>50% (Manto Semi-saturado)</span>
                <span className="text-[#B91C1C]">100% (Afloramento)</span>
              </div>
            </div>

            {/* 5. Slider de Profundidade da Ruptura */}
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
                  <Mountain className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Profundidade da Ruptura (z):
                </span>
                <strong className="font-mono text-sm" style={{ color: 'var(--primary)' }}>{soilDepthM.toFixed(1)} m</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={soilDepthM}
                onChange={(e) => setSoilDepthM(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--border)', accentColor: 'var(--primary)' }}
              />
              <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--foreground-muted)' }}>
                <span>1.0 m (Raso)</span>
                <span>2.5 m (Médio)</span>
                <span>5.0 m (Profundo)</span>
              </div>
            </div>

            {/* Botão de Sincronização com o Modelo 3D */}
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={handleInjectTo3D}
                className="w-full py-3 rounded-xl theme-btn-primary font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Injetar no Gêmeo Digital 3D
              </button>
              {injectedSuccess && (
                <p className="text-[11px] font-mono text-[#2E6F40] text-center mt-2 flex items-center justify-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Condições aplicadas com sucesso à maquete 3D e sensores!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Gráfico de Mohr-Coulomb, Fator de Segurança e Memória de Cálculo */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card de Fator de Segurança & Classificação CPRM */}
          <div className="theme-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-sm"
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
                  <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--foreground-muted)' }}>Classificação Oficial</span>
                  <span style={{ color: 'var(--border)' }}>•</span>
                  <span className="text-xs font-mono font-bold" style={{ color: cprmClassification.color }}>
                    {cprmClassification.name}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono tracking-tight mt-0.5 flex items-baseline gap-2" style={{ color: 'var(--foreground)' }}>
                  FS = {safetyFactor >= 99 ? 'Estável (Platô)' : safetyFactor.toFixed(2)}
                  <span className="text-xs font-mono font-normal" style={{ color: 'var(--foreground-muted)' }}>
                    {safetyFactor >= 1.5 ? '(Em conformidade com NBR 11682)' : '(Subcrítico / Instável)'}
                  </span>
                </div>
                <p className="text-xs mt-1 max-w-md" style={{ color: 'var(--foreground-muted)' }}>
                  {cprmClassification.description}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto text-right font-mono theme-card-muted p-3.5 rounded-xl min-w-[140px]">
              <span className="text-[9px] uppercase block" style={{ color: 'var(--foreground-muted)' }}>Probabilidade Ruptura</span>
              <span className="text-2xl font-black font-mono" style={{ color: cprmClassification.color }}>
                {geotechnicalCalculation.ruptureRiskPercent}%
              </span>
              <span className="text-[9px] block mt-0.5" style={{ color: 'var(--foreground-muted)' }}>Mecanismo Translacional</span>
            </div>
          </div>

          {/* Gráfico do Diagrama de Mohr-Coulomb */}
          <MohrCoulombChart calculation={geotechnicalCalculation} />

          {/* Memória de Cálculo Auditável da NBR 11682 */}
          <div className="theme-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                  Memória de Cálculo da Estabilidade de Taludes (ABNT NBR 11682)
                </h4>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded theme-card-muted" style={{ color: 'var(--foreground-muted)' }}>
                AUDITÁVEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="theme-card-muted rounded-xl p-3.5 space-y-1">
                <span className="text-[9px] uppercase block" style={{ color: 'var(--foreground-muted)' }}>1. Tensão Normal Total (σ_n):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  σ_n = γ_sat · z · cos²(β) = <strong style={{ color: 'var(--foreground)' }}>{sigmaNormalTotal} kPa</strong>
                </div>
                <span className="text-[9px] uppercase block pt-1" style={{ color: 'var(--foreground-muted)' }}>2. Poro-pressão de Água (u):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  u = m · γ_w · z · cos²(β) = <strong style={{ color: 'var(--primary)' }}>{poreWaterPressure} kPa</strong>
                </div>
                <span className="text-[9px] uppercase block pt-1" style={{ color: 'var(--foreground-muted)' }}>3. Tensão Normal Efetiva (σ&#39;):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  σ&#39; = σ_n - u = <strong className="text-[#2E6F40]">{sigmaEffective} kPa</strong>
                </div>
              </div>

              <div className="theme-card-muted rounded-xl p-3.5 space-y-1">
                <span className="text-[9px] uppercase block" style={{ color: 'var(--foreground-muted)' }}>4. Tensão Cisalhante Atuante (τ_d):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  τ_d = γ_sat · z · sin(β) · cos(β) = <strong style={{ color: isCollapse ? '#B91C1C' : 'var(--foreground)' }}>{drivingShearStress} kPa</strong>
                </div>
                <span className="text-[9px] uppercase block pt-1" style={{ color: 'var(--foreground-muted)' }}>5. Resistência Cisalhante Disponível (τ_r):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  τ_r = c&#39; + σ&#39; · tan(φ&#39;) = <strong style={{ color: 'var(--foreground)' }}>{resistingShearStress} kPa</strong>
                </div>
                <span className="text-[9px] uppercase block pt-1" style={{ color: 'var(--foreground-muted)' }}>6. Fator de Segurança (FS):</span>
                <div style={{ color: 'var(--foreground-muted)' }}>
                  FS = τ_r / τ_d = <strong style={{ color: isCollapse ? '#B91C1C' : '#2E6F40' }}>{safetyFactor >= 99 ? 'Estável' : safetyFactor.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {isCollapse && (
              <div className="p-3.5 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/30 flex items-center justify-between gap-3 text-xs font-mono text-[#B91C1C]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
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
            className="fixed bottom-10 right-10 theme-card border-2 border-[#B91C1C] p-6 rounded-2xl shadow-2xl z-50 max-w-sm font-sans"
          >
            <div className="flex items-center gap-3 text-[#B91C1C] font-bold text-lg mb-2">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              ALERTA DE EVACUAÇÃO
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground)' }}>
              O modelo identificou colapso geotécnico iminente no setor monitorado.
            </p>
            <div className="theme-card-muted p-3 rounded-lg mb-4 text-xs font-mono" style={{ color: 'var(--foreground)' }}>
              Protocolo: <strong>{activeAlert.protocolCode}</strong><br/>
              Severidade: CPRM R4 (Muito Alto)
            </div>
            <button 
              onClick={sendToCivilDefense}
              className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider font-mono cursor-pointer"
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
