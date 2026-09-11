"use client";

import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PrecisionGaugeProps {
  value: number; // 0 - 100
  riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4';
  riskClassification: string;
  safetyFactor: number;
  statusColor: string;
}

export function PrecisionGauge({
  value,
  riskLevelCode,
  riskClassification,
  safetyFactor,
  statusColor,
}: PrecisionGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));

  // Ângulos do arco: 150° (inferior esquerdo) a 390° (inferior direito) = 240° de amplitude
  const startAngle = 150;
  const sweepAngle = 240;
  const cx = 150;
  const cy = 145;
  const r = 100;

  // Ângulo do ponteiro atual
  const needleAngle = startAngle + (clampedValue / 100) * sweepAngle;

  // Cálculo de coordenadas trigonométricas
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Gera path SVG para arcos
  const createArc = (a1: number, a2: number, radius: number) => {
    const startX = cx + radius * Math.cos(toRad(a1));
    const startY = cy + radius * Math.sin(toRad(a1));
    const endX = cx + radius * Math.cos(toRad(a2));
    const endY = cy + radius * Math.sin(toRad(a2));
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  };

  // Cores dinâmicas
  const gaugeColor = useMemo(() => {
    switch (statusColor) {
      case 'Vermelho': return '#ef4444';
      case 'Laranja': return '#f97316';
      case 'Amarelo': return '#eab308';
      default: return '#10b981';
    }
  }, [statusColor]);

  // Ticks radiais
  const ticks = useMemo(() => {
    const list = [];
    for (let p = 0; p <= 100; p += 5) {
      const a = startAngle + (p / 100) * sweepAngle;
      const isMajor = p % 20 === 0;
      const isIntermediate = p % 10 === 0 && !isMajor;
      const outerR = isMajor ? 116 : isIntermediate ? 113 : 111;
      const innerR = 105;

      const x1 = cx + outerR * Math.cos(toRad(a));
      const y1 = cy + outerR * Math.sin(toRad(a));
      const x2 = cx + innerR * Math.cos(toRad(a));
      const y2 = cy + innerR * Math.sin(toRad(a));

      let labelX = null;
      let labelY = null;
      if (isMajor) {
        labelX = cx + 128 * Math.cos(toRad(a));
        labelY = cy + 128 * Math.sin(toRad(a));
      }

      list.push({
        p,
        x1, y1, x2, y2,
        isMajor,
        isIntermediate,
        labelX, labelY
      });
    }
    return list;
  }, []);

  // Coordenadas do ponteiro (agulha tática aeroespacial)
  const needleTipX = cx + 82 * Math.cos(toRad(needleAngle));
  const needleTipY = cy + 82 * Math.sin(toRad(needleAngle));

  const perpAngle1 = needleAngle + 90;
  const perpAngle2 = needleAngle - 90;
  const needleP1X = cx + 4.5 * Math.cos(toRad(perpAngle1)) - 10 * Math.cos(toRad(needleAngle));
  const needleP1Y = cy + 4.5 * Math.sin(toRad(perpAngle1)) - 10 * Math.sin(toRad(needleAngle));
  const needleP2X = cx + 4.5 * Math.cos(toRad(perpAngle2)) - 10 * Math.cos(toRad(needleAngle));
  const needleP2Y = cy + 4.5 * Math.sin(toRad(perpAngle2)) - 10 * Math.sin(toRad(needleAngle));
  const needleTailX = cx - 16 * Math.cos(toRad(needleAngle));
  const needleTailY = cy - 16 * Math.sin(toRad(needleAngle));

  return (
    <div className="flex flex-col items-center justify-between w-full h-full relative font-sans select-none">
      {/* Top Header Card */}
      <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: gaugeColor }} />
          <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
            Índice de Ameaça Geotécnica
          </span>
        </div>
        <span 
          className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black border uppercase tracking-wider"
          style={{ 
            backgroundColor: `${gaugeColor}15`, 
            borderColor: `${gaugeColor}40`,
            color: gaugeColor 
          }}
        >
          {riskLevelCode} • {riskClassification}
        </span>
      </div>

      {/* SVG Instrument Dial */}
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center my-1">
        <svg viewBox="0 0 300 290" className="w-full h-full overflow-visible">
          <defs>
            {/* Gradiente do arco de progresso */}
            <linearGradient id="gaugeProgressGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Glow da agulha */}
            <filter id="dialGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>

            {/* Gradiente radial para o centro anodizado */}
            <radialGradient id="centerCapGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>

          {/* Faixas de zonas do arco interno (CPRM) */}
          {/* R1: 0% a 35% -> 150° a 234° */}
          <path d={createArc(150, 234, 98)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeOpacity="0.4" />
          {/* R2: 35% a 65% -> 234° a 306° */}
          <path d={createArc(234, 306, 98)} fill="none" stroke="#eab308" strokeWidth="2.5" strokeOpacity="0.4" />
          {/* R3: 65% a 85% -> 306° a 354° */}
          <path d={createArc(306, 354, 98)} fill="none" stroke="#f97316" strokeWidth="2.5" strokeOpacity="0.4" />
          {/* R4: 85% a 100% -> 354° a 390° */}
          <path d={createArc(354, 390, 98)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeOpacity="0.5" />

          {/* Trilho de fundo do arco principal */}
          <path
            d={createArc(startAngle, startAngle + sweepAngle, r)}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Arco ativo com gradiente dinâmico */}
          {clampedValue > 0 && (
            <path
              d={createArc(startAngle, Math.min(startAngle + sweepAngle, needleAngle), r)}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="10"
              strokeLinecap="round"
              filter="url(#dialGlow)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Ticks e rótulos numéricos */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.isMajor ? '#94a3b8' : t.isIntermediate ? '#64748b' : '#334155'}
                strokeWidth={t.isMajor ? 1.8 : 1}
              />
              {t.labelX !== null && t.labelY !== null && (
                <text
                  x={t.labelX}
                  y={t.labelY + 3.5}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {t.p}
                </text>
              )}
            </g>
          ))}

          {/* Agulha tática de precisão */}
          <polygon
            points={`${needleTipX},${needleTipY} ${needleP1X},${needleP1Y} ${needleTailX},${needleTailY} ${needleP2X},${needleP2Y}`}
            fill={gaugeColor}
            filter="url(#dialGlow)"
            className="transition-all duration-700 ease-out"
          />

          {/* Centro anodizado maquinado do instrumento */}
          <circle cx={cx} cy={cy} r="18" fill="url(#centerCapGrad)" stroke="#475569" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="10" fill="#020617" stroke="#1e293b" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="4.5" fill={gaugeColor} className="transition-colors duration-500" />
        </svg>

        {/* Leitura Digital Centralizada */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center gap-0.5">
            <span 
              className="text-4xl md:text-5xl font-black font-mono tracking-tight"
              style={{ color: gaugeColor, textShadow: `0 0 20px ${gaugeColor}40` }}
            >
              {clampedValue}
            </span>
            <span className="text-base font-mono text-gray-500 font-bold">%</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">
            Probabilidade de Ruptura
          </span>
        </div>
      </div>

      {/* Rodapé Geotécnico com Fator de Segurança */}
      <div className="w-full bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between mt-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Estabilidade Mohr-Coulomb</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono font-bold text-gray-300">
              {safetyFactor >= 99 ? 'Talude Plano' : `FS ${safetyFactor}`}
            </span>
            <span className={`text-[10px] font-mono font-bold ${safetyFactor < 1.0 ? 'text-red-400' : safetyFactor < 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ({safetyFactor < 1.0 ? 'Crítico' : safetyFactor < 1.3 ? 'Atenção' : 'Estável'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-right font-mono text-[10px] text-gray-400">
          {clampedValue >= 70 ? (
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> Subindo
            </span>
          ) : clampedValue <= 30 ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <TrendingDown className="w-3.5 h-3.5" /> Seguro
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-400 font-bold">
              <Minus className="w-3.5 h-3.5" /> Monitorado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
