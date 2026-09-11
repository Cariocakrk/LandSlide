import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'DISCONNECTED',
    connected: false,
    ready: false,
    activeCep: '25680-195',
    qr: null,
    qrCode: null,
    number: null,
    message: 'Serviço WhatsApp Web em modo de espera.'
  });
}
