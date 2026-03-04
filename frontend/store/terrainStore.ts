import { create } from 'zustand';

export type Sensor = {
  id: string;
  position: { x: number; y: number; z: number };
  gridX: number;
  gridY: number;
  soilMoisture: number;     // 0-100%
  terrainInclination: number; // degrees
  rainVolume: number;       // mm
  vibration: number;        // Richter mm/s
  localRisk: number;        // 0-100 severity
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

  setTerrainData: (data: any, slopeData: any) => void;
  setSensors: (sensors: Sensor[]) => void;
  updateSensor: (id: string, partial: Partial<Sensor>) => void;
  updateAllSensors: (partial: Partial<Sensor>) => void;
  recalculateGlobalRisk: () => void;
  clearTerrain: () => void;
};

// Calculate individual risk identical to the Backend logic
const calcLocalRisk = (sensor: Sensor) => {
  let risk = 0;
  risk += (sensor.soilMoisture / 100) * 35;
  risk += Math.min(sensor.terrainInclination / 45, 1) * 30; // 45deg is max weight
  risk += Math.min(sensor.rainVolume / 100, 1) * 20; // 100mm is max weight
  risk += Math.min(sensor.vibration / 10, 1) * 15; // 10 mm/s is max weight
  return Math.min(Math.round(risk), 100);
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

  setTerrainData: (data, slopeData) => {
    set({
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      elevationMatrix: data.elevationMatrix,
      minElevation: data.minElevation,
      maxElevation: data.maxElevation,
      slopeData,
    });
  },

  setSensors: (sensors: Sensor[]) => {
    set({ sensors });
    get().recalculateGlobalRisk();
  },

  updateSensor: (id, partial) => {
    set((state) => {
      const updatedSensors = state.sensors.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...partial };
        updated.localRisk = calcLocalRisk(updated);
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

  clearTerrain: () => set({ 
    location: null, elevationMatrix: null, slopeData: null, sensors: [], globalRisk: 0 
  })
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
        soilMoisture: 40 + Math.random() * 20, // valor inicial padrão
        terrainInclination: cand.slope,
        rainVolume: 0,
        vibration: 0,
        localRisk: 0 
     };
     
     initSensor.localRisk = calcLocalRisk(initSensor);
     selectedSensors.push(initSensor);
  }

  return selectedSensors;
}
