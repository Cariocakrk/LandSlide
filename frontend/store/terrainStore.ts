import { create } from 'zustand';

export type FloodSensor = {
  id: string;
  riverName: string;
  lat: number;
  lng: number;
  distanceToCenter: number;
  nivelAtual: number;
  localRisk: number;
  waterwayId: string;
};

export type Sensor = {
  id: string;
  position: { x: number; y: number; z: number };
  gridX: number;
  gridY: number;
  soilMoisture: number;     // 0-100%
  terrainInclination: number; // degreesL
  rainVolume: number;       // mm
  vibration: number;        // Richter mm/s
  localRisk: number;        // 0-100 severity
  futureRisk: number;       // 0-100 deterministic projected severity (6h)
};

type TerrainState = {
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  elevationMatrix: number[][] | null;
  minElevation: number;
  maxElevation: number;
  slopeData: { meanSlope: number; maxSlope: number; criticalAreas: number } | null;
  sensors: Sensor[];
  globalRisk: number;
  weatherData: any | null;

  // Flood Module Extensions
  activeModule: 'landslide' | 'flood';
  waterways: any[];
  floodSensors: FloodSensor[];
  globalFloodRisk: number;

  roads: any[];

  telemetryInterval: NodeJS.Timeout | null;
  weatherInterval: NodeJS.Timeout | null;

  setTerrainData: (data: any, slopeData: any) => void;
  setSensors: (sensors: Sensor[]) => void;
  updateSensor: (id: string, partial: Partial<Sensor>) => void;
  updateAllSensors: (partial: Partial<Sensor>) => void;
  recalculateGlobalRisk: () => void;
  clearTerrain: () => void;
  fetchAndApplyWeather: () => Promise<void>;
  setActiveModule: (module: 'landslide' | 'flood') => void;
  applyFallbackTerrain: () => void;
};

// --- Structural Geotechnical Risk Logic (Mirrored from Backend) ---
const calcularFatorEstrutural = (slope: number): number => {
  const fator = slope / 45;
  return Math.min(Math.max(fator, 0.05), 1);
};

const calcularRiscoBase = (
  soilMoisture: number,
  rainVolume: number,
  vibration: number
): number => {
  const pesoChuva = 0.4;
  const pesoUmidade = 0.35;
  const pesoVibracao = 0.25;

  return (
    (rainVolume * pesoChuva) +
    (soilMoisture * pesoUmidade) +
    (vibration * pesoVibracao)
  );
};

const calcLocalRisk = (sensor: Sensor) => {
  let riscoBase = calcularRiscoBase(sensor.soilMoisture, sensor.rainVolume, sensor.vibration);
  const fatorEstrutural = calcularFatorEstrutural(sensor.terrainInclination);

  let riscoFinal = riscoBase * fatorEstrutural;

  // Crítico de Saturação (Encostas encharcadas)
  if (sensor.soilMoisture > 90 && sensor.terrainInclination > 20) {
    riscoFinal *= 1.2;
  }

  return Math.min(Math.max(Math.round(riscoFinal), 0), 100);
};

const calculateFutureRisk = (sensor: Sensor, accumulatedRain6h: number) => {
  let riscoBase = calcularRiscoBase(sensor.soilMoisture, accumulatedRain6h * 0.5, sensor.vibration); // Pessimistic rain projection
  const fatorEstrutural = calcularFatorEstrutural(sensor.terrainInclination);
  let riscoFinal = riscoBase * fatorEstrutural;

  if (sensor.soilMoisture > 90 && sensor.terrainInclination > 20) {
    riscoFinal *= 1.2;
  }
  
  return Math.max(sensor.localRisk, Math.min(Math.round(riscoFinal), 100)); 
};

