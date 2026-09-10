"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CloudRain, ShieldAlert, Zap, Activity, CheckCircle2, Lock } from 'lucide-react';
import { socket } from '@/lib/socket';
import { useTerrainStore } from '@/store/terrainStore';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { apiFetch } from '@/lib/api';

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

  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    return () => { socket.off('emergencyAlert'); }
  }, []);

  const triggerSimulation = async (mode: string) => {
    setLoading(true);
    try {
      // API call to register log in backend + dispatch sockets to other clients
      const backendMode = 
        mode === 'petropolis_2022' ? 'critical_risk' :
        mode === 'sao_sebastiao_2023' ? 'saturated_soil' :
        mode === 'continuous_rain' ? 'heavy_rain' :
        mode === 'intense_vibration' ? 'intense_vibration' : 'normal';

      await apiFetch('/api/simulation/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: backendMode })
      });
      
      const store = useTerrainStore.getState();
      
      // Update the Global Zustand System
      if (mode === 'normal') {
         setActiveAlert(null);
         useTerrainStore.setState({ rainVolume: 0, soilSaturationPercent: 30 });
         store.restoreNormalConditions(); // Modelo de Inércia de Secagem Gradual
      } else if (mode === 'petropolis_2022') {
         useTerrainStore.setState({ rainVolume: 260, soilSaturationPercent: 98 });
         store.updateAllSensors({ rainVolume: 260, soilMoisture: 98, vibration: 12 });
      } else if (mode === 'sao_sebastiao_2023') {
         useTerrainStore.setState({ rainVolume: 320, soilSaturationPercent: 100 });
         store.updateAllSensors({ rainVolume: 320, soilMoisture: 100, vibration: 18 });
      } else if (mode === 'continuous_rain') {
         useTerrainStore.setState({ rainVolume: 95, soilSaturationPercent: 82 });
         store.updateAllSensors({ rainVolume: 95, soilMoisture: 82, vibration: 2 });
      } else if (mode === 'intense_vibration') {
         useTerrainStore.setState({ rainVolume: 45, soilSaturationPercent: 65 });
         store.updateAllSensors({ vibration: 25, rainVolume: 45, soilMoisture: 65 });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  if (!mounted) return null; // Avoid hydration flash mismatch

  const isOperator = user && user.role === 'OPERATOR';

  if (!isOperator) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] p-6 text-center select-none font-sans relative overflow-hidden h-screen w-full">
        {/* Glow overlay */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md bg-white/[0.01] border border-white/5 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center border-t-blue-500/20"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <Lock className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white tracking-wide uppercase">Controle Operacional Restrito</h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">Credenciais de Monitoramento Exigidas</p>
          
          <p className="text-xs text-gray-400 leading-relaxed mt-4 mb-6">
            O laboratório de simulação geotécnica permite forçar intempéries climáticas e emitir despachos formais para a Defesa Civil. Para evitar acionamentos acidentais e falsos alarmes, as chaves estão trancadas para visitantes.
          </p>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/15 cursor-pointer active:scale-95 transition-all"
          >
            Acessar com Cadastro ou Avaliador
          </button>
        </motion.div>

        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)} 
          message="Faça login como operador de monitoramento ou utilize o botão de Avaliador de TCC." 
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full relative">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-orange-400 uppercase tracking-wider mb-2">
          <span>Modelagem Geotécnica Mohr-Coulomb</span>
          <span>•</span>
          <span>Cenários Históricos do Brasil</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-orange-500" />
          Laboratório de Simulação Geotécnica & Desastres
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Reproduza os parâmetros hidrológicos e mecânicos de eventos catastróficos reais brasileiros para testar o cálculo instantâneo do Fator de Segurança (FS), a classificação de risco CPRM (R1 a R4) e os protocolos de evacuação preventiva.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <SimulationCard 
          icon={AlertTriangle} 
          title="Petrópolis / RJ (2022)" 
          badge="Catástrofe Histórica • R4 Iminente"
          desc="Tempestade convectiva extrema com 260 mm de precipitação em poucas horas. Força o colapso da sucção mátrica do solo em talude íngreme, disparando escorregamento translacional generalizado e corridas de detritos."
          metrics="P72h: 260mm • Saturação: 98% • FS < 0.70"
          delay={0}
          action={() => triggerSimulation('petropolis_2022')} 
          loading={loading}
          color="red"
        />
        <SimulationCard 
          icon={CloudRain} 
          title="São Sebastião / SP (2023)" 
          badge="Maior Chuva do Brasil • 680mm"
          desc="Saturação hidrológica total da Serra do Mar (>600 mm/24h). O lençol freático sobe até a superfície do terreno, anulando as tensões efetivas e induzindo liquefação com ruptura planar catastrófica."
          metrics="P72h: 320mm • Saturação: 100% • FS < 0.55"
          delay={0.1}
          action={() => triggerSimulation('sao_sebastiao_2023')} 
          loading={loading}
          color="cyan"
        />
        <SimulationCard 
          icon={Activity} 
          title="Frente Fria Prolongada" 
          badge="Limiar CEMADEN • Transição R2/R3"
          desc="Chuva contínua de 95 mm ao longo de 72 horas. Infiltração constante que encharca os horizontes superficiais do manto de alteração, reduzindo o Fator de Segurança para a faixa de Atenção Máxima."
          metrics="P72h: 95mm • Saturação: 82% • FS ≈ 1.15"
          delay={0.2}
          action={() => triggerSimulation('continuous_rain')} 
          loading={loading}
          color="blue"
        />
        <SimulationCard 
          icon={Zap} 
          title="Rastejo de Encosta & Dinâmica Sísmica" 
          badge="Soil Creep • Fissuras de Tração"
          desc="Simula microssismos e vibrações mecânicas intensas decorrentes de tráfego pesado e propagação de trincas de tração na crista do talude, acelerando a perda de estabilidade estrutural."
          metrics="Vibração: 25mm/s • Saturação: 65% • FS ≈ 1.25"
          delay={0.3}
          action={() => triggerSimulation('intense_vibration')} 
          loading={loading}
          color="yellow"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Estabilidade Geotécnica Natural</div>
            <div className="text-xs text-gray-400">Drenagem gravitacional ativa, sucção mátrica preservada e FS &gt; 1.80 (R1 Seguro)</div>
          </div>
        </div>
        <button 
           onClick={() => triggerSimulation('normal')} 
           disabled={loading}
           className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/15 cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          Restaurar Condições Normais (Verde)
        </button>
      </div>

      <AnimatePresence>
        {activeAlert && activeAlert.status !== "Encaminhado" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 right-10 bg-red-950/90 backdrop-blur-xl border border-red-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] z-50 max-w-sm"
          >
            <div className="flex items-center gap-3 text-red-500 font-bold text-lg mb-2">
              <AlertTriangle className="w-6 h-6 animate-ping" />
              ALERTA DETECTADO
            </div>
            <p className="text-red-100 text-sm mb-4">
              O sistema identificou uma grave anomalia na área de riscos.
            </p>
            <div className="bg-black/50 p-3 rounded-lg mb-4 text-sm font-mono text-red-200 border border-red-900/50">
              Protocolo Interno: <strong>{activeAlert.protocolCode}</strong><br/>
              Severidade Estimada: {activeAlert.riskLevel}
            </div>
            <button 
              onClick={sendToCivilDefense}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-95"
            >
              <ShieldAlert className="w-5 h-5" />
              Enviar para Defesa Civil Oficial
            </button>
          </motion.div>
        )}
        
        {activeAlert && activeAlert.status === "Encaminhado" && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 20 }}
             className="fixed bottom-10 right-10 bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] z-50 max-w-sm"
           >
             <div className="flex items-center gap-3 text-emerald-500 font-bold text-lg mb-2">
               <CheckCircle2 className="w-6 h-6" />
               ALERTA ENVIADO
             </div>
             <p className="text-emerald-100 text-sm">
               Protocolo <strong>{activeAlert.protocolCode}</strong> registrado com sucesso na central externa. Mudança de status para <span className="text-white font-medium">&quot;Em análise&quot;</span>.
             </p>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SimulationCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  desc: string;
  metrics?: string;
  action: () => void;
  loading: boolean;
  color: string;
  delay: number;
}

