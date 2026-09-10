import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_API_URL;
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const socket = io(URL || (isLocal ? 'http://localhost:3001' : ''), {
  autoConnect: Boolean(URL) || isLocal,
  reconnectionAttempts: 3,
});
