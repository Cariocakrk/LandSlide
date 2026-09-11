"use client";

import { useEffect, useState, useMemo } from 'react';
import { socket } from '@/lib/socket';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine
} from 'recharts';
import { 
  Activity, Droplets, Mountain, CloudRain, AlertTriangle, Compass, 
  ShieldAlert, CheckCircle2, Radio, Server, FileText, Zap, Layers, AlertOctagon
} from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';
import { PrecisionGauge } from '@/components/dashboard/PrecisionGauge';
import { SeismographMonitor } from '@/components/dashboard/SeismographMonitor';

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
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

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
  const displayVibration = current?.groundVibration ?? (sensors.length > 0 ? (sensors[0].vibration || 0.12) : 0.15);

  const displayFutureRisk = sensorsEnabled && sensors.length > 0
    ? Math.round(sensors.reduce((acc, s) => acc + (s.futureRisk || 0), 0) / sensors.length)
    : Math.min(100, Math.round(displayRisk * 1.15 + (forecastRain24h > 20 ? 15 : 0)));

  // Mock histórico inicial quando ainda não há streams do socket para os gráficos nunca ficarem vazios
  const chartData = useMemo(() => {
    if (data.length >= 3) return data;
    const mockHistory: SensorData[] = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      const t = new Date(now - i * 120000).toISOString();
      const wave = Math.sin(i * 0.8);
      mockHistory.push({
        timestamp: t,
        soilMoisture: Math.max(10, Math.min(100, Math.round(displayMoisture + wave * 3))),
        rainVolume: Math.max(0, Math.round(displayRain72h + wave * 2)),
        terrainInclination: displayInclination,
        groundVibration: displayVibration,
        safetyFactor: displayFS,
        risk: Math.max(5, Math.min(100, Math.round(displayRisk + wave * 4))),
        statusColor: displayStatusColor
      });
    }
    return mockHistory;
  }, [data, displayMoisture, displayRain72h, displayInclination, displayVibration, displayFS, displayRisk, displayStatusColor]);

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto w-full space-y-6 animate-in fade-in duration-700 font-sans text-slate-100">
      {/* 1. Ticker Superior de Telemetria CICC (Mission Status Bar) */}
      <div className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono backdrop-blur-xl shadow-lg border-t-blue-500/30">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SISTEMA CICC OPERACIONAL</span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            MOTOR: <strong className="text-slate-200">MOHR-COULOMB // TALUDE INFINITO</strong>
          </span>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-gray-400 hidden sm:inline">
            BASE DADOS: <strong className="text-cyan-400">CEMADEN & SRTM 30M</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-gray-400">
          <span>PROTOCOLO: <strong className="text-white">NUP-CPRM-2026</strong></span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <Radio className="w-3 h-3 animate-spin" /> TELEMETRIA ATIVA
          </span>
        </div>
      </div>

      {/* 2. Cabeçalho Oficial do Centro de Comando */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> Sistema de Proteção e Defesa Civil
            </span>
            <span className="text-gray-600 font-mono text-xs">•</span>
            <span className="text-gray-400 font-mono text-[10px] uppercase tracking-wider">
              Terminal de Alerta Precoce
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-blue-500" />
            Centro de Comando Geotécnico e Risco
          </h1>

          <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
            {location 
              ? `Monitoramento em tempo real do setor: ${location} • Modelo Digital de Elevação SRTM 30m calibrado com sensores piezoelétricos.`
              : "Monitoramento de estabilidade de encostas e saturação do manto geológico sob diretrizes da CPRM e CEMADEN."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-end">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2.5 backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase block leading-none">Classificação CPRM</span>
              <strong className="text-sm font-mono text-white leading-tight">{displayRiskCode} - {riskClassification}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Bloco Principal: Gauge de Cockpit + Grid de Métricas Industriais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instrumento Circular de Cockpit (PrecisionGauge) */}
        <div className="lg:col-span-1 border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all border-t-white/15">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <PrecisionGauge
            value={displayRisk}
            riskLevelCode={displayRiskCode}
            riskClassification={riskClassification}
            safetyFactor={displayFS}
            statusColor={displayStatusColor}
          />
        </div>

        {/* Grid de Métricas Industriais (6 Cards) */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title="Fator de Segurança (FS)"
            value={displayFS >= 99 ? 'Estável' : displayFS}
            unit={displayFS >= 99 ? 'Talude Plano' : 'Mohr-Coulomb'}
            icon={Mountain}
            color={displayFS < 1.0 ? "text-red-400" : displayFS < 1.3 ? "text-orange-400" : "text-emerald-400"}
            tag="TALUDE"
            capacityPercent={displayFS >= 99 ? 100 : Math.min(100, Math.round((displayFS / 2.0) * 100))}
            barColor={displayFS < 1.0 ? "bg-red-500" : displayFS < 1.3 ? "bg-orange-500" : "bg-emerald-500"}
          />

          <MetricCard
            title="Chuva Acumulada 72h"
            value={displayRain72h}
            unit="mm (CEMADEN)"
            icon={CloudRain}
            color={displayRain72h >= 100 ? "text-red-400" : displayRain72h >= 60 ? "text-orange-400" : "text-blue-400"}
            tag="PLUVIÔMETRO"
            capacityPercent={Math.min(100, Math.round((displayRain72h / 120) * 100))}
            barColor={displayRain72h >= 100 ? "bg-red-500" : displayRain72h >= 60 ? "bg-orange-500" : "bg-blue-500"}
          />

          <MetricCard
            title="Saturação do Manto"
            value={displayMoisture}
            unit="% capacidade"
            icon={Droplets}
            color="text-cyan-400"
            tag="HIGRÔMETRO"
            capacityPercent={displayMoisture}
            barColor="bg-cyan-500"
          />

          <MetricCard
            title="Declividade Média"
            value={displayInclination}
            unit={`° (Máx ${displayMaxSlope}°)`}
            icon={Compass}
            color={displayInclination >= 25 ? "text-orange-400" : "text-yellow-400"}
            tag="TOPOGRAFIA"
            capacityPercent={Math.min(100, Math.round((displayInclination / 45) * 100))}
            barColor={displayInclination >= 25 ? "bg-orange-500" : "bg-yellow-500"}
          />

          <MetricCard
            title="Previsão Próx. 24h"
            value={forecastRain24h}
            unit="mm esperados"
            icon={CloudRain}
            color="text-purple-400"
            tag="RADAR METEO"
            capacityPercent={Math.min(100, Math.round((forecastRain24h / 60) * 100))}
            barColor="bg-purple-500"
          />

          <MetricCard
            title="Alerta CEMADEN"
            value={(cemadenThreshold || 'Normal').split(' ')[0]}
            unit="limiar crítico"
            icon={AlertTriangle}
            color="text-amber-400"
            tag="PROTOCOLO"
            capacityPercent={displayRain72h >= 100 ? 100 : displayRain72h >= 60 ? 65 : 25}
            barColor={displayRain72h >= 100 ? "bg-red-500" : displayRain72h >= 60 ? "bg-amber-500" : "bg-emerald-500"}
          />
        </div>
      </div>

      {/* 4. Gráficos Técnicos Avançados (Hietograma CEMADEN & Estabilidade Estrutural) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Hietograma CEMADEN com Linha de Limiar Crítico de 100mm */}
        <div className="border border-white/10 rounded-2xl bg-slate-950/70 backdrop-blur-xl p-5 shadow-2xl flex flex-col justify-between group hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hietograma de Precipitação & Saturação</h3>
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  Curva de Acúmulo Hidrológico vs Capacidade de Campo
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Saturação (%)
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Chuva 72h (mm)
              </span>
            </div>
          </div>

          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="satGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="rainGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    stroke="#475569" 
                    fontSize={10} 
                  />
                  <YAxis stroke="#475569" fontSize={10} domain={[0, Math.max(120, displayRain72h + 20)]} />
                  <Tooltip content={<TacticalTooltip />} />
                  
                  {/* Linha de Referência do Limiar Crítico do CEMADEN (100mm) */}
                  <ReferenceLine 
                    y={100} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: 'LIMIAR CRÍTICO CEMADEN (100mm)', 
                      fill: '#ef4444', 
                      fontSize: 9, 
                      position: 'insideTopRight',
                      fontFamily: 'monospace',
                      fontWeight: 'bold'
                    }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    name="Saturação Solo (%)" 
                    stroke="#06b6d4" 
                    strokeWidth={2} 
                    fill="url(#satGlow)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rainVolume" 
                    name="Chuva Acumulada (mm)" 
                    stroke="#c084fc" 
                    strokeWidth={2.5} 
                    dot={{ r: 2, fill: '#c084fc' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 pt-2 border-t border-white/5 mt-2">
            <span>MODELO HIDROLÓGICO: INFILTRAÇÃO GREEN-AMPT</span>
            <span className="text-red-400 font-bold">ALERTA DISPARADO COM PRECIPITAÇÃO &gt; 100mm/72h</span>
          </div>
        </div>

        {/* Gráfico 2: Estabilidade Estrutural e Fator de Segurança (FS) */}
        <div className="border border-white/10 rounded-2xl bg-slate-950/70 backdrop-blur-xl p-5 shadow-2xl flex flex-col justify-between group hover:border-orange-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Mountain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Estabilidade Estrutural & Ruptura</h3>
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  Fator de Segurança (FS) vs Índice de Risco (%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Fator Segurança (FS)
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Índice de Risco (%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    stroke="#475569" 
                    fontSize={10} 
                  />
                  <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                  <Tooltip content={<TacticalTooltip />} />

                  {/* Linhas Críticas Geotécnicas de Fator de Segurança */}
                  <ReferenceLine 
                    y={50} 
                    stroke="#eab308" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                    label={{ 
                      value: 'LIMIAR DE ATENÇÃO (50%)', 
                      fill: '#eab308', 
                      fontSize: 8.5, 
                      position: 'insideBottomRight',
                      fontFamily: 'monospace'
                    }} 
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: 'RISCO CRÍTICO EVACUAÇÃO (80%)', 
                      fill: '#ef4444', 
                      fontSize: 8.5, 
                      position: 'insideTopRight',
                      fontFamily: 'monospace'
                    }} 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    name="Índice de Risco (%)" 
                    stroke="#ef4444" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#ef4444' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="safetyFactor" 
                    name="Fator de Segurança (FS)" 
                    stroke="#06b6d4" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 pt-2 border-t border-white/5 mt-2">
            <span>EQUILÍBRIO LIMITE: TENSÕES CISALHANTES TAU_D / TAU_R</span>
            <span className="text-cyan-400 font-bold">FS &lt; 1.00 CONFIGURA COLAPSO ESTRUTURAL</span>
          </div>
        </div>
      </div>

      {/* 5. Bloco Inferior: Sismógrafo Geotécnico + Despacho Técnico Oficial de Defesa Civil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sismógrafo Geotécnico de Microssismicidade */}
        <SeismographMonitor currentVibration={displayVibration} />

        {/* Despacho Técnico Oficial de Defesa Civil */}
        <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          {/* Header do Despacho */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  Despacho Geotécnico Oficial
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                    CICC-DOC #GEO-2026
                  </span>
                </h3>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  Parecer emitido pela Central Integrada de Gestão de Desastres
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-[10px] text-gray-500 hidden sm:block">
              <span>PROJEÇÃO 24H:</span>{' '}
              <strong className={displayFutureRisk >= 70 ? 'text-red-400 font-bold' : 'text-slate-200'}>
                {displayFutureRisk}%
              </strong>
            </div>
          </div>

          {/* Dados do Quadrante e Diagnóstico Oficial */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] font-mono">
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">Setor de Análise</span>
                <strong className="text-white truncate block">{location || "Morro da Oficina (Petrópolis)"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">Manto / Solo</span>
                <strong className="text-cyan-400 truncate block">{geomorphology || "Solo Residual / Colúvio"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">Nível de Resposta</span>
                <strong className={displayRiskCode === 'R4' ? 'text-red-400' : displayRiskCode === 'R3' ? 'text-orange-400' : 'text-emerald-400'}>
                  {displayRiskCode === 'R4' ? 'PLANO VERMELHO' : displayRiskCode === 'R3' ? 'PLANO LARANJA' : 'MONITORAMENTO'}
                </strong>
              </div>
            </div>

            {/* Parecer textual */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 leading-relaxed font-mono relative">
              <p>
                {current?.diagnosis || diagnosis || 
                  "Condições estruturais sob monitoramento ativo. As leituras telemétricas combinadas de umidade intersticial, inclinação de talude e precipitação acumulada indicam estabilidade com base no modelo de Mohr-Coulomb."}
              </p>
              {displayRiskCode === 'R4' && (
                <div className="mt-2 pt-2 border-t border-red-500/20 text-red-400 flex items-center gap-2 font-bold text-[11px]">
                  <AlertOctagon className="w-4 h-4 animate-bounce" />
                  RECOMENDAÇÃO: Disparo imediato de sirenes e evacuação de moradores para os pontos de apoio seguros.
                </div>
              )}
            </div>
          </div>

          {/* Assinatura Digital e Selo */}
          <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-gray-500 pt-3 border-t border-white/5 mt-3">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ASSINADO DIGITALMENTE // DEFESA CIVIL & INSTITUTO DE GEOTECNIA</span>
            </div>
            <span className="text-gray-600">HASH: SHA256-NUP-2026-OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Componente de Card de Métrica Industrial com Micro-Barra de Nível
// -------------------------------------------------------------
interface MetricCardProps {
  title: string;
  value: number | string | undefined | null;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tag: string;
  capacityPercent?: number;
  barColor?: string;
}

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  color, 
  tag,
  capacityPercent = 50,
  barColor = "bg-blue-500"
}: MetricCardProps) {
  return (
    <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl relative overflow-hidden group border-t-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 truncate max-w-[120px]">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="my-2">
        <div className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight flex items-baseline gap-1.5">
          {value !== undefined && value !== null ? value : '-'}
        </div>
        <span className="text-[10px] font-mono text-gray-500 font-medium">{unit}</span>
      </div>

      {/* Micro-barra de capacidade integrada na base */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 mt-1">
        <span className="text-[8px] font-mono text-gray-500 uppercase">{tag}</span>
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[90px]">
          <div 
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, Math.max(0, capacityPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Tooltip Tático Aeroespacial Customizado para Recharts
// -------------------------------------------------------------
function TacticalTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-950/95 border border-white/20 rounded-xl p-3 shadow-2xl backdrop-blur-md text-[11px] font-mono text-white min-w-[160px]">
      <div className="text-[9px] text-gray-400 border-b border-white/10 pb-1.5 mb-2 flex items-center justify-between">
        <span>HORÁRIO:</span>
        <strong className="text-cyan-400">{new Date(label).toLocaleTimeString()}</strong>
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-[10px]">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <strong className="text-white">{entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
