import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { calculateSlope, SlopeAnalysisResult } from '@/lib/slopeCalculation';

export type GeotechnicalStation = {
  id: string;
  position: { x: number; y: number; z: number };
  gridX: number;
  gridY: number;
  altitude: number;             // Altitude real da cota DEM (m)
  soilMoisture: number;         // Saturação do solo (0-100%)
  terrainInclination: number;   // Declividade em graus (0-90°)
  rainVolume: number;           // Chuva acumulada 72h (mm)
  vibration: number;            // Microssismicidade / rastejo (mm/s)
  safetyFactor: number;         // Fator de Segurança pontual (FS)
  localRisk: number;            // Índice de risco (0-100%)
  futureRisk: number;           // Projeção com previsão 24h
  riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4';
};

// Aliás para compatibilidade
export type Sensor = GeotechnicalStation;

export interface TerrainData {
  location: string;
  latitude: number;
  longitude: number;
  elevationMatrix: number[][];
  minElevation: number;
  maxElevation: number;
  reliefAmplitude?: number;
}

export type SlopeData = SlopeAnalysisResult;

type TerrainState = {
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  elevationMatrix: number[][] | null;
  minElevation: number;
  maxElevation: number;
  reliefAmplitude: number;
  slopeData: SlopeData | null;
  sensors: GeotechnicalStation[];
  globalRisk: number;
  safetyFactor: number;
  riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4';
  riskClassification: string;
  cemadenThreshold: string;
  geomorphology: string;
  diagnosis: string;
  sensorsEnabled: boolean;

  // Variáveis meteorológicas reais
  rainVolume: number;           // Chuva acumulada 72h
  accumulatedRain24h: number;
  currentRainIntensity: number;
  forecastRain24h: number;
  humidity: number;
  soilSaturationPercent: number;

  telemetryInterval: NodeJS.Timeout | null;
  weatherInterval: NodeJS.Timeout | null;

  setTerrainData: (data: TerrainData, slopeData: SlopeData) => void;
  setSensors: (sensors: GeotechnicalStation[]) => void;
  setSensorsEnabled: (enabled: boolean) => void;
  updateSensor: (id: string, partial: Partial<GeotechnicalStation>) => void;
  updateAllSensors: (partial: Partial<GeotechnicalStation>) => void;
  recalculateGlobalRisk: () => void;
  clearTerrain: () => void;
  restoreNormalConditions: () => void;
  fetchAndApplyWeather: () => Promise<void>;
};

