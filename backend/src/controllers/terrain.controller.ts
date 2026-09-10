import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getCoordinatesFromQuery } from '../lib/geocoding';
import { getElevationMatrix } from '../lib/elevation';
import { setActiveTerrainCep } from '../lib/whatsapp';

/**
 * Calcula declividade média, máxima e proporção de encostas críticas
 * a partir da matriz MDE real, considerando resolução de amostragem.
 */
function computeSlopeStatistics(matrix: number[][], cellResolutionMeters: number = 38) {
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

export async function generateTerrain(req: AuthRequest, res: Response) {
  try {
    const { cep, query } = req.body;
    const searchString = query || cep;

    if (!searchString || typeof searchString !== 'string') {
      return res.status(400).json({ error: 'Insira um CEP ou Endereço válido para gerar o terreno.' });
    }

    const isCep = /^\d{5}-?\d{3}$/.test(searchString.trim()) || /^\d{8}$/.test(searchString.trim());
    if (isCep) {
      setActiveTerrainCep(searchString);
    }

    const { lat, lon, name } = await getCoordinatesFromQuery(searchString);
    const elevationData = await getElevationMatrix(lat, lon);
    const slopeStats = computeSlopeStatistics(elevationData.matrix);

    return res.json({
      location: name,
      latitude: lat,
      longitude: lon,
      elevationMatrix: elevationData.matrix,
      minElevation: elevationData.min,
      maxElevation: elevationData.max,
      reliefAmplitude: elevationData.reliefAmplitude,
      meanElevation: elevationData.mean,
      slopeStats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar topografia real.' });
  }
}
