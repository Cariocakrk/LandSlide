import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET() {
  const externalApi = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  // Se houver backend externo configurado (ex: Railway, Render, VPS), consulta-o primeiro
  if (externalApi) {
    try {
      const res = await fetch(`${externalApi}/api/whatsapp/status`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e) {
      console.warn('[WhatsApp Status API] Falha ao consultar backend externo, usando fallback local:', e);
    }
  }

  // Fallback Serverless Vercel: Gera QR Code real e escaneável
  try {
    const pairingPayload = `https://wa.me/5521981245500?text=${encodeURIComponent(
      'Olá, Defesa Civil! Desejo ativar alertas preventivos do GeoShield Monitor para o meu setor.'
    )}`;

    const qrDataUrl = await QRCode.toDataURL(pairingPayload, {
      width: 256,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    });

    return NextResponse.json({
      status: 'DISCONNECTED',
      connected: false,
      ready: false,
      activeCep: '25680-195',
      qr: qrDataUrl,
      qrCode: qrDataUrl,
      number: null,
      isServerless: true,
      message: 'QR Code de pareamento comunitário pronto para escaneamento.'
    });
  } catch (err) {
    console.error('[WhatsApp Status API] Erro ao gerar QR Code fallback:', err);
    return NextResponse.json({
      status: 'DISCONNECTED',
      connected: false,
      ready: false,
      activeCep: '25680-195',
      qr: null,
      qrCode: null,
      number: null,
      error: 'Falha na geração do QR Code.'
    }, { status: 500 });
  }
}
