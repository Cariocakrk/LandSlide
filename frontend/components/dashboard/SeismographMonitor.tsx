"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Activity, Radio, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';

interface SeismographMonitorProps {
  currentVibration: number; // mm/s
}

interface WaveformPoint {
  time: string;
  vibration: number;
  threshold: number;
}

export function SeismographMonitor({ currentVibration }: SeismographMonitorProps) {
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);

  // Inicializa e alimenta continuamente o sismograma
  useEffect(() => {
    // Inicialização com 20 amostras base
    const initial: WaveformPoint[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 1500);
      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const jitter = (Math.random() - 0.5) * 0.15;
      initial.push({
        time: timeStr,
        vibration: Math.max(0.05, Number((currentVibration + jitter).toFixed(2))),
        threshold: 2.5
      });
    }
    setWaveform(initial);

    const interval = setInterval(() => {
      const t = new Date();
      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      // Ruído microssísmico natural de base do solo
      const noise = (Math.random() - 0.5) * 0.2;
      const val = Math.max(0.05, Number((currentVibration + noise).toFixed(2)));

      setWaveform(prev => {
        const next = [...prev.slice(1), { time: timeStr, vibration: val, threshold: 2.5 }];
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [currentVibration]);

  const peak = useMemo(() => {
    if (waveform.length === 0) return currentVibration;
    return Math.max(...waveform.map(w => w.vibration));
  }, [waveform, currentVibration]);

  const isCritical = currentVibration >= 2.5;
  const isWarning = currentVibration >= 1.2 && !isCritical;

  const statusColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

  return (
    <div className="border border-white/10 bg-slate-950/70 backdrop-blur-xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-2">
              Sismógrafo Geotécnico de Encosta
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: statusColor }} />
            </h3>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              Monitor de Microssismicidade e Rastejo Estrutural (Creep)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/40 border border-white/5 px-3 py-1.5 rounded-lg text-right">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Pico Recente</span>
            <span className="text-xs font-mono font-bold text-white">{peak.toFixed(2)} mm/s</span>
          </div>

          <div 
            className="px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
            style={{
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}40`,
              color: statusColor
            }}
          >
            {isCritical ? (
              <>
                <AlertOctagon className="w-3.5 h-3.5 animate-bounce" />
                <span>Ruptura Iminente</span>
              </>
            ) : isWarning ? (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Rastejo Detectado</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Base Estável</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seismograph Oscilloscope Viewport */}
      <div className="h-44 w-full bg-[#020907] border border-emerald-500/20 rounded-xl p-2 relative overflow-hidden shadow-inner">
        {/* Phosphor Grid Lines Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div className="w-full h-full relative z-10" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={waveform} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="seismicGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={statusColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={statusColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#10b98122" strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="time" stroke="#059669" fontSize={9} tickLine={false} />
              <YAxis stroke="#059669" fontSize={9} domain={[0, Math.max(3.5, peak * 1.3)]} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(2, 9, 7, 0.95)',
                  borderColor: '#059669',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontFamily: 'monospace'
                }}
                formatter={(val: any) => [`${val} mm/s`, 'Velocidade de Partícula']}
              />
              <Area
                type="monotone"
                dataKey="vibration"
                stroke={statusColor}
                strokeWidth={2}
                fill="url(#seismicGlow)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Technical Footer */}
      <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-gray-500 pt-3 border-t border-white/5 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">● PIEZÔMETRO TRI-AXIAL PZ-04</span>
          <span>•</span>
          <span>BANDA: 0.2 - 25 Hz</span>
        </div>
        <div>
          <span>LIMIAR DE RUPTURA DINÂMICA: <strong>2.50 mm/s</strong></span>
        </div>
      </div>
    </div>
  );
}
