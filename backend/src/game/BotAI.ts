import { PlayerInput, Direction, Position, TileType } from '@blast-arena/shared';
import { Player } from './Player';
import { GameStateManager } from './GameState';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class BotAI {
  private seq: number = 0;
  private lastDirection: Direction = 'down';
  private directionTicks: number = 0;
  private fleeing: boolean = false;

  generateInput(player: Player, state: GameStateManager): PlayerInput | null {
    if (!player.alive) return null;

    this.seq++;
    const pos = player.position;

    // Check if standing on or near an explosion — flee!
    const inDanger = this.isInDanger(pos, state);

    if (inDanger) {
      this.fleeing = true;
      const safeDir = this.findSafeDirection(pos, state);
      if (safeDir) {
        return { seq: this.seq, direction: safeDir, action: null, tick: state.tick };
      }
    } else {
      this.fleeing = false;
    }

    // Every ~40 ticks try to place a bomb near a destructible wall
    if (!this.fleeing && state.tick % 40 < 2 && player.canPlaceBomb()) {
      if (this.isNearDestructible(pos, state)) {
        return { seq: this.seq, direction: null, action: 'bomb', tick: state.tick };
      }
    }

    // Move: change direction occasionally or when blocked
    this.directionTicks++;
    if (this.directionTicks > 8 + Math.floor(Math.random() * 12)) {
      this.lastDirection = this.pickDirection(pos, state);
      this.directionTicks = 0;
    }

    // Check if current direction is blocked
    const bombPositions = Array.from(state.bombs.values()).map(b => b.position);
    const otherPlayers = Array.from(state.players.values())
      .filter(p => p.id !== player.id && p.alive)
      .map(p => p.position);
    const canMove = state.collisionSystem.canMoveTo(pos.x, pos.y, this.lastDirection, bombPositions, otherPlayers);
    if (!canMove) {
      this.lastDirection = this.pickDirection(pos, state);
      this.directionTicks = 0;
    }

    return { seq: this.seq, direction: this.lastDirection, action: null, tick: state.tick };
  }

  private isInDanger(pos: Position, state: GameStateManager): boolean {
    // Check active explosions
    for (const exp of state.explosions.values()) {
      if (exp.containsCell(pos.x, pos.y)) return true;
    }
    // Check bombs about to explode (within 20 ticks)
    for (const bomb of state.bombs.values()) {
      if (bomb.ticksRemaining < 20) {
        const dx = Math.abs(bomb.position.x - pos.x);
        const dy = Math.abs(bomb.position.y - pos.y);
        if ((dx === 0 && dy <= bomb.fireRange) || (dy === 0 && dx <= bomb.fireRange)) {
          return true;
        }
      }
    }
    return false;
  }

  private findSafeDirection(pos: Position, state: GameStateManager): Direction | null {
    const bombPositions = Array.from(state.bombs.values()).map(b => b.position);
    const otherPlayers = Array.from(state.players.values())
      .filter(p => p.id !== -1 && p.alive)
      .map(p => p.position);

    const safe: Direction[] = [];
    for (const dir of DIRECTIONS) {
      const newPos = state.collisionSystem.canMoveTo(pos.x, pos.y, dir, bombPositions, otherPlayers);
      if (newPos && !this.isInDanger(newPos, state)) {
        safe.push(dir);
      }
    }
    if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];

    // Any movable direction as fallback
    for (const dir of DIRECTIONS) {
      if (state.collisionSystem.canMoveTo(pos.x, pos.y, dir, bombPositions, otherPlayers)) {
        return dir;
      }
    }
    return null;
  }

  private isNearDestructible(pos: Position, state: GameStateManager): boolean {
    for (const dir of DIRECTIONS) {
      const nx = pos.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
      const ny = pos.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
      if (state.collisionSystem.getTileAt(nx, ny) === 'destructible') return true;
    }
    return false;
  }

  private pickDirection(pos: Position, state: GameStateManager): Direction {
    const bombPositions = Array.from(state.bombs.values()).map(b => b.position);
    const otherPlayers = Array.from(state.players.values())
      .filter(p => p.alive)
      .map(p => p.position);

    // Prefer directions we can move in, shuffled
    const shuffled = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    for (const dir of shuffled) {
      if (state.collisionSystem.canMoveTo(pos.x, pos.y, dir, bombPositions, otherPlayers)) {
        return dir;
      }
    }
    return this.lastDirection;
  }
}
