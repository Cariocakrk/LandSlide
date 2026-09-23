/**
 * Motor Geotécnico - ABNT NBR 11682 / Critério de Ruptura de Mohr-Coulomb
 * Modela a estabilidade de taludes infinitos com fluxo paralelo e perda de sucção mátrica.
 */

export interface SoilLithology {
  id: string;
  name: string;
  description: string;
  phiDeg: number; // Ângulo de atrito interno em graus (φ')
  cohesionKPa: number; // Coesão efetiva em kPa (c')
  gammaSatKN: number; // Peso específico saturado em kN/m³ (γ_sat)
  typicalLocations: string;
}

export const SOIL_PRESETS: Record<string, SoilLithology> = {
  coluvionar: {
    id: 'coluvionar',
    name: 'Manto Coluvionar (Depósito de Encosta)',
    description: 'Solo heterogêneo formado por transporte gravitacional. Muito vulnerável a corridas de massa.',
    phiDeg: 26,
    cohesionKPa: 6,
    gammaSatKN: 17.8,
    typicalLocations: 'Serra do Mar (SP), Petrópolis (RJ), Angra dos Reis'
  },
  residual: {
    id: 'residual',
    name: 'Solo Residual Jovem (Gnaisse / Granito)',
    description: 'Camada intemperizada sobre rocha matriz cristalina. Comum na escarpa da Serra dos Órgãos.',
    phiDeg: 32,
    cohesionKPa: 14,
    gammaSatKN: 18.5,
    typicalLocations: 'Região Serrana do RJ, Nova Friburgo, Teresópolis'
  },
  argiloso: {
    id: 'argiloso',
    name: 'Solo Argiloso Laterítico Tropical',
    description: 'Alta coesão quando seco, mas sofre rápida lixiviação e perda de resistência com saturação prolongada.',
    phiDeg: 22,
    cohesionKPa: 20,
    gammaSatKN: 19.2,
    typicalLocations: 'Belo Horizonte (MG), Salvador (BA), Vale do Paraíba'
  },
  aterro: {
    id: 'aterro',
    name: 'Aterro Antrópico Desordenado',
    description: 'Deposição de terra e entulho sem compactação ou drenagem em ocupações urbanas de encostas.',
    phiDeg: 19,
    cohesionKPa: 2,
    gammaSatKN: 16.5,
    typicalLocations: 'Favelas em encostas, taludes de corte viário desprotegidos'
  }
};

export interface GeotechnicalParameters {
  slopeDeg: number; // Ângulo de inclinação do talude (β) em graus
  soilDepthM: number; // Profundidade do manto / plano de ruptura (z) em metros
  saturationRatio: number; // Nível freático / razão de saturação (m = hw / z), entre 0 e 1
  accumulatedRain72h: number; // Precipitação acumulada em mm nas últimas 72 horas
  lithologyKey: string; // Chave do solo selecionado
}

export interface GeotechnicalCalculationResult {
  slopeDeg: number;
  soilDepthM: number;
  saturationRatio: number;
  accumulatedRain72h: number;
  lithology: SoilLithology;

  // Valores de tensão em kPa
  sigmaNormalTotal: number; // σ_n
  poreWaterPressure: number; // u
  sigmaEffective: number; // σ' = σ_n - u
  drivingShearStress: number; // τ_d (solicitante)
  resistingShearStress: number; // τ_r (resistente de Mohr-Coulomb)

  safetyFactor: number; // FS = τ_r / τ_d
  cprmClassification: {
    code: 'R1' | 'R2' | 'R3' | 'R4';
    name: string;
    color: string;
    description: string;
  };
  ruptureRiskPercent: number;
  failureEnvelopePoints: { sigma: number; tauRupture: number }[];
  currentStatePoint: { sigma: number; tauDriving: number };
}

/**
 * Executa o cálculo de equilíbrio limite para talude infinito com base na ABNT NBR 11682.
 */
