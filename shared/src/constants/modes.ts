export type GameMode = 'ffa' | 'teams' | 'battle_royale';

export interface GameModeConfig {
  mode: GameMode;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  defaultMapWidth: number;
  defaultMapHeight: number;
  roundTimeSeconds: number;
  teamsCount?: number;
  hasZone?: boolean;
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  ffa: {
    mode: 'ffa',
    name: 'Free for All',
    description: 'Last player standing wins',
    minPlayers: 2,
    maxPlayers: 8,
    defaultMapWidth: 15,
    defaultMapHeight: 13,
    roundTimeSeconds: 180,
  },
  teams: {
    mode: 'teams',
    name: 'Teams',
    description: 'Two teams compete - last team standing wins',
    minPlayers: 4,
    maxPlayers: 8,
    defaultMapWidth: 17,
    defaultMapHeight: 13,
    roundTimeSeconds: 240,
    teamsCount: 2,
  },
  battle_royale: {
    mode: 'battle_royale',
    name: 'Battle Royale',
    description: 'Shrinking zone forces players together',
    minPlayers: 4,
    maxPlayers: 8,
    defaultMapWidth: 19,
    defaultMapHeight: 15,
    roundTimeSeconds: 300,
    hasZone: true,
  },
};

// Battle Royale zone config
export const BR_ZONE_INITIAL_DELAY_SECONDS = 30;
export const BR_ZONE_SHRINK_INTERVAL_SECONDS = 15;
export const BR_ZONE_SHRINK_AMOUNT = 1;
export const BR_ZONE_DAMAGE_PER_TICK = 1;
export const BR_ZONE_MIN_RADIUS = 3;
