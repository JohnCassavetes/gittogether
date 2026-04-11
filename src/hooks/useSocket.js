import { useEffect, useRef, useCallback } from 'react';
import { initSocket, getSocket } from '../utils/socket';

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = initSocket();

    return () => {
      // Don't close socket on unmount - it might be needed for next game
      // closeSocket();
    };
  }, []);

  const on = useCallback((event, callback) => {
    const socket = getSocket();
    socket.on(event, callback);
    return () => socket.off(event);
  }, []);

  const emit = useCallback((event, data) => {
    const socket = getSocket();
    socket.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    on,
    emit
  };
}
