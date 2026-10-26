'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

export function useConnectionStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const update = () => setConnected(socket.connected);
    update();
    socket.on('connect', update);
    socket.on('disconnect', update);
    return () => { socket.off('connect', update); socket.off('disconnect', update); };
  }, []);
  return connected;
}
