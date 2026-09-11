import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const newProto = {
    id: 'prot-manual-' + Date.now(),
    protocolCode: `DEF-${Math.floor(100000 + Math.random() * 900000)}`,
    riskLevel: 92,
    description: 'Alerta emergencial de risco crítico disparado manualmente pela Central Operacional.',
    status: 'Em análise',
    createdAt: new Date().toISOString()
  };
  return NextResponse.json(newProto);
}
