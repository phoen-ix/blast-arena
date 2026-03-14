import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@blast-arena/shared';
import { AuthManager } from './AuthManager';

export class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private authManager: AuthManager;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
  }

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authManager.getAccessToken();
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit<E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>): void {
    if (!this.socket) return;
    (this.socket as any).emit(event, ...args);
  }

  on<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]): void {
    if (!this.socket) return;
    (this.socket as any).on(event, handler);
  }

  off<E extends keyof ServerToClientEvents>(event: E, handler?: ServerToClientEvents[E]): void {
    if (!this.socket) return;
    (this.socket as any).off(event, handler);
  }
}
