/**
 * Motor de Cálculo Geotécnico e Risco de Deslizamentos (GeoShield Monitor)
 * 
 * Baseado na Mecânica dos Solos clássica:
 * - Modelo de Talude Infinito (Infinite Slope Model) com critério de ruptura de Mohr-Coulomb
 * - Influência da poropressão hídrica e perda de sucção matricial (Fredlund & Rahardjo)
 * - Limiares críticos de precipitação acumulada (CEMADEN / CPRM / IPT)
 */

export interface GeotechnicalRiskInput {
  slopeDeg: number;             // Declividade da encosta em graus (0 a 90°)
  accumulatedRain72h: number;   // Chuva acumulada 72h (mm) - parâmetro mestre CEMADEN
  soilMoisturePercent: number;  // Saturação do solo (0 a 100%)
  currentRain1h?: number;       // Intensidade horária atual (mm/h)
  groundVibration?: number;     // Aceleração/vibração de rastejo em mm/s (0 a 100)
  curvature?: 'concave' | 'planar' | 'convex'; // Geomorfometria (convergência hídrica)
  cohesionResidualKPa?: number; // Coesão efetiva saturada c' (padrão: 6 kPa para saprolitos/colúvios)
  cohesionSuctionKPa?: number;  // Ganho de coesão aparente por sucção quando seco (padrão: 14 kPa)
  frictionAngleDeg?: number;    // Ângulo de atrito interno phi' (padrão: 30° para Cambissolos/Argissolos)
  soilDepthM?: number;          // Profundidade do manto de intemperismo z (padrão: 2.0 m)
  soilUnitWeightKN?: number;    // Peso específico do solo saturado gamma_sat (padrão: 18.5 kN/m³)
}

export interface GeotechnicalRiskResult {
  safetyFactor: number;         // Fator de Segurança (FS)
  risk: number;                 // Risco normalizado (0 a 100%)
  statusColor: 'Verde' | 'Amarelo' | 'Laranja' | 'Vermelho';
  riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4'; // Padrão Oficial Defesa Civil Nacional (CPRM/IPT)
  classification: string;       // "Baixo", "Médio / Atenção", "Alto / Alerta", "Muito Alto / Emergência"
  saturationRatio: number;      // Razão piezométrica m (0.0 a 1.0)
  isCriticalSlope: boolean;     // Se a declividade ultrapassa o limiar de atenção (>= 25°)
  diagnosis: string;            // Laudo geotécnico sintetizado
}

/**
 * Cálculo geotécnico rigoroso de estabilidade de encosta
 */
