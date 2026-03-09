import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log(`[SOCKET] Conectado ao servidor: ${URL}`);
});

socket.on('connect_error', (err) => {
  console.error('[SOCKET] Erro de conexão:', err.message);
});

socket.on('disconnect', (reason) => {
  console.warn('[SOCKET] Desconectado:', reason);
});
