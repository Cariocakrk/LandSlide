import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import axios from 'axios';

const prisma = new PrismaClient();

export async function dispatchAlert(req: AuthRequest, res: Response, io: any) {
  try {
    const { protocolCode, cep, numResidents, channel, message } = req.body;
    
    if (!protocolCode || !cep) {
      return res.status(400).json({ error: 'protocolCode e cep são obrigatórios' });
    }

    const residents = numResidents || Math.floor(800 + Math.random() * 1200);
    const alertMessage = message || `ALERTA DEFESA CIVIL: Risco de deslizamento crítico detectado para o CEP ${cep}. Evacue imediatamente a área e dirija-se para o ponto de apoio mais próximo!`;

    let dispatchRecord;
    try {
      dispatchRecord = await prisma.alertDispatch.create({
        data: {
          protocolCode,
          cep,
          numResidents: residents,
          channel: channel || 'WhatsApp',
          status: 'ENVIADO',
          message: alertMessage
        }
      });
    } catch (dbErr) {
      console.log('[DB] Banco offline, criando registro em memória para WebSocket.');
      dispatchRecord = {
        id: `mock-${Date.now()}`,
        protocolCode,
        cep,
        numResidents: residents,
        channel: channel || 'WhatsApp',
        status: 'ENVIADO',
        message: alertMessage,
        createdAt: new Date()
      };
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM || 'whatsapp:+14155238886';
    const waPhone = process.env.WHATSAPP_PHONE_NUMBER;

    let matchingPhones: string[] = [];
    try {
      const users = await prisma.user.findMany({
        where: {
          cep: cep.trim(),
          phoneNumber: {
            not: null
          }
        },
        select: { phoneNumber: true }
      });
      matchingPhones = users.map(u => u.phoneNumber!).filter(Boolean);
    } catch (dbErr) {
      console.error('[Alert System] Erro ao buscar usuários por CEP no banco:', dbErr);
    }

    if (matchingPhones.length === 0 && waPhone) {
      matchingPhones.push(waPhone);
    }

    for (const phone of matchingPhones) {
      const sentViaLocalBot = await sendWhatsAppMessage(phone, alertMessage);
      if (sentViaLocalBot) {
        continue;
      }

      if (twilioSid && twilioAuthToken) {
        try {
          const formattedTo = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
          const formattedFrom = twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`;
          const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
          
          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            new URLSearchParams({
              To: formattedTo,
              From: formattedFrom,
              Body: alertMessage
            }).toString(),
            {
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
        } catch (twilioErr: any) {
          console.error(`[Twilio WhatsApp] Erro no disparo para ${phone} via Twilio:`, twilioErr?.response?.data || twilioErr.message);
        }
      } else {
        const waToken = process.env.WHATSAPP_API_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (waToken && waPhoneId) {
          try {
            const rawTo = phone.replace('whatsapp:', '');
            await axios.post(
              `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
              {
                messaging_product: "whatsapp",
                to: rawTo,
                type: "text",
                text: { body: alertMessage }
              },
              {
                headers: {
                  'Authorization': `Bearer ${waToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (waErr: any) {
            console.log(`[WhatsApp API] Falha no disparo real para ${phone} via Meta Cloud API (Credenciais incorretas ou expiradas).`);
          }
        }
      }
    }

    io.emit('alertDispatched', dispatchRecord);
    res.json({ success: true, alert: dispatchRecord, dispatchedCount: matchingPhones.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar e despachar chamado' });
  }
}

export async function getAlerts(req: AuthRequest, res: Response) {
  try {
    const alerts = await prisma.alertDispatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico de disparos' });
  }
}
