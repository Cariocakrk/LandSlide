import { NextRequest, NextResponse } from 'next/server';
import { getCoordinatesFromQuery } from '@/lib/server/geocoding';
import { getElevationMatrix } from '@/lib/server/elevation';
import { computeSlopeStatistics } from '@/lib/server/slopeStats';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const searchString = body.query || body.cep;

    if (!searchString || typeof searchString !== 'string') {
      return NextResponse.json(
        { error: 'Insira um CEP ou Endereço válido para gerar o terreno.' },
        { status: 400 }
      );
    }

    const { lat, lon, name } = await getCoordinatesFromQuery(searchString);
    const elevationData = await getElevationMatrix(lat, lon);
    const slopeStats = computeSlopeStatistics(elevationData.matrix);

    return NextResponse.json({
      location: name,
      latitude: lat,
      longitude: lon,
      elevationMatrix: elevationData.matrix,
      minElevation: elevationData.min,
      maxElevation: elevationData.max,
      reliefAmplitude: elevationData.reliefAmplitude,
      meanElevation: elevationData.mean,
      slopeStats
    });
  } catch (error: any) {
    console.error('[API generate-terrain] Erro:', error?.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar topografia real.' },
      { status: 500 }
    );
  }
}
