export interface ElevationResponse {
  matrix: number[][];
  min: number;
  max: number;
  mean: number;
  reliefAmplitude: number;
}

const elevationCache = new Map<string, ElevationResponse>();

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

export async function getElevationMatrix(
  lat: number,
  lon: number,
  sampleGridSize: number = 16,
  renderGridSize: number = 48
): Promise<ElevationResponse> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (elevationCache.has(cacheKey)) {
    return elevationCache.get(cacheKey)!;
  }

  try {
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

    const chunkSize = 85;
    const batches: { lat: number; lon: number }[][] = [];
    for (let i = 0; i < coords.length; i += chunkSize) {
      batches.push(coords.slice(i, i + chunkSize));
    }

    const batchResponses = await Promise.all(
      batches.map(async (batch) => {
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${batch.map(c => c.lat).join(',')}&longitude=${batch.map(c => c.lon).join(',')}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Falha na API Open-Meteo Elevation');
        const data = await res.json();
        return data.elevation as number[];
      })
    );

    const allElevations = batchResponses.flat();

    if (allElevations.length !== sampleGridSize * sampleGridSize) {
      throw new Error('Dimensão de altitudes recebidas incompatível.');
    }

    const rawMatrix: number[][] = [];
    for (let i = 0; i < sampleGridSize; i++) {
      rawMatrix.push(allElevations.slice(i * sampleGridSize, (i + 1) * sampleGridSize));
    }

    const matrix = bilinearInterpolation(rawMatrix, renderGridSize);

    const flat = matrix.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const sum = flat.reduce((a, b) => a + b, 0);
    const mean = Number((sum / flat.length).toFixed(1));
    const reliefAmplitude = Number((max - min).toFixed(1));

    const result: ElevationResponse = {
      matrix,
      min,
      max,
      mean,
      reliefAmplitude
    };

    elevationCache.set(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error('Open-Meteo Elevation Error:', error?.message);
    const fallbackMatrix: number[][] = [];
    for (let i = 0; i < renderGridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < renderGridSize; j++) {
        row.push(Number((500 + Math.sin(i / 5) * 40 + Math.cos(j / 5) * 30).toFixed(1)));
      }
      fallbackMatrix.push(row);
    }
    const flat = fallbackMatrix.flat();
    return {
      matrix: fallbackMatrix,
      min: Math.min(...flat),
      max: Math.max(...flat),
      mean: 500,
      reliefAmplitude: 70
    };
  }
}
