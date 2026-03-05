import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST']
  }
});

import authRoutes from './routes/auth';

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// 1. Get history logs
app.get('/api/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const data = await prisma.sensorData.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });
    const total = await prisma.sensorData.count();

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Endpoint "simulation/mode" was removed in favor of Real Weather.

// 3. Civil Defense protocols
app.get('/api/defense-protocols', async (req, res) => {
  try {
    const protocols = await prisma.emergencyProtocol.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(protocols);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

app.post('/api/defense-protocols/mock', async (req, res) => {
  try {
    const protocolCode = `DEF-MANUAL-${Math.floor(Math.random() * 1000)}`;
    
    // We create a mock Object to safely emit to Socket without crashing Postgres
    const newAlert = {
       id: `temp-${Date.now()}`,
       protocolCode,
       riskLevel: 99,
       description: `Alerta manual de emergência disparado pelo operador da Defesa Civil.`,
       status: "Em análise",
       createdAt: new Date()
    };
    
    try {
      // Tenta gravar no banco se ele estiver online
      await prisma.emergencyProtocol.create({
        data: {
          protocolCode: newAlert.protocolCode,
          riskLevel: newAlert.riskLevel,
          description: newAlert.description,
          status: newAlert.status
        }
      });
    } catch (dbError) {
      console.log("[DB] Banco offline, emitindo alerta apenas via WebSocket em modo Mock.");
    }
    
    // Emite para o frontend independente do banco de dados
    io.emit('emergencyAlert', newAlert);
    res.json(newAlert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar chamado manual' });
  }
});

app.post('/api/defense-protocols/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updated = await prisma.emergencyProtocol.update({
      where: { id },
      data: { status }
    });
    
    io.emit('protocolUpdate', updated);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar chamado' });
  }
});

import { getCoordinatesFromCEP } from './lib/geocoding';
import { getElevationMatrix } from './lib/elevation';
import { getWaterways } from './lib/waterways';

// 4. Módulo Gerador Topográfico por CEP
app.post('/api/generate-terrain', async (req, res) => {
  try {
    const { cep } = req.body;
    
    if (!cep || typeof cep !== 'string') {
       return res.status(400).json({ error: 'Insira um CEP válido para gerar o terreno.' });
    }

    // Passos arquitetônicos:
    // 1. Converter CEP fornecido na localização real do usuário (Lat Long)
    const { lat, lon, name } = await getCoordinatesFromCEP(cep);
    
    // 2. Extrair altitude geográfica do modelo DEM
    const { matrix, min, max } = await getElevationMatrix(lat, lon);
    
    // 3. Extrair malha hidrográfica (Rios) via Overpass e gerar Sensores de Enchente Virtuais
    // Módulo Multi-Risco
    const hydroData = await getWaterways(lat, lon);
    
    // 4. Devolver formato de matriz Z compreensível para o Three.js do Frontend
    return res.json({
       location: name,
       latitude: lat,
       longitude: lon,
       elevationMatrix: matrix,
       minElevation: min,
       maxElevation: max,
       waterways: hydroData.waterways,
       floodSensors: hydroData.floodSensors
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar topografia' });
  }
});

import axios from 'axios';

// 5. Integração Meteorológica em Tempo Real (Open-Meteo)
async function fetchWeather(lat: number, lng: number) {
  // Pedindo Previsão Horária E Dados Atuais:
  // Incluindo temperature_2m, weather_code e wind_speed_10m
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,soil_moisture_0_1cm,wind_speed_10m,weather_code&hourly=precipitation,temperature_2m,weather_code&forecast_days=2&timezone=auto`;
  const response = await axios.get(url);
  return response.data;
}

app.get('/api/weather/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias.' });
    }

    const weatherData = await fetchWeather(parseFloat(lat), parseFloat(lng));
    
    // Pegar as próximas 12 horas a partir de agora:
    const currentHourIndex = new Date().getHours();
    const endIndex12h = Math.min(currentHourIndex + 12, weatherData.hourly.time.length);
    const endIndex6h = Math.min(currentHourIndex + 6, weatherData.hourly.time.length);
    
    const hourlyRain6h = weatherData.hourly.precipitation.slice(currentHourIndex, endIndex6h);
    const accumulatedRain6h = hourlyRain6h.reduce((acc: number, curr: number) => acc + curr, 0);

    const hourlyForecast12h = [];
    for (let i = currentHourIndex; i < endIndex12h; i++) {
        hourlyForecast12h.push({
            time: weatherData.hourly.time[i],
            precipitation: weatherData.hourly.precipitation[i],
            temperature: weatherData.hourly.temperature_2m[i],
            weatherCode: weatherData.hourly.weather_code[i]
        });
    }

    // Extrair os valores ATAIS reais (Current)
    const current = weatherData.current;

    res.json({
      accumulatedRain6h: Number(accumulatedRain6h.toFixed(2)),
      hourlyForecast: hourlyForecast12h,
      current: {
        temperature: current.temperature_2m,
        rain: current.precipitation,
        soilMoisture: current.soil_moisture_0_1cm,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code
      }
    });

  } catch (error) {
    console.error("Weather Fetch Error:", error);
    res.status(500).json({ error: 'Erro ao buscar previsão meteorológica' });
  }
});

// Buildings route removed.

// 6. Sistema de Telemetria de Sensores (Histórico em Memória)
type SensorReading = {
  sensorId: string
  timestamp: number
  slope: number
  moisture: number
  rain: number
  vibration: number
  risk: number
}

const sensorHistory: Record<string, SensorReading[]> = {}

app.post('/api/sensor-data', (req, res) => {
  try {
    const { sensorId, slope, moisture, rain, vibration, risk } = req.body;

    if (!sensorId) {
      return res.status(400).json({ error: 'sensorId é obrigatório' });
    }

    const reading: SensorReading = {
      sensorId,
      timestamp: Date.now(),
      slope,
      moisture,
      rain,
      vibration,
      risk
    };

    if (!sensorHistory[sensorId]) {
      sensorHistory[sensorId] = [];
    }

    sensorHistory[sensorId].push(reading);

    // Manter limite máximo de 500 leituras por sensor
    if (sensorHistory[sensorId].length > 500) {
      // Remove o mais antigo (início do array)
      sensorHistory[sensorId].shift();
    }

    res.status(200).json({ success: true, message: 'Telemetria registrada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar telemetria' });
  }
});

app.get('/api/sensor-history/:sensorId', (req, res) => {
  try {
    const { sensorId } = req.params;
    const history = sensorHistory[sensorId] || [];
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico do sensor' });
  }
});

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
