export const calculateSlope = (matrix: number[][]) => {
  if (!matrix || matrix.length === 0) return { meanSlope: 0, maxSlope: 0, criticalAreas: 0 };

  const rows = matrix.length;
  const cols = matrix[0].length;
  let totalSlope = 0;
  let maxSlope = 0;
  let criticalAreas = 0;

  // Assuming a standard grid resolution of 30 meters between points (SRTM style)
  const cellResolution = 30; 

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      // Calculate gradients in X and Y directions
      const dzdx = (matrix[i][j + 1] - matrix[i][j]) / cellResolution;
      const dzdy = (matrix[i + 1][j] - matrix[i][j]) / cellResolution;

      // Slope in radians
      const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      // Convert to degrees
      const slopeDeg = slopeRad * (180 / Math.PI);

      totalSlope += slopeDeg;
      if (slopeDeg > maxSlope) maxSlope = slopeDeg;
      
      // Areas with slope > 30 degrees are typically considered high landslide risk
      if (slopeDeg > 30) criticalAreas++;
    }
  }

  const cells = (rows - 1) * (cols - 1);
  const meanSlope = parseFloat((totalSlope / cells).toFixed(2));

  return {
    meanSlope,
    maxSlope: parseFloat(maxSlope.toFixed(2)),
    criticalAreas
  };
};
