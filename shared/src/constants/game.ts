export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE; // 50ms
export const TILE_SIZE = 48; // pixels

// Map defaults
export const DEFAULT_MAP_WIDTH = 15;
export const DEFAULT_MAP_HEIGHT = 13;
export const DESTRUCTIBLE_FILL_RATE = 0.65;
export const SPAWN_CLEAR_RADIUS = 2;

// Player defaults
export const DEFAULT_SPEED = 1;
export const DEFAULT_MAX_BOMBS = 1;
export const DEFAULT_FIRE_RANGE = 1;
export const MAX_SPEED = 5;
export const MAX_BOMBS = 8;
export const MAX_FIRE_RANGE = 8;

// Timings (in ticks at 20 tps)
export const BOMB_TIMER_TICKS = 60; // 3 seconds
export const EXPLOSION_DURATION_TICKS = 10; // 0.5 seconds
export const SHIELD_DURATION_TICKS = 200; // 10 seconds
export const COUNTDOWN_SECONDS = 3;
export const INVULNERABILITY_TICKS = 40; // 2 seconds after spawn

// Game limits
export const MAX_PLAYERS_PER_ROOM = 8;
export const MIN_PLAYERS_TO_START = 2;
export const MAX_ROOMS = 50;
