export interface SlopeAnalysisResult {
  meanSlope: number;
  maxSlope: number;
  criticalAreas: number;
  criticalAreasPercent: number;
  geomorphology: string;
  slopeMatrix: number[][];
  minSafetyFactor: number;
  meanSafetyFactor: number;
}

/**
 * Análise geomorfométrica completa da malha topográfica real (DEM).
 * Calcula gradientes dz/dx e dz/dy, ângulo de declividade em graus,
 * proporção de encostas instáveis e Fator de Segurança (FS) geotécnico.
 */
export const calculateSlope = (
  matrix: number[][],
  accumulatedRain72h: number = 0,
  soilMoisturePercent: number = 40
): SlopeAnalysisResult => {
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return {
      meanSlope: 0,
      maxSlope: 0,
      criticalAreas: 0,
      criticalAreasPercent: 0,
      geomorphology: 'Não calculada',
      slopeMatrix: [],
      minSafetyFactor: 99,
      meanSafetyFactor: 99
    };
  }

  const rows = matrix.length;
  const cols = matrix[0].length;
  let totalSlope = 0;
  let maxSlope = 0;
  let criticalAreas = 0;

  // Resolução média do espaçamento geográfico da malha em metros
  const cellResolution = 38;

  // Parâmetros de saturação hídrica
  const mRain = Math.min(1.0, accumulatedRain72h / 120);
  const mMoist = Math.min(1.0, soilMoisturePercent / 100);
  const saturationRatio = Math.min(1.0, mRain * 0.6 + mMoist * 0.4);

  // Parâmetros geotécnicos do regolito (Mohr-Coulomb)
  const gammaW = 9.81;
  const gammaSat = 18.5;
  const z = 2.0;
  const phiRad = (30 * Math.PI) / 180;
  const effectiveCohesion = 6 + 14 * (1 - saturationRatio); // Perda de sucção matricial

  const slopeMatrix: number[][] = [];
  let sumFS = 0;
  let minFS = 99;
  let validFSCells = 0;

  for (let i = 0; i < rows; i++) {
    const slopeRow: number[] = [];
    for (let j = 0; j < cols; j++) {
      const nextJ = j < cols - 1 ? j + 1 : j;
      const prevJ = j > 0 ? j - 1 : j;
      const nextI = i < rows - 1 ? i + 1 : i;
      const prevI = i > 0 ? i - 1 : i;

      const deltaX = (matrix[i][nextJ] - matrix[i][prevJ]) / ((nextJ - prevJ || 1) * cellResolution);
      const deltaY = (matrix[nextI][j] - matrix[prevI][j]) / ((nextI - prevI || 1) * cellResolution);

      const slopeRad = Math.atan(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
      const slopeDeg = Number((slopeRad * (180 / Math.PI)).toFixed(1));

      slopeRow.push(slopeDeg);
      totalSlope += slopeDeg;
      if (slopeDeg > maxSlope) maxSlope = slopeDeg;
      if (slopeDeg >= 25.0) criticalAreas++;

      // Cálculo de FS da célula
      if (slopeDeg <= 2.0) {
        sumFS += 99;
      } else {
        const beta = (slopeDeg * Math.PI) / 180;
        const cosB = Math.cos(beta);
        const sinB = Math.sin(beta);
        const tauD = gammaSat * z * sinB * cosB;
        const sigmaPrime = Math.max(0, (gammaSat - saturationRatio * gammaW) * z * cosB * cosB);
        const tauR = effectiveCohesion + sigmaPrime * Math.tan(phiRad);
        const fs = Number((Math.max(0.05, tauR / Math.max(0.01, tauD))).toFixed(2));

        if (fs < minFS) minFS = fs;
        sumFS += fs;
      }
      validFSCells++;
    }
    slopeMatrix.push(slopeRow);
  }

  const totalCells = rows * cols;
  const meanSlope = Number((totalSlope / totalCells).toFixed(1));
  const criticalAreasPercent = Number(((criticalAreas / totalCells) * 100).toFixed(1));
  const meanSafetyFactor = Number((sumFS / (validFSCells || 1)).toFixed(2));

  let geomorphology = 'Planície ou Platô Suave';
  if (meanSlope > 25 || maxSlope > 40) {
    geomorphology = 'Relevo Montanhoso Escarpado (Serra)';
  } else if (meanSlope > 15 || maxSlope > 25) {
    geomorphology = 'Colinas Dissecadas / Encostas Onduladas';
  }

  return {
    meanSlope,
    maxSlope: Number(maxSlope.toFixed(1)),
    criticalAreas,
    criticalAreasPercent,
    geomorphology,
    slopeMatrix,
    minSafetyFactor: minFS === 99 ? 99 : Number(minFS.toFixed(2)),
    meanSafetyFactor
  };
};
