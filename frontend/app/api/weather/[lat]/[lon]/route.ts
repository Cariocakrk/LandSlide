import { NextRequest, NextResponse } from 'next/server';

function describeWmoWeatherCode(code: number, currentRain: number): {
  condition: string;
  isRainingNow: boolean;
  severity: 'clear' | 'cloudy' | 'drizzle' | 'rain' | 'storm';
} {
  if (code >= 95) {
    return { condition: 'Tempestade Severa com Raios', isRainingNow: true, severity: 'storm' };
  }
  if (code >= 80) {
    const label = code === 82 ? 'Pancadas de Chuva Violentas' : code === 81 ? 'Pancadas de Chuva Moderadas' : 'Pancadas de Chuva Isoladas';
    return { condition: label, isRainingNow: true, severity: code === 82 ? 'storm' : 'rain' };
  }
  if (code >= 61 && code <= 67) {
    const label = code >= 65 ? 'Chuva Forte Contínua' : code >= 63 ? 'Chuva Moderada' : 'Chuva Fraca';
    return { condition: label, isRainingNow: true, severity: code >= 65 ? 'storm' : 'rain' };
  }
  if (code >= 51 && code <= 57) {
    const label = code >= 55 ? 'Garoa Densa / Chuvisco' : 'Garoa Leve / Chuvisco';
    return { condition: label, isRainingNow: true, severity: 'drizzle' };
  }
  if (currentRain > 0.1) {
    return {
      condition: currentRain >= 10 ? 'Chuva Intensa Localizada' : 'Chuva Leve em Curso',
      isRainingNow: true,
      severity: currentRain >= 10 ? 'storm' : 'rain'
    };
  }
  if (code === 45 || code === 48) {
    return { condition: 'Nevoeiro / Neblina de Encosta', isRainingNow: false, severity: 'cloudy' };
  }
  if (code === 3) {
    return { condition: 'Céu Encoberto / Nublado', isRainingNow: false, severity: 'cloudy' };
  }
  if (code === 1 || code === 2) {
    return { condition: 'Parcialmente Nublado', isRainingNow: false, severity: 'cloudy' };
  }
  return { condition: 'Céu Limpo / Estável', isRainingNow: false, severity: 'clear' };
}

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

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation,rain,relativehumidity_2m,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&past_days=3&forecast_days=2&timezone=UTC`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Falha na consulta meteorológica Open-Meteo');
    }

    const weatherData = await response.json();
    const hourly = weatherData.hourly;
    const current = weatherData.current || {};

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

    const hourlyRainNow = Number((precipitations[currentHourIndex] || 0).toFixed(1));
    const currentRainIntensity = Number(Math.max(hourlyRainNow, current.precipitation || 0, current.rain || 0).toFixed(1));

    const end24hForecast = Math.min(hourly.time.length, currentHourIndex + 24);
    const forecast24hSlice = precipitations.slice(currentHourIndex, end24hForecast);
    const forecastRain24h = Number(forecast24hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const end6hForecast = Math.min(hourly.time.length, currentHourIndex + 6);
    const hourlyRain6h = precipitations.slice(currentHourIndex, end6hForecast);
    const accumulatedRain6h = Number(hourlyRain6h.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const hourlyHumidity6h = humidity.slice(currentHourIndex, end6hForecast);
    const avgHumidity6h = Math.round(
      current.relative_humidity_2m ??
      (hourlyHumidity6h.reduce((acc, curr) => acc + curr, 0) / (hourlyHumidity6h.length || 1))
    );

    const sm0 = hourly.soil_moisture_0_to_1cm?.[currentHourIndex] || 0.35;
    const sm1 = hourly.soil_moisture_1_to_3cm?.[currentHourIndex] || 0.35;
    const smDeep = hourly.soil_moisture_9_to_27cm?.[currentHourIndex] || 0.38;
    const avgVolumetricMoisture = Number(((sm0 + sm1 + smDeep) / 3).toFixed(3));

    const soilSaturationPercent = Math.min(100, Math.round((avgVolumetricMoisture / 0.48) * 100));

    const temperature = Number((current.temperature_2m ?? hourly.temperature_2m?.[currentHourIndex] ?? 22.0).toFixed(1));
    const apparentTemperature = Number((current.apparent_temperature ?? temperature).toFixed(1));
    const windSpeed = Number((current.wind_speed_10m ?? hourly.wind_speed_10m?.[currentHourIndex] ?? 8.0).toFixed(1));
    const cloudCover = Math.round(current.cloud_cover ?? hourly.cloud_cover?.[currentHourIndex] ?? 40);
    const weatherCode = Number(current.weather_code ?? hourly.weather_code?.[currentHourIndex] ?? 0);
    const isDay = current.is_day !== undefined ? Boolean(current.is_day) : true;

    const wmoInfo = describeWmoWeatherCode(weatherCode, currentRainIntensity);

    let cemadenThreshold = 'Normal / Observação';
    if (accumulatedRain72h >= 100 || currentRainIntensity >= 30) {
      cemadenThreshold = 'Alerta Máximo (Limiar Crítico > 100mm/72h superado)';
    } else if (accumulatedRain72h >= 60) {
      cemadenThreshold = 'Alerta (60mm a 100mm/72h acumulados)';
    } else if (accumulatedRain72h >= 30) {
      cemadenThreshold = 'Atenção (30mm a 60mm/72h acumulados)';
    }

    return NextResponse.json({
      temperature,
      apparentTemperature,
      windSpeed,
      cloudCover,
      weatherCode,
      weatherCondition: wmoInfo.condition,
      weatherSeverity: wmoInfo.severity,
      isRainingNow: wmoInfo.isRainingNow,
      isDay,
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
