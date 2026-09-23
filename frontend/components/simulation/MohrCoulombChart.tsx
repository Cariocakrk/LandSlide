"use client";

import React from 'react';
import { GeotechnicalCalculationResult } from '@/lib/geotechnicalEngine';

interface MohrCoulombChartProps {
  calculation: GeotechnicalCalculationResult;
}

export const MohrCoulombChart: React.FC<MohrCoulombChartProps> = ({ calculation }) => {
  const {
    failureEnvelopePoints,
    currentStatePoint,
    lithology,
    safetyFactor,
    drivingShearStress,
    resistingShearStress,
    sigmaEffective,
    poreWaterPressure,
    cprmClassification
  } = calculation;

  // Dimensões do gráfico SVG
  const width = 500;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Escalas máximas dos eixos
  const maxSigma = Math.max(80, Math.ceil((failureEnvelopePoints[failureEnvelopePoints.length - 1]?.sigma || 80) / 10) * 10);
  const maxTau = Math.max(60, Math.ceil((failureEnvelopePoints[failureEnvelopePoints.length - 1]?.tauRupture || 60) * 1.15));

  // Funções de projeção
  const scaleX = (val: number) => padding.left + (Math.max(0, Math.min(val, maxSigma)) / maxSigma) * plotWidth;
  const scaleY = (val: number) => padding.top + plotHeight - (Math.max(0, Math.min(val, maxTau)) / maxTau) * plotHeight;

  // Traçado da linha da envoltória de ruptura
  const envelopePath = failureEnvelopePoints.map((pt, idx) => {
    const x = scaleX(pt.sigma);
    const y = scaleY(pt.tauRupture);
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Área de ruptura (polígono acima da envoltória)
  const firstPt = failureEnvelopePoints[0];
  const lastPt = failureEnvelopePoints[failureEnvelopePoints.length - 1];
  const ruptureAreaPath = `${envelopePath} L ${scaleX(lastPt.sigma)} ${padding.top} L ${scaleX(firstPt.sigma)} ${padding.top} Z`;

  // Coordenadas do ponto atuante
  const currentX = scaleX(currentStatePoint.sigma);
  const currentY = scaleY(currentStatePoint.tauDriving);

  const isRupture = safetyFactor < 1.0;

  return (
    <div className="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: cprmClassification.color }} />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Diagrama de Tensões de Mohr-Coulomb
            </h4>
          </div>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
            Envoltória de Ruptura: <strong className="text-cyan-400">τ = c&#39; + σ&#39;·tan(φ&#39;)</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded border uppercase font-bold" style={{
            backgroundColor: `${cprmClassification.color}15`,
            borderColor: `${cprmClassification.color}40`,
            color: cprmClassification.color
          }}>
            FS = {safetyFactor >= 99 ? 'Estável' : safetyFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* SVG Canvas do Gráfico */}
      <div className="relative w-full aspect-[500/300] select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            {/* Gradiente da Zona de Ruptura */}
            <linearGradient id="ruptureZoneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
            {/* Gradiente da Zona Segura */}
            <linearGradient id="stableZoneGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Grid de fundo */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            const val = Math.round(maxTau * ratio);
            return (
              <g key={`gy-${ratio}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const x = padding.left + plotWidth * ratio;
            const val = Math.round(maxSigma * ratio);
            return (
              <g key={`gx-${ratio}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.4"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 14}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Eixos X e Y */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + plotHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Rótulos dos eixos */}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Tensão Normal Efetiva σ&#39; = σ_n - u (kPa)
          </text>
          <text
            x={-(padding.top + plotHeight / 2)}
            y="16"
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Tensão Cisalhante τ (kPa)
          </text>

          {/* Área de Ruptura Acima da Linha */}
          <path d={ruptureAreaPath} fill="url(#ruptureZoneGrad)" />

          {/* Linha da Envoltória de Ruptura de Mohr-Coulomb */}
          <path
            d={envelopePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeDasharray="5 3"
          />
          <text
            x={scaleX(lastPt.sigma) - 10}
            y={scaleY(lastPt.tauRupture) - 8}
            textAnchor="end"
            fill="#ef4444"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Envoltória de Ruptura (τ_r)
          </text>

          {/* Ponto de Coesão no Eixo Y */}
          <circle
            cx={padding.left}
            cy={scaleY(lithology.cohesionKPa)}
            r="3"
            fill="#38bdf8"
          />
          <text
            x={padding.left + 6}
            y={scaleY(lithology.cohesionKPa) + 3}
            fill="#38bdf8"
            fontSize="8"
            fontFamily="monospace"
          >
            c&#39;={lithology.cohesionKPa}kPa
          </text>

          {/* Linhas de Projeção do Ponto Atual */}
          <line
            x1={currentX}
            y1={scaleY(0)}
            x2={currentX}
            y2={currentY}
            stroke={isRupture ? '#ef4444' : '#10b981'}
            strokeWidth="1"
            strokeDasharray="2 2"
            strokeOpacity="0.7"
          />
          <line
            x1={padding.left}
            y1={currentY}
            x2={currentX}
            y2={currentY}
            stroke={isRupture ? '#ef4444' : '#10b981'}
            strokeWidth="1"
            strokeDasharray="2 2"
            strokeOpacity="0.7"
          />

          {/* Ponto Atual de Tensão Atuante (σ', τ_d) */}
          <circle
            cx={currentX}
            cy={currentY}
            r="7"
            fill={isRupture ? '#ef4444' : '#10b981'}
            fillOpacity="0.3"
            className="animate-ping"
          />
          <circle
            cx={currentX}
            cy={currentY}
            r="5"
            fill={isRupture ? '#ef4444' : '#10b981'}
            stroke="#ffffff"
            strokeWidth="1.5"
            filter="url(#pointGlow)"
          />

          {/* Rótulo do Ponto de Tensão */}
          <text
            x={Math.min(padding.left + plotWidth - 45, currentX + 8)}
            y={Math.max(padding.top + 14, currentY - 8)}
            fill={isRupture ? '#f87171' : '#34d399'}
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            (σ&#39;={sigmaEffective}, τ_d={drivingShearStress})
          </text>
        </svg>
      </div>

      {/* Rodapé do Gráfico com Grandezas Físicas */}
      <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/5 rounded-xl p-2.5 mt-2 font-mono text-[10px]">
        <div>
          <span className="text-gray-500 uppercase block text-[8.5px]">Resistência τ_r</span>
          <strong className="text-white text-xs">{resistingShearStress} kPa</strong>
        </div>
        <div>
          <span className="text-gray-500 uppercase block text-[8.5px]">Solicitação τ_d</span>
          <strong className={isRupture ? 'text-red-400 text-xs' : 'text-emerald-400 text-xs'}>
            {drivingShearStress} kPa
          </strong>
        </div>
        <div>
          <span className="text-gray-500 uppercase block text-[8.5px]">Poropressão u</span>
          <strong className="text-cyan-400 text-xs">{poreWaterPressure} kPa</strong>
        </div>
      </div>
    </div>
  );
};
