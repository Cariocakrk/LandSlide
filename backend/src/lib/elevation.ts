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
    
    // Procedural terrain generation based on coordinates (Simulating real DEM)
    // If the region is Petrópolis (-22.5, -43.1) it generates steeper mountains
    const isSerrana = lat < -22.0 && lat > -24.0 && lon > -45.0 && lon < -43.0;
    const baseAltitude = isSerrana ? 800 : 10;
    const roughness = isSerrana ? 60 : 15;
    
    const noise = (x: number, y: number, randomSeed: number) => {
      return Math.sin(x * 0.1 + randomSeed) * Math.cos(y * 0.1 - randomSeed) * roughness;
    };

    const mapSeed = Math.abs(lat + lon);

    for (let i = 0; i < size; i++) {
      let row: number[] = [];
      for (let j = 0; j < size; j++) {
         // Create hills and valleys simulating topography
         const elevation = baseAltitude 
                         + noise(i, j, mapSeed) 
                         + noise(i * 0.5, j * 0.5, mapSeed * 2) * 0.5
                         + (Math.random() * 2); // fine detail
         
         row.push(Math.max(0, elevation)); // No negative altitudes
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
