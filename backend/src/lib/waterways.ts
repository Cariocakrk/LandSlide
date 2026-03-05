import axios from 'axios';

// Cache for waterways and sensors to prevent Overpass exhaustion
const waterwaysCache = new Map<string, any>();

// We calculate the distance between two lat/lng pairs using the Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

export const getWaterways = async (centerLat: number, centerLon: number) => {
  const cacheKey = `${centerLat.toFixed(3)},${centerLon.toFixed(3)}`;
  
  if (waterwaysCache.has(cacheKey)) {
    console.log(`\n[FLOOD] Usando cache para Coordenadas: ${centerLat}, ${centerLon}`);
    return waterwaysCache.get(cacheKey)!;
  }

  console.log(`\n[FLOOD] CEP carregado`);
  console.log(`[FLOOD] Coordenadas: ${centerLat}, ${centerLon}`);
  console.log(`[FLOOD] Raio de busca: 3000m`);
  console.log(`[FLOOD] Momento da chamada: ${new Date().toISOString()}`);
  console.log(`[FLOOD] Iniciando busca Overpass...`);

  // Create bounding box roughly 5km around the center
  // 1 deg lat is ~ 111km, so 5km is ~ 0.045 deg
  const offset = 0.045;
  const bbox = `${centerLat - offset},${centerLon - offset},${centerLat + offset},${centerLon + offset}`;

  // Overpass QL to find naturally flowing rivers, streams, lakes and coastlines
  const query = `
    [out:json][timeout:25];
    (
      way["waterway"](around:3000,${centerLat},${centerLon});
      way["natural"="water"](around:3000,${centerLat},${centerLon});
      relation["natural"="water"](around:3000,${centerLat},${centerLon});
    );
    out geom;
  `;

  try {
    const url = 'https://overpass-api.de/api/interpreter';
    console.log(`[FLOOD] URL final da query: ${url}`);
    console.log(`[FLOOD] String da query Overpass: \n${query}`);

    console.log("[FLOOD] Preparando requisição Overpass");
    const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log(`[FLOOD] Status HTTP: ${response.status}`);
    const elements = response.data.elements || [];
    console.log(`[FLOOD] Quantidade total de elementos retornados: ${elements.length}`);
    console.log(`[FLOOD] response.data completo (resumido): ${JSON.stringify(response.data).substring(0, 150)}...`);
    const waterwaysList: any[] = [];
    let floodSensors: any[] = [];

    let waterBodiesCount = 0;
    let linesCreated = 0;

    // Assemble waterways directly from geometry
    elements.forEach((el: any) => {
      // For relations we might need to look at members, but with 'out geom;' members have geometry too.
      let geometries: any[][] = [];
      
      if (el.type === 'way' && el.geometry) {
         geometries.push(el.geometry.map((g: any) => [g.lat, g.lon]));
      } else if (el.type === 'relation' && el.members) {
         el.members.forEach((m: any) => {
            if (m.type === 'way' && m.geometry) {
               geometries.push(m.geometry.map((g: any) => [g.lat, g.lon]));
            }
         });
      }

      geometries.forEach((coordinates) => {
          if (coordinates.length > 0) {
              console.log(`[FLOOD] Conversão de geometria - Tipo: ${el.type}`);
              console.log(`[FLOOD] Quantidade de pontos na geometria: ${coordinates.length}`);
              console.log(`[FLOOD] Primeiro ponto convertido: [${coordinates[0][0]}, ${coordinates[0][1]}]`);
              console.log(`[FLOOD] Último ponto convertido: [${coordinates[coordinates.length-1][0]}, ${coordinates[coordinates.length-1][1]}]`);
              
              waterBodiesCount++;
              
              // Get the semantic name of the river if it exists
              const name = el.tags?.name || 'Corpo d\'água Local';
              
              const waterwayDesc = {
                  id: `river-${el.id}-${linesCreated}`,
                  name,
                  coordinates
              };
              waterwaysList.push(waterwayDesc);
              linesCreated++;
    
              // Find the center of this way to place a virtual Flood Sensor
              const middleIndex = Math.floor(coordinates.length / 2);
              const riverCenterPoint = coordinates[middleIndex];
              
              if (riverCenterPoint) {
                 const rLat = riverCenterPoint[0];
                 const rLng = riverCenterPoint[1];
                 const distanceKm = getDistanceFromLatLonInKm(centerLat, centerLon, rLat, rLng);
                 
                 // Generate Virtual Flood Sensor
                 floodSensors.push({
                     id: `FLD-${el.id}-${linesCreated}`,
                     riverName: name,
                     lat: rLat,
                     lng: rLng,
                     distanceToCenter: distanceKm * 1000, 
                     nivelAtual: 0,
                     localRisk: 0, 
                     waterwayId: waterwayDesc.id
                 });
              }
          }
      });
    });

    console.log(`Corpos d’água encontrados: ${waterBodiesCount}`);
    console.log(`Linhas criadas: ${linesCreated}`);
    console.log(`Adicionados à cena com sucesso.`);

    const payload = {
        waterways: waterwaysList,
        floodSensors: floodSensors
    };

    waterwaysCache.set(cacheKey, payload);
    return payload;

  } catch (error: any) {
    console.error('[FLOOD ERROR] Stack trace completo:', error.stack || error.message);
    if (error.response) {
      console.error('[FLOOD ERROR] Resposta de erro da API (CORS/RateLimit?):', error.response.status, error.response.data);
    }
    // If overpass fails, return structurally valid empty arrays to avoid frontend explosions
    return { waterways: [], floodSensors: [] };
  }
};
