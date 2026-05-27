"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CloudRain, ShieldAlert, Zap, Activity, CheckCircle2, Lock } from 'lucide-react';
import { socket } from '@/lib/socket';
import { useTerrainStore } from '@/store/terrainStore';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';

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
      await fetch('http://localhost:3001/api/simulation/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      
      const store = useTerrainStore.getState();
      
      // Update the Global Zustand System
      if (mode === 'normal') {
         setActiveAlert(null);
         store.restoreNormalConditions(); // Modelo de Inércia de Secagem Gradual
      } else if (mode === 'heavy_rain') {
         store.updateAllSensors({ rainVolume: 120, soilMoisture: 80 }); 
      } else if (mode === 'saturated_soil') {
         store.updateAllSensors({ soilMoisture: 100 });
      } else if (mode === 'intense_vibration') {
         store.updateAllSensors({ vibration: 15 });
      } else if (mode === 'critical_risk') {
         store.updateAllSensors({ rainVolume: 150, soilMoisture: 100, vibration: 20 });
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
      await fetch(`http://localhost:3001/api/defense-protocols/${activeAlert.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            O painel de simulação geotécnica permite forçar intempéries físicas e emitir chamados para a Defesa Civil. Para evitar acionamentos acidentais e falsos alarmes, as chaves estão trancadas para visitantes.
          </p>

          <button
            onClick={() => setAuthOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/15 cursor-pointer active:scale-95 transition-all"
          >
            Acessar com Cadastro
          </button>
        </motion.div>

        <AuthModal 
          isOpen={authOpen} 
          onClose={() => setAuthOpen(false)} 
          message="Faça login como operador de monitoramento para liberar os comandos de simulação." 
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full relative">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-orange-500" />
          Painel de Simulação de Emergências
        </h1>
        <p className="text-gray-400">Ative cenários extremos para testar o motor de alertas estruturais preventivos.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <SimulationCard 
          icon={CloudRain} 
          title="Simular Chuva Forte" 
          desc="Eleva rapidamente o volume de precipitação simulando um evento atípico de 100mm/h."
          delay={0}
          action={() => triggerSimulation('heavy_rain')} 
          loading={loading}
          color="blue"
        />
        <SimulationCard 
          icon={Activity} 
          title="Solo Saturado" 
          desc="Eleva a umidade do solo aos 100%, reduzindo drasticamente o coeficiente de atrito."
          delay={0.1}
          action={() => triggerSimulation('saturated_soil')} 
          loading={loading}
          color="cyan"
        />
        <SimulationCard 
          icon={Zap} 
          title="Vibração Intensa" 
          desc="Simula um pequeno abalo sísmico ou tráfego pesado próximo à encosta vulnerável."
          delay={0.2}
          action={() => triggerSimulation('intense_vibration')} 
          loading={loading}
          color="yellow"
        />
        <SimulationCard 
          icon={AlertTriangle} 
          title="Risco Crítico Iminente" 
          desc="Maximiza todas as variáveis simultaneamente forçando um estado letal de emergência total."
          delay={0.3}
          action={() => triggerSimulation('critical_risk')} 
          loading={loading}
          color="red"
        />
      </div>
      
      <div className="flex justify-center mb-10">
        <button 
           onClick={() => triggerSimulation('normal')} 
           className="px-6 py-2 rounded-full border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shadow-xl"
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
  desc: string;
  action: () => void;
  loading: boolean;
  color: string;
  delay: number;
}

function SimulationCard({ icon: Icon, title, desc, action, loading, color, delay }: SimulationCardProps) {
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
     blue: "bg-blue-500/20",
     cyan: "bg-cyan-500/20",
     yellow: "bg-yellow-500/20",
     red: "bg-red-500/20"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`border border-white/5 bg-black/40 backdrop-blur-lg p-6 rounded-2xl transition-all duration-300 cursor-pointer group ${colorMap[color]}`}
      onClick={() => !loading && action()}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${badgeObj[color]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${iconColor[color]}`} />
        </div>
        <div>
          <h3 className={`font-bold text-lg text-white mb-2 group-hover:${iconColor[color]} transition-colors`}>{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
