export function calculateRisk(
  soilMoisture: number,
  terrainInclination: number,
  rainVolume: number,
  groundVibration: number
): { risk: number; statusColor: string } {
  // risk = (soilMoisture * 0.35) + (terrainInclination * 0.30) + (rainVolume * 0.20) + (groundVibration * 0.15)
  const risk = 
    soilMoisture * 0.35 +
    terrainInclination * 0.30 +
    rainVolume * 0.20 +
    groundVibration * 0.15;

  const roundedRisk = Math.round(risk);

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
