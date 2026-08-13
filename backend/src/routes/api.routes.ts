import { Router } from 'express';
import { getHistory } from '../controllers/history.controller';
import { changeSimulationMode } from '../controllers/simulation.controller';
import { getProtocols, createMockProtocol, updateProtocolStatus } from '../controllers/protocols.controller';
import { generateTerrain } from '../controllers/terrain.controller';
import { getWeatherForecast } from '../controllers/weather.controller';
import { receiveSensorData, getSensorHistory } from '../controllers/sensors.controller';
import { dispatchAlert, getAlerts } from '../controllers/alerts.controller';
import { getStatus, disconnect } from '../controllers/whatsapp.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

export default function createApiRouter(io: any): Router {
  const router = Router();

  // Public/IoT/Utility Routes (Sem JWT para facilidade do simulador de sensores e geocodificação)
  router.post('/sensor-data', receiveSensorData);
  router.get('/sensor-history/:sensorId', getSensorHistory);
  router.post('/generate-terrain', generateTerrain);
  router.get('/weather/:lat/:lng', getWeatherForecast);

  // Authenticated/Operator Routes (Protegidas por JWT)
  router.get('/history', authMiddleware, getHistory);
  router.post('/simulation/mode', authMiddleware, requireRole('OPERATOR'), (req, res) => changeSimulationMode(req, res, io));
  router.get('/defense-protocols', authMiddleware, getProtocols);
  router.post('/defense-protocols/mock', authMiddleware, requireRole('OPERATOR'), (req, res) => createMockProtocol(req, res, io));
  router.post('/defense-protocols/:id/status', authMiddleware, requireRole('OPERATOR'), (req, res) => updateProtocolStatus(req, res, io));
  router.post('/alerts/dispatch', authMiddleware, requireRole('OPERATOR'), (req, res) => dispatchAlert(req, res, io));
  router.get('/alerts', authMiddleware, getAlerts);
  router.get('/whatsapp/status', authMiddleware, requireRole('OPERATOR'), getStatus);
  router.post('/whatsapp/disconnect', authMiddleware, requireRole('OPERATOR'), disconnect);

  return router;
}
