import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = [];
  const now = Date.now();
  for (let i = 10; i >= 0; i--) {
    const isoTime = new Date(now - i * 15000).toISOString();
    const moisture = Number((40 + Math.sin(i) * 15).toFixed(1));
    const slope = 24.5;
    const rain = Number((20 + (10 - i) * 6).toFixed(1));
    const vibration = 1.2;
    const risk = Number((25 + (10 - i) * 5).toFixed(1));

    history.push({
      id: 'sh-' + i,
      sensorId: id,
      timestamp: isoTime,
      createdAt: isoTime,
      moisture,
      soilMoisture: moisture,
      slope,
      terrainInclination: slope,
      rain,
      rainVolume: rain,
      vibration,
      risk,
      riskScore: risk,
      riskStatus: (10 - i) > 7 ? 'Vermelho' : (10 - i) > 4 ? 'Amarelo' : 'Verde'
    });
  }
  return NextResponse.json(history);
}
