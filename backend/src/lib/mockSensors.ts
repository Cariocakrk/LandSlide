import { Server } from 'socket.io';
import { calculateRisk } from './riskAlgorithm';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type SimulationMode = 'normal' | 'heavy_rain' | 'saturated_soil' | 'intense_vibration' | 'critical_risk';

let currentMode: SimulationMode = 'normal';
let tickCount = 0;

// Valores físicos basais para estações geotécnicas virtuais
let soilMoisture = 32;       // Saturação do solo (0-100%)
let terrainInclination = 14;  // Declividade em graus (0-90°)
let rainVolume = 8;          // Chuva acumulada 72h (mm)
let groundVibration = 0;     // Vibração / microssismicidade de rastejo (mm/s)

export function setSimulationMode(mode: SimulationMode) {
  currentMode = mode;
  console.log(`[Geotechnical Monitor] Mode updated to: ${mode}`);
}

export function startSensorSimulation(io: Server) {
  setInterval(() => {
    // Ruído gaussiano sutil para oscilação natural de medições ambientais
    const noise = () => (Math.random() * 2) - 1;

    switch (currentMode) {
      case 'normal':
        // Modelo de Drenagem e Secagem Gradual do Solo:
        if (soilMoisture > 35) {
          soilMoisture = Math.max(30, soilMoisture - (1.0 + Math.random() * 0.8));
        } else {
          soilMoisture = Math.max(20, Math.min(40, soilMoisture + noise()));
        }
        
        terrainInclination = Math.max(8, Math.min(18, terrainInclination + noise() * 0.2));

        if (rainVolume > 10) {
          rainVolume = Math.max(0, rainVolume - (2.0 + Math.random() * 1.5));
        } else {
          rainVolume = Math.max(0, Math.min(15, rainVolume + noise() * 0.5));
        }

        groundVibration = Math.max(0, Math.min(3, groundVibration + noise() * 0.2));
        break;

      case 'heavy_rain':
        // Chuva forte contínua (alcançando limiar de atenção 70mm do CEMADEN)
        rainVolume = Math.min(85, rainVolume + 3 + noise());
        soilMoisture = Math.min(78, soilMoisture + 1.5 + noise());
        terrainInclination = Math.max(26, Math.min(32, terrainInclination + noise() * 0.3));
        groundVibration = Math.max(0, Math.min(12, groundVibration + noise()));
        break;

      case 'saturated_soil':
        // Solo próximo da capacidade de campo com elevação do lençol freático
        soilMoisture = Math.min(95, soilMoisture + 2.5 + noise());
        rainVolume = Math.min(110, rainVolume + 2 + noise());
        terrainInclination = Math.max(30, Math.min(36, terrainInclination + noise() * 0.3));
        break;

      case 'intense_vibration':
        // Movimentação de massa em rastejo lento (soil creep) detectado por sensores sísmicos
        groundVibration = Math.min(65, groundVibration + 4 + Math.random() * 3);
        terrainInclination = Math.max(32, Math.min(42, terrainInclination + noise() * 0.4));
        soilMoisture = Math.min(88, soilMoisture + 1);
        rainVolume = Math.min(95, rainVolume + 1);
        break;

      case 'critical_risk':
        // Cenário Histórico Crítico (Petrópolis 2022 / São Sebastião 2023: > 150mm em talude íngreme)
        soilMoisture = Math.min(100, soilMoisture + 4);
        terrainInclination = Math.max(35, Math.min(48, terrainInclination + 0.5));
        rainVolume = Math.min(180, rainVolume + 6);
        groundVibration = Math.min(75, groundVibration + 4);
        break;
    }

    const geoResult = calculateRisk(
      soilMoisture,
      terrainInclination,
      rainVolume,
      groundVibration
    );

    const payload = {
      soilMoisture: Math.round(soilMoisture),
      terrainInclination: Number(terrainInclination.toFixed(1)),
      rainVolume: Math.round(rainVolume),
      groundVibration: Number(groundVibration.toFixed(1)),
      risk: geoResult.risk,
      statusColor: geoResult.statusColor,
      safetyFactor: geoResult.safetyFactor ?? 1.5,
      riskLevelCode: geoResult.riskLevelCode ?? 'R1',
      classification: geoResult.classification ?? 'Baixo',
      diagnosis: geoResult.diagnosis ?? '',
      timestamp: new Date().toISOString()
    };

    io.emit('sensorData', payload);

    // Persiste periodicamente no MySQL (a cada 30 segundos ou em caso de alerta não normal)
    tickCount++;
    if (tickCount % 15 === 0 || currentMode !== 'normal') {
      prisma.sensorData.create({
        data: {
          sensorId: 'EST-GEO-PRINCIPAL',
          soilMoisture: payload.soilMoisture,
          terrainInclination: payload.terrainInclination,
          rainVolume: payload.rainVolume,
          groundVibration: payload.groundVibration,
          riskLevel: payload.risk,
          statusColor: payload.statusColor
        }
      }).catch(() => {});
    }
  }, 2000);
}
