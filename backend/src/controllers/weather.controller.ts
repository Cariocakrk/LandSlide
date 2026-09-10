import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

async function fetchComprehensiveWeather(lat: number, lng: number) {
  // Coletamos os últimos 3 dias (72h) de histórico real + previsão de 2 dias futuros
  // Incluindo precipitação horária, umidade relativa e 4 camadas de umidade volumétrica de solo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,rain,relativehumidity_2m,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&past_days=3&forecast_days=2&timezone=auto`;
  const response = await axios.get(url, { timeout: 8000 });
  return response.data;
}

export async function getWeatherForecast(req: AuthRequest, res: Response) {
  try {
    const { lat, lng } = req.params;

    if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
      return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias e devem ser válidas.' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    const weatherData = await fetchComprehensiveWeather(latitude, longitude);
    const hourly = weatherData.hourly;

    if (!hourly || !hourly.time || hourly.time.length === 0) {
      return res.status(500).json({ error: 'Dados meteorológicos incompletos retornados pela estação.' });
    }

    // Identificar índice da hora atual dentro do array histórico (passado 72h + presente + futuro)
    const nowIsoPrefix = new Date().toISOString().slice(0, 13); // 'YYYY-MM-DDTHH'
    let currentHourIndex = hourly.time.findIndex((t: string) => t.startsWith(nowIsoPrefix));
    if (currentHourIndex === -1) {
      // Se fuso horário diferir, usar 72 (já que past_days=3 tem 72 horas prévias)
      currentHourIndex = Math.min(72, hourly.time.length - 1);
    }

    const precipitations: number[] = hourly.precipitation || [];
    const humidity: number[] = hourly.relativehumidity_2m || [];

    // 1. Chuva Acumulada nas últimas 72 horas (P72h - Limiar Oficial CEMADEN)
    const start72h = Math.max(0, currentHourIndex - 72);
    const past72hSlice = precipitations.slice(start72h, currentHourIndex + 1);
    const accumulatedRain72h = Number(past72hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    // 2. Chuva Acumulada nas últimas 24 horas (P24h)
    const start24h = Math.max(0, currentHourIndex - 24);
    const past24hSlice = precipitations.slice(start24h, currentHourIndex + 1);
    const accumulatedRain24h = Number(past24hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    // 3. Intensidade atual (última hora P1h)
    const currentRainIntensity = Number((precipitations[currentHourIndex] || 0).toFixed(1));

    // 4. Previsão para as próximas 24 horas (P_forecast)
    const end24hForecast = Math.min(hourly.time.length, currentHourIndex + 24);
    const forecast24hSlice = precipitations.slice(currentHourIndex, end24hForecast);
    const forecastRain24h = Number(forecast24hSlice.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    // Próximas 6 horas (compatibilidade com frontend)
    const end6hForecast = Math.min(hourly.time.length, currentHourIndex + 6);
    const hourlyRain6h = precipitations.slice(currentHourIndex, end6hForecast);
    const accumulatedRain6h = Number(hourlyRain6h.reduce((acc, curr) => acc + (curr || 0), 0).toFixed(1));

    const hourlyHumidity6h = humidity.slice(currentHourIndex, end6hForecast);
    const avgHumidity6h = Math.round(hourlyHumidity6h.reduce((acc, curr) => acc + curr, 0) / (hourlyHumidity6h.length || 1));

    // 5. Umidade Volumétrica Real do Solo (m³/m³)
    // Amostrada nas camadas 0-1cm e 1-3cm (superficial) e 9-27cm (subsuperficial/frente de saturação)
    const sm0 = hourly.soil_moisture_0_to_1cm?.[currentHourIndex] || 0.35;
    const sm1 = hourly.soil_moisture_1_to_3cm?.[currentHourIndex] || 0.35;
    const smDeep = hourly.soil_moisture_9_to_27cm?.[currentHourIndex] || 0.38;
    const avgVolumetricMoisture = Number(((sm0 + sm1 + smDeep) / 3).toFixed(3));

    // Estimativa de saturação do manto (%) assumindo porosidade média de solo tropical residual (n ≈ 0.48)
    const soilSaturationPercent = Math.min(100, Math.round((avgVolumetricMoisture / 0.48) * 100));

    // 6. Diagnóstico CEMADEN
    let cemadenThreshold = 'Normal / Observação';
    if (accumulatedRain72h >= 100 || currentRainIntensity >= 30) {
      cemadenThreshold = 'Alerta Máximo (Limiar Crítico > 100mm/72h superado)';
    } else if (accumulatedRain72h >= 60) {
      cemadenThreshold = 'Alerta (60mm a 100mm/72h acumulados)';
    } else if (accumulatedRain72h >= 30) {
      cemadenThreshold = 'Atenção (30mm a 60mm/72h acumulados)';
    }

    res.json({
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
    console.error("Weather Fetch Error:", error?.message);
    res.status(500).json({ error: 'Erro ao buscar telemetria hidrometeorológica do local.' });
  }
}
