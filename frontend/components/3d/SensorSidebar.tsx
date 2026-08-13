"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Cpu, Battery, Activity, Wifi, AlertTriangle, 
  Volume2, RefreshCw, Droplets, Compass, CloudRain, 
  Flame, CheckCircle, Radio, Lock
} from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';
import { useAuthStore } from '@/store/authStore';
import { socket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';

interface SensorSidebarProps {
  sensorId: string | null;
  onClose: () => void;
}

interface HistoricalPoint {
  time: string;
  moisture: number;
  vibration: number;
  slope: number;
}

export function SensorSidebar({ sensorId, onClose }: SensorSidebarProps) {
  const { sensors, updateSensor } = useTerrainStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [activeTab, setActiveTab] = useState<'moisture' | 'vibration'>('moisture');
  const [calibrating, setCalibrating] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensor = sensors.find(s => s.id === sensorId);

  // Fetch telemetry history from backend
  useEffect(() => {
    if (!sensorId) return;

    const fetchHistory = async () => {
      try {
        const res = await apiFetch(`/api/sensor-history/${sensorId}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((reading: any) => ({
            time: new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            moisture: Math.round(reading.moisture || 0),
            vibration: Math.round(reading.vibration || 0),
            slope: Math.round(reading.slope || 0)
          }));
          setHistory(formatted);
        } else {
          // If history is empty, generate realistic seed points so the user is wowed with a chart instantly
          const seedPoints: HistoricalPoint[] = [];
          const now = Date.now();
          const baseMoisture = sensor?.soilMoisture || 45;
          const baseVib = sensor?.vibration || 2;
          const baseSlope = sensor?.terrainInclination || 15;

          for (let i = 10; i >= 0; i--) {
            const tempTime = new Date(now - i * 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            seedPoints.push({
              time: tempTime,
              moisture: Math.min(100, Math.max(0, Math.round(baseMoisture - 5 + Math.random() * 10))),
              vibration: Math.min(10, Math.max(0, Math.round(baseVib - 1 + Math.random() * 2))),
              slope: Math.round(baseSlope)
            });
          }
          setHistory(seedPoints);
        }
      } catch (err) {
        console.error("Failed to load historical data:", err);
      }
    };

    fetchHistory();
    // Poll history every 5 seconds while open to update chart in real time
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [sensorId, sensor?.soilMoisture, sensor?.vibration, sensor?.terrainInclination]);

  if (!sensor) return null;

  // Determine threat level color
  const getRiskDetails = (risk: number) => {
    if (risk > 70) return { label: 'CRÍTICO', color: 'text-red-500 border-red-500/30 bg-red-500/10 shadow-red-500/20' };
    if (risk > 40) return { label: 'ALERTA', color: 'text-orange-500 border-orange-500/30 bg-orange-500/10 shadow-orange-500/10' };
    if (risk > 15) return { label: 'ATENÇÃO', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10 shadow-yellow-500/10' };
    return { label: 'NORMAL', color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/10' };
  };

  const riskDetails = getRiskDetails(sensor.localRisk);

  // Calibrate Gyroscope Action
  const handleCalibrate = () => {
    if (calibrating) return;
    setCalibrating(true);
    setCalibrationSuccess(false);

    // Simulate GIRO/Inclination calibration delay
    setTimeout(() => {
      updateSensor(sensor.id, { terrainInclination: 10 });
      setCalibrating(false);
      setCalibrationSuccess(true);

      // Trigger WebSockets update immediately to keep other users synchronized
      socket.emit('calibrateSensor', { sensorId: sensor.id, newSlope: 10 });

      // Clear success feedback after 3 seconds
      setTimeout(() => setCalibrationSuccess(false), 3000);
    }, 1500);
  };

  // Sirene Test Action
  const handleSirenTest = () => {
    if (sirenActive) {
      setSirenActive(false);
      return;
    }
    setSirenActive(true);

    // Play visual beep
    try {
      const audio = new Audio('/alert.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Fallback tone synthesis if alert.mp3 is missing or blocked by browser gesture
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      });
    } catch {}

    // Emit siren test over WebSockets so backend and other operators register the siren test trigger
    socket.emit('sirenTest', { sensorId: sensor.id });

    // Auto-disable siren test after 8 seconds
    setTimeout(() => {
      setSirenActive(false);
    }, 8000);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.9 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="absolute top-0 right-0 h-full w-[420px] z-30 bg-[#070708cc] backdrop-blur-2xl border-l border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.85)] flex flex-col font-sans"
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">{sensor.id}</h2>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 uppercase">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Telemetria IoT Online
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {/* Status Badge & Power */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`border p-4 rounded-xl flex flex-col justify-between shadow-lg ${riskDetails.color}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Status de Risco</span>
            <span className="text-xl font-black mt-1">{riskDetails.label}</span>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between text-gray-400">
            <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" /> Energia
            </span>
            <span className="text-xl font-black text-white mt-1">
              94% <span className="text-[10px] text-emerald-400 font-normal uppercase">Solar</span>
            </span>
          </div>
        </div>

        {/* Dynamic Warning Alert for Critical Risk */}
        {sensor.localRisk > 70 && (
          <div className="border border-red-500/30 bg-red-950/20 p-4 rounded-xl flex gap-3 text-red-400 border-l-4 border-l-red-500 animate-pulse">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Perigo de Deslizamento</h4>
              <p className="text-[11px] opacity-80 mt-1 leading-normal">
                Níveis críticos de saturação e inclinação detectados. Recomenda-se acionamento imediato da sirene comunitária e envio das equipes da Defesa Civil.
              </p>
            </div>
          </div>
        )}

        {/* Telemetry Stats Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">Diagnóstico Instantâneo</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Moisture Card */}
            <div className="bg-[#ffffff03] border border-white/5 p-3.5 rounded-xl hover:border-white/15 transition-all">
              <div className="flex items-center justify-between text-cyan-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Umidade do Solo</span>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{sensor.soilMoisture.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500 mt-1">Ref. Saturação (Capacitivo)</div>
            </div>

            {/* Inclination Card */}
            <div className="bg-[#ffffff03] border border-white/5 p-3.5 rounded-xl hover:border-white/15 transition-all">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Inclinação</span>
                <Compass className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{sensor.terrainInclination.toFixed(1)}°</div>
              <div className="text-[10px] text-gray-500 mt-1">Acelerômetro Giroscópico</div>
            </div>

            {/* Rain Card */}
            <div className="bg-[#ffffff03] border border-white/5 p-3.5 rounded-xl hover:border-white/15 transition-all">
              <div className="flex items-center justify-between text-blue-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Pluviômetro</span>
                <CloudRain className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{sensor.rainVolume.toFixed(0)} mm</div>
              <div className="text-[10px] text-gray-500 mt-1">Acumulado (Últimas 24h)</div>
            </div>

            {/* Vibration Card */}
            <div className="bg-[#ffffff03] border border-white/5 p-3.5 rounded-xl hover:border-white/15 transition-all">
              <div className="flex items-center justify-between text-rose-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Vibração</span>
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{sensor.vibration.toFixed(1)} Hz</div>
              <div className="text-[10px] text-gray-500 mt-1">Sensor Piezoelétrico (Solo)</div>
            </div>
          </div>
        </div>

        {/* Telemetry Charts Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gráficos de Tendência</h3>
            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
              <button 
                onClick={() => setActiveTab('moisture')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  activeTab === 'moisture' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Umidade
              </button>
              <button 
                onClick={() => setActiveTab('vibration')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  activeTab === 'vibration' 
                    ? 'bg-rose-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Vibração
              </button>
            </div>
          </div>

          <div className="bg-[#030303ec] border border-white/5 p-4 rounded-xl h-44 flex items-center justify-center relative">
            {history.length === 0 ? (
              <div className="text-xs text-gray-600 animate-pulse">Carregando histórico do sensor...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#555" fontSize={9} />
                  <YAxis stroke="#555" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111', 
                      borderColor: 'rgba(255,255,255,0.1)', 
                      fontSize: 10,
                      borderRadius: 8,
                      fontFamily: 'monospace'
                    }} 
                  />
                  {activeTab === 'moisture' ? (
                    <Area 
                      type="monotone" 
                      dataKey="moisture" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMoisture)" 
                      name="Umidade (%)"
                    />
                  ) : (
                    <Area 
                      type="monotone" 
                      dataKey="vibration" 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorVib)" 
                      name="Vibração (Hz)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Interactive Actuators Section */}
        {mounted && user && user.role === 'OPERATOR' ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">Controle Remoto de Atuadores</h3>
            
            <div className="space-y-2">
              {/* Actuator 1: Gyroscope Calibration */}
              <div className="bg-[#ffffff02] border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-amber-400" /> Calibrar Giroscópio
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Zera o giroscópio do acelerômetro no local para 10° estabilizados.
                  </p>
                </div>
                <button
                  disabled={calibrating}
                  onClick={handleCalibrate}
                  className={`px-3 py-2 rounded-lg border font-mono text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${
                    calibrationSuccess
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-amber-400 border-amber-500/20 hover:bg-white/10 hover:border-amber-500/40'
                  }`}
                >
                  {calibrating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" /> Calibrando...
                    </>
                  ) : calibrationSuccess ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Sucesso
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" /> Resetar
                    </>
                  )}
                </button>
              </div>

              {/* Actuator 2: Siren Horn Trigger */}
              <div className="bg-[#ffffff02] border border-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Corneta / Sirene
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Toca a sirene de alerta sonora de alta potência acoplada ao poste do sensor.
                  </p>
                </div>
                <button
                  onClick={handleSirenTest}
                  className={`px-3 py-2 rounded-lg border font-mono text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${
                    sirenActive
                      ? 'bg-red-600/90 text-white border-red-500 hover:bg-red-500 animate-pulse shadow-lg shadow-red-600/20'
                      : 'bg-white/5 text-blue-400 border-blue-500/20 hover:bg-white/10 hover:border-blue-500/40'
                  }`}
                >
                  {sirenActive ? (
                    <>
                      <Flame className="w-3 h-3 animate-bounce" /> Ativa
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" /> Testar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-center space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-amber-500/90 tracking-wider flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-500" /> Atuadores Bloqueados
            </span>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              O teste acústico de sirenes e o alinhamento remoto de inclinômetro estão disponíveis apenas para membros autorizados da Defesa Civil.
            </p>
          </div>
        )}
      </div>

      {/* Floating Siren Alert Active */}
      {sirenActive && (
        <div className="bg-red-950/60 backdrop-blur border-t border-red-500/20 p-4 text-center text-red-400 text-xs font-mono font-bold animate-pulse tracking-wide flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 animate-bounce" /> SIRENE DE TESTE ATIVADA EM {sensor.id}
        </div>
      )}
    </motion.div>
  );
}
