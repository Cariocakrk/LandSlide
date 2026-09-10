import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lat: string; lon: string }> }
) {
  try {
    const { lat, lon } = await params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: 'Latitude e Longitude inválidas.' }, { status: 400 });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation,rain,relativehumidity_2m,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&past_days=3&forecast_days=2&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Falha na consulta meteorológica Open-Meteo');
    }

    const weatherData = await response.json();
    const hourly = weatherData.hourly;

    if (!hourly || !hourly.time || hourly.time.length === 0) {
      return NextResponse.json({ error: 'Dados meteorológicos incompletos.' }, { status: 500 });
    }

    const nowIsoPrefix = new Date().toISOString().slice(0, 13);
    let currentHourIndex = hourly.time.findIndex((t: string) => t.startsWith(nowIsoPrefix));
    if (currentHourIndex === -1) {
      currentHourIndex = Math.min(72, hourly.time.length - 1);
    }

    const precipitations: number[] = hourly.precipitation || [];
    const humidity: number[] = hourly.relativehumidity_2m || [];

    // P72h (CEMADEN)
    const start72h = Math.max(0, currentHourIndex - 72);
    const past72hSlice = precipitations.slice(start72h, currentHourIndex + 1);
    const accumulatedRain72h = Number(past72hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    // P24h
    const start24h = Math.max(0, currentHourIndex - 24);
    const past24hSlice = precipitations.slice(start24h, currentHourIndex + 1);
    const accumulatedRain24h = Number(past24hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const currentRainIntensity = Number((precipitations[currentHourIndex] || 0).toFixed(1));

    const end24hForecast = Math.min(hourly.time.length, currentHourIndex + 24);
    const forecast24hSlice = precipitations.slice(currentHourIndex, end24hForecast);
    const forecastRain24h = Number(forecast24hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const end6hForecast = Math.min(hourly.time.length, currentHourIndex + 6);
    const hourlyRain6h = precipitations.slice(currentHourIndex, end6hForecast);
    const accumulatedRain6h = Number(hourlyRain6h.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const hourlyHumidity6h = humidity.slice(currentHourIndex, end6hForecast);
    const avgHumidity6h = Math.round(hourlyHumidity6h.reduce((acc, curr) => acc + curr, 0) / (hourlyHumidity6h.length || 1));

    const sm0 = hourly.soil_moisture_0_to_1cm?.[currentHourIndex] || 0.35;
    const sm1 = hourly.soil_moisture_1_to_3cm?.[currentHourIndex] || 0.35;
    const smDeep = hourly.soil_moisture_9_to_27cm?.[currentHourIndex] || 0.38;
    const avgVolumetricMoisture = Number(((sm0 + sm1 + smDeep) / 3).toFixed(3));

    const soilSaturationPercent = Math.min(100, Math.round((avgVolumetricMoisture / 0.48) * 100));

    let cemadenThreshold = 'Normal / Observação';
    if (accumulatedRain72h >= 100 || currentRainIntensity >= 30) {
      cemadenThreshold = 'Alerta Máximo (Limiar Crítico > 100mm/72h superado)';
    } else if (accumulatedRain72h >= 60) {
      cemadenThreshold = 'Alerta (60mm a 100mm/72h acumulados)';
    } else if (accumulatedRain72h >= 30) {
      cemadenThreshold = 'Atenção (30mm a 60mm/72h acumulados)';
    }

    return NextResponse.json({
      accumulatedRain72h,
      accumulatedRain24h,
      currentRainIntensity,
      forecastRain24h,
      accumulatedRain6h,
      avgHumidity6h,
      soilMoistureVolumetric: avgVolumetricMoisture,
      soilSaturationPercent,
      cemadenThreshold,
      hourlyRain: hourlyRain6h
    });
  } catch (error: any) {
    console.error('[API weather] Erro:', error?.message);
    return NextResponse.json({ error: 'Erro ao buscar dados meteorológicos.' }, { status: 500 });
  }
}
