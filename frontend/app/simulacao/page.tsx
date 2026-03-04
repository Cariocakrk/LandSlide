"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CloudRain, ShieldAlert, Zap, Activity, CheckCircle2 } from 'lucide-react';
import { socket } from '@/lib/socket';
import { useTerrainStore } from '@/store/terrainStore';

export default function Simulacao() {
  const [loading, setLoading] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any>(null);

  useEffect(() => {
    socket.on('emergencyAlert', (alert) => {
      setActiveAlert(alert);
      try {
        const audio = new Audio('/alert.mp3');
        audio.play().catch(() => {});
      } catch(e) {}
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
         store.updateAllSensors({ soilMoisture: 40, rainVolume: 0, vibration: 0 }); // Restore normal metrics
      } else if (mode === 'heavy_rain') {
         store.updateAllSensors({ rainVolume: 120, soilMoisture: 80 }); 
      } else if (mode === 'saturated_soil') {
         store.updateAllSensors({ soilMoisture: 100 });
      } else if (mode === 'intense_vibration') {
         store.updateAllSensors({ vibration: 15 });
      } else if (mode === 'critical_risk') {
         store.updateAllSensors({ rainVolume: 150, soilMoisture: 100, vibration: 20 });
      }

    } catch(e) {
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
      setActiveAlert((prev: any) => ({ ...prev, status: "Encaminhado" }));
    } catch (e) {
      console.error(e);
    }
  };

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
               Protocolo <strong>{activeAlert.protocolCode}</strong> registrado com sucesso na central externa. Mudança de status para <span className="text-white font-medium">"Em análise"</span>.
             </p>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SimulationCard({ icon: Icon, title, desc, action, loading, color, delay }: any) {
  const colorMap: any = {
    blue: "hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    cyan: "hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]",
    yellow: "hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]",
    red: "hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]"
  };

  const iconColor: any = {
      blue: "text-blue-400",
      cyan: "text-cyan-400",
      yellow: "text-yellow-400",
      red: "text-red-500"
  };

  const badgeObj: any = {
     blue: "bg-blue-500/20",
     cyan: "bg-cyan-500/20",
     yellow: "bg-yellow-500/20",
     red: "bg-red-500/20"
  }

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
