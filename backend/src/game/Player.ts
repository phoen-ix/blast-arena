import { PlayerState, Position, Direction, PowerUpType } from '@blast-arena/shared';
import { DEFAULT_SPEED, DEFAULT_MAX_BOMBS, DEFAULT_FIRE_RANGE, MAX_SPEED, MAX_BOMBS, MAX_FIRE_RANGE, SHIELD_DURATION_TICKS, INVULNERABILITY_TICKS } from '@blast-arena/shared';

export class Player {
  public readonly id: number;
  public readonly username: string;
  public readonly displayName: string;
  public position: Position;
  public alive: boolean = true;
  public bombCount: number = 0;
  public maxBombs: number = DEFAULT_MAX_BOMBS;
  public fireRange: number = DEFAULT_FIRE_RANGE;
  public speed: number = DEFAULT_SPEED;
  public hasShield: boolean = false;
  public shieldTicksRemaining: number = 0;
  public hasKick: boolean = false;
  public team: number | null = null;
  public direction: Direction = 'down';
  public invulnerableTicks: number = INVULNERABILITY_TICKS;

  // Stats tracking
  public kills: number = 0;
  public deaths: number = 0;
  public bombsPlaced: number = 0;
  public powerupsCollected: number = 0;
  public placement: number | null = null;

  constructor(id: number, username: string, displayName: string, spawnPosition: Position, team: number | null = null) {
    this.id = id;
    this.username = username;
    this.displayName = displayName;
    this.position = { ...spawnPosition };
    this.team = team;
  }

  applyPowerUp(type: PowerUpType): void {
    this.powerupsCollected++;
    switch (type) {
      case 'bomb_up':
        this.maxBombs = Math.min(this.maxBombs + 1, MAX_BOMBS);
        break;
      case 'fire_up':
        this.fireRange = Math.min(this.fireRange + 1, MAX_FIRE_RANGE);
        break;
      case 'speed_up':
        this.speed = Math.min(this.speed + 1, MAX_SPEED);
        break;
      case 'shield':
        this.hasShield = true;
        this.shieldTicksRemaining = SHIELD_DURATION_TICKS;
        break;
      case 'kick':
        this.hasKick = true;
        break;
    }
  }

  canPlaceBomb(): boolean {
    return this.alive && this.bombCount < this.maxBombs;
  }

  die(): void {
    this.alive = false;
    this.deaths++;
  }

  tick(): void {
    if (this.invulnerableTicks > 0) {
      this.invulnerableTicks--;
    }
    if (this.hasShield) {
      this.shieldTicksRemaining--;
      if (this.shieldTicksRemaining <= 0) {
        this.hasShield = false;
      }
    }
  }

  toState(): PlayerState {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      position: { ...this.position },
      alive: this.alive,
      bombCount: this.bombCount,
      maxBombs: this.maxBombs,
      fireRange: this.fireRange,
      speed: this.speed,
      hasShield: this.hasShield,
      hasKick: this.hasKick,
      team: this.team,
      direction: this.direction,
    };
  }
}
