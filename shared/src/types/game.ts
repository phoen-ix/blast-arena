export type TileType = 'empty' | 'wall' | 'destructible' | 'spawn';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PowerUpType = 'bomb_up' | 'fire_up' | 'speed_up' | 'shield' | 'kick';

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  id: number;
  username: string;
  displayName: string;
  position: Position;
  alive: boolean;
  bombCount: number;
  maxBombs: number;
  fireRange: number;
  speed: number;
  hasShield: boolean;
  hasKick: boolean;
  team: number | null;
  direction: Direction;
}

export interface BombState {
  id: string;
  position: Position;
  ownerId: number;
  fireRange: number;
  ticksRemaining: number;
}

export interface ExplosionState {
  id: string;
  cells: Position[];
  ownerId: number;
  ticksRemaining: number;
}

export interface PowerUpState {
  id: string;
  position: Position;
  type: PowerUpType;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: TileType[][];
  spawnPoints: Position[];
  seed: number;
}

export interface GameState {
  tick: number;
  players: PlayerState[];
  bombs: BombState[];
  explosions: ExplosionState[];
  powerUps: PowerUpState[];
  map: GameMap;
  zone?: ZoneState;
  status: 'countdown' | 'playing' | 'finished';
  winnerId: number | null;
  winnerTeam: number | null;
  timeElapsed: number;
}

export interface ZoneState {
  currentRadius: number;
  targetRadius: number;
  centerX: number;
  centerY: number;
  shrinkRate: number;
  damagePerTick: number;
  nextShrinkTick: number;
}

export interface PlayerInput {
  seq: number;
  direction: Direction | null;
  action: 'bomb' | null;
  tick: number;
}