// Função geotécnica pura para cálculo de estabilidade de talude infinito com Mohr-Coulomb
export function calcGeotechnicalStationRisk(station: {
  terrainInclination: number;
  rainVolume: number;
  soilMoisture: number;
  vibration?: number;
}) {
  const beta = Math.max(0, Math.min(85, station.terrainInclination));
  const rain72h = station.rainVolume;
  const moist = station.soilMoisture;
  const vib = station.vibration || 0;

  if (beta <= 2.0) {
    return {
      safetyFactor: 99,
      localRisk: 0,
      riskLevelCode: 'R1' as const,
      classification: 'Baixo (Plano)'
    };
  }

  const mRain = Math.min(1.0, rain72h / 120);
  const mMoist = Math.min(1.0, moist / 100);
  const m = Math.min(1.0, mRain * 0.6 + mMoist * 0.4);

  const betaRad = (beta * Math.PI) / 180;
  const phiRad = (30 * Math.PI) / 180;
  const z = 2.0;
  const gammaSat = 18.5;
  const gammaW = 9.81;
  const effectiveCohesion = 6 + 14 * (1 - m); // perda de sucção

  const cosB = Math.cos(betaRad);
  const sinB = Math.sin(betaRad);
  let tauD = gammaSat * z * sinB * cosB;
  if (vib > 0) {
    const kh = Math.min(0.25, (vib / 100) * 0.15);
    tauD += kh * gammaSat * z * (cosB * cosB);
  }

  const sigmaPrime = Math.max(0, (gammaSat - m * gammaW) * z * (cosB * cosB));
  const tauR = effectiveCohesion + sigmaPrime * Math.tan(phiRad);
  const safetyFactor = Number((Math.max(0.05, tauR / Math.max(0.01, tauD))).toFixed(2));

  let localRisk = 0;
  let riskLevelCode: 'R1' | 'R2' | 'R3' | 'R4' = 'R1';
  let classification = 'Baixo';

  if (safetyFactor <= 1.0 || (rain72h >= 100 && beta >= 25)) {
    riskLevelCode = 'R4';
    classification = 'Muito Alto / Emergência';
    localRisk = Math.min(100, Math.round(85 + (1.0 - Math.min(1.0, safetyFactor)) * 15));
  } else if (safetyFactor < 1.3 || (rain72h >= 70 && beta >= 25)) {
    riskLevelCode = 'R3';
    classification = 'Alto / Alerta';
    localRisk = Math.max(66, Math.min(84, 66 + Math.round(((1.3 - safetyFactor) / 0.3) * 19)));
  } else if (safetyFactor < 1.5 || (rain72h >= 40 && beta >= 15)) {
    riskLevelCode = 'R2';
    classification = 'Médio / Atenção';
    localRisk = Math.max(36, Math.min(65, 36 + Math.round(((1.5 - safetyFactor) / 0.2) * 29)));
  } else {
    riskLevelCode = 'R1';
    classification = 'Baixo';
    localRisk = Math.min(35, Math.max(0, Math.round((beta / 25) * 20 + m * 15)));
  }

  return { safetyFactor, localRisk, riskLevelCode, classification };
}