// --- Flood Module Logic ---
const calcularRiscoEnchente = (sensor: FloodSensor, currentRain: number, accumulatedRain6h: number): number => {
  // Risco = (chuvaAcumulada6h * 0.5) + (precipitacaoAtual * 0.3) + (fatorProximidadeRio * 0.2)
  const normAcumulada = Math.min(accumulatedRain6h * 1.5, 100); 
  const normChuvaMomento = Math.min(currentRain * 10, 100);
  
  // Proximity factor (maximized at 10km)
  const proximityFactor = Math.max(0, 100 - (sensor.distanceToCenter / 100));

  let risk = (normAcumulada * 0.5) + (normChuvaMomento * 0.3) + (proximityFactor * 0.2);

  if (accumulatedRain6h > 70) {
      risk = Math.max(risk, 60);
  } else if (accumulatedRain6h > 40) {
      risk = Math.max(risk, 40);
  }
  
  if (currentRain === 0) {
      risk = risk * 0.8; 
  }

  return Number(Math.min(Math.max(risk, 0), 100).toFixed(0));
};

export const useTerrainStore = create<TerrainState>((set, get) => ({
  location: null,
  latitude: null,
  longitude: null,
  elevationMatrix: null,
  minElevation: 0,
  maxElevation: 0,
  slopeData: null,
  sensors: [],
  globalRisk: 0,
  weatherData: null,
  activeModule: 'flood',
  waterways: [],
  floodSensors: [],
  globalFloodRisk: 0,
  roads: [],

  telemetryInterval: null,
  weatherInterval: null,

  setTerrainData: (data, slopeData) => {
    
    // Auto-generate optimal sensors based on the new terrain matrix
    let newSensors: Sensor[] = [];
    if (data.elevationMatrix) {
       newSensors = generateOptimalSensors(data.elevationMatrix, slopeData, 6);
    }

    set({
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      elevationMatrix: data.elevationMatrix,
      minElevation: data.minElevation,
      maxElevation: data.maxElevation,
      waterways: data.waterways || [],
      floodSensors: data.floodSensors || [],
      roads: data.roads || [],
      sensors: newSensors,
      slopeData
    });

    // We must ensure the sensors length is captured so weather doesn't bounce
    setTimeout(() => {
        get().fetchAndApplyWeather();
    }, 100);
  },

  fetchAndApplyWeather: async () => {
    const { latitude, longitude, sensors } = get();
    if (!latitude || !longitude || sensors.length === 0) return;

    try {
      const resp = await fetch(`http://localhost:3001/api/weather/${latitude}/${longitude}`);
      
      if (!resp.ok) {
         console.warn("Weather API non-JSON response:", await resp.text());
         return;
      }
      
      const weatherData = await resp.json();

      if (weatherData && weatherData.current) {
         set((state) => {
            const upSensors = state.sensors.map(s => {
               // Aplying real current data directly to sensors
               // The API returns windSpeed in km/h or m/s. We map it to the vibration scale (0-100) loosely.
               // e.g., 50km/h wind ~ 50 "vibration"
               let newVibration = weatherData.current.windSpeed;
               if (newVibration > 100) newVibration = 100;

               // Soil moisture is usually 0 to 1 (m3/m3) or percentage. If it's a decimal, multiply by 100.
               let smRaw = weatherData.current.soilMoisture;
               if (smRaw === undefined || smRaw === null) smRaw = 0;
               let newMoisture = smRaw < 1.5 ? smRaw * 100 : smRaw; // safety parse
               if (newMoisture > 100) newMoisture = 100;

               const newRain = weatherData.current.rain || 0;
               const projectedRain = weatherData.accumulatedRain6h || 0;

               const updated = { 
                 ...s, 
                 rainVolume: newRain, 
                 soilMoisture: newMoisture,
                 vibration: newVibration
               };

               updated.localRisk = calcLocalRisk(updated);
               updated.futureRisk = calculateFutureRisk(updated, projectedRain);
               return updated;
            });

            // Calculate Flood updates
            const upFloodSensors = state.floodSensors.map(fs => {
               const projectedRain = weatherData.accumulatedRain6h || 0;
               const currentRain = weatherData.current?.precipitation || 0;
               const floodRisk = calcularRiscoEnchente(fs, currentRain, projectedRain);
               
               // Estimate Level loosely based on rain
               const nivelAdicional = (projectedRain * 0.05) + (currentRain * 0.1);

               return {
                 ...fs,
                 localRisk: floodRisk,
                 nivelAtual: Number((2.0 + nivelAdicional).toFixed(2)) // Base river depth roughly 2.0m + rain
               }
            });

            return { sensors: upSensors, floodSensors: upFloodSensors, weatherData: weatherData };
         });
         get().recalculateGlobalRisk();
      }
    } catch(e) {
      console.error("[FLOOD ERROR] Failed to fetch meteorology. Applying Fallback Mock Data...", e);
      
      const fallbackWeather = {
        accumulatedRain6h: 50,
        current: {
          precipitation: 10,
          windSpeed: 20,
          soilMoisture: 0.8,
          temperature: 22,
          weatherCode: 3
        }
      };

      set((state) => {
          const upSensors = state.sensors.map(s => {
             const updated = { 
               ...s, 
               rainVolume: fallbackWeather.current.precipitation, 
               soilMoisture: 80,
               vibration: 20
             };
             updated.localRisk = calcLocalRisk(updated);
             updated.futureRisk = calculateFutureRisk(updated, fallbackWeather.accumulatedRain6h);
             return updated;
          });

          const upFloodSensors = state.floodSensors.map(fs => {
             const floodRisk = calcularRiscoEnchente(fs, 10, 50);
             return {
               ...fs,
               localRisk: floodRisk,
               nivelAtual: 3.5 // 2.0 base + 1.5 rain
             }
          });

          return { sensors: upSensors, floodSensors: upFloodSensors, weatherData: fallbackWeather };
      });
      get().recalculateGlobalRisk();
    }
  },

  setSensors: (sensors: Sensor[]) => {
    // Limpar intervals antigos se existirem
    const currentTelemetry = get().telemetryInterval;
    const currentWeather = get().weatherInterval;
    if (currentTelemetry) clearInterval(currentTelemetry);
    if (currentWeather) clearInterval(currentWeather);

    set({ sensors });
    get().recalculateGlobalRisk();

    // We now just broadcast telemetry. We don't poll updates from sensors because they are entirely driven by weather polling.
    const newTelemetry = setInterval(() => {
       const currentSensors = get().sensors;
       currentSensors.forEach(sensor => {
          fetch('http://localhost:3001/api/sensor-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sensorId: sensor.id,
              slope: sensor.terrainInclination,
              moisture: sensor.soilMoisture,
              rain: sensor.rainVolume,
              vibration: sensor.vibration,
              risk: sensor.localRisk
            })
          }).catch(err => console.error("Telemetry error:", err));
       });
    }, 15000);

    // Weather Fetch (Immediately and then every 30 minutes)
    get().fetchAndApplyWeather();
    const newWeatherInterval = setInterval(() => {
       get().fetchAndApplyWeather();
    }, 1800000); // 30 minutes

    set({ telemetryInterval: newTelemetry, weatherInterval: newWeatherInterval });
  },

  // Manual update sensors (if UI still allows forcing a change, but typically we rely on real-time polling)
  updateSensor: (id, partial) => {
    set((state) => {
      const updatedSensors = state.sensors.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...partial };
        updated.localRisk = calcLocalRisk(updated);
        // maintain projected risk recalculation (assuming rainVolume is the projected logic variable fallback here)
        updated.futureRisk = calculateFutureRisk(updated, updated.rainVolume);
        return updated;
      });
      return { sensors: updatedSensors };
    });
    get().recalculateGlobalRisk();
  },

  updateAllSensors: (partial) => {
    set((state) => {
      const updatedSensors = state.sensors.map((s) => {
        const updated = { ...s, ...partial };
        updated.localRisk = calcLocalRisk(updated);
        updated.futureRisk = calculateFutureRisk(updated, updated.rainVolume);
        return updated;
      });
      return { sensors: updatedSensors };
    });
    get().recalculateGlobalRisk();
  },

  recalculateGlobalRisk: () => {
    set((state) => {
      if (state.sensors.length === 0) return { globalRisk: 0 };
      const total = state.sensors.reduce((acc, curr) => acc + curr.localRisk, 0);
      return { globalRisk: Math.round(total / state.sensors.length) };
    });
  },

  setActiveModule: (module) => set({ activeModule: module }),

  clearTerrain: () => {
     const tInt = get().telemetryInterval;
     const wInt = get().weatherInterval;
     if (tInt) clearInterval(tInt);
     if (wInt) clearInterval(wInt);
     
     set({ 
       location: null, elevationMatrix: null, slopeData: null, sensors: [], globalRisk: 0, 
       telemetryInterval: null, weatherInterval: null, weatherData: null,
       activeModule: 'landslide', waterways: [], floodSensors: [], globalFloodRisk: 0, roads: []
     });
  },

  applyFallbackTerrain: () => {
     console.warn("[FRONTEND] Using procedural fallback terrain.");
     const fallbackData = {
        location: "Área Procedural (Fallback)",
        latitude: -23.5505,
        longitude: -46.6333,
        elevationMatrix: Array(32).fill(0).map((_, r) => Array(32).fill(0).map((_, c) => 
          Math.sin(r * 0.3) * Math.cos(c * 0.3) * 10 + Math.random() * 2
        )),
        minElevation: 0,
        maxElevation: 12,
        waterways: [],
        floodSensors: [],
        roads: []
     };
     
     const slopeData = { meanSlope: 12, maxSlope: 35, criticalAreas: 5 };
     get().setTerrainData(fallbackData, slopeData);
  }
}));

