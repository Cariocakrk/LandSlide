"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Cpu, Activity, AlertTriangle, 
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

  useEffect(() => {
    const handleSensorCalibrated = (data: { sensorId: string; newSlope: number }) => {
      if (data && data.sensorId) {
        updateSensor(data.sensorId, { terrainInclination: data.newSlope ?? 10 });
      }
    };

    const handleSirenTested = (data: { sensorId: string }) => {
      if (data && data.sensorId === sensorId) {
        setSirenActive(true);
        setTimeout(() => setSirenActive(false), 8000);
      }
    };

    socket.on('sensorCalibrated', handleSensorCalibrated);
    socket.on('sirenTested', handleSirenTested);

    return () => {
      socket.off('sensorCalibrated', handleSensorCalibrated);
      socket.off('sirenTested', handleSirenTested);
    };
  }, [sensorId, updateSensor]);

  const sensor = sensors.find(s => s.id === sensorId);

  useEffect(() => {
    if (!sensorId) return;

    const fetchHistory = async () => {
      try {
        const res = await apiFetch(`/api/sensor-history/${sensorId}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((reading: any) => ({
            time: new Date(reading.timestamp || reading.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            moisture: Math.round(reading.moisture ?? reading.soilMoisture ?? 0),
            vibration: Math.round(reading.vibration ?? reading.groundVibration ?? 0),
            slope: Math.round(reading.slope ?? reading.terrainInclination ?? 0)
          }));
          setHistory(formatted);
        } else {
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
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [sensorId, sensor?.soilMoisture, sensor?.vibration, sensor?.terrainInclination]);

  if (!sensor) return null;

  const getRiskDetails = (risk: number) => {
    if (risk > 70) return { label: 'CRÍTICO', color: 'text-[#B91C1C] border-[#B91C1C]/30 bg-[#B91C1C]/10' };
    if (risk > 40) return { label: 'ALERTA', color: 'text-[#C85A17] border-[#C85A17]/30 bg-[#C85A17]/10' };
    if (risk > 15) return { label: 'ATENÇÃO', color: 'text-[#B47B1C] border-[#B47B1C]/30 bg-[#B47B1C]/10' };
    return { label: 'ESTÁVEL', color: 'text-[#2E6F40] dark:text-[#52B788] border-[#2E6F40]/30 bg-[#2E6F40]/10' };
  };

  const riskDetails = getRiskDetails(sensor.localRisk);

  const handleCalibrate = () => {
    if (calibrating) return;
    setCalibrating(true);
    setCalibrationSuccess(false);

    setTimeout(() => {
      updateSensor(sensor.id, { terrainInclination: 10 });
      setCalibrating(false);
      setCalibrationSuccess(true);
      socket.emit('calibrateSensor', { sensorId: sensor.id, newSlope: 10 });
      setTimeout(() => setCalibrationSuccess(false), 3000);
    }, 1500);
  };

  const handleSirenTest = () => {
    if (sirenActive) {
      setSirenActive(false);
      return;
    }
    setSirenActive(true);

    try {
      const audio = new Audio('/alert.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      });
    } catch {}

    socket.emit('sirenTest', { sensorId: sensor.id });

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
      className="absolute top-0 right-0 h-full w-[400px] z-30 bg-[var(--surface)]/95 backdrop-blur-2xl border-l border-[var(--border)] shadow-2xl flex flex-col font-sans text-[var(--foreground)]"
    >
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[var(--foreground)]">{sensor.id}</h2>
              <span className="w-2 h-2 rounded-full bg-[#2E6F40] dark:bg-[#52B788]" />
            </div>
            <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-1">
              <Radio className="w-3 h-3 text-[var(--primary)]" /> Estação Geotécnica de Encosta
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-lg theme-card-muted text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className={`border p-3.5 rounded-xl flex flex-col justify-between ${riskDetails.color}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Classificação</span>
            <span className="text-lg font-extrabold mt-1">{sensor.riskLevelCode || 'R1'} • {riskDetails.label}</span>
          </div>

          <div className="theme-card-muted p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--foreground-muted)] flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[var(--primary)]" /> Fator de Segurança
            </span>
            <span className="text-lg font-extrabold font-mono text-[var(--foreground)] mt-1">
              {sensor.safetyFactor ? (sensor.safetyFactor >= 99 ? 'Estável' : `FS ${sensor.safetyFactor}`) : 'FS 1.50'}
            </span>
          </div>
        </div>

        {sensor.localRisk > 70 && (
          <div className="border border-[#B91C1C]/35 bg-[#B91C1C]/10 p-4 rounded-xl flex gap-3 text-[#B91C1C] dark:text-[#F87171]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase">Risco Crítico de Ruptura</h4>
              <p className="text-[11px] opacity-90 mt-1 leading-normal">
                Limiar de saturação superado na encosta. Fator de Segurança próximo de 1,00 (equilíbrio-limite).
              </p>
            </div>
          </div>
        )}

        {/* Telemetry Stats Grid */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">
            Leituras Locais
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="theme-card-muted p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-[var(--primary)] mb-1.5">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Saturação</span>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[var(--foreground)]">{sensor.soilMoisture.toFixed(1)}%</div>
              <div className="text-[10px] text-[var(--foreground-muted)] mt-0.5">Poropressão ativa</div>
            </div>

            <div className="theme-card-muted p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-[#B47B1C] mb-1.5">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Declividade</span>
                <Compass className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[var(--foreground)]">{sensor.terrainInclination.toFixed(1)}°</div>
              <div className="text-[10px] text-[var(--foreground-muted)] mt-0.5">Gradiente SRTM</div>
            </div>

            <div className="theme-card-muted p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-[var(--primary)] mb-1.5">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Chuva 72h</span>
                <CloudRain className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[var(--foreground)]">{sensor.rainVolume.toFixed(0)} mm</div>
              <div className="text-[10px] text-[var(--foreground-muted)] mt-0.5">Acumulado local</div>
            </div>

            <div className="theme-card-muted p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-[#2E6F40] dark:text-[#52B788] mb-1.5">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Cota Altimétrica</span>
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[var(--foreground)]">{sensor.altitude ? `${Math.round(sensor.altitude)}m` : 'SRTM DEM'}</div>
              <div className="text-[10px] text-[var(--foreground-muted)] mt-0.5">Altitude real</div>
            </div>
          </div>
        </div>

        {/* Telemetry Charts Panel */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
            <h3 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Histórico Recente</h3>
            <div className="flex theme-card-muted p-0.5 rounded-lg">
              <button 
                onClick={() => setActiveTab('moisture')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  activeTab === 'moisture' 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Umidade
              </button>
              <button 
                onClick={() => setActiveTab('vibration')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  activeTab === 'vibration' 
                    ? 'bg-[#B91C1C] text-white shadow-xs' 
                    : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Vibração
              </button>
            </div>
          </div>

          <div className="theme-card-muted p-3.5 rounded-xl h-44 flex items-center justify-center relative">
            {history.length === 0 ? (
              <div className="text-xs text-[var(--foreground-muted)]">Carregando histórico do sensor...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A85832" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#A85832" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#B91C1C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--foreground-muted)" fontSize={9} />
                  <YAxis stroke="var(--foreground-muted)" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface)', 
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                      fontSize: 11,
                      borderRadius: 10,
                    }} 
                  />
                  {activeTab === 'moisture' ? (
                    <Area 
                      type="monotone" 
                      dataKey="moisture" 
                      stroke="#A85832" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMoisture)" 
                      name="Umidade (%)"
                    />
                  ) : (
                    <Area 
                      type="monotone" 
                      dataKey="vibration" 
                      stroke="#B91C1C" 
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
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider border-b border-[var(--border)] pb-1.5">
              Comandos Remotos
            </h3>
            
            <div className="space-y-2">
              <div className="theme-card-muted p-3.5 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[var(--primary)]" /> Calibrar Giroscópio
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                    Alinha a referência do inclinômetro para 10°.
                  </p>
                </div>
                <button
                  disabled={calibrating}
                  onClick={handleCalibrate}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    calibrationSuccess
                      ? 'bg-[#2E6F40]/15 text-[#2E6F40] border-[#2E6F40]/30'
                      : 'theme-btn-secondary'
                  }`}
                >
                  {calibrating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" /> Calibrando
                    </>
                  ) : calibrationSuccess ? (
                    <>
                      <CheckCircle className="w-3 h-3" /> Calibrado
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" /> Resetar
                    </>
                  )}
                </button>
              </div>

              <div className="theme-card-muted p-3.5 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--primary)]" /> Sirene de Alerta
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                    Aciona teste sonoro na estação de campo.
                  </p>
                </div>
                <button
                  onClick={handleSirenTest}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sirenActive
                      ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                      : 'theme-btn-secondary'
                  }`}
                >
                  {sirenActive ? (
                    <>
                      <Flame className="w-3 h-3" /> Ativa
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
          <div className="theme-card-muted p-4 rounded-xl text-center space-y-1">
            <span className="text-xs font-bold text-[var(--primary)] flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Comandos Restritos a Operadores
            </span>
            <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
              Faça login como engenheiro ou operador para calibrar inclinômetros e acionar sirenes.
            </p>
          </div>
        )}
      </div>

      {sirenActive && (
        <div className="bg-[#B91C1C] p-3.5 text-center text-white text-xs font-bold flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4" /> Sirene de teste acionada em {sensor.id}
        </div>
      )}
    </motion.div>
  );
}
