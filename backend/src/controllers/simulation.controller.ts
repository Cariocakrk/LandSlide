import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { setSimulationMode, SimulationMode } from '../lib/mockSensors';

const prisma = new PrismaClient();

export async function changeSimulationMode(req: AuthRequest, res: Response, io: any) {
  const { mode } = req.body;
  if (!['normal', 'heavy_rain', 'saturated_soil', 'intense_vibration', 'critical_risk'].includes(mode)) {
    return res.status(400).json({ error: 'Modo inválido' });
  }
  setSimulationMode(mode as SimulationMode);
  
  // Create an alert event when changed from normal
  if (mode !== 'normal') {
    const protocolCode = `DEF-${Math.floor(Math.random() * 1000000)}`;
    
    const tempAlert = {
      id: '',
      protocolCode,
      riskLevel: mode === 'critical_risk' ? 90 : 70, // Dummy based on mode
      description: `Simulação de ${mode} acionada automaticamente.`,
      status: "Em análise",
      createdAt: new Date()
    };
    
    try {
      const created = await prisma.emergencyProtocol.create({
        data: {
          protocolCode: tempAlert.protocolCode,
          riskLevel: tempAlert.riskLevel,
          description: tempAlert.description,
          status: tempAlert.status
        }
      });
      tempAlert.id = created.id; // Corrected: Use actual DB UUID
    } catch (dbError) {
      console.log(`[DB] Banco offline, simulação ${mode} emitindo alerta WebSocket limpo.`);
      tempAlert.id = `sim-${Date.now()}`;
    }

    io.emit('emergencyAlert', tempAlert);
  }

  res.json({ success: true, mode });
}
