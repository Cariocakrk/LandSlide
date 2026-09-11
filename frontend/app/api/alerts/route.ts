import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'alt-1',
      protocolCode: 'DEF-849201',
      cep: '25680-195 (Quitandinha)',
      sensorId: 'EST-GEO-1',
      riskScore: 88,
      riskLevel: 'R4',
      numResidents: 420,
      channel: 'WhatsApp',
      status: 'DISPARADO',
      message: '[ALERTA DEFESA CIVIL]: Risco crítico de deslizamento por saturação de solo na encosta Quitandinha. Evacuação preventiva recomendada.',
      createdAt: new Date().toISOString()
    }
  ]);
}
