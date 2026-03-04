import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
});
