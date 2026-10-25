import { io } from 'socket.io-client';

// Dev: same origin (Vite proxies /socket.io). Production: the API server (VITE_API_URL without "/api").
const apiUrl = import.meta.env.VITE_API_URL;
const base = apiUrl ? apiUrl.replace(/\/api\/?$/, '') : undefined;

export const socket = io(base, { transports: ['websocket', 'polling'] });
