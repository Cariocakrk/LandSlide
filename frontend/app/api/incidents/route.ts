import { NextRequest, NextResponse } from 'next/server';

export interface IncidentReport {
  id: string;
  protocolCode: string;
  phone: string;
  text: string;
  photo: string | null;
  location: string;
  riskLevel: number;
  status: 'Em análise' | 'Equipe enviada' | 'Finalizado';
  channel: 'WhatsApp' | 'Central';
  createdAt: string;
}

// Repositório em memória para persistência em runtime serverless
export const globalIncidents: IncidentReport[] = [
  {
    id: 'inc-sample-1',
    protocolCode: 'DEF-WA-819204',
    phone: '+55 (24) 99812-4019',
    text: 'Apareceu uma trinca de mais de 4 metros no muro de arrimo aqui da Rua Nova. A água da chuva tá saindo barrenta por baixo do concreto!',
    photo: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?q=80&w=800&auto=format&fit=crop', // Imagem de fissura estrutural
    location: 'Morro da Oficina, Petrópolis - RJ',
    riskLevel: 92,
    status: 'Em análise',
    channel: 'WhatsApp',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

export async function GET() {
  return NextResponse.json(globalIncidents);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const newIncident: IncidentReport = {
      id: 'inc-' + Date.now(),
      protocolCode: `DEF-WA-${Math.floor(100000 + Math.random() * 900000)}`,
      phone: body.phone || '+55 (21) 98765-4321',
      text: body.text || 'Ocorrência de instabilidade geológica reportada por cidadão via WhatsApp.',
      photo: body.photo || null,
      location: body.location || 'Setor Encosta sob Monitoramento',
      riskLevel: typeof body.riskLevel === 'number' ? body.riskLevel : 88,
      status: 'Em análise',
      channel: 'WhatsApp',
      createdAt: new Date().toISOString()
    };

    globalIncidents.unshift(newIncident);

    return NextResponse.json({
      success: true,
      incident: newIncident,
      message: 'Denúncia recebida e encaminhada à mesa de despacho do CICC.'
    });
  } catch (error) {
    console.error('[API /api/incidents] Erro ao registrar denúncia:', error);
    return NextResponse.json({ error: 'Falha ao processar ocorrência.' }, { status: 500 });
  }
}
