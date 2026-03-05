export function calcularFatorEstrutural(slope: number): number {
  const fator = slope / 45;
  return Math.min(Math.max(fator, 0.05), 1);
}

export function calcularRiscoBase(
  soilMoisture: number,
  rainVolume: number,
  groundVibration: number
): number {
  const pesoChuva = 0.4;
  const pesoUmidade = 0.35;
  const pesoVibracao = 0.25;

  return (
    (rainVolume * pesoChuva) +
    (soilMoisture * pesoUmidade) +
    (groundVibration * pesoVibracao)
  );
}

export function calcularRiscoFinal(
  soilMoisture: number,
  terrainInclination: number,
  rainVolume: number,
  groundVibration: number
): { risk: number; statusColor: string } {
  let riscoBase = calcularRiscoBase(soilMoisture, rainVolume, groundVibration);
  const fatorEstrutural = calcularFatorEstrutural(terrainInclination);

  let riscoFinal = riscoBase * fatorEstrutural;

  // Saturação Crítica
  if (soilMoisture > 90 && terrainInclination > 20) {
    riscoFinal *= 1.2;
  }

  const roundedRisk = Math.min(Math.max(Math.round(riscoFinal), 0), 100);

  let statusColor = "Verde";
  if (roundedRisk <= 40) {
    statusColor = "Verde";
  } else if (roundedRisk <= 65) {
    statusColor = "Amarelo";
  } else if (roundedRisk <= 85) {
    statusColor = "Laranja";
  } else {
    statusColor = "Vermelho";
  }

  return { risk: roundedRisk, statusColor };
}

