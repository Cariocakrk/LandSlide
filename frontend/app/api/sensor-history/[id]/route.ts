import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = [];
  const now = Date.now();
  for (let i = 10; i >= 0; i--) {
    history.push({
      id: 'sh-' + i,
      sensorId: id,
      soilMoisture: Number((40 + Math.sin(i) * 15).toFixed(1)),
      terrainInclination: 24.5,
      rainVolume: Number((20 + (10 - i) * 6).toFixed(1)),
      vibration: 1.2,
      riskScore: Number((25 + (10 - i) * 5).toFixed(1)),
      riskStatus: (10 - i) > 7 ? 'Vermelho' : (10 - i) > 4 ? 'Amarelo' : 'Verde',
      createdAt: new Date(now - i * 15000).toISOString()
    });
  }
  return NextResponse.json(history);
}
