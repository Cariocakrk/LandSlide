import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export async function getProtocols(req: AuthRequest, res: Response) {
  try {
    const protocols = await prisma.emergencyProtocol.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(protocols);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
}

export async function createMockProtocol(req: AuthRequest, res: Response, io: any) {
  try {
    const protocolCode = `DEF-MANUAL-${Math.floor(Math.random() * 1000)}`;
    
    const newAlert = {
       id: '',
       protocolCode,
       riskLevel: 99,
       description: `Alerta manual de emergência disparado pelo operador da Defesa Civil.`,
       status: "Em análise",
       createdAt: new Date()
    };
    
    try {
      const dbAlert = await prisma.emergencyProtocol.create({
        data: {
          protocolCode: newAlert.protocolCode,
          riskLevel: newAlert.riskLevel,
          description: newAlert.description,
          status: newAlert.status
        }
      });
      newAlert.id = dbAlert.id; // Corrected: Use actual DB UUID
    } catch (dbError) {
      console.log("[DB] Banco offline, emitindo alerta apenas via WebSocket em modo Mock.");
      newAlert.id = `temp-${Date.now()}`;
    }
    
    io.emit('emergencyAlert', newAlert);
    res.json(newAlert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar chamado manual' });
  }
}

export async function updateProtocolStatus(req: AuthRequest, res: Response, io: any) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do protocolo inválido.' });
    }
    
    const updated = await prisma.emergencyProtocol.update({
      where: { id },
      data: { status }
    });
    
    io.emit('protocolUpdate', updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
}
