import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'alt-1',
      sensorId: 'EST-GEO-1',
      riskScore: 88,
      riskLevel: 'R4',
      message: 'Limiar crítico superado: precipitação 72h acima de 120mm.',
      createdAt: new Date().toISOString()
    }
  ]);
}
