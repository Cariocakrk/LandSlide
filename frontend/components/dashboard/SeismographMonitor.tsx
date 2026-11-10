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

  useEffect(() => {
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

  const statusColor = isCritical ? '#B91C1C' : isWarning ? '#B47B1C' : '#A85832';

  return (
    <div className="theme-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--foreground)] text-sm flex items-center gap-2">
              Sismógrafo Geotécnico de Encosta
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            </h3>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Monitoramento de vibração do solo e rastejo estrutural
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="theme-card-muted px-3 py-1.5 rounded-lg text-right">
            <span className="text-[9px] text-[var(--foreground-muted)] uppercase block">Pico Recente</span>
            <span className="text-xs font-mono font-bold text-[var(--foreground)]">{peak.toFixed(2)} mm/s</span>
          </div>

          <div 
            className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5"
            style={{
              backgroundColor: `${statusColor}14`,
              borderColor: `${statusColor}35`,
              color: statusColor
            }}
          >
            {isCritical ? (
              <>
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Instável</span>
              </>
            ) : isWarning ? (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Atenção</span>
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

      {/* Seismograph Viewport */}
      <div className="h-44 w-full theme-card-muted rounded-xl p-2 relative overflow-hidden">
        <div className="w-full h-full relative z-10" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={waveform} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="seismicGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={statusColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" stroke="var(--foreground-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--foreground-muted)" fontSize={9} domain={[0, Math.max(3.5, peak * 1.3)]} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  borderRadius: '10px',
                  fontSize: '11px',
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
      <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-3 border-t border-[var(--border)] mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--primary)] font-semibold">● Piezômetro Tri-Axial PZ-04</span>
          <span>•</span>
          <span>Banda: 0.2 - 25 Hz</span>
        </div>
        <div>
          <span>Limiar de Vibração Crítica: <strong className="text-[var(--foreground)] font-mono">2.50 mm/s</strong></span>
        </div>
      </div>
    </div>
  );
}
