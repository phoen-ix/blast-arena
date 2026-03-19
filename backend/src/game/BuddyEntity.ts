import { Position, Direction, BuddyState } from '@blast-arena/shared';

/**
 * Buddy mode stub — mini-player controlled by second player.
 * Foundation only; not processed in tick loop yet.
 */
export class BuddyEntity {
  public position: Position;
  public direction: Direction = 'down';
  public active: boolean = false;

  constructor(spawnPosition: Position) {
    this.position = { ...spawnPosition };
  }

  toState(): BuddyState {
    return {
      position: { ...this.position },
      direction: this.direction,
      active: this.active,
    };
  }
}
