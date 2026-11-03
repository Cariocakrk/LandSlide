import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page')) || 1;
  const level = searchParams.get('level') || 'all';
  const date = searchParams.get('date') || '';

  const items = [];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    const riskVal = Number((20 + i * 3.5).toFixed(1));
    const statusColor = i > 12 ? 'Vermelho' : i > 8 ? 'Laranja' : i > 4 ? 'Amarelo' : 'Verde';
    items.push({
      id: 'hist-' + i,
      sensorId: 'EST-GEO-' + ((i % 5) + 1),
      soilMoisture: Number((35 + Math.sin(i) * 20).toFixed(1)),
      terrainInclination: Number((18 + Math.cos(i) * 12).toFixed(1)),
      rainVolume: Number((15 + i * 4).toFixed(1)),
      groundVibration: Number((0.5 + Math.sin(i) * 2).toFixed(1)),
      vibration: Number((0.5 + Math.sin(i) * 2).toFixed(1)),
      risk: riskVal,
      riskLevel: riskVal,
      riskScore: riskVal,
      statusColor,
      riskStatus: statusColor,
      createdAt: new Date(now - i * 60000).toISOString()
    });
  }

  const filtered = items.filter((item) => {
    if (level === 'critical' && item.statusColor !== 'Vermelho' && item.statusColor !== 'Laranja') return false;
    if (level === 'low' && item.statusColor !== 'Verde' && item.statusColor !== 'Amarelo') return false;
    if (date && !item.createdAt.startsWith(date)) return false;
    return true;
  });

  return NextResponse.json({
    data: filtered,
    page,
    totalPages: 1,
    totalRecords: filtered.length
  });
}
