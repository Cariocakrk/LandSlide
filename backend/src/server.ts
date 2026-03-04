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
