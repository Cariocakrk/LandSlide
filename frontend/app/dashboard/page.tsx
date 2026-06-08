"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Activity, Droplets, Mountain, CloudRain, AlertTriangle } from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';

type SensorData = {
  soilMoisture: number;
  terrainInclination: number;
  rainVolume: number;
  groundVibration: number;
  risk: number;
  statusColor: string;
  timestamp: string;
};

export default function Dashboard() {
  const [data, setData] = useState<SensorData[]>([]);
  const [current, setCurrent] = useState<SensorData | null>(null);

  const { sensors, globalRisk, sensorsEnabled, rainVolume, humidity, slopeData } = useTerrainStore();

  useEffect(() => {
    if (!sensorsEnabled) return;
    socket.on('sensorData', (newData: SensorData) => {
      setCurrent(newData);
      setData(prev => {
        const next = [...prev, newData];
        if (next.length > 30) return next.slice(next.length - 30);
        return next;
      });
    });

    return () => {
      socket.off('sensorData');
    };
  }, [sensorsEnabled]);

  const displayRisk = globalRisk;

  const displayFutureRisk = sensorsEnabled && sensors.length > 0
       ? Math.round(sensors.reduce((acc, s) => acc + (s.futureRisk || 0), 0) / sensors.length)
       : displayRisk; // Fallback para o atual se não tiver projeção
  
  const displayMoisture = sensorsEnabled && sensors.length > 0 
       ? Math.round(sensors.reduce((acc, s) => acc + s.soilMoisture, 0) / sensors.length) 
       : null;
       
  const displayRain = sensorsEnabled && sensors.length > 0 
       ? Math.round(sensors.reduce((acc, s) => acc + s.rainVolume, 0) / sensors.length) 
       : rainVolume;
       
  const displayInclination = sensorsEnabled && sensors.length > 0 
       ? Math.round(sensors.reduce((acc, s) => acc + s.terrainInclination, 0) / sensors.length) 
       : (slopeData?.meanSlope || 0);
       
  const displayVibration = sensorsEnabled && sensors.length > 0 
       ? Math.round(sensors.reduce((acc, s) => acc + s.vibration, 0) / sensors.length) 
       : null;

  const getDynamicStatusColor = (riskVal: number) => {
      if (riskVal > 70) return "Vermelho";
      if (riskVal > 40) return "Laranja";
      if (riskVal > 15) return "Amarelo";
      return "Verde";
  };

  const statusLabel = getDynamicStatusColor(displayRisk);

  const getStatusColorHex = (color: string) => {
    switch(color) {
      case "Verde": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Amarelo": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "Laranja": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "Vermelho": return "text-red-500 bg-red-500/10 border-red-500/20 animate-pulse";
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };
  
  const getGaugeColorHex = (color: string) => {
    switch(color) {
      case "Verde": return "#10b981";
      case "Amarelo": return "#eab308";
      case "Laranja": return "#f97316";
      case "Vermelho": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const calculateGaugeStrokeDashoffset = (value: number) => {
    const circumference = Math.PI * 100;
    const offset = circumference - (value / 100) * circumference;
    return offset;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-700">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" />
          Dashboard {sensorsEnabled ? "em Tempo Real" : "via Satélite"}
        </h1>
        <p className="text-gray-400">
          {sensorsEnabled 
            ? "Monitoramento contínuo dos sensores da encosta via WebSocket" 
            : "Análise climática e topográfica baseada em relevo global e previsão de satélite"}
        </p>
      </header>

      {/* Main Status & Gauge */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={`md:col-span-1 border rounded-2xl p-6 flex flex-col items-center justify-center transition-colors duration-500 ${getStatusColorHex(statusLabel)}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Nível de Risco</h2>
          
          <div className="relative w-48 h-24 overflow-hidden mb-2 flex justify-center">
             <svg className="w-48 h-48 rotate-[180deg]" viewBox="0 0 250 250">
                <circle cx="125" cy="125" r="100" fill="transparent" stroke="currentColor" strokeWidth="24" strokeLinecap="round" className="opacity-20 stroke-current text-white" strokeDasharray="314.159" strokeDashoffset="0" />
                <circle 
                   cx="125" 
                   cy="125" 
                   r="100" 
                   fill="transparent" 
                   stroke={getGaugeColorHex(statusLabel)} 
                   strokeWidth="24" 
                   strokeLinecap="round"
                   strokeDasharray="314.159" 
                   strokeDashoffset={calculateGaugeStrokeDashoffset(displayRisk)} 
                   className="transition-all duration-1000 ease-out"
                />
             </svg>
             <div className="absolute bottom-4 flex flex-col items-center">
                  <span className="text-5xl font-black">{displayRisk}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4 text-xl font-bold bg-black/20 px-4 py-2 rounded-full border border-current">
            {statusLabel === 'Vermelho' && <AlertTriangle className="w-5 h-5" />}
            Estado: {statusLabel}
          </div>
        </div>

        {/* Sensor Metrics Grid */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {sensorsEnabled ? (
            <>
              <MetricCard title="Umidade do Solo" value={displayMoisture} unit="%" icon={Droplets} color="text-blue-400" />
              <MetricCard title="Chuva Acum. 6h" value={displayRain} unit="mm" icon={CloudRain} color="text-purple-400" />
              <MetricCard title="Inclinação Média" value={displayInclination} unit="°" icon={Mountain} color="text-orange-400" />
              <MetricCard title="Vibração Solo" value={displayVibration} unit="Hz" icon={Activity} color="text-red-400" />
            </>
          ) : (
            <>
              <MetricCard title="Chuva Acum. 6h" value={displayRain} unit="mm" icon={CloudRain} color="text-purple-400" />
              <MetricCard title="Declividade Global" value={displayInclination} unit="°" icon={Mountain} color="text-orange-400" />
              <MetricCard title="Umidade do Ar" value={humidity} unit="%" icon={Droplets} color="text-blue-400" />
            </>
          )}
          
          {/* Projeção (Future Risk) */}
          <div className={`col-span-2 border border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-6 flex flex-col justify-between hover:bg-white/5 transition-colors relative overflow-hidden`}>
            {/* Gradiente de fundo sutil */}
            <div className={`absolute inset-0 opacity-10 ${getStatusColorHex(getDynamicStatusColor(displayFutureRisk))}`} />
            
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="font-semibold text-gray-300">Projeção Geotécnica (Próximas 6h)</span>
              <div className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColorHex(getDynamicStatusColor(displayFutureRisk))}`}>
                {getDynamicStatusColor(displayFutureRisk)}
              </div>
            </div>
            
            <div className="relative z-10 flex items-end gap-4">
              <div className="text-5xl font-extrabold text-white tracking-tight">
                {displayFutureRisk}
              </div>
              <div className="mb-2 text-sm text-gray-400 flex items-center gap-1">
                vs <span className="font-bold text-white">{displayRisk}</span> atual
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts List */}
      {sensorsEnabled ? (
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* Soil Moisture Chart */}
          <div className="border border-white/10 rounded-xl bg-black/40 backdrop-blur p-5 shadow-xl">
             <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
               <Droplets className="w-4 h-4 text-blue-500" />
               Umidade vs Chuva Histórico
             </h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={data}>
                   <defs>
                      <linearGradient id="colorUmidade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} stroke="#555" fontSize={12} />
                   <YAxis stroke="#555" fontSize={12} />
                   <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
                   <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.9)', borderColor: '#333', borderRadius: '8px' }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                   <Area type="monotone" dataKey="soilMoisture" name="Umidade (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUmidade)" />
                   <Line type="monotone" dataKey="rainVolume" name="Chuva (mm)" stroke="#a855f7" strokeWidth={2} dot={false} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Inclination and Vibration Chart */}
          <div className="border border-white/10 rounded-xl bg-black/40 backdrop-blur p-5 shadow-xl">
             <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
               <Mountain className="w-4 h-4 text-orange-500" />
               Estabilidade Estrutural
             </h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={data}>
                   <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} stroke="#555" fontSize={12} />
                   <YAxis stroke="#555" fontSize={12} />
                   <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
                   <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.9)', borderColor: '#333', borderRadius: '8px' }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                   <Line type="monotone" dataKey="terrainInclination" name="Inclinação (°)" stroke="#f97316" strokeWidth={3} dot={false} />
                   <Line type="monotone" dataKey="groundVibration" name="Vibração (Hz)" stroke="#ef4444" strokeWidth={3} dot={false} />
                   <Line type="stepAfter" dataKey="risk" name="Risco Global" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/[0.01] backdrop-blur-md">
          <CloudRain className="w-12 h-12 text-indigo-500/50 mb-4 animate-pulse" />
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Monitoramento Topográfico Ativo</h4>
          <p className="text-xs text-gray-400 max-w-md mt-2 leading-relaxed">
            Sem sensores físicos instalados neste setor. Os dados em tempo real e gráficos de telemetria estão indisponíveis. A central continua operando com base nas estimativas de relevo e dados meteorológicos integrados por satélite.
          </p>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | undefined | null;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function MetricCard({ title, value, unit, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-6 flex flex-col justify-between hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-gray-400">{title}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-4xl font-extrabold text-white tracking-tight flex items-end gap-1">
        {value !== undefined ? value : '-'} <span className="text-lg text-gray-500 font-normal mb-1">{unit}</span>
      </div>
    </div>
  )
}
