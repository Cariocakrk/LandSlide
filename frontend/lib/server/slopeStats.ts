export function computeSlopeStatistics(matrix: number[][], cellResolutionMeters: number = 38) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let totalSlope = 0;
  let maxSlope = 0;
  let criticalSlopeCount = 0;
  const totalCells = (rows - 1) * (cols - 1);

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const dzdx = (matrix[i][j + 1] - matrix[i][j]) / cellResolutionMeters;
      const dzdy = (matrix[i + 1][j] - matrix[i][j]) / cellResolutionMeters;
      const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      const slopeDeg = slopeRad * (180 / Math.PI);

      totalSlope += slopeDeg;
      if (slopeDeg > maxSlope) maxSlope = slopeDeg;
      if (slopeDeg >= 25.0) criticalSlopeCount++;
    }
  }

  const meanSlope = Number((totalSlope / totalCells).toFixed(1));
  const criticalAreasPercent = Number(((criticalSlopeCount / totalCells) * 100).toFixed(1));

  let geomorphology = 'Planície ou Platô Suave';
  if (meanSlope > 25 || maxSlope > 40) {
    geomorphology = 'Relevo Montanhoso Escarpado (Alta Suscetibilidade Geológica)';
  } else if (meanSlope > 15 || maxSlope > 25) {
    geomorphology = 'Colinas Dissecadas / Encostas Onduladas';
  }

  return {
    meanSlope,
    maxSlope: Number(maxSlope.toFixed(1)),
    criticalAreas: criticalSlopeCount,
    criticalAreasPercent,
    geomorphology
  };
}
