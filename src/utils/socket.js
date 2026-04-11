import { io } from 'socket.io-client';

// Use ngrok tunnel for backend WebSocket only
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://dani-backend.ngrok-free.dev';

let socket = null;

export function initSocket() {
  if (socket) return socket;

  socket = io(BACKEND_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Connected to server at', BACKEND_URL);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Utility functions for game events

export function joinGame(name, difficulty) {
  const socket = getSocket();
  socket.emit('player-join', { name, difficulty });
}

export function sendPlayerUpdate(roomId, bladePoints, score, timeLeft, playerId) {
  const socket = getSocket();
  socket.emit('player-update', {
    roomId,
    bladePoints: bladePoints.slice(-5), // Send only last 5 points to save bandwidth
    score,
    timeLeft,
    playerId
  });
}

export function sendGameOver(roomId, finalScore, playerId) {
  const socket = getSocket();
  socket.emit('game-over', { roomId, finalScore, playerId });
}

export function requestRematch(roomId, playerId) {
  const socket = getSocket();
  socket.emit('rematch-request', { roomId, playerId });
}

export function onMatchFound(callback) {
  const socket = getSocket();
  socket.on('match-found', callback);
}

export function onOpponentUpdate(callback) {
  const socket = getSocket();
  socket.on('opponent-update', callback);
}

export function onGameEnded(callback) {
  const socket = getSocket();
  socket.on('game-ended', callback);
}

export function onOpponentDisconnected(callback) {
  const socket = getSocket();
  socket.on('opponent-disconnected', callback);
}

export function onWaitingForOpponent(callback) {
  const socket = getSocket();
  socket.on('waiting-for-opponent', callback);
}

export function onRematchReady(callback) {
  const socket = getSocket();
  socket.on('rematch-ready', callback);
}
