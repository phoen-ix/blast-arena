import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

// --- Mock setup (jest.mock is hoisted before imports) ---

const mockExecute = jest.fn<AnyFn>();
jest.mock('../../../backend/src/db/connection', () => ({
  query: jest.fn(),
  execute: mockExecute,
}));

const mockUpdateRoomStatus = jest.fn<AnyFn>();
jest.mock('../../../backend/src/services/lobby', () => ({
  updateRoomStatus: mockUpdateRoomStatus,
  createRoom: jest.fn(),
  getRoom: jest.fn(),
  deleteRoom: jest.fn(),
  getRoomList: jest.fn(),
}));

jest.mock('../../../backend/src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../backend/src/services/settings', () => ({
  isRecordingEnabled: jest.fn<AnyFn>().mockResolvedValue(false),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

const mockGameLoopStart = jest.fn();
const mockGameLoopStop = jest.fn();
const mockGameLoopIsRunning = jest.fn().mockReturnValue(false);
jest.mock('../../../backend/src/game/GameLoop', () => ({
  GameLoop: jest.fn().mockImplementation(() => ({
    start: mockGameLoopStart,
    stop: mockGameLoopStop,
    isRunning: mockGameLoopIsRunning,
  })),
}));

jest.mock('../../../backend/src/utils/replayRecorder', () => ({
  ReplayRecorder: jest.fn().mockImplementation(() => ({
    setMatchId: jest.fn(),
    recordTick: jest.fn(),
    finalize: jest.fn(),
  })),
}));

jest.mock('../../../backend/src/utils/gameLogger', () => ({
  GameLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    logGameOver: jest.fn(),
    logPlayerDisconnect: jest.fn(),
    logPlayerLeave: jest.fn(),
    replayRecorder: null,
  })),
}));

import { GameRoom } from '../../../backend/src/game/GameRoom';

// --- Helpers ---

function createMockRoom(configOverrides: Record<string, unknown> = {}) {
  return {
    code: 'ABC123',
    name: 'Test Room',
    host: { id: 1, username: 'host', role: 'user' as const },
    players: [
      {
        user: { id: 1, username: 'host', role: 'user' as const },
        ready: true,
        team: null,
      },
      {
        user: { id: 2, username: 'player2', role: 'user' as const },
        ready: true,
        team: null,
      },
    ],
    config: {
      gameMode: 'ffa' as const,
      maxPlayers: 8,
      mapWidth: 15,
      mapHeight: 13,
      mapSeed: 12345,
      roundTime: 180,
      wallDensity: 0.65,
      powerUpDropRate: 0.3,
      enabledPowerUps: ['bomb_up', 'fire_up', 'speed_up', 'shield', 'kick'] as string[],
      botCount: 0,
      botDifficulty: 'normal' as const,
      botTeams: {} as Record<string, unknown>,
      friendlyFire: true,
      hazardTiles: false,
      enableMapEvents: false,
      reinforcedWalls: false,
      recordGame: false,
      ...configOverrides,
    },
    status: 'waiting' as const,
    createdAt: new Date(),
  };
}

function createMockIo() {
  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  return {
    io: {
      to: mockTo,
      sockets: { adapter: { rooms: new Map() } },
    } as any,
    mockTo,
    mockEmit,
  };
}

describe('GameRoom', () => {
  let mockIo: any;
  let mockTo: jest.Mock;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const ioSetup = createMockIo();
    mockIo = ioSetup.io;
    mockTo = ioSetup.mockTo;
    mockEmit = ioSetup.mockEmit;
    mockExecute.mockResolvedValue({ insertId: 1, affectedRows: 1 });
    mockUpdateRoomStatus.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should create instance without error', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      expect(gameRoom).toBeDefined();
    });

    it('should expose room code via code property', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      expect(gameRoom.code).toBe('ABC123');
    });
  });

  describe('handleInput', () => {
    it('should accept player input without throwing', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      expect(() => {
        gameRoom.handleInput(1, { seq: 1, direction: 'right', action: null, tick: 0 });
      }).not.toThrow();
    });
  });

  describe('handlePlayerDisconnect', () => {
    it('should record disconnect without throwing', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      expect(() => {
        gameRoom.handlePlayerDisconnect(1);
      }).not.toThrow();
    });
  });

  describe('handlePlayerReconnect', () => {
    it('should return false when player was not disconnected', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      const result = gameRoom.handlePlayerReconnect(1);

      expect(result).toBe(false);
    });

    it('should return false for unknown player ID', () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      const result = gameRoom.handlePlayerReconnect(999);

      expect(result).toBe(false);
    });
  });

  describe('start', () => {
    it('should call execute to create match record', async () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO matches'),
        expect.arrayContaining(['ABC123', 'ffa']),
      );
    });

    it('should insert match_players for human players', async () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      const matchPlayerCalls = mockExecute.mock.calls.filter(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('match_players'),
      );
      expect(matchPlayerCalls.length).toBe(2);
    });

    it('should emit game:start event via io.to()', async () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      expect(mockTo).toHaveBeenCalledWith('room:ABC123');
      expect(mockEmit).toHaveBeenCalledWith('game:start', expect.any(Object));
    });

    it('should start the game loop', async () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      expect(mockGameLoopStart).toHaveBeenCalled();
    });

    it('should update room status to playing', async () => {
      const room = createMockRoom();
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      expect(mockUpdateRoomStatus).toHaveBeenCalledWith('ABC123', 'playing');
    });
  });

  describe('bots', () => {
    it('should assign negative IDs to bot players', () => {
      const room = createMockRoom({ botCount: 2 });
      const gameRoom = new GameRoom(mockIo, room as any);

      const state = gameRoom.getFullState();
      const botPlayers = state.players.filter((p) => p.id < 0);

      expect(botPlayers.length).toBe(2);
      expect(botPlayers[0].id).toBe(-1);
      expect(botPlayers[1].id).toBe(-2);
    });

    it('should add bots as players with bot names', () => {
      const room = createMockRoom({ botCount: 1 });
      const gameRoom = new GameRoom(mockIo, room as any);

      const state = gameRoom.getFullState();
      const botPlayers = state.players.filter((p) => p.id < 0);

      expect(botPlayers.length).toBe(1);
      expect(botPlayers[0].username).toBe('Bomber Bot');
      expect(botPlayers[0].isBot).toBe(true);
    });

    it('should not insert match_players for bots during start', async () => {
      const room = createMockRoom({ botCount: 2 });
      const gameRoom = new GameRoom(mockIo, room as any);

      await gameRoom.start();

      const matchPlayerCalls = mockExecute.mock.calls.filter(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('match_players'),
      );
      // Only 2 human players, not 4 (2 humans + 2 bots)
      expect(matchPlayerCalls.length).toBe(2);
    });
  });
});
