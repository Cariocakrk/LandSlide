import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { mode } = body;
  return NextResponse.json({ success: true, mode: mode || 'normal' });
}
