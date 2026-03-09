import { Server } from 'socket.io';

export function startSensorSimulation(io: Server) {
  console.log('[SIMULATION] Starting sensor telemetry simulation...');
  
  // Real-time loop
  setInterval(() => {
    // Basic simulation logic: emit random data for a few mock sensors
    const mockSensors = ['IOT-A1B2', 'IOT-C3D4', 'IOT-E5F6'];
    
    mockSensors.forEach(id => {
      const data = {
        sensorId: id,
        slope: Number((15 + Math.random() * 20).toFixed(2)),
        moisture: Number((40 + Math.random() * 40).toFixed(2)),
        rain: Number((Math.random() * 10).toFixed(2)),
        vibration: Number((Math.random() * 5).toFixed(2)),
        risk: Number((Math.random() * 30).toFixed(2)),
        timestamp: Date.now()
      };
      
      // Emit via socket
      io.emit('sensorData', data);
    });
  }, 5000);
}

// In case the module expects other exports based on usage
export type SimulationMode = 'dry' | 'rainy' | 'storm';
export let currentMode: SimulationMode = 'dry';

export function setSimulationMode(mode: SimulationMode) {
  currentMode = mode;
  console.log(`[SIMULATION] Mode set to: ${mode}`);
}
