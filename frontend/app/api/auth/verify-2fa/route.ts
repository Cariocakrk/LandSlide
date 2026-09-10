import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code } = body;

  if (code === '123456' || code === '000000' || String(code).length === 6) {
    return NextResponse.json({
      token: 'jwt-verified-operator-token',
      user: {
        id: 'evaluator-user-id',
        name: 'Operador Chefe - Defesa Civil',
        email: 'admin@defesacivil.gov.br',
        role: 'OPERATOR'
      }
    });
  }

  return NextResponse.json({ error: 'Código inválido. Use 123456.' }, { status: 400 });
}
