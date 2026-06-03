import { io, Socket } from 'socket.io-client';

// Production Render backend URL (hardcoded as reliable fallback)
const PRODUCTION_SOCKET_URL = 'https://codeshare-backend-rbe5.onrender.com';

const getSocketUrl = (): string => {
  // Client-side detection to avoid using localhost URLs in production environments
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Local development — connect to local server or environment variable
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    }

    // Production — use NEXT_PUBLIC_SOCKET_URL only if it is a production URL, otherwise fallback to Render backend
    if (
      process.env.NEXT_PUBLIC_SOCKET_URL &&
      !process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost') &&
      !process.env.NEXT_PUBLIC_SOCKET_URL.includes('127.0.0.1')
    ) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }

    return PRODUCTION_SOCKET_URL;
  }

  // Server-side fallback
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
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
