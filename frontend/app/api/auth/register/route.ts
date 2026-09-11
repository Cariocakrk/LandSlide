import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, role } = body;

  return NextResponse.json({
    token: 'jwt-registered-session-token',
    user: {
      id: 'reg-user-' + Date.now(),
      name: name || 'Operador Credenciado',
      email: email || 'operador@defesacivil.gov.br',
      role: role || 'OPERATOR'
    }
  });
}
