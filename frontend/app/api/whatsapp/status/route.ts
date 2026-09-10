import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    connected: false,
    ready: false,
    activeCep: '25680-195',
    qrCode: null,
    message: 'Serviço WhatsApp Web em modo de espera.'
  });
}
