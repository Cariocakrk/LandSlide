import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (email === 'admin@defesacivil.gov.br' && password === 'admin123') {
    return NextResponse.json({
      twoFactorRequired: true,
      tempToken: 'temp-token-evaluator',
      devCode: '123456'
    });
  }

  // Permite qualquer login em modo de apresentação/avaliação
  return NextResponse.json({
    twoFactorRequired: true,
    tempToken: 'temp-token-demo',
    devCode: '123456'
  });
}
