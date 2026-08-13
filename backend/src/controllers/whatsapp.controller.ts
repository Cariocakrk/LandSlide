import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getWhatsAppStatus, disconnectWhatsApp } from '../lib/whatsapp';

export function getStatus(req: AuthRequest, res: Response) {
  res.json(getWhatsAppStatus());
}

export async function disconnect(req: AuthRequest, res: Response) {
  try {
    await disconnectWhatsApp();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desconectar o WhatsApp' });
  }
}
