import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const CSV_FILE = './leaderboard.csv';

// Matchmaking queue and room management
const waitingQueue = [];
const activeRooms = new Map(); // roomId -> { p1SocketId, p2SocketId, p1Name, p2Name, p1Score, p2Score, startTime }
const rematchRequests = new Map(); // roomId -> Set of playerIds requesting rematch

// Initialize CSV with headers if it doesn't exist
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, 'name,score\nAAA,100\nNJA,50\nBOB,20\n');
}

function getTopScoresFromCSV() {
  const fileData = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = fileData.trim().split('\n');

  const scores = [];
  // Skip header, parse the rest
  for (let i = 1; i < lines.length; i++) {
    const [name, scoreStr] = lines[i].split(',');
    if (name && scoreStr) {
      scores.push({ name, score: parseInt(scoreStr, 10) });
    }
  }

  // Sort descending and grab top 5
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 5);
}

app.get('/api/scores', (req, res) => {
  try {
    const top5 = getTopScoresFromCSV();
    res.json({ message: "success", data: top5 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  try {
    // Append to CSV, ensuring newline spacing
    let currentData = "";
    if (fs.existsSync(CSV_FILE)) {
      currentData = fs.readFileSync(CSV_FILE, 'utf-8');
    }
    const prefix = currentData && !currentData.endsWith('\n') ? '\n' : '';

    fs.appendFileSync(CSV_FILE, `${prefix}${name.toUpperCase().substring(0,10)},${score}\n`);
    const top5 = getTopScoresFromCSV();
    res.json({ message: "success", data: top5 });
  } catch (err) {
      res.status(400).json({ error: err.message });
  }
});

// Post endpoint for saving both players' scores from networked multiplayer
app.post('/api/scores/multiplayer', (req, res) => {
  const { p1Name, p1Score, p2Name, p2Score } = req.body;
  if (!p1Name || !p2Name) return res.status(400).json({ error: "both names required" });

  try {
    let currentData = "";
    if (fs.existsSync(CSV_FILE)) {
      currentData = fs.readFileSync(CSV_FILE, 'utf-8');
    }
    const prefix = currentData && !currentData.endsWith('\n') ? '\n' : '';

    const entry = `${prefix}${p1Name.toUpperCase().substring(0,10)},${p1Score}\n${p2Name.toUpperCase().substring(0,10)},${p2Score}`;
    fs.appendFileSync(CSV_FILE, entry + '\n');
    const top5 = getTopScoresFromCSV();
    res.json({ message: "success", data: top5 });
  } catch (err) {
      res.status(400).json({ error: err.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('player-join', (data) => {
    const { name, difficulty } = data;
    console.log(`${name} joined queue for ${difficulty} mode`);

    if (waitingQueue.length > 0) {
      // Match found!
      const p1Data = waitingQueue.shift();
      const p2Data = { socketId: socket.id, name, difficulty };

      const roomId = uuidv4();
      const seed = Math.floor(Math.random() * 1000000);
      const startTime = Date.now();

      activeRooms.set(roomId, {
        p1SocketId: p1Data.socketId,
        p2SocketId: p2Data.socketId,
        p1Name: p1Data.name,
        p2Name: p2Data.name,
        p1Score: 0,
        p2Score: 0,
        p1GameOverReceived: false,
        p2GameOverReceived: false,
        difficulty: difficulty,
        startTime: startTime,
        seed: seed
      });

      // Join both players to a socket.io room
      io.to(p1Data.socketId).emit('match-found', {
        roomId,
        playerId: 1,
        opponentName: p2Data.name,
        seed,
        startTime
      });

      io.to(socket.id).emit('match-found', {
        roomId,
        playerId: 2,
        opponentName: p1Data.name,
        seed,
        startTime
      });

      socket.join(roomId);
      io.to(p1Data.socketId).socketsJoin(roomId);
    } else {
      // Add to waiting queue
      waitingQueue.push({ socketId: socket.id, name, difficulty });
      socket.emit('waiting-for-opponent', { message: 'Waiting for opponent...' });
    }
  });

  socket.on('player-update', (data) => {
    const { roomId, bladePoints, score, timeLeft, playerId } = data;
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);

      // Update score for this player
      if (playerId === 1) {
        room.p1Score = score;
      } else {
        room.p2Score = score;
      }

      // Broadcast to opponent
      socket.to(roomId).emit('opponent-update', {
        bladePoints,
        score,
        timeLeft,
        playerId
      });
    }
  });

  socket.on('game-over', (data) => {
    const { roomId, finalScore, playerId } = data;
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);

      // Record final score and mark this player as done
      if (playerId === 1) {
        room.p1Score = finalScore;
        room.p1GameOverReceived = true;
      } else {
        room.p2Score = finalScore;
        room.p2GameOverReceived = true;
      }

      // Only end the match once BOTH players have reported game-over
      if (room.p1GameOverReceived && room.p2GameOverReceived) {
        let winner = 'TIE';
        if (room.p1Score > room.p2Score) winner = 'P1';
        else if (room.p2Score > room.p1Score) winner = 'P2';

        io.to(roomId).emit('game-ended', {
          winner,
          p1Score: room.p1Score,
          p2Score: room.p2Score
        });

        setTimeout(() => {
          activeRooms.delete(roomId);
        }, 5000);
      }
    }
  });

  socket.on('rematch-request', (data) => {
    const { roomId, playerId } = data;
    if (activeRooms.has(roomId)) {
      if (!rematchRequests.has(roomId)) {
        rematchRequests.set(roomId, new Set());
      }
      rematchRequests.get(roomId).add(playerId);

      // Check if both players have requested rematch
      if (rematchRequests.get(roomId).size === 2) {
        const room = activeRooms.get(roomId);
        const seed = Math.floor(Math.random() * 1000000);
        const startTime = Date.now();

        // Reset room scores and emit rematch-ready to both players
        room.p1Score = 0;
        room.p2Score = 0;
        room.startTime = startTime;
        room.seed = seed;

        io.to(roomId).emit('rematch-ready', {
          roomId,
          seed,
          startTime
        });

        // Clear rematch requests for next round
        rematchRequests.delete(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from waiting queue if present
    const queueIndex = waitingQueue.findIndex(p => p.socketId === socket.id);
    if (queueIndex !== -1) {
      waitingQueue.splice(queueIndex, 1);
    }

    // Clean up active rooms
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.p1SocketId === socket.id || room.p2SocketId === socket.id) {
        io.to(roomId).emit('opponent-disconnected', { message: 'Opponent disconnected' });
        activeRooms.delete(roomId);
      }
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0',  () => {
  console.log(`Server running on port ${PORT} (WebSocket & CSV Backend)`);
});
