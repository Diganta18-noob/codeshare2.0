import { io, Socket } from 'socket.io-client';

// Production Render backend URL (hardcoded as reliable fallback)
const PRODUCTION_SOCKET_URL = 'https://codeshare-backend-rbe5.onrender.com';

const getSocketUrl = (): string => {
  // 1. If the environment variable is explicitly set at build time, use it
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  // 2. Client-side: detect environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Local development — connect to local monolith server
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'http://localhost:3000';
    }

    // Production — always use the Render backend
    return PRODUCTION_SOCKET_URL;
  }

  return 'http://localhost:3000';
};

const URL = getSocketUrl();
if (typeof window !== 'undefined') {
  console.log('[Socket] Connecting to:', URL);
}

export const socket: Socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});
