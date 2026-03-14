import { PowerUpType } from '../types/game';

export const POWERUP_DROP_CHANCE = 0.3;

export interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
  weight: number; // Relative probability
  color: string;
}

export const POWERUP_DEFINITIONS: Record<PowerUpType, PowerUpDefinition> = {
  bomb_up: {
    type: 'bomb_up',
    name: 'Bomb Up',
    description: 'Increases max bombs by 1',
    weight: 30,
    color: '#FF4444',
  },
  fire_up: {
    type: 'fire_up',
    name: 'Fire Up',
    description: 'Increases explosion range by 1',
    weight: 30,
    color: '#FF8800',
  },
  speed_up: {
    type: 'speed_up',
    name: 'Speed Up',
    description: 'Increases movement speed',
    weight: 25,
    color: '#44AAFF',
  },
  shield: {
    type: 'shield',
    name: 'Shield',
    description: 'Absorbs one explosion hit',
    weight: 10,
    color: '#44FF44',
  },
  kick: {
    type: 'kick',
    name: 'Bomb Kick',
    description: 'Kick bombs by walking into them',
    weight: 5,
    color: '#CC44FF',
  },
};

export const POWERUP_TOTAL_WEIGHT = Object.values(POWERUP_DEFINITIONS).reduce(
  (sum, def) => sum + def.weight,
  0
);

export function getRandomPowerUpType(random: () => number): PowerUpType {
  let roll = random() * POWERUP_TOTAL_WEIGHT;
  for (const def of Object.values(POWERUP_DEFINITIONS)) {
    roll -= def.weight;
    if (roll <= 0) return def.type;
  }
  return 'bomb_up'; // fallback
}