export function calculateGeotechnicalStability(params: GeotechnicalParameters): GeotechnicalCalculationResult {
  const lithology = SOIL_PRESETS[params.lithologyKey] || SOIL_PRESETS.coluvionar;
  
  const betaRad = (Math.max(0.1, params.slopeDeg) * Math.PI) / 180;
  const phiRad = (lithology.phiDeg * Math.PI) / 180;
  const z = Math.max(0.5, params.soilDepthM);
  const m = Math.max(0, Math.min(1.0, params.saturationRatio));
  
  const gammaW = 9.81; // kN/m³ (peso específico da água)
  const gammaSat = lithology.gammaSatKN;

  // A sucção mátrica aparente em solo parcialmente saturado decai com o acúmulo pluviométrico
  const suctionLossFactor = Math.min(1.0, params.accumulatedRain72h / 150);
  const effectiveCohesion = Math.max(0.5, lithology.cohesionKPa * (1 - 0.75 * suctionLossFactor));

  const cosBeta = Math.cos(betaRad);
  const sinBeta = Math.sin(betaRad);
  const cos2Beta = cosBeta * cosBeta;

  // 1. Tensão Normal Total (σ_n = γ_sat * z * cos²β)
  const sigmaNormalTotal = Number((gammaSat * z * cos2Beta).toFixed(2));

  // 2. Poropressão de Água Neutra (u = m * γ_w * z * cos²β)
  const poreWaterPressure = Number((m * gammaW * z * cos2Beta).toFixed(2));

  // 3. Tensão Efetiva Normal (σ' = σ_n - u)
  const sigmaEffective = Math.max(0, Number((sigmaNormalTotal - poreWaterPressure).toFixed(2)));

  // 4. Tensão Cisalhante Solicitante (τ_d = γ_sat * z * sinβ * cosβ)
  const drivingShearStress = Number((gammaSat * z * sinBeta * cosBeta).toFixed(2));

  // 5. Resistência Cisalhante de Mohr-Coulomb (τ_r = c' + σ' * tan(φ'))
  const resistingShearStress = Number((effectiveCohesion + sigmaEffective * Math.tan(phiRad)).toFixed(2));

  // 6. Fator de Segurança (FS = τ_r / τ_d)
  let safetyFactor = 99;
  if (params.slopeDeg <= 1.0) {
    safetyFactor = 99;
  } else {
    safetyFactor = Number((resistingShearStress / Math.max(0.01, drivingShearStress)).toFixed(2));
  }

  // 7. Classificação CPRM / NBR 11682
  let cprmCode: 'R1' | 'R2' | 'R3' | 'R4' = 'R1';
  let cprmName = 'Baixo (Estável)';
  let cprmColor = '#10b981';
  let cprmDesc = 'Equilíbrio preservado. Resistência cisalhante amplamente superior às solicitações.';

  if (safetyFactor < 1.0) {
    cprmCode = 'R4';
    cprmName = 'Muito Alto (Iminência de Colapso)';
    cprmColor = '#ef4444';
    cprmDesc = 'Ruptura física ativa. Tensões cisalhantes superam a resistência do maciço.';
  } else if (safetyFactor < 1.30) {
    cprmCode = 'R3';
    cprmName = 'Alto (Atenção Máxima)';
    cprmColor = '#f97316';
    cprmDesc = 'Margem de segurança crítica. Risco iminente caso a chuva continue infiltrando.';
  } else if (safetyFactor < 1.50) {
    cprmCode = 'R2';
    cprmName = 'Médio (Monitoramento)';
    cprmColor = '#eab308';
    cprmDesc = 'Condições subcríticas. Abaixo do Fator de Segurança de projeto da NBR 11682 (FS=1.5).';
  }

  // 8. Probabilidade estimada de ruptura (%)
  let ruptureRiskPercent = 0;
  if (safetyFactor >= 2.0) {
    ruptureRiskPercent = Math.round(Math.max(2, 10 / safetyFactor));
  } else if (safetyFactor >= 1.5) {
    ruptureRiskPercent = Math.round(15 + (2.0 - safetyFactor) * 20);
  } else if (safetyFactor >= 1.0) {
    ruptureRiskPercent = Math.round(35 + (1.5 - safetyFactor) * 100);
  } else {
    ruptureRiskPercent = Math.min(100, Math.round(85 + (1.0 - safetyFactor) * 50));
  }

  // 9. Pontos para desenhar o gráfico do Envelope de Ruptura (τ vs σ')
  const maxSigmaGraph = Math.max(100, Math.ceil(sigmaNormalTotal * 1.5));
  const step = maxSigmaGraph / 6;
  const failureEnvelopePoints: { sigma: number; tauRupture: number }[] = [];
  for (let s = 0; s <= maxSigmaGraph; s += step) {
    const tau = effectiveCohesion + s * Math.tan(phiRad);
    failureEnvelopePoints.push({
      sigma: Number(s.toFixed(1)),
      tauRupture: Number(tau.toFixed(1))
    });
  }

  const currentStatePoint = {
    sigma: sigmaEffective,
    tauDriving: drivingShearStress
  };

  return {
    slopeDeg: params.slopeDeg,
    soilDepthM: z,
    saturationRatio: m,
    accumulatedRain72h: params.accumulatedRain72h,
    lithology,
    sigmaNormalTotal,
    poreWaterPressure,
    sigmaEffective,
    drivingShearStress,
    resistingShearStress,
    safetyFactor,
    cprmClassification: {
      code: cprmCode,
      name: cprmName,
      color: cprmColor,
      description: cprmDesc
    },
    ruptureRiskPercent,
    failureEnvelopePoints,
    currentStatePoint
  };
}
