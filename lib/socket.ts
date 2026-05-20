import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  // 1. If the environment variable is explicitly set, use it
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  // 2. Client-side smart fallback to prevent Edge local network popups
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Only target local server if the user is running the app on their local machine
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'http://localhost:3000';
    }
    // Fallback to current host domain. It will fail gracefully in the console instead of triggering a browser device-access warning.
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

const URL = getSocketUrl();
if (typeof window !== 'undefined') {
  console.log('[Socket] Initialized with URL:', URL);
}

export const socket: Socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