export const useTerrainStore = create<TerrainState>((set, get) => ({
  location: null,
  latitude: null,
  longitude: null,
  elevationMatrix: null,
  minElevation: 0,
  maxElevation: 0,
  reliefAmplitude: 0,
  slopeData: null,
  sensors: [],
  globalRisk: 0,
  safetyFactor: 99,
  riskLevelCode: 'R1',
  riskClassification: 'Baixo',
  cemadenThreshold: 'Normal / Observação',
  geomorphology: 'Não analisada',
  diagnosis: 'Aguardando seleção de localidade ou CEP.',
  sensorsEnabled: true,

  rainVolume: 0,
  accumulatedRain24h: 0,
  currentRainIntensity: 0,
  forecastRain24h: 0,
  humidity: 0,
  soilSaturationPercent: 40,

  telemetryInterval: null,
  weatherInterval: null,

  setTerrainData: (data: TerrainData, slopeData: SlopeData) => {
    set({
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      elevationMatrix: data.elevationMatrix,
      minElevation: data.minElevation,
      maxElevation: data.maxElevation,
      reliefAmplitude: data.reliefAmplitude || (data.maxElevation - data.minElevation),
      slopeData,
      geomorphology: slopeData.geomorphology || 'Relevo em Análise'
    });
    get().recalculateGlobalRisk();
  },

  fetchAndApplyWeather: async () => {
    const { latitude, longitude } = get();
    if (!latitude || !longitude) return;

    try {
      const resp = await apiFetch(`/api/weather/${latitude}/${longitude}`);
      const weather = await resp.json();

      if (weather && weather.accumulatedRain72h !== undefined) {
        const rain72h = weather.accumulatedRain72h;
        const rain24h = weather.accumulatedRain24h || 0;
        const rain1h = weather.currentRainIntensity || 0;
        const forecast24h = weather.forecastRain24h || 0;
        const saturation = weather.soilSaturationPercent || 40;
        const humidity = weather.avgHumidity6h || 60;
        const cemaden = weather.cemadenThreshold || 'Normal';

        set({
          rainVolume: rain72h,
          accumulatedRain24h: rain24h,
          currentRainIntensity: rain1h,
          forecastRain24h: forecast24h,
          soilSaturationPercent: saturation,
          humidity,
          cemadenThreshold: cemaden
        });

        // Atualizar estações virtuais com telemetria hidrometeorológica real
        set((state) => {
          const updatedSensors = state.sensors.map((s) => {
            const updated = {
              ...s,
              rainVolume: rain72h,
              soilMoisture: saturation
            };
            const geo = calcGeotechnicalStationRisk(updated);
            
            // Projeção futura com previsão 24h
            const futureRain = rain72h + forecast24h;
            const geoFuture = calcGeotechnicalStationRisk({
              ...updated,
              rainVolume: futureRain,
              soilMoisture: Math.min(100, saturation + forecast24h * 0.4)
            });

            return {
              ...updated,
              safetyFactor: geo.safetyFactor,
              localRisk: geo.localRisk,
              riskLevelCode: geo.riskLevelCode,
              futureRisk: Math.max(geo.localRisk, geoFuture.localRisk)
            };
          });
          return { sensors: updatedSensors };
        });

        get().recalculateGlobalRisk();
      }
    } catch (err) {
      console.error('[TerrainStore] Erro ao obter telemetria climática real:', err);
    }
  },

  setSensors: (sensors: GeotechnicalStation[]) => {
    const currentTelemetry = get().telemetryInterval;
    const currentWeather = get().weatherInterval;
    if (currentTelemetry) clearInterval(currentTelemetry);
    if (currentWeather) clearInterval(currentWeather);

    if (!get().sensorsEnabled) {
      set({ sensors: [] });
      get().recalculateGlobalRisk();
      return;
    }

    set({ sensors });
    get().recalculateGlobalRisk();

    // Sincronização periódica com backend (a cada 30s para telemetria leve)
    const newTelemetry = setInterval(() => {
      const currentSensors = get().sensors;
      currentSensors.forEach((sensor) => {
        apiFetch('/api/sensor-data', {
          method: 'POST',
          body: JSON.stringify({
            sensorId: sensor.id,
            slope: sensor.terrainInclination,
            moisture: sensor.soilMoisture,
            rain: sensor.rainVolume,
            vibration: sensor.vibration,
            risk: sensor.localRisk
          })
        }).catch(() => {});
      });
    }, 15000);

    // Consulta meteorológica real (imediatamente e a cada 15 minutos)
    get().fetchAndApplyWeather();
    const newWeatherInterval = setInterval(() => {
      get().fetchAndApplyWeather();
    }, 900000);

    set({ telemetryInterval: newTelemetry, weatherInterval: newWeatherInterval });
  },

  setSensorsEnabled: (enabled: boolean) => {
    set({ sensorsEnabled: enabled });
    if (enabled) {
      const matrix = get().elevationMatrix;
      if (matrix) {
        const optimalSensors = generateOptimalSensors(matrix, 5);
        get().setSensors(optimalSensors);
      }
    } else {
      const currentTelemetry = get().telemetryInterval;
      const currentWeather = get().weatherInterval;
      if (currentTelemetry) clearInterval(currentTelemetry);
      if (currentWeather) clearInterval(currentWeather);

      set({
        sensors: [],
        telemetryInterval: null,
        weatherInterval: null
      });
      get().recalculateGlobalRisk();
      get().fetchAndApplyWeather();
    }
  },

  updateSensor: (id, partial) => {
    set((state) => {
      const updatedSensors = state.sensors.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...partial };
        const geo = calcGeotechnicalStationRisk(updated);
        return {
          ...updated,
          safetyFactor: geo.safetyFactor,
          localRisk: geo.localRisk,
          riskLevelCode: geo.riskLevelCode
        };
      });
      return { sensors: updatedSensors };
    });
    get().recalculateGlobalRisk();
  },

  updateAllSensors: (partial) => {
    set((state) => {
      const updatedSensors = state.sensors.map((s) => {
        const updated = { ...s, ...partial };
        const geo = calcGeotechnicalStationRisk(updated);
        return {
          ...updated,
          safetyFactor: geo.safetyFactor,
          localRisk: geo.localRisk,
          riskLevelCode: geo.riskLevelCode
        };
      });
      return { sensors: updatedSensors };
    });
    get().recalculateGlobalRisk();
  },

  recalculateGlobalRisk: () => {
    set((state) => {
      let finalRisk = 0;
      let minFS = 99;
      let worstCode: 'R1' | 'R2' | 'R3' | 'R4' = 'R1';
      let classification = 'Baixo';
      let diag = '';

      if (state.sensorsEnabled && state.sensors.length > 0) {
        const total = state.sensors.reduce((acc, curr) => acc + curr.localRisk, 0);
        finalRisk = Math.round(total / state.sensors.length);
        minFS = Math.min(...state.sensors.map((s) => s.safetyFactor));

        if (state.sensors.some((s) => s.riskLevelCode === 'R4')) worstCode = 'R4';
        else if (state.sensors.some((s) => s.riskLevelCode === 'R3')) worstCode = 'R3';
        else if (state.sensors.some((s) => s.riskLevelCode === 'R2')) worstCode = 'R2';
      } else {
        // Cálculo direto sobre a malha topográfica real e chuva do local
        const slopeVal = state.slopeData?.meanSlope || 0;
        const maxSlope = state.slopeData?.maxSlope || 0;
        const criticalSlope = Math.max(slopeVal, maxSlope * 0.7);

        const geo = calcGeotechnicalStationRisk({
          terrainInclination: criticalSlope,
          rainVolume: state.rainVolume,
          soilMoisture: state.soilSaturationPercent
        });

        finalRisk = geo.localRisk;
        minFS = geo.safetyFactor;
        worstCode = geo.riskLevelCode;
        classification = geo.classification;
      }

      if (worstCode === 'R4') {
        classification = 'Muito Alto / Emergência';
        diag = `Alerta Vermelho Máximo (R4). Fator de Segurança crítico (FS = ${minFS} <= 1.00) ou sobrecarga hidrodinâmica extrema em encosta íngreme. Risco iminente de escorregamento translacional.`;
      } else if (worstCode === 'R3') {
        classification = 'Alto / Alerta';
        diag = `Estado de Alerta (R3). Fator de Segurança reduzido (FS = ${minFS} < 1.30). Saturação elevada e chuva acumulada expressiva (${Math.round(state.rainVolume)}mm/72h).`;
      } else if (worstCode === 'R2') {
        classification = 'Médio / Atenção';
        diag = `Estado de Atenção (R2). Estabilidade moderada (FS = ${minFS}). Infiltração ativa e monitoramento contínuo das encostas recomendado.`;
      } else {
        classification = 'Baixo / Estável';
        diag = `Condição Estável (R1). Fator de Segurança adequado (FS = ${minFS >= 99 ? 'Estável' : minFS}). Ausência de poropressão crítica.`;
      }

      return {
        globalRisk: finalRisk,
        safetyFactor: minFS,
        riskLevelCode: worstCode,
        riskClassification: classification,
        diagnosis: diag
      };
    });
  },

  clearTerrain: () => {
    const tInt = get().telemetryInterval;
    const wInt = get().weatherInterval;
    if (tInt) clearInterval(tInt);
    if (wInt) clearInterval(wInt);

    set({
      location: null,
      elevationMatrix: null,
      slopeData: null,
      sensors: [],
      globalRisk: 0,
      safetyFactor: 99,
      riskLevelCode: 'R1',
      riskClassification: 'Baixo',
      geomorphology: 'Não analisada',
      diagnosis: 'Aguardando seleção de localidade.',
      telemetryInterval: null,
      weatherInterval: null,
      rainVolume: 0,
      accumulatedRain24h: 0,
      currentRainIntensity: 0,
      forecastRain24h: 0,
      humidity: 0,
      soilSaturationPercent: 40
    });
  },

  restoreNormalConditions: () => {
    // Esvaziamento hidrológico progressivo simulando drenagem natural do manto
    const drainInterval = setInterval(() => {
      let done = true;
      set((state) => {
        const updatedSensors = state.sensors.map((s) => {
          let newMoist = s.soilMoisture;
          let newRain = s.rainVolume;
          let newVib = s.vibration;

          if (s.soilMoisture > 35) {
            newMoist = Math.max(35, s.soilMoisture - 2.0);
            done = false;
          }
          if (s.rainVolume > 0) {
            newRain = Math.max(0, s.rainVolume - 3.0);
            done = false;
          }
          if (s.vibration > 0) {
            newVib = Math.max(0, s.vibration - 1.0);
            done = false;
          }

          const updated = {
            ...s,
            soilMoisture: newMoist,
            rainVolume: newRain,
            vibration: newVib
          };
          const geo = calcGeotechnicalStationRisk(updated);
          return {
            ...updated,
            safetyFactor: geo.safetyFactor,
            localRisk: geo.localRisk,
            riskLevelCode: geo.riskLevelCode
          };
        });

        return {
          sensors: updatedSensors,
          rainVolume: Math.max(0, state.rainVolume - 3.0),
          soilSaturationPercent: Math.max(35, state.soilSaturationPercent - 2.0)
        };
      });

      get().recalculateGlobalRisk();

      if (done) {
        clearInterval(drainInterval);
      }
    }, 2000);
  }
}));

