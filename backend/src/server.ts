import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { startSensorSimulation, setSimulationMode, SimulationMode } from './lib/mockSensors';

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

// 2. Change simulation mode
app.post('/api/simulation/mode', async (req, res) => {
  const { mode } = req.body;
  if (!['normal', 'heavy_rain', 'saturated_soil', 'intense_vibration', 'critical_risk'].includes(mode)) {
    return res.status(400).json({ error: 'Modo inválido' });
  }
  setSimulationMode(mode as SimulationMode);
  
  // Create an alert event when changed from normal
  if (mode !== 'normal') {
    const protocolCode = `DEF-${Math.floor(Math.random() * 1000000)}`;
    
    const tempAlert = {
      id: `sim-${Date.now()}`,
      protocolCode,
      riskLevel: mode === 'critical_risk' ? 90 : 70, // Dummy based on mode
      description: `Simulação de ${mode} acionada automaticamente.`,
      status: "Em análise",
      createdAt: new Date()
    };
    
    try {
      await prisma.emergencyProtocol.create({
        data: {
          protocolCode: tempAlert.protocolCode,
          riskLevel: tempAlert.riskLevel,
          description: tempAlert.description,
          status: tempAlert.status
        }
      });
    } catch (dbError) {
      console.log(`[DB] Banco offline, simulação ${mode} emitindo alerta WebSocket limpo.`);
    }

    io.emit('emergencyAlert', tempAlert);
  }

  res.json({ success: true, mode });
});

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
    
    // 3. Devolver formato de matriz Z compreensível para o Three.js do Frontend
    return res.json({
       location: name,
       latitude: lat,
       longitude: lon,
       elevationMatrix: matrix,
       minElevation: min,
       maxElevation: max
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar topografia' });
  }
});

import axios from 'axios';

// 5. Integração Meteorológica em Tempo Real (Open-Meteo)
async function fetchWeather(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,relativehumidity_2m&forecast_days=1&timezone=auto`;
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
    
    // Pegar as próximas 6 horas a partir de agora
    const currentHourIndex = new Date().getHours();
    // Prevenção: Se faltar menos de 6h para o fim do dia, pega o resto que tiver (API de 1 dia)
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
});

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

// Start Simulation
startSensorSimulation(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
