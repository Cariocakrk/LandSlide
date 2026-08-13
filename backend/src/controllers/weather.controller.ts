import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import axios from 'axios';

async function fetchWeather(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,relativehumidity_2m&forecast_days=1&timezone=auto`;
  const response = await axios.get(url);
  return response.data;
}

export async function getWeatherForecast(req: AuthRequest, res: Response) {
  try {
    const { lat, lng } = req.params;
    
    if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
      return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias e devem ser válidas.' });
    }

    const weatherData = await fetchWeather(parseFloat(lat), parseFloat(lng));
    const currentHourIndex = new Date().getHours();
    const endIndex = Math.min(currentHourIndex + 6, weatherData.hourly.time.length);
    
    const hourlyRain = weatherData.hourly.precipitation.slice(currentHourIndex, endIndex);
    const hourlyHumidity = weatherData.hourly.relativehumidity_2m.slice(currentHourIndex, endIndex);
    
    const accumulatedRain6h = hourlyRain.reduce((acc: number, curr: number) => acc + curr, 0);
    const avgHumidity6h = hourlyHumidity.reduce((acc: number, curr: number) => acc + curr, 0) / hourlyHumidity.length;

    res.json({
      hourlyRain,
      accumulatedRain6h: Number(accumulatedRain6h.toFixed(2)),
      avgHumidity6h: Math.round(avgHumidity6h)
    });
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    res.status(500).json({ error: 'Erro ao buscar previsão meteorológica' });
  }
}