/**
 * Posicionador automático de Estações Geotécnicas Virtuais
 * Distribui as estações com base nos pontos de maior declividade e rupturas de relevo
 */
export function generateOptimalSensors(matrix: number[][], maxSensors: number): GeotechnicalStation[] {
  if (!matrix || matrix.length === 0) return [];

  const rows = matrix.length;
  const cols = matrix[0].length;
  const resolution = 38; // metros

  type Candidate = {
    r: number;
    c: number;
    slope: number;
    altitude: number;
    x: number;
    y: number;
    z: number;
  };
  const candidates: Candidate[] = [];

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const dzdx = (matrix[r][c + 1] - matrix[r][c - 1]) / (2 * resolution);
      const dzdy = (matrix[r + 1][c] - matrix[r - 1][c]) / (2 * resolution);
      const slope = Number((Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI)).toFixed(1));

      const xOffset = c - cols / 2;
      const yOffset = r - rows / 2;

      candidates.push({
        r,
        c,
        slope,
        altitude: matrix[r][c],
        x: xOffset * (10 / cols),
        y: -yOffset * (10 / rows),
        z: matrix[r][c] * 0.05
      });
    }
  }

  // Ordenar prioritariamente por maior declividade
  candidates.sort((a, b) => b.slope - a.slope);

  const selectedSensors: GeotechnicalStation[] = [];
  const minDistance = Math.floor(cols / 5);

  for (const cand of candidates) {
    if (selectedSensors.length >= maxSensors) break;

    const isTooClose = selectedSensors.some((s) => {
      const dist = Math.sqrt(Math.pow(s.gridX - cand.c, 2) + Math.pow(s.gridY - cand.r, 2));
      return dist < minDistance;
    });

    if (isTooClose && candidates.length > maxSensors * 3) continue;

    const stationRisk = calcGeotechnicalStationRisk({
      terrainInclination: cand.slope,
      rainVolume: 0,
      soilMoisture: 40
    });

    const station: GeotechnicalStation = {
      id: `EST-GEO-${cand.r}x${cand.c}`,
      gridX: cand.c,
      gridY: cand.r,
      altitude: cand.altitude,
      position: { x: cand.x, y: cand.y, z: cand.z },
      soilMoisture: 40,
      terrainInclination: cand.slope,
      rainVolume: 0,
      vibration: 0,
      safetyFactor: stationRisk.safetyFactor,
      localRisk: stationRisk.localRisk,
      futureRisk: stationRisk.localRisk,
      riskLevelCode: stationRisk.riskLevelCode
    };

    selectedSensors.push(station);
  }

  return selectedSensors;
}
