import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { updateActiveSensor } from '../lib/whatsapp';

const prisma = new PrismaClient();

type SensorReading = {
  sensorId: string;
  timestamp: number;
  slope: number;
  moisture: number;
  rain: number;
  vibration: number;
  risk: number;
};

const sensorHistory: Record<string, SensorReading[]> = {};

export async function receiveSensorData(req: AuthRequest, res: Response) {
  try {
    const { sensorId, slope, moisture, rain, vibration, risk } = req.body;

    if (!sensorId) {
      return res.status(400).json({ error: 'sensorId é obrigatório' });
    }

    updateActiveSensor({ sensorId, slope, moisture, rain, vibration, risk });

    const reading: SensorReading = {
      sensorId,
      timestamp: Date.now(),
      slope,
      moisture,
      rain,
      vibration,
      risk
    };

    if (!sensorHistory[sensorId]) {
      sensorHistory[sensorId] = [];
    }

    sensorHistory[sensorId].push(reading);

    if (sensorHistory[sensorId].length > 500) {
      sensorHistory[sensorId].shift();
    }

    try {
      const numericRisk = Math.round(risk || 0);
      let statusColor = "Verde";
      if (numericRisk > 70) {
        statusColor = "Vermelho";
      } else if (numericRisk > 40) {
        statusColor = "Laranja";
      } else if (numericRisk > 15) {
        statusColor = "Amarelo";
      }

      await prisma.sensorData.create({
        data: {
          sensorId, // Added: Save sensorId to DB as well!
          soilMoisture: parseFloat(moisture || 0),
          terrainInclination: parseFloat(slope || 0),
          rainVolume: parseFloat(rain || 0),
          groundVibration: parseFloat(vibration || 0),
          riskLevel: numericRisk,
          statusColor
        }
      });
    } catch (dbError) {
      console.log(`[DB] Banco offline ou ocupado, telemetria registrada apenas em memória local.`);
    }

    res.status(200).json({ success: true, message: 'Telemetria registrada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar telemetria' });
  }
}

export function getSensorHistory(req: AuthRequest, res: Response) {
  try {
    const { sensorId } = req.params;
    if (!sensorId || typeof sensorId !== 'string') {
      return res.status(400).json({ error: 'sensorId inválido.' });
    }
    const history = sensorHistory[sensorId] || [];
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico do sensor' });
  }
}
