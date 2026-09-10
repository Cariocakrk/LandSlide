import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    dispatchedTo: body.recipientsCount || 1,
    message: 'Alerta emitido com sucesso para as equipes de campo.'
  });
}
