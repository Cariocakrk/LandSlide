import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const items = [];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    items.push({
      id: 'hist-' + i,
      sensorId: 'EST-GEO-' + ((i % 5) + 1),
      soilMoisture: Number((35 + Math.sin(i) * 20).toFixed(1)),
      terrainInclination: Number((18 + Math.cos(i) * 12).toFixed(1)),
      rainVolume: Number((15 + i * 4).toFixed(1)),
      vibration: Number((0.5 + Math.sin(i) * 2).toFixed(1)),
      riskScore: Number((20 + i * 3.5).toFixed(1)),
      riskStatus: i > 12 ? 'Vermelho' : i > 6 ? 'Amarelo' : 'Verde',
      createdAt: new Date(now - i * 60000).toISOString()
    });
  }
  return NextResponse.json({
    data: items,
    page: 1,
    totalPages: 1,
    totalRecords: 20
  });
}