export function calculateGeotechnicalRisk(input: GeotechnicalRiskInput): GeotechnicalRiskResult {
  const {
    slopeDeg,
    accumulatedRain72h,
    soilMoisturePercent,
    currentRain1h = 0,
    groundVibration = 0,
    curvature = 'planar',
    cohesionResidualKPa = 6,
    cohesionSuctionKPa = 14,
    frictionAngleDeg = 30,
    soilDepthM = 2.0,
    soilUnitWeightKN = 18.5
  } = input;

  const gammaW = 9.81; // Peso específico da água (kN/m³)
  const safeSlope = Math.max(0, Math.min(85, slopeDeg));

  // 1. Razão de saturação hídrica / piezométrica do solo (m = zw / z)
  // Baseada na chuva acumulada de 72h (CEMADEN) e umidade volumétrica
  const mRain = Math.min(1.0, Math.max(0, accumulatedRain72h / 120));
  const mMoisture = Math.min(1.0, Math.max(0, soilMoisturePercent / 100));
  let saturationRatio = Math.min(1.0, mRain * 0.6 + mMoisture * 0.4);

  // Fator geomorfométrico de curvatura:
  // Encostas côncavas convergem o fluxo hídrico subsuperficial, acumulando poro-pressão
  if (curvature === 'concave') {
    saturationRatio = Math.min(1.0, saturationRatio * 1.25);
  } else if (curvature === 'convex') {
    saturationRatio = Math.max(0.0, saturationRatio * 0.85);
  }

  // 2. Fator de Segurança (FS) pelo Modelo de Talude Infinito (Mohr-Coulomb com perda de sucção)
  let safetyFactor: number;

  if (safeSlope <= 2.0) {
    // Relevo plano ou quase plano não sofre deslizamento translacional de encosta
    safetyFactor = 99.0;
  } else {
    const betaRad = (safeSlope * Math.PI) / 180;
    const phiRad = (frictionAngleDeg * Math.PI) / 180;

    // Perda de sucção matricial conforme a saturação avança (Fredlund & Rahardjo)
    const effectiveCohesion = cohesionResidualKPa + cohesionSuctionKPa * (1 - saturationRatio);

    // Força desestabilizadora (tensão cisalhante solicitante tau_d)
    const sinBeta = Math.sin(betaRad);
    const cosBeta = Math.cos(betaRad);
    let tauDriving = soilUnitWeightKN * soilDepthM * sinBeta * cosBeta;

    // Acréscimo pseudo-estático se houver vibração mecânica/microssísmica de rastejo
    if (groundVibration > 0) {
      const kh = Math.min(0.25, (groundVibration / 100) * 0.15);
      tauDriving += kh * soilUnitWeightKN * soilDepthM * (cosBeta * cosBeta);
    }

    // Força resistente (tensão cisalhante admissível de Mohr-Coulomb com poropressão tau_r)
    const effectiveNormalStress = Math.max(0, (soilUnitWeightKN - saturationRatio * gammaW) * soilDepthM * (cosBeta * cosBeta));
    const tauResisting = effectiveCohesion + effectiveNormalStress * Math.tan(phiRad);

    safetyFactor = Number((Math.max(0.05, tauResisting / Math.max(0.01, tauDriving))).toFixed(2));
  }

  // 3. Determinação da Faixa de Risco e Classificação Defesa Civil (R1 a R4)
  const isCriticalSlope = safeSlope >= 25.0;
  const isExtremeRain = accumulatedRain72h >= 100 || currentRain1h >= 30;

  let riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4' = 'R1';
  let statusColor: 'Verde' | 'Amarelo' | 'Laranja' | 'Vermelho' = 'Verde';
  let classification = 'Baixo';
  let risk = 0;
  let diagnosis = '';

  if (safetyFactor <= 1.0 || (isExtremeRain && isCriticalSlope)) {
    // R4 - Muito Alto / Emergência
    riskLevelCode = 'R4';
    statusColor = 'Vermelho';
    classification = 'Muito Alto / Emergência';
    risk = Math.min(100, Math.round(85 + (1.0 - Math.min(1.0, safetyFactor)) * 15));
    diagnosis = `Alerta de Emergência Máxima (R4). Fator de Segurança crítico (FS = ${safetyFactor} <= 1.00) ou saturação extrema em encosta de ${safeSlope}°. Poropressão supera a resistência cisalhante do solo. Risco iminente de escorregamento translacional / corrida de massa.`;
  } else if (safetyFactor < 1.3 || (accumulatedRain72h >= 70 && isCriticalSlope)) {
    // R3 - Alto / Alerta
    riskLevelCode = 'R3';
    statusColor = 'Laranja';
    classification = 'Alto / Alerta';
    const normalized = 66 + Math.round(((1.3 - safetyFactor) / 0.3) * 19);
    risk = Math.max(66, Math.min(84, normalized));
    diagnosis = `Estado de Alerta (R3). Fator de Segurança reduzido (FS = ${safetyFactor}). Encosta em condição de equilíbrio-limite com sobrecarga piezométrica devido a ${Math.round(accumulatedRain72h)}mm acumulados.`;
  } else if (safetyFactor < 1.5 || (accumulatedRain72h >= 40 && safeSlope >= 15)) {
    // R2 - Médio / Atenção
    riskLevelCode = 'R2';
    statusColor = 'Amarelo';
    classification = 'Médio / Atenção';
    const normalized = 36 + Math.round(((1.5 - safetyFactor) / 0.2) * 29);
    risk = Math.max(36, Math.min(65, normalized));
    diagnosis = `Estado de Atenção (R2). Estabilidade moderada (FS = ${safetyFactor}). Infiltração ativa no regolito; monitoramento de drenagem recomendado para declividade de ${safeSlope}°.`;
  } else {
    // R1 - Baixo
    riskLevelCode = 'R1';
    statusColor = 'Verde';
    classification = 'Baixo';
    const base = safeSlope <= 2 ? 0 : Math.round((safeSlope / 25) * 20 + saturationRatio * 15);
    risk = Math.min(35, Math.max(0, base));
    diagnosis = `Condição Estável (R1). Fator de Segurança adequado (FS = ${safetyFactor >= 99 ? 'Estável (Plano)' : safetyFactor}). Ausência de saturação crítica ou sobrecarga hidrodinâmica.`;
  }

  return {
    safetyFactor,
    risk,
    statusColor,
    riskLevelCode,
    classification,
    saturationRatio: Number(saturationRatio.toFixed(2)),
    isCriticalSlope,
    diagnosis
  };
}

/**
 * Função compatível com as chamadas legadas do projeto, agora alimentada
 * internamente pelo Modelo Geotécnico de Talude Infinito.
 */
export function calculateRisk(
  soilMoisture: number,
  terrainInclination: number,
  rainVolume: number,
  groundVibration: number
): {
  risk: number;
  statusColor: string;
  safetyFactor?: number;
  riskLevelCode?: string;
  classification?: string;
  diagnosis?: string;
} {
  const result = calculateGeotechnicalRisk({
    slopeDeg: terrainInclination,
    accumulatedRain72h: rainVolume,
    soilMoisturePercent: soilMoisture,
    groundVibration
  });

  return {
    risk: result.risk,
    statusColor: result.statusColor,
    safetyFactor: result.safetyFactor,
    riskLevelCode: result.riskLevelCode,
    classification: result.classification,
    diagnosis: result.diagnosis
  };
}
