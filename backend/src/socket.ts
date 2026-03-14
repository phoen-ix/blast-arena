import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getConfig } from './config';
import { logger } from './utils/logger';
import { sanitizeChatMessage } from './utils/sanitize';
import * as lobbyService from './services/lobby';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  AuthPayload,
  PublicUser,
} from '@blast-arena/shared';

export function createSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: process.env.APP_URL || 'http://localhost:8080',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, getConfig().JWT_SECRET) as AuthPayload;
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info({ userId: socket.data.userId, username: socket.data.username }, 'Socket connected');

    const currentUser: PublicUser = {
      id: socket.data.userId,
      username: socket.data.username,
      displayName: socket.data.username,
      role: socket.data.role as any,
    };

    // Room creation
    socket.on('room:create', async (data, callback) => {
      try {
        const room = await lobbyService.createRoom(currentUser, data.name, data.config);
        socket.join(`room:${room.code}`);
        callback({ success: true, room });
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Join room
    socket.on('room:join', async (data, callback) => {
      try {
        const room = await lobbyService.joinRoom(data.code, currentUser);
        socket.join(`room:${room.code}`);
        socket.to(`room:${room.code}`).emit('room:playerJoined', { user: currentUser, ready: false, team: null });
        callback({ success: true, room });
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // Leave room
    socket.on('room:leave', async () => {
      const roomCode = await lobbyService.getPlayerRoom(socket.data.userId);
      if (!roomCode) return;

      const room = await lobbyService.leaveRoom(roomCode, socket.data.userId);
      socket.leave(`room:${roomCode}`);
      if (room) {
        io.to(`room:${roomCode}`).emit('room:playerLeft', socket.data.userId);
        io.to(`room:${roomCode}`).emit('room:state', room);
      }
    });

    // Ready toggle
    socket.on('room:ready', async (data) => {
      const roomCode = await lobbyService.getPlayerRoom(socket.data.userId);
      if (!roomCode) return;

      try {
        await lobbyService.setPlayerReady(roomCode, socket.data.userId, data.ready);
        io.to(`room:${roomCode}`).emit('room:playerReady', { userId: socket.data.userId, ready: data.ready });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // Start game
    socket.on('room:start', async () => {
      const roomCode = await lobbyService.getPlayerRoom(socket.data.userId);
      if (!roomCode) return;

      const room = await lobbyService.getRoom(roomCode);
      if (!room) return;

      // Verify host
      if (room.host.id !== socket.data.userId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      // Check all players ready
      const allReady = room.players.every(p => p.user.id === room.host.id || p.ready);
      if (!allReady) {
        socket.emit('error', { message: 'Not all players are ready' });
        return;
      }

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players' });
        return;
      }

      // Start countdown
      await lobbyService.updateRoomStatus(roomCode, 'countdown');
      io.to(`room:${roomCode}`).emit('room:countdown', { seconds: 3 });

      // TODO: After countdown, create GameRoom and start game loop
      logger.info({ roomCode }, 'Game starting (countdown)');
    });

    // Game input
    socket.on('game:input', (input) => {
      // TODO: Forward to game room's input buffer
    });

    // Chat
    socket.on('chat:message', async (data) => {
      const roomCode = await lobbyService.getPlayerRoom(socket.data.userId);
      if (!roomCode) return;

      const sanitized = sanitizeChatMessage(data.message);
      if (!sanitized) return;

      io.to(`room:${roomCode}`).emit('chat:message', {
        user: currentUser,
        message: sanitized,
        timestamp: Date.now(),
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      logger.info({ userId: socket.data.userId }, 'Socket disconnected');

      const roomCode = await lobbyService.getPlayerRoom(socket.data.userId);
      if (roomCode) {
        const room = await lobbyService.leaveRoom(roomCode, socket.data.userId);
        if (room) {
          io.to(`room:${roomCode}`).emit('room:playerLeft', socket.data.userId);
          io.to(`room:${roomCode}`).emit('room:state', room);
        }
      }
    });
  });

  return io;
}
