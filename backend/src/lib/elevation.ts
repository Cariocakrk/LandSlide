import axios from 'axios';

const elevationCache = new Map<string, number[][]>();

// Generates an elevation matrix for a given coordinate bounding box
// Simulating an OpenTopography DEM API wrapper
export const getElevationMatrix = async (lat: number, lon: number): Promise<{ matrix: number[][], min: number, max: number }> => {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  
  if (elevationCache.has(cacheKey)) {
    const matrix = elevationCache.get(cacheKey)!;
    return calculateMinMax(matrix);
  }

  try {
    // In a real production environment, you would call Mapbox Terrain-RGB or OpenTopography API here
    // Example: await axios.get(`...api.opentopography.org/...`)
    
    // For this academic proof of concept, since OpenTopography endpoints are often heavily ratelimited
    // or require tokens, we will generate a procedural fractal elevation map based on the geographic seed (lat/lon).
    // This perfectly mimics the expected 100x100 `number[][]` payload format of a DEM matrix.
    
    const size = 64; // Grid size for the 3D plane
    let matrix: number[][] = [];
    
    const isSerrana = lat < -22.0 && lat > -24.0 && lon > -45.0 && lon < -43.0;
    let baseAltitude = isSerrana ? 800 : 10;
    try {
      // Obter a altitude geográfica real usando a API pública Open-Meteo
      const response = await axios.get(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
      if (response.data && Array.isArray(response.data.elevation) && response.data.elevation[0] !== undefined) {
        baseAltitude = response.data.elevation[0];
        console.log(`[Elevation] Altitude geográfica real obtida via Open-Meteo para a coordenada (${lat}, ${lon}): ${baseAltitude}m`);
      }
    } catch (apiErr) {
      console.warn('[Elevation] Falha ao obter altitude real do Open-Meteo. Usando fallback aproximado.', apiErr);
    }
    const roughness = isSerrana ? 60 : 15;
    
    const noise = (x: number, y: number, randomSeed: number) => {
      return Math.sin(x * 0.1 + randomSeed) * Math.cos(y * 0.1 - randomSeed) * roughness;
    };

    const mapSeed = Math.abs(lat + lon);

    for (let i = 0; i < size; i++) {
      let row: number[] = [];
      for (let j = 0; j < size; j++) {
         let elevation = baseAltitude 
                          + noise(i, j, mapSeed) 
                          + noise(i * 0.5, j * 0.5, mapSeed * 2) * 0.5;
         
         // Esculpir corpos d'água de forma limpa e plana
         if (isSerrana) {
           // Região Serrana (Petrópolis): Criar um rio sinuoso no meio do vale
           const riverCenter = size / 2 + Math.sin(i * 0.25) * 8;
           const distToRiver = Math.abs(j - riverCenter);
           
           if (distToRiver < 3.5) {
             // Canal do rio profundo e plano
             elevation = baseAltitude - roughness - 12; // 728
           } else if (distToRiver < 6) {
             // Margens do rio: rampa de transição suave
             const t = (distToRiver - 3.5) / 2.5;
             const riverFloor = baseAltitude - roughness - 12; // 728
             const landElevation = Math.max(baseAltitude - roughness + 5, elevation); // Garante terra >= 745
             elevation = riverFloor + t * (landElevation - riverFloor);
           } else {
             // Terra normal: garante que a montanha nunca afunde abaixo do vale do rio (mínimo 745)
             elevation = Math.max(baseAltitude - roughness + 5, elevation) + (Math.random() * 1.5);
           }
         } else {
           // Região Litorânea (São Sebastião): Criar oceano no terço esquerdo e rampa de praia
           const oceanEnd = size / 3;
           if (j < oceanEnd) {
             // Oceano perfeitamente plano a nível zero
             elevation = 0;
           } else if (j < oceanEnd + 4) {
             // Praia: rampa suave do oceano para a terra
             const t = (j - oceanEnd) / 4;
             const landBase = Math.max(5, elevation); // Garante terra >= 5
             elevation = t * landBase;
           } else {
             // Terra normal: garante que a litorânea fique sempre acima do nível do mar (mínimo 5)
             elevation = Math.max(5, elevation) + (Math.random() * 1.5);
           }
         }
         
         row.push(Math.max(0, elevation)); // Evitar altitudes negativas
      }
      matrix.push(row);
    }
    
    elevationCache.set(cacheKey, matrix);
    return calculateMinMax(matrix);
    
  } catch (error) {
     throw new Error('Falha ao obter topografia da região especificada.');
  }
};

const calculateMinMax = (matrix: number[][]) => {
    let min = Infinity;
    let max = -Infinity;
    
    for (const row of matrix) {
        for (const val of row) {
            if (val < min) min = val;
            if (val > max) max = val;
        }
    }
    
    return { matrix, min, max };
}
