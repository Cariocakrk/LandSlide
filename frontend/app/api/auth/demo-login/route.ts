import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    token: 'jwt-evaluator-demo-session-token',
    user: {
      id: 'demo-evaluator-tcc-id',
      name: 'Operador Chefe (Banca TCC)',
      email: 'admin@defesacivil.gov.br',
      role: 'OPERATOR'
    }
  });
}
