import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';

let roomManager: RoomManager | null = null;
let io: Server | null = null;

export function setRegistry(rm: RoomManager, ioServer: Server): void {
  roomManager = rm;
  io = ioServer;
}

export function getRoomManager(): RoomManager {
  if (!roomManager) throw new Error('RoomManager not initialized');
  return roomManager;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io server not initialized');
  return io;
}
