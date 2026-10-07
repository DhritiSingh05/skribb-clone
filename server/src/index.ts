import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { RoomManager } from './services/RoomManager';
import { WordManager } from './services/WordManager';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Initialize core services
const wordManager = new WordManager();
const roomManager = new RoomManager(io, wordManager);

// Attach Socket Handlers
setupSocketHandlers(io, roomManager);

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: roomManager.getPublicRooms() });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({ room: room.getPublicInfo() });
});

// Serve production client build if available
const candidateDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(p));

if (clientDistPath) {
  console.log(`📦 Serving static client build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`===============================================`);
  console.log(`🎨 skribbl.io Clone Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`===============================================`);
});

export { app, server, io, roomManager, wordManager };
