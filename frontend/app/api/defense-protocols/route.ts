import { NextRequest, NextResponse } from 'next/server';
import { globalIncidents } from '../incidents/route';

const defaultProtocols = [
  {
    id: 'prot-1',
    protocolCode: 'DEF-849201',
    riskLevel: 85,
    description: 'Atenção máxima: encosta em Morro da Oficina com saturação crítica.',
    status: 'Em análise',
    channel: 'Central',
    phone: null,
    photo: null,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prot-2',
    protocolCode: 'DEF-310492',
    riskLevel: 45,
    description: 'Monitoramento preventivo de rotina em área de declividade moderada.',
    status: 'Equipe enviada',
    channel: 'Central',
    phone: null,
    photo: null,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export async function GET() {
  // Converte denúncias do WhatsApp para o formato de protocolo de emergência
  const incidentProtocols = globalIncidents.map(inc => ({
    id: inc.id,
    protocolCode: inc.protocolCode,
    riskLevel: inc.riskLevel,
    description: inc.text,
    status: inc.status,
    channel: inc.channel,
    phone: inc.phone,
    photo: inc.photo,
    location: inc.location,
    createdAt: inc.createdAt
  }));

  // Mescla incidentes do WhatsApp com os protocolos padrão ordenados pelo mais recente
  const merged = [...incidentProtocols, ...defaultProtocols].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(merged);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const newProto = {
    id: 'prot-' + Date.now(),
    protocolCode: `DEF-${Math.floor(100000 + Math.random() * 900000)}`,
    riskLevel: body.riskLevel || 70,
    description: body.description || 'Chamado gerado pela Central de Monitoramento.',
    status: 'Em análise',
    channel: body.channel || 'Central',
    phone: body.phone || null,
    photo: body.photo || null,
    createdAt: new Date().toISOString()
  };
  defaultProtocols.unshift(newProto);
  return NextResponse.json(newProto);
}
