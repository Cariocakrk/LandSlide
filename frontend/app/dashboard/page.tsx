"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Activity, Droplets, Mountain, CloudRain, AlertTriangle, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';

type SensorData = {
  soilMoisture: number;
  terrainInclination: number;
  rainVolume: number;
  groundVibration: number;
  risk: number;
  statusColor: string;
  safetyFactor?: number;
  riskLevelCode?: 'R1' | 'R2' | 'R3' | 'R4';
  classification?: string;
  diagnosis?: string;
  timestamp: string;
};

export default function Dashboard() {
  const [data, setData] = useState<SensorData[]>([]);
  const [current, setCurrent] = useState<SensorData | null>(null);

  const {
    location,
    sensors,
    globalRisk,
    safetyFactor,
    riskLevelCode,
    riskClassification,
    cemadenThreshold,
    geomorphology,
    diagnosis,
    sensorsEnabled,
    rainVolume,
    accumulatedRain24h,
    forecastRain24h,
    soilSaturationPercent,
    slopeData
  } = useTerrainStore();

  useEffect(() => {
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
  }, []);

  const displayRisk = current?.risk ?? globalRisk;
  const displayFS = current?.safetyFactor ?? safetyFactor;
  const displayRiskCode = current?.riskLevelCode ?? riskLevelCode;
  const displayStatusColor = current?.statusColor ?? (
    displayRiskCode === 'R4' ? 'Vermelho' :
    displayRiskCode === 'R3' ? 'Laranja' :
    displayRiskCode === 'R2' ? 'Amarelo' : 'Verde'
  );

  const isTerrainActive = Boolean(location || slopeData);
  const displayMoisture = isTerrainActive ? soilSaturationPercent : (current?.soilMoisture ?? soilSaturationPercent);
  const displayRain72h = isTerrainActive ? rainVolume : (current?.rainVolume ?? rainVolume);
  const displayInclination = current?.terrainInclination ?? (slopeData?.meanSlope || 15);
  const displayMaxSlope = slopeData?.maxSlope || 28;

  const displayFutureRisk = sensorsEnabled && sensors.length > 0
    ? Math.round(sensors.reduce((acc, s) => acc + (s.futureRisk || 0), 0) / sensors.length)
    : Math.min(100, Math.round(displayRisk * 1.15 + (forecastRain24h > 20 ? 15 : 0)));

  const getStatusColorHex = (color: string) => {
    switch (color) {
      case "Verde": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Amarelo": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "Laranja": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "Vermelho": return "text-red-500 bg-red-500/10 border-red-500/20 animate-pulse";
      default: return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getGaugeColorHex = (color: string) => {
    switch (color) {
      case "Verde": return "#10b981";
      case "Amarelo": return "#eab308";
      case "Laranja": return "#f97316";
      case "Vermelho": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const calculateGaugeStrokeDashoffset = (value: number) => {
    const circumference = Math.PI * 100;
    return circumference - (value / 100) * circumference;
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-700 font-sans">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3 tracking-tight">
              <Activity className="w-8 h-8 text-blue-500" />
              Painel de Inteligência Geotécnica e Risco
            </h1>
            <p className="text-gray-400 text-sm">
              {location 
                ? `Monitoramento ativo para: ${location} • Modelo Digital de Elevação (SRTM 30m)`
                : "Sistema de Alerta Precoce baseado no Modelo de Talude Infinito (Mohr-Coulomb) e Limiares CEMADEN"}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-300 font-mono">
              Classificação CPRM: <strong className="text-white">{displayRiskCode}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Status & Gauge */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={`md:col-span-1 border rounded-2xl p-6 flex flex-col items-center justify-between transition-colors duration-500 ${getStatusColorHex(displayStatusColor)}`}>
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Grau de Risco CPRM</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-black/30 border border-current">
              {displayRiskCode}
            </span>
          </div>

          <div className="relative w-48 h-24 overflow-hidden my-4 flex justify-center">
            <svg className="w-48 h-48 rotate-[180deg]" viewBox="0 0 250 250">
              <circle cx="125" cy="125" r="100" fill="transparent" stroke="currentColor" strokeWidth="24" strokeLinecap="round" className="opacity-20 stroke-current text-white" strokeDasharray="314.159" strokeDashoffset="0" />
              <circle
                cx="125"
                cy="125"
                r="100"
                fill="transparent"
                stroke={getGaugeColorHex(displayStatusColor)}
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray="314.159"
                strokeDashoffset={calculateGaugeStrokeDashoffset(displayRisk)}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-4 flex flex-col items-center">
              <span className="text-5xl font-black">{displayRisk}%</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2 text-lg font-bold bg-black/20 px-4 py-1.5 rounded-full border border-current">
              {displayStatusColor === 'Vermelho' ? <AlertTriangle className="w-5 h-5 animate-bounce" /> : <CheckCircle2 className="w-5 h-5" />}
              {displayStatusColor} ({riskClassification})
            </div>
            <span className="text-[11px] opacity-75 mt-1 font-mono">
              Fator de Segurança: {displayFS >= 99 ? 'Estável (Plano)' : `FS ${displayFS}`}
            </span>
          </div>
        </div>

        {/* Geotechnical Metrics Grid */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title="Fator de Segurança (FS)"
            value={displayFS >= 99 ? 'Estável' : displayFS}
            unit={displayFS >= 99 ? '' : 'Mohr-Coulomb'}
            icon={Mountain}
            color={displayFS < 1.0 ? "text-red-400" : displayFS < 1.3 ? "text-orange-400" : "text-emerald-400"}
          />
          <MetricCard
            title="Chuva Acumulada 72h"
            value={displayRain72h}
            unit="mm (CEMADEN)"
            icon={CloudRain}
            color={displayRain72h >= 100 ? "text-red-400" : displayRain72h >= 60 ? "text-orange-400" : "text-blue-400"}
          />
          <MetricCard
            title="Saturação do Solo"
            value={displayMoisture}
            unit="% capacidade"
            icon={Droplets}
            color="text-cyan-400"
          />
          <MetricCard
            title="Declividade Média"
            value={displayInclination}
            unit={`° (Máx ${displayMaxSlope}°)`}
            icon={Compass}
            color={displayInclination >= 25 ? "text-orange-400" : "text-yellow-400"}
          />
          <MetricCard
            title="Previsão Próx. 24h"
            value={forecastRain24h}
            unit="mm esperados"
            icon={CloudRain}
            color="text-indigo-400"
          />
          <MetricCard
            title="Alerta CEMADEN"
            value={cemadenThreshold.split(' ')[0]}
            unit="limiar"
            icon={AlertTriangle}
            color="text-amber-400"
          />

          {/* Projeção Geotécnica */}
          <div className="col-span-2 md:col-span-3 border border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between hover:bg-white/5 transition-colors relative overflow-hidden">
            <div className={`absolute inset-0 opacity-10 ${getStatusColorHex(displayStatusColor)}`} />
            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Diagnóstico Geotécnico Oficial</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400 font-mono">{geomorphology}</span>
              </div>
              <span className="text-xs font-mono text-gray-400">Projeção 24h: {displayFutureRisk}%</span>
            </div>
            <p className="text-xs text-gray-300 relative z-10 leading-relaxed font-mono">
              {current?.diagnosis || diagnosis || "Aguardando leitura e consolidação dos sensores da encosta."}
            </p>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Soil Moisture and Rain Chart */}
        <div className="border border-white/10 rounded-xl bg-black/40 backdrop-blur p-5 shadow-xl">
          <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Droplets className="w-4 h-4 text-blue-500" />
              Evolução da Saturação do Manto vs Precipitação
            </span>
            <span className="text-[10px] font-mono text-gray-500">Histórico em Tempo Real</span>
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
                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} stroke="#555" fontSize={11} />
                <YAxis stroke="#555" fontSize={11} domain={[0, 100]} />
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.95)', borderColor: '#333', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                <Area type="monotone" dataKey="soilMoisture" name="Saturação Solo (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUmidade)" />
                <Line type="monotone" dataKey="rainVolume" name="Chuva Acumulada (mm)" stroke="#a855f7" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Structural Stability & Safety Factor Chart */}
        <div className="border border-white/10 rounded-xl bg-black/40 backdrop-blur p-5 shadow-xl">
          <h3 className="font-semibold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Mountain className="w-4 h-4 text-orange-500" />
              Estabilidade Estrutural e Risco Geotécnico
            </span>
            <span className="text-[10px] font-mono text-gray-500">Talude Infinito</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} stroke="#555" fontSize={11} />
                <YAxis stroke="#555" fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 5, 0.95)', borderColor: '#333', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                <Line type="monotone" dataKey="terrainInclination" name="Declividade (°)" stroke="#f97316" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="safetyFactor" name="Fator de Segurança (FS)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="risk" name="Índice de Risco (%)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string | undefined | null;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function MetricCard({ title, value, unit, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400">{title}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-baseline gap-1.5">
        {value !== undefined && value !== null ? value : '-'}
        <span className="text-xs text-gray-500 font-normal">{unit}</span>
      </div>
    </div>
  );
}
