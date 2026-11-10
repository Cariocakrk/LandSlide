"use client";

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  const startAngle = 150;
  const sweepAngle = 240;
  const cx = 150;
  const cy = 145;
  const r = 100;

  const needleAngle = startAngle + (clampedValue / 100) * sweepAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const createArc = (a1: number, a2: number, radius: number) => {
    const startX = cx + radius * Math.cos(toRad(a1));
    const startY = cy + radius * Math.sin(toRad(a1));
    const endX = cx + radius * Math.cos(toRad(a2));
    const endY = cy + radius * Math.sin(toRad(a2));
    const largeArc = a2 - a1 > 180 ? 1 : 0;
    return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  };

  // Cores semânticas sóbrias de engenharia
  const gaugeColor = useMemo(() => {
    switch (statusColor) {
      case 'Vermelho': return '#B91C1C';
      case 'Laranja': return '#C85A17';
      case 'Amarelo': return '#B47B1C';
      default: return '#2E6F40';
    }
  }, [statusColor]);

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
      <div className="w-full flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gaugeColor }} />
          <span className="text-xs font-semibold text-[var(--foreground)]">
            Índice de Risco Geotécnico
          </span>
        </div>
        <span 
          className="px-2.5 py-0.5 rounded-md text-[11px] font-bold border"
          style={{ 
            backgroundColor: `${gaugeColor}14`, 
            borderColor: `${gaugeColor}35`,
            color: gaugeColor 
          }}
        >
          {riskLevelCode} • {riskClassification}
        </span>
      </div>

      {/* SVG Instrument Dial */}
      <div className="relative w-full max-w-[265px] aspect-square flex items-center justify-center my-1">
        <svg viewBox="0 0 300 290" className="w-full h-full overflow-visible">
          {/* Faixas de zonas do arco interno (CPRM) */}
          <path d={createArc(150, 234, 98)} fill="none" stroke="#2E6F40" strokeWidth="2.5" strokeOpacity="0.35" />
          <path d={createArc(234, 306, 98)} fill="none" stroke="#B47B1C" strokeWidth="2.5" strokeOpacity="0.35" />
          <path d={createArc(306, 354, 98)} fill="none" stroke="#C85A17" strokeWidth="2.5" strokeOpacity="0.35" />
          <path d={createArc(354, 390, 98)} fill="none" stroke="#B91C1C" strokeWidth="2.5" strokeOpacity="0.4" />

          {/* Trilho de fundo do arco principal */}
          <path
            d={createArc(startAngle, startAngle + sweepAngle, r)}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Arco ativo */}
          {clampedValue > 0 && (
            <path
              d={createArc(startAngle, Math.min(startAngle + sweepAngle, needleAngle), r)}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="10"
              strokeLinecap="round"
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
                stroke={t.isMajor ? 'var(--foreground-muted)' : 'var(--border-strong)'}
                strokeWidth={t.isMajor ? 1.6 : 1}
              />
              {t.labelX !== null && t.labelY !== null && (
                <text
                  x={t.labelX}
                  y={t.labelY + 3.5}
                  textAnchor="middle"
                  fill="var(--foreground-muted)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {t.p}
                </text>
              )}
            </g>
          ))}

          {/* Agulha de precisão */}
          <polygon
            points={`${needleTipX},${needleTipY} ${needleP1X},${needleP1Y} ${needleTailX},${needleTailY} ${needleP2X},${needleP2Y}`}
            fill={gaugeColor}
            className="transition-all duration-700 ease-out"
          />

          {/* Centro do instrumento */}
          <circle cx={cx} cy={cy} r="15" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="5.5" fill={gaugeColor} className="transition-colors duration-500" />
        </svg>

        {/* Leitura Digital Centralizada */}
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center gap-0.5">
            <span 
              className="text-4xl font-extrabold font-mono tracking-tight"
              style={{ color: gaugeColor }}
            >
              {clampedValue}
            </span>
            <span className="text-sm font-mono text-[var(--foreground-muted)] font-semibold">%</span>
          </div>
          <span className="text-[11px] font-medium text-[var(--foreground-muted)] mt-0.5">
            Suscetibilidade de Ruptura
          </span>
        </div>
      </div>

      {/* Rodapé Geotécnico com Fator de Segurança */}
      <div className="w-full theme-card-muted rounded-xl p-3 flex items-center justify-between mt-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-[var(--foreground-muted)]">Estabilidade Mohr-Coulomb</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono font-bold text-[var(--foreground)]">
              {safetyFactor >= 99 ? 'Talude Plano' : `FS ${safetyFactor}`}
            </span>
            <span className={`text-[11px] font-semibold ${
              safetyFactor < 1.0 ? 'text-[#B91C1C]' : safetyFactor < 1.3 ? 'text-[#B47B1C]' : 'text-[#2E6F40] dark:text-[#52B788]'
            }`}>
              ({safetyFactor < 1.0 ? 'Crítico' : safetyFactor < 1.3 ? 'Atenção' : 'Estável'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-right text-xs font-semibold">
          {clampedValue >= 70 ? (
            <span className="flex items-center gap-1 text-[#B91C1C]">
              <TrendingUp className="w-3.5 h-3.5" /> Elevado
            </span>
          ) : clampedValue <= 30 ? (
            <span className="flex items-center gap-1 text-[#2E6F40] dark:text-[#52B788]">
              <TrendingDown className="w-3.5 h-3.5" /> Seguro
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#B47B1C]">
              <Minus className="w-3.5 h-3.5" /> Moderado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
