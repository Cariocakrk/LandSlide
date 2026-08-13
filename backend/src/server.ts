import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { startSensorSimulation } from './lib/mockSensors';
import { initWhatsApp, getWhatsAppStatus, updateActiveSensor } from './lib/whatsapp';
import authRoutes from './routes/auth.routes';
import createApiRouter from './routes/api.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', createApiRouter(io));

// WebSocket Connection and Listeners
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  // Enviar status atual do WhatsApp para o cliente conectado
  socket.emit('whatsapp-status', getWhatsAppStatus());

  // Listener para calibração de sensores
  socket.on('calibrateSensor', (data) => {
    console.log(`[Socket] Calibrate sensor event received:`, data);
    // Broadcast para sincronizar outros operadores conectados
    socket.broadcast.emit('sensorCalibrated', data);
    
    // Atualizar no bot do WhatsApp se dados forem válidos
    if (data.sensorId && data.newSlope !== undefined) {
      updateActiveSensor({
        sensorId: data.sensorId,
        slope: data.newSlope,
        moisture: 40, // valor default
        rain: 0,
        vibration: 0,
        risk: 0
      });
    }
  });

  // Listener para teste de sirene
  socket.on('sirenTest', (data) => {
    console.log(`[Socket] Siren test event received:`, data);
    // Broadcast para sincronizar outros operadores conectados
    socket.broadcast.emit('sirenTested', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// Start WhatsApp Service
initWhatsApp(io);

// Start Simulation
startSensorSimulation(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});

