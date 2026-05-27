import { Server } from 'socket.io';
import { calculateRisk } from './riskAlgorithm';

export type SimulationMode = 'normal' | 'heavy_rain' | 'saturated_soil' | 'intense_vibration' | 'critical_risk';

let currentMode: SimulationMode = 'normal';

// Base values
let soilMoisture = 30; // 0-100
let terrainInclination = 10; // 0-100
let rainVolume = 5; // 0-100
let groundVibration = 2; // 0-100

export function setSimulationMode(mode: SimulationMode) {
  currentMode = mode;
  console.log(`[Simulator] Mode changed to: ${mode}`);
}

export function startSensorSimulation(io: Server) {
  setInterval(() => {
    // Add random noise
    const noise = () => (Math.random() * 4) - 2;

    switch (currentMode) {
      case 'normal':
        // Modelo de Inércia de Secagem (Evapotranspiração e Drenagem):
        // Se a terra estiver saturada, ela escoa gradualmente (cai de 1% a 2.5% por intervalo de 2s)
        if (soilMoisture > 40) {
          soilMoisture = Math.max(40, soilMoisture - (1.2 + Math.random() * 1.0));
        } else {
          soilMoisture = Math.max(10, Math.min(40, soilMoisture + noise()));
        }
        terrainInclination = Math.max(5, Math.min(15, terrainInclination + noise()));
        // A chuva acumulada também escoa/para de forma realista
        if (rainVolume > 5) {
          rainVolume = Math.max(0, rainVolume - (2.5 + Math.random() * 2.0));
        } else {
          rainVolume = Math.max(0, Math.min(20, rainVolume + noise()));
        }
        groundVibration = Math.max(0, Math.min(10, groundVibration + noise()));
        break;
      case 'heavy_rain':
        rainVolume = Math.min(100, rainVolume + 5 + noise());
        soilMoisture = Math.min(80, soilMoisture + 2 + noise());
        groundVibration = Math.max(0, Math.min(30, groundVibration + noise()));
        break;
      case 'saturated_soil':
        soilMoisture = Math.min(100, soilMoisture + 5 + noise());
        terrainInclination = Math.min(40, terrainInclination + 1 + noise());
        break;
      case 'intense_vibration':
        groundVibration = Math.min(100, groundVibration + 10 + Math.random() * 10);
        terrainInclination = Math.min(60, terrainInclination + 2 + noise());
        break;
      case 'critical_risk':
        soilMoisture = Math.min(100, soilMoisture + 5);
        terrainInclination = Math.min(100, terrainInclination + 5);
        rainVolume = Math.min(100, rainVolume + 5);
        groundVibration = Math.min(100, groundVibration + 5);
        break;
    }

    const { risk, statusColor } = calculateRisk(
      soilMoisture,
      terrainInclination,
      rainVolume,
      groundVibration
    );

    const payload = {
      soilMoisture: Math.round(soilMoisture),
      terrainInclination: Math.round(terrainInclination),
      rainVolume: Math.round(rainVolume),
      groundVibration: Math.round(groundVibration),
      risk,
      statusColor,
      timestamp: new Date().toISOString()
    };

    io.emit('sensorData', payload);
  }, 2000); // Emits every 2 seconds
}