function SimulationCard({ icon: Icon, title, badge, desc, metrics, action, loading, color, delay }: SimulationCardProps) {
  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    cyan: "hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]",
    yellow: "hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]",
    red: "hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
  };

  const iconColor: Record<string, string> = {
      blue: "text-blue-400",
      cyan: "text-cyan-400",
      yellow: "text-yellow-400",
      red: "text-red-500"
  };

  const badgeObj: Record<string, string> = {
     blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
     cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
     yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
     red: "bg-red-500/20 text-red-300 border-red-500/30"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`border border-white/5 bg-black/40 backdrop-blur-lg p-6 rounded-2xl transition-all duration-300 cursor-pointer group flex flex-col justify-between ${colorMap[color]}`}
      onClick={() => !loading && action()}
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${badgeObj[color]} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-6 h-6 ${iconColor[color]}`} />
            </div>
            <div>
              <h3 className={`font-bold text-lg text-white group-hover:${iconColor[color]} transition-colors`}>{title}</h3>
              {badge && (
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-mono mt-1 ${badgeObj[color]}`}>
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors mb-4">
          {desc}
        </p>
      </div>

      {metrics && (
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span className="text-gray-500">Parâmetros:</span>
          <span className="text-white font-semibold">{metrics}</span>
        </div>
      )}
    </motion.div>
  );
}
