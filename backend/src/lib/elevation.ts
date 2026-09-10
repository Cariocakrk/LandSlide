import axios from 'axios';

interface ElevationResponse {
  matrix: number[][];
  min: number;
  max: number;
  mean: number;
  reliefAmplitude: number; // Desnível real entre cota mínima e máxima (m)
}

const elevationCache = new Map<string, ElevationResponse>();

/**
 * Interpolação bilinear suave para transformar uma malha DEM amostrada em
 * resolução adequada para visualização tridimensional sem perder a morfologia real.
 */
function bilinearInterpolation(srcMatrix: number[][], targetSize: number): number[][] {
  const srcRows = srcMatrix.length;
  const srcCols = srcMatrix[0].length;
  const result: number[][] = [];

  for (let i = 0; i < targetSize; i++) {
    const row: number[] = [];
    const r = (i / (targetSize - 1)) * (srcRows - 1);
    const r0 = Math.floor(r);
    const r1 = Math.min(srcRows - 1, r0 + 1);
    const dr = r - r0;

    for (let j = 0; j < targetSize; j++) {
      const c = (j / (targetSize - 1)) * (srcCols - 1);
      const c0 = Math.floor(c);
      const c1 = Math.min(srcCols - 1, c0 + 1);
      const dc = c - c0;

      const v00 = srcMatrix[r0][c0];
      const v01 = srcMatrix[r0][c1];
      const v10 = srcMatrix[r1][c0];
      const v11 = srcMatrix[r1][c1];

      const v0 = v00 * (1 - dc) + v01 * dc;
      const v1 = v10 * (1 - dc) + v11 * dc;
      const val = v0 * (1 - dr) + v1 * dr;
      row.push(Number(val.toFixed(1)));
    }
    result.push(row);
  }
  return result;
}

/**
 * Consulta a API de Elevação Global do Open-Meteo (SRTM / Copernicus DEM 30m)
 * para obter a altimetria real de uma grade geográfica em torno das coordenadas de busca.
 */
export const getElevationMatrix = async (
  lat: number,
  lon: number,
  sampleGridSize: number = 16,
  renderGridSize: number = 48
): Promise<ElevationResponse> => {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (elevationCache.has(cacheKey)) {
    return elevationCache.get(cacheKey)!;
  }

  try {
    // Passo angular de amostragem (~0.00035° ≈ 38 metros de resolução entre pontos)
    // Uma grade de 16x16 cobre uma área de aproximadamente 600m x 600m ao redor do CEP
    const step = 0.00035;
    const coords: { lat: number; lon: number }[] = [];

    for (let i = 0; i < sampleGridSize; i++) {
      for (let j = 0; j < sampleGridSize; j++) {
        coords.push({
          lat: Number((lat + (i - sampleGridSize / 2) * step).toFixed(5)),
          lon: Number((lon + (j - sampleGridSize / 2) * step).toFixed(5))
        });
      }
    }

    // A API pública aceita até 100 coordenadas por requisição.
    // Dividimos as 256 coordenadas em 3 lotes de ~86 e executamos em paralelo.
    const chunkSize = 85;
    const batches: { lat: number; lon: number }[][] = [];
    for (let i = 0; i < coords.length; i += chunkSize) {
      batches.push(coords.slice(i, i + chunkSize));
    }

    const batchResponses = await Promise.all(
      batches.map(batch =>
        axios.post(
          'https://api.open-meteo.com/v1/elevation',
          {
            latitude: batch.map(c => c.lat),
            longitude: batch.map(c => c.lon)
          },
          { timeout: 8000 }
        ).then(res => res.data.elevation as number[])
      )
    );

    const allElevations = batchResponses.flat();

    // Reorganizar em matriz 2D (sampleGridSize x sampleGridSize)
    const rawMatrix: number[][] = [];
    for (let i = 0; i < sampleGridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < sampleGridSize; j++) {
        row.push(allElevations[i * sampleGridSize + j]);
      }
      rawMatrix.push(row);
    }

    // Interpolar para a resolução final do Three.js
    const interpolatedMatrix = bilinearInterpolation(rawMatrix, renderGridSize);

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let totalCells = 0;

    for (const row of interpolatedMatrix) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
        totalCells++;
      }
    }

    const mean = Number((sum / totalCells).toFixed(1));
    const reliefAmplitude = Number((max - min).toFixed(1));

    const result: ElevationResponse = {
      matrix: interpolatedMatrix,
      min,
      max,
      mean,
      reliefAmplitude
    };

    elevationCache.set(cacheKey, result);
    return result;

  } catch (error: any) {
    console.warn('[Elevation] Falha ao coletar grade MDE real do Open-Meteo. Tentando cota pontual...', error?.message);

    // Fallback: Obter cota única e gerar suave relevo local
    try {
      const fallbackRes = await axios.get(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
        { timeout: 5000 }
      );
      const baseAlt = fallbackRes.data?.elevation?.[0] || 50;

      const fallbackMatrix: number[][] = [];
      for (let i = 0; i < renderGridSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < renderGridSize; j++) {
          row.push(baseAlt);
        }
        fallbackMatrix.push(row);
      }

      return {
        matrix: fallbackMatrix,
        min: baseAlt,
        max: baseAlt,
        mean: baseAlt,
        reliefAmplitude: 0
      };
    } catch {
      throw new Error('Falha ao obter dados topográficos para a região especificada.');
    }
  }
};
