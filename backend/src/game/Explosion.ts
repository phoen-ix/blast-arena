import { ExplosionState, Position } from '@blast-arena/shared';
import { EXPLOSION_DURATION_TICKS } from '@blast-arena/shared';
import { v4 as uuidv4 } from 'uuid';

export class Explosion {
  public readonly id: string;
  public readonly cells: Position[];
  public readonly ownerId: number;
  public ticksRemaining: number;

  constructor(cells: Position[], ownerId: number) {
    this.id = uuidv4();
    this.cells = cells.map(c => ({ ...c }));
    this.ownerId = ownerId;
    this.ticksRemaining = EXPLOSION_DURATION_TICKS;
  }

  tick(): boolean {
    this.ticksRemaining--;
    return this.ticksRemaining <= 0;
  }

  containsCell(x: number, y: number): boolean {
    return this.cells.some(c => c.x === x && c.y === y);
  }

  toState(): ExplosionState {
    return {
      id: this.id,
      cells: this.cells.map(c => ({ ...c })),
      ownerId: this.ownerId,
      ticksRemaining: this.ticksRemaining,
    };
  }
}
