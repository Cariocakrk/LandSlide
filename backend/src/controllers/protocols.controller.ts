import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

function normalizeProtocolRecord(p: any) {
  if (!p) return p;
  if (typeof p.description === 'string' && p.description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(p.description);
      return {
        ...p,
        description: parsed.text || p.description,
        phone: parsed.phone || p.phone || null,
        photo: parsed.photo || p.photo || null,
        location: parsed.location || p.location || null,
        channel: parsed.channel || (p.protocolCode?.includes('WA') ? 'WhatsApp' : 'Central')
      };
    } catch {
      return p;
    }
  }
  return p;
}

export async function getProtocols(req: AuthRequest, res: Response) {
  try {
    const protocols = await prisma.emergencyProtocol.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(protocols.map(normalizeProtocolRecord));
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
      status: 'Em análise',
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
      newAlert.id = dbAlert.id;
    } catch (dbError) {
      console.log('[DB] Banco offline, emitindo alerta apenas via WebSocket em modo Mock.');
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
    
    try {
      const updated = await prisma.emergencyProtocol.update({
        where: { id },
        data: { status }
      });
      const normalized = normalizeProtocolRecord(updated);
      io.emit('protocolUpdate', normalized);
      res.json(normalized);
    } catch {
      // Fallback caso o protocolo tenha sido gerado com ID em memória
      const fallbackUpdated = { id, status, updatedAt: new Date() };
      io.emit('protocolUpdate', fallbackUpdated);
      res.json(fallbackUpdated);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
}

export async function getIncidents(req: AuthRequest, res: Response) {
  try {
    const protocols = await prisma.emergencyProtocol.findMany({
      where: { protocolCode: { contains: 'WA' } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(protocols.map(normalizeProtocolRecord));
  } catch {
    res.json([]);
  }
}

export async function createIncidentReport(req: AuthRequest, res: Response, io: any) {
  try {
    const body = req.body || {};
    const protocolCode = `DEF-WA-${Math.floor(100000 + Math.random() * 900000)}`;
    const phone = body.phone || '+55 (21) 98765-4321';
    const text = body.text || 'Ocorrência de instabilidade geológica reportada por cidadão via WhatsApp.';
    const photo = body.photo || null;
    const location = body.location || 'Setor Encosta sob Monitoramento';
    const riskLevel = typeof body.riskLevel === 'number' ? body.riskLevel : 88;

    let recordId = `inc-${Date.now()}`;
    try {
      const created = await prisma.emergencyProtocol.create({
        data: {
          protocolCode,
          riskLevel,
          description: JSON.stringify({
            text,
            phone,
            photo,
            location,
            channel: 'WhatsApp'
          }),
          status: 'Em análise'
        }
      });
      recordId = created.id;
    } catch {
      console.log('[DB] Banco offline, criando incidente WhatsApp em memória.');
    }

    const newIncident = {
      id: recordId,
      protocolCode,
      phone,
      text,
      description: text,
      photo,
      location,
      riskLevel,
      status: 'Em análise',
      channel: 'WhatsApp',
      createdAt: new Date().toISOString()
    };

    if (io) {
      io.emit('emergencyAlert', newIncident);
    }

    res.json({
      success: true,
      incident: newIncident,
      message: 'Denúncia recebida e encaminhada à mesa de despacho do CICC.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao processar ocorrência.' });
  }
}
