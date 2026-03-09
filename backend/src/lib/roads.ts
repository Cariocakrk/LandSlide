import axios from 'axios';

// Cache for roads to prevent Overpass exhaustion
const roadsCache = new Map<string, any>();

export const getRoads = async (centerLat: number, centerLon: number) => {
  const cacheKey = `${centerLat.toFixed(3)},${centerLon.toFixed(3)}`;
  
  if (roadsCache.has(cacheKey)) {
    console.log(`[ROADS] Usando cache para Coordenadas: ${centerLat}, ${centerLon}`);
    return roadsCache.get(cacheKey)!;
  }

  console.log(`[ROADS] Coordenadas: ${centerLat}, ${centerLon}`);
  console.log(`[ROADS] Iniciando busca Overpass para ruas...`);

  const offset = 0.045; // roughly 5km

  // Overpass QL to find highways
  const query = `
    [out:json][timeout:25];
    (
      way["highway"](around:3000,${centerLat},${centerLon});
    );
    out geom;
  `;

  try {
    const url = 'https://overpass-api.de/api/interpreter';
    const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const elements = response.data.elements || [];
    const roadsList: any[] = [];
    let linesCreated = 0;

    elements.forEach((el: any) => {
      let geometries: any[][] = [];
      
      if (el.type === 'way' && el.geometry) {
         geometries.push(el.geometry.map((g: any) => [g.lat, g.lon]));
      }

      geometries.forEach((coordinates) => {
          if (coordinates.length > 0) {
              const name = el.tags?.name || el.tags?.highway || 'Rua Local';
              
              roadsList.push({
                  id: `road-${el.id}-${linesCreated}`,
                  name,
                  type: el.tags?.highway || 'unknown',
                  coordinates
              });
              linesCreated++;
          }
      });
    });

    console.log(`[ROADS] Vias encontradas: ${linesCreated}`);

    const payload = { roads: roadsList };
    roadsCache.set(cacheKey, payload);
    return payload;

  } catch (error: any) {
    console.error('[ROADS ERROR] Falha ao buscar ruas:', error.message);
    return { roads: [] };
  }
};
