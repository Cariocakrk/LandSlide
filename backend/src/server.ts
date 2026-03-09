import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// Import libs
import { getCoordinatesFromCEP } from './lib/geocoding';
import { getElevationMatrix } from './lib/elevation';
import { getWaterways } from './lib/waterways';
import { getRoads } from './lib/roads';
import { startSensorSimulation } from './lib/sensorSimulation';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// 1. Get history logs
app.get('/api/history', async (req: Request, res: Response) => {
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

// 3. Civil Defense protocols
app.get('/api/defense-protocols', async (req: Request, res: Response) => {
  try {
    const protocols = await prisma.emergencyProtocol.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(protocols);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar chamados' });
  }
});

app.post('/api/defense-protocols/mock', async (req: Request, res: Response) => {
  try {
    const protocolCode = `DEF-MANUAL-${Math.floor(Math.random() * 1000)}`;
    const newAlert = {
       id: `temp-${Date.now()}`,
       protocolCode,
       riskLevel: 99,
       description: `Alerta manual de emergência disparado pelo operador da Defesa Civil.`,
       status: "Em análise",
       createdAt: new Date()
    };
    
    try {
      await prisma.emergencyProtocol.create({
        data: {
          protocolCode: newAlert.protocolCode,
          riskLevel: newAlert.riskLevel,
          description: newAlert.description,
          status: newAlert.status
        }
      });
    } catch (dbError) {
      console.log("[DB] Banco offline, emitindo alerta apenas via WebSocket.");
    }
    
    io.emit('emergencyAlert', newAlert);
    res.json(newAlert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar chamado manual' });
  }
});

app.post('/api/defense-protocols/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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

// 4. Módulo Gerador Topográfico por CEP
app.post('/api/generate-terrain', async (req: Request, res: Response): Promise<any> => {
  try {
    const { cep } = req.body;
    
    if (!cep || typeof cep !== 'string') {
       return res.status(400).json({ error: 'Insira um CEP válido para gerar o terreno.' });
    }

    console.log(`[BACKEND] Generating terrain for CEP: ${cep}`);

    try {
      const { lat, lon, name } = await getCoordinatesFromCEP(cep);
      const { matrix, min, max } = await getElevationMatrix(lat, lon);
      const hydroData = await getWaterways(lat, lon);
      const roadData = await getRoads(lat, lon);
      
      return res.json({
         location: name,
         latitude: lat,
         longitude: lon,
         elevationMatrix: matrix,
         minElevation: min,
         maxElevation: max,
         waterways: hydroData.waterways,
         floodSensors: hydroData.floodSensors,
         roads: roadData.roads
      });
    } catch (apiError: any) {
      console.error(`[BACKEND] /api/generate-terrain API failed, using fallback:`, apiError.message);
      
      // B.1 Fallback (Mock) Data
      return res.json({
        location: "Localização de Fallback (Mock)",
        latitude: -23.5505,
        longitude: -46.6333,
        elevationMatrix: Array(10).fill(0).map(() => Array(10).fill(0).map(() => Math.random() * 10)),
        minElevation: 0,
        maxElevation: 10,
        waterways: [],
        floodSensors: [],
        roads: []
      });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao gerar topografia' });
  }
});

// 5. Integração Meteorológica em Tempo Real
app.get('/api/weather/:lat/:lng', async (req: Request, res: Response): Promise<any> => {
  try {
    const { lat, lng } = req.params;
    if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng obrigatórios' });

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,soil_moisture_0_1cm,wind_speed_10m,weather_code&hourly=precipitation,temperature_2m,weather_code&forecast_days=2&timezone=auto`;
    const response = await axios.get(url);
    const weatherData = response.data;
    
    const currentHourIndex = new Date().getHours();
    const endIndex12h = Math.min(currentHourIndex + 12, weatherData.hourly.time.length);
    const hourlyForecast12h = [];
    
    for (let i = currentHourIndex; i < endIndex12h; i++) {
        hourlyForecast12h.push({
            time: weatherData.hourly.time[i],
            precipitation: weatherData.hourly.precipitation[i],
            temperature: weatherData.hourly.temperature_2m[i],
            weatherCode: weatherData.hourly.weather_code[i]
        });
    }

    res.json({
      accumulatedRain6h: 0, // Fallback p/ o que o front espera
      hourlyForecast: hourlyForecast12h,
      current: {
        temperature: weatherData.current.temperature_2m,
        rain: weatherData.current.precipitation,
        soilMoisture: weatherData.current.soil_moisture_0_1cm,
        windSpeed: weatherData.current.wind_speed_10m,
        weatherCode: weatherData.current.weather_code
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clima' });
  }
});

// 6. Telemetria
type SensorReading = {
  sensorId: string;
  timestamp: number;
  slope: number;
  moisture: number;
  rain: number;
  vibration: number;
  risk: number;
}
const sensorHistory: Record<string, SensorReading[]> = {};

app.post('/api/sensor-data', (req: Request, res: Response): any => {
  const { sensorId, slope, moisture, rain, vibration, risk } = req.body;
  if (!sensorId) return res.status(400).json({ error: 'sensorId obrigatório' });

  const reading: SensorReading = { sensorId, timestamp: Date.now(), slope, moisture, rain, vibration, risk };
  if (!sensorHistory[sensorId]) sensorHistory[sensorId] = [];
  sensorHistory[sensorId].push(reading);
  if (sensorHistory[sensorId].length > 500) sensorHistory[sensorId].shift();

  res.json({ success: true });
});

app.get('/api/sensor-history/:sensorId', (req: Request, res: Response) => {
  const sensorId = req.params.sensorId as string;
  res.json(sensorHistory[sensorId] || []);
});

// WebSocket
io.on('connection', (socket: any) => {
  console.log('[SOCKET] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[SOCKET] Client disconnected:', socket.id));
});

// Start Simulation
startSensorSimulation(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[BACKEND] Server running on port ${PORT}`);
});
