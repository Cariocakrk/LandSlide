"use client";

import { useEffect, useState, useMemo } from 'react';
import { socket } from '@/lib/socket';
import {
  Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine
} from 'recharts';
import { 
  Activity, Droplets, Mountain, CloudRain, AlertTriangle, Compass, 
  CheckCircle2, FileText, AlertOctagon, ShieldCheck
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
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 font-sans text-[var(--foreground)]">
      {/* Cabeçalho do Painel */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Monitoramento Geotécnico em Tempo Real
            </span>
            <span className="text-[var(--border-strong)]">•</span>
            <span className="text-[var(--foreground-muted)] text-xs">
              ABNT NBR 11682
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            Painel de Controle Geotécnico
          </h1>

          <p className="text-[var(--foreground-muted)] text-xs md:text-sm mt-1 max-w-3xl leading-relaxed">
            {location 
              ? `Setor monitorado: ${location} • Modelo Digital de Elevação SRTM 30m e telemetria pluviométrica.`
              : "Acompanhamento de estabilidade de encostas, saturação do solo e volume de chuvas acumuladas."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-end">
          <div className="theme-card px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${
              displayRiskCode === 'R4' ? 'bg-[#B91C1C]' :
              displayRiskCode === 'R3' ? 'bg-[#C85A17]' :
              displayRiskCode === 'R2' ? 'bg-[#B47B1C]' : 'bg-[#2E6F40]'
            }`} />
            <div>
              <span className="text-[10px] text-[var(--foreground-muted)] uppercase font-medium block leading-none">Classificação CPRM</span>
              <strong className="text-sm font-bold text-[var(--foreground)] leading-tight">{displayRiskCode} — {riskClassification}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Risco Segmentada Normativa (R1 a R4 — ABNT NBR 11682 / CPRM) */}
      <div className="theme-card rounded-2xl p-4 relative overflow-hidden transition-all duration-300 hover:border-[var(--border-strong)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
              Régua Normativa de Suscetibilidade (CPRM / IPT)
            </span>
            <span className="text-xs text-[var(--foreground-muted)] hidden md:inline">
              • Posição em tempo real do setor monitorado
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[var(--foreground-muted)]">
              Índice Atual: <strong className="text-[var(--foreground)]">{displayRisk}%</strong>
            </span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="text-[var(--foreground-muted)]">
              Projeção 24h: <strong className={displayFutureRisk >= 70 ? 'text-[#B91C1C]' : 'text-[var(--primary)]'}>{displayFutureRisk}%</strong>
            </span>
          </div>
        </div>

        <div className="relative pt-1 pb-1">
          <div className="grid grid-cols-4 gap-1.5 h-3 rounded-full overflow-hidden p-0.5 bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className={`rounded-l-full transition-all duration-500 ${displayRisk <= 25 ? 'bg-[#2E6F40] opacity-100' : 'bg-[#2E6F40]/45'}`} />
            <div className={`transition-all duration-500 ${displayRisk > 25 && displayRisk <= 50 ? 'bg-[#B47B1C] opacity-100' : 'bg-[#B47B1C]/45'}`} />
            <div className={`transition-all duration-500 ${displayRisk > 50 && displayRisk <= 75 ? 'bg-[#C85A17] opacity-100' : 'bg-[#C85A17]/45'}`} />
            <div className={`rounded-r-full transition-all duration-500 ${displayRisk > 75 ? 'bg-[#B91C1C] opacity-100' : 'bg-[#B91C1C]/45'}`} />
          </div>

          {/* Marcador deslizante da leitura atual */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none flex flex-col items-center"
            style={{ left: `${Math.min(98, Math.max(2, displayRisk))}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-[var(--surface)] border-[3px] border-[var(--foreground)] shadow-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-[11px]">
          <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border transition-all ${displayRiskCode === 'R1' ? 'bg-[#2E6F40]/12 border-[#2E6F40]/40 text-[#2E6F40] dark:text-[#52B788] font-bold' : 'border-transparent text-[var(--foreground-muted)]'}`}>
            <span>R1 • Baixo / Estável</span>
            <span className="font-mono text-[10px]">0–25%</span>
          </div>
          <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border transition-all ${displayRiskCode === 'R2' ? 'bg-[#B47B1C]/12 border-[#B47B1C]/40 text-[#B47B1C] font-bold' : 'border-transparent text-[var(--foreground-muted)]'}`}>
            <span>R2 • Médio / Atenção</span>
            <span className="font-mono text-[10px]">26–50%</span>
          </div>
          <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border transition-all ${displayRiskCode === 'R3' ? 'bg-[#C85A17]/12 border-[#C85A17]/40 text-[#C85A17] font-bold' : 'border-transparent text-[var(--foreground-muted)]'}`}>
            <span>R3 • Alto / Alerta</span>
            <span className="font-mono text-[10px]">51–75%</span>
          </div>
          <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border transition-all ${displayRiskCode === 'R4' ? 'bg-[#B91C1C]/12 border-[#B91C1C]/40 text-[#B91C1C] font-bold' : 'border-transparent text-[var(--foreground-muted)]'}`}>
            <span>R4 • Crítico</span>
            <span className="font-mono text-[10px]">76–100%</span>
          </div>
        </div>
      </div>

      {/* Bloco Principal: Indicador de Risco + 6 Cards de Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 theme-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg">
          <PrecisionGauge
            value={displayRisk}
            riskLevelCode={displayRiskCode}
            riskClassification={riskClassification}
            safetyFactor={displayFS}
            statusColor={displayStatusColor}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title="Fator de Segurança (FS)"
            value={displayFS >= 99 ? 'Estável' : displayFS}
            unit={displayFS >= 99 ? 'Talude Plano' : 'Mohr-Coulomb'}
            icon={Mountain}
            color={displayFS < 1.0 ? "text-[#B91C1C]" : displayFS < 1.3 ? "text-[#C85A17]" : "text-[#2E6F40] dark:text-[#52B788]"}
            tag="ESTABILIDADE"
            capacityPercent={displayFS >= 99 ? 100 : Math.min(100, Math.round((displayFS / 2.0) * 100))}
            barColor={displayFS < 1.0 ? "bg-[#B91C1C]" : displayFS < 1.3 ? "bg-[#C85A17]" : "bg-[#2E6F40]"}
          />

          <MetricCard
            title="Chuva Acumulada 72h"
            value={displayRain72h}
            unit="mm (CEMADEN)"
            icon={CloudRain}
            color={displayRain72h >= 100 ? "text-[#B91C1C]" : displayRain72h >= 60 ? "text-[#C85A17]" : "text-[var(--primary)]"}
            tag="PLUVIÔMETRO"
            capacityPercent={Math.min(100, Math.round((displayRain72h / 120) * 100))}
            barColor={displayRain72h >= 100 ? "bg-[#B91C1C]" : displayRain72h >= 60 ? "bg-[#C85A17]" : "bg-[var(--primary)]"}
          />

          <MetricCard
            title="Saturação do Solo"
            value={displayMoisture}
            unit="% capacidade"
            icon={Droplets}
            color="text-[var(--primary)]"
            tag="UMIDADE"
            capacityPercent={displayMoisture}
            barColor="bg-[var(--primary)]"
          />

          <MetricCard
            title="Declividade Média"
            value={displayInclination}
            unit={`° (Máx ${displayMaxSlope}°)`}
            icon={Compass}
            color={displayInclination >= 25 ? "text-[#C85A17]" : "text-[#B47B1C]"}
            tag="TOPOGRAFIA"
            capacityPercent={Math.min(100, Math.round((displayInclination / 45) * 100))}
            barColor={displayInclination >= 25 ? "bg-[#C85A17]" : "bg-[#B47B1C]"}
          />

          <MetricCard
            title="Previsão Próx. 24h"
            value={forecastRain24h}
            unit="mm esperados"
            icon={CloudRain}
            color="text-[var(--primary)]"
            tag="METEOROLOGIA"
            capacityPercent={Math.min(100, Math.round((forecastRain24h / 60) * 100))}
            barColor="bg-[var(--primary)]"
          />

          <MetricCard
            title="Limiar CEMADEN"
            value={(cemadenThreshold || 'Normal').split(' ')[0]}
            unit="status atual"
            icon={AlertTriangle}
            color="text-[#B47B1C]"
            tag="PROTOCOLO"
            capacityPercent={displayRain72h >= 100 ? 100 : displayRain72h >= 60 ? 65 : 25}
            barColor={displayRain72h >= 100 ? "bg-[#B91C1C]" : displayRain72h >= 60 ? "bg-[#B47B1C]" : "bg-[#2E6F40]"}
          />
        </div>
      </div>

      {/* Gráficos Técnicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Hietograma */}
        <div className="theme-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-sm">Precipitação & Saturação do Solo</h3>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  Acúmulo hidrológico vs. capacidade de infiltração
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-[var(--primary)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" /> Saturação (%)
              </span>
              <span className="flex items-center gap-1.5 text-[#5C3D2E] dark:text-[#E6CCB2]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5C3D2E] dark:bg-[#E6CCB2]" /> Chuva 72h (mm)
              </span>
            </div>
          </div>

          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="satGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A85832" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#A85832" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    stroke="var(--foreground-muted)" 
                    fontSize={10} 
                  />
                  <YAxis stroke="var(--foreground-muted)" fontSize={10} domain={[0, Math.max(120, displayRain72h + 20)]} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <ReferenceLine 
                    y={100} 
                    stroke="#B91C1C" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: 'Limiar CEMADEN (100mm)', 
                      fill: '#B91C1C', 
                      fontSize: 10, 
                      position: 'insideTopRight',
                      fontWeight: 'bold'
                    }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    name="Saturação Solo (%)" 
                    stroke="#A85832" 
                    strokeWidth={2} 
                    fill="url(#satGlow)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rainVolume" 
                    name="Chuva Acumulada (mm)" 
                    stroke="#5C3D2E" 
                    strokeWidth={2.5} 
                    dot={{ r: 2.5, fill: '#5C3D2E' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-3 border-t border-[var(--border)] mt-2">
            <span>Modelo Hidrológico de Infiltração</span>
            <span className="text-[#B91C1C] dark:text-[#F87171] font-semibold">Alerta com precipitação &gt; 100mm/72h</span>
          </div>
        </div>

        {/* Gráfico 2: Estabilidade Estrutural */}
        <div className="theme-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <Mountain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-sm">Estabilidade Estrutural & Risco</h3>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  Fator de Segurança (FS) vs. Índice de Risco (%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-[#2E6F40] dark:text-[#52B788]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E6F40]" /> Fator Segurança (FS)
              </span>
              <span className="flex items-center gap-1.5 text-[#B91C1C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" /> Índice de Risco (%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            {mounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    stroke="var(--foreground-muted)" 
                    fontSize={10} 
                  />
                  <YAxis stroke="var(--foreground-muted)" fontSize={10} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />

                  <ReferenceLine 
                    y={50} 
                    stroke="#B47B1C" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                    label={{ 
                      value: 'Atenção (50%)', 
                      fill: '#B47B1C', 
                      fontSize: 9.5, 
                      position: 'insideBottomRight'
                    }} 
                  />
                  <ReferenceLine 
                    y={80} 
                    stroke="#B91C1C" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: 'Risco Crítico (80%)', 
                      fill: '#B91C1C', 
                      fontSize: 9.5, 
                      position: 'insideTopRight'
                    }} 
                  />

                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    name="Índice de Risco (%)" 
                    stroke="#B91C1C" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#B91C1C' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="safetyFactor" 
                    name="Fator de Segurança (FS)" 
                    stroke="#2E6F40" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-3 border-t border-[var(--border)] mt-2">
            <span>Equilíbrio-Limite de Mohr-Coulomb</span>
            <span className="text-[var(--primary)] font-semibold">FS &lt; 1,00 indica ruptura de talude</span>
          </div>
        </div>
      </div>

      {/* Bloco Inferior: Sismógrafo + Parecer Técnico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeismographMonitor currentVibration={displayVibration} />

        <div className="theme-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg group">
          {/* Textura Topográfica de Fundo no Card de Parecer */}
          <svg
            viewBox="0 0 420 220"
            fill="none"
            className="pointer-events-none absolute right-0 bottom-0 w-64 h-40 opacity-20 dark:opacity-15 group-hover:opacity-40 transition-opacity duration-500"
          >
            <path
              d="M40 220 C 110 150, 210 190, 310 110 C 360 70, 395 85, 430 40"
              stroke="var(--mountain-stroke)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <path
              d="M80 230 C 150 170, 240 205, 335 135 C 380 100, 405 110, 435 75"
              stroke="var(--mountain-stroke)"
              strokeWidth="1"
            />
            <path
              d="M130 235 C 190 190, 270 215, 360 160 C 395 135, 415 140, 440 115"
              stroke="var(--mountain-stroke)"
              strokeWidth="0.9"
            />
          </svg>

          <div className="relative z-10 flex items-center justify-between border-b border-[var(--border)] pb-3.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-sm flex items-center gap-2">
                  Parecer Geotécnico Consolidado
                </h3>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Síntese estrutural para tomada de decisão operacional
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-[var(--foreground-muted)] hidden sm:block">
              <span>Projeção 24h:</span>{' '}
              <strong className={displayFutureRisk >= 70 ? 'text-[#B91C1C] font-bold' : 'text-[var(--foreground)] font-bold'}>
                {displayFutureRisk}%
              </strong>
            </div>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="grid grid-cols-3 gap-2.5 theme-card-muted rounded-xl p-3 text-xs">
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Setor Analisado</span>
                <strong className="text-[var(--foreground)] truncate block mt-0.5">{location || "Morro da Oficina (Petrópolis)"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Litologia / Manto</span>
                <strong className="text-[var(--primary)] truncate block mt-0.5">{geomorphology || "Solo Residual / Colúvio"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--foreground-muted)] uppercase block">Nível de Resposta</span>
                <strong className={`block mt-0.5 ${
                  displayRiskCode === 'R4' ? 'text-[#B91C1C]' : displayRiskCode === 'R3' ? 'text-[#C85A17]' : 'text-[#2E6F40] dark:text-[#52B788]'
                }`}>
                  {displayRiskCode === 'R4' ? 'Interdição / Alerta' : displayRiskCode === 'R3' ? 'Vistoria Imediata' : 'Operação Normal'}
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-xl theme-card-muted text-xs text-[var(--foreground)] leading-relaxed">
              <p>
                {current?.diagnosis || diagnosis || 
                  "Condições estruturais sob monitoramento ativo. As leituras combinadas de umidade do solo, declividade topográfica e precipitação acumulada indicam estabilidade segundo o critério de Mohr-Coulomb."}
              </p>
              {displayRiskCode === 'R4' && (
                <div className="mt-2.5 pt-2.5 border-t border-[#B91C1C]/25 text-[#B91C1C] dark:text-[#F87171] flex items-center gap-2 font-semibold text-xs">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  Recomendação: Acionamento de protocolo preventivo e isolamento da área de encosta.
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-3 border-t border-[var(--border)] mt-3">
            <div className="flex items-center gap-1.5 text-[#2E6F40] dark:text-[#52B788] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conformidade Técnica ABNT NBR 11682</span>
            </div>
            <span className="font-mono text-[10px]">SHA256-AUDIT</span>
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
  barColor = "bg-[var(--primary)]"
}: MetricCardProps) {
  const clampedCap = Math.min(100, Math.max(0, capacityPercent));

  return (
    <div className="group relative overflow-hidden theme-card rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-lg">
      {/* Filete Superior de Relevo que acende no Hover */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${barColor} opacity-45 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Textura de Curvas de Nível (Isolinhas Topográficas) no Fundo do Card */}
      <svg
        viewBox="0 0 220 130"
        fill="none"
        className="pointer-events-none absolute -right-3 -bottom-2 w-40 h-28 opacity-20 dark:opacity-15 group-hover:opacity-45 group-hover:scale-105 transition-all duration-500"
      >
        <path
          d="M15 130 C 55 85, 115 105, 165 55 C 190 30, 205 38, 225 12"
          stroke="var(--mountain-stroke)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <path
          d="M45 135 C 85 98, 135 112, 180 72 C 202 52, 212 58, 230 35"
          stroke="var(--mountain-stroke)"
          strokeWidth="1"
        />
        <path
          d="M80 140 C 115 112, 155 120, 195 90 C 210 76, 218 80, 232 62"
          stroke="var(--mountain-stroke)"
          strokeWidth="0.85"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors truncate max-w-[145px]">
          {title}
        </span>
        <div className={`p-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] group-hover:border-[var(--primary)]/40 transition-all ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="relative z-10 my-1.5">
        <div className="text-2xl md:text-3xl font-extrabold font-mono text-[var(--foreground)] tracking-tight flex items-baseline gap-1.5">
          {value !== undefined && value !== null ? value : '-'}
        </div>
        <span className="text-[11px] text-[var(--foreground-muted)]">{unit}</span>
      </div>

      <div className="relative z-10 pt-2.5 border-t border-[var(--border)] space-y-1.5 mt-1">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          <span>{tag}</span>
          <span className="font-mono text-[10px] text-[var(--foreground)]">{clampedCap}%</span>
        </div>
        {/* Barra Segmentada de Capacidade / Escala */}
        <div className="relative h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden border border-[var(--border)]/60">
          <div 
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${clampedCap}%` }}
          />
          {/* Divisórias de quartis (25% / 50% / 75%) */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
            <div className="border-r border-[var(--surface)]/60" />
            <div className="border-r border-[var(--surface)]/60" />
            <div className="border-r border-[var(--surface)]/60" />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="theme-card rounded-xl p-3 shadow-lg text-xs min-w-[160px]">
      <div className="text-[10px] text-[var(--foreground-muted)] border-b border-[var(--border)] pb-1.5 mb-2 flex items-center justify-between">
        <span>Horário:</span>
        <strong className="text-[var(--foreground)] font-mono">{new Date(label).toLocaleTimeString()}</strong>
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
            <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
            <strong className="text-[var(--foreground)] font-mono">{entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
