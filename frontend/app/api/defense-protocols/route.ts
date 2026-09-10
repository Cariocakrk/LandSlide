import { NextRequest, NextResponse } from 'next/server';

const defaultProtocols = [
  {
    id: 'prot-1',
    protocolCode: 'DEF-849201',
    riskLevel: 85,
    description: 'Atenção máxima: encosta em Morro da Oficina com saturação crítica.',
    status: 'Em análise',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prot-2',
    protocolCode: 'DEF-310492',
    riskLevel: 45,
    description: 'Monitoramento preventivo de rotina em área de declividade moderada.',
    status: 'Encaminhado',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export async function GET() {
  return NextResponse.json(defaultProtocols);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const newProto = {
    id: 'prot-' + Date.now(),
    protocolCode: `DEF-${Math.floor(100000 + Math.random() * 900000)}`,
    riskLevel: body.riskLevel || 70,
    description: body.description || 'Chamado gerado pela Central de Monitoramento.',
    status: 'Em análise',
    createdAt: new Date().toISOString()
  };
  defaultProtocols.unshift(newProto);
  return NextResponse.json(newProto);
}