// Algorithm to place sensors prioritizing steep slopes or highest altitude variations
export function generateOptimalSensors(matrix: number[][], slopeMap: any, maxSensors: number): Sensor[] {
  if (!matrix || matrix.length === 0) return [];

  const rows = matrix.length;
  const cols = matrix[0].length;
  const resolution = 30; // meters

  type Candidate = { r: number; c: number; slope: number; x: number; y: number; z: number, altVar: number };
  const candidates: Candidate[] = [];

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const dzdx = (matrix[r][c + 1] - matrix[r][c]) / resolution;
      const dzdy = (matrix[r + 1][c] - matrix[r][c]) / resolution;
      const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
      
      const altVar = Math.max(
         Math.abs(matrix[r][c + 1] - matrix[r][c]),
         Math.abs(matrix[r + 1][c] - matrix[r][c])
      );

      const xOffset = c - cols / 2;
      const yOffset = r - rows / 2;
      
      candidates.push({ 
         r, c, slope, altVar,
         x: xOffset * (10 / cols), 
         y: -yOffset * (10 / rows), 
         z: matrix[r][c] * 0.05 
      });
    }
  }

  // Identificar pontos com inclinação > 25°
  let criticalCandidates = candidates.filter(c => c.slope > 25);
  
  // Se não houver pontos críticos suficientes (> 25°), recuar para selecionar maiores variações de altitude
  if (criticalCandidates.length < maxSensors) {
     candidates.sort((a, b) => b.altVar - a.altVar);
     criticalCandidates = candidates;
  } else {
     // Ordenar por maior inclinação
     criticalCandidates.sort((a, b) => b.slope - a.slope);
  }

  const selectedSensors: Sensor[] = [];
  
  for (const cand of criticalCandidates) {
     if (selectedSensors.length >= maxSensors) break;
     
     // Garantir distância mínima entre sensores (Ex: 8 grids de distância)
     const minDistance = 8;
     const isTooClose = selectedSensors.some(s => {
        const dist = Math.sqrt(Math.pow(s.gridX - cand.c, 2) + Math.pow(s.gridY - cand.r, 2));
        return dist < minDistance;
     });
     
     if (isTooClose && criticalCandidates.length > maxSensors * 2) continue; // Only skip if we have plenty candidates

     const initSensor: Sensor = {
        id: `IOT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        gridX: cand.c,
        gridY: cand.r,
        position: { x: cand.x, y: cand.y, z: cand.z },
        soilMoisture: 0, 
        terrainInclination: cand.slope,
        rainVolume: 0,
        vibration: 0,
        localRisk: 0,
        futureRisk: 0 // Will auto calculate upon first weather polling
     };
     
     initSensor.localRisk = calcLocalRisk(initSensor);
     selectedSensors.push(initSensor);
  }

  return selectedSensors;
}
