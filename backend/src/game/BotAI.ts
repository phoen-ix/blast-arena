import { PlayerInput, Direction, Position, TileType } from '@blast-arena/shared';
import { Player } from './Player';
import { GameStateManager } from './GameState';
import { GameLogger } from '../utils/gameLogger';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function isDestructibleTile(tile: TileType): boolean {
  return tile === 'destructible' || tile === ('destructible_cracked' as TileType);
}

export interface BotDifficultyConfig {
  dangerAwareness: number | 'fireRange';
  escapeSearchDepth: number;
  bombCooldownMin: number;
  bombCooldownMax: number;
  escapeCheckBeforeBomb: boolean;
  huntChance: number;
  powerUpVision: number;
  optimalMoveChance: number;
  useKick: boolean;
  reactionDelay: number;
  huntSearchDepth: number;
  dangerTimerThreshold: number;
  roamAfterIdleTicks: number;
}

const DIFFICULTY_PRESETS: Record<'easy' | 'normal' | 'hard', BotDifficultyConfig> = {
  easy: {
    dangerAwareness: 'fireRange',
    escapeSearchDepth: 3,
    bombCooldownMin: 40,
    bombCooldownMax: 70,
    escapeCheckBeforeBomb: false,
    huntChance: 0.2,
    powerUpVision: 2,
    optimalMoveChance: 0.4,
    useKick: false,
    reactionDelay: 3,
    huntSearchDepth: 10,
    dangerTimerThreshold: 0,
    roamAfterIdleTicks: 0,
  },
  normal: {
    dangerAwareness: 99,
    escapeSearchDepth: 5,
    bombCooldownMin: 15,
    bombCooldownMax: 30,
    escapeCheckBeforeBomb: true,
    huntChance: 0.5,
    powerUpVision: 8,
    optimalMoveChance: 0.7,
    useKick: true,
    reactionDelay: 0,
    huntSearchDepth: 25,
    dangerTimerThreshold: 30,
    roamAfterIdleTicks: 100,
  },
  hard: {
    dangerAwareness: 99,
    escapeSearchDepth: 8,
    bombCooldownMin: 8,
    bombCooldownMax: 18,
    escapeCheckBeforeBomb: true,
    huntChance: 0.8,
    powerUpVision: 12,
    optimalMoveChance: 0.95,
    useKick: true,
    reactionDelay: 0,
    huntSearchDepth: 35,
    dangerTimerThreshold: 40,
    roamAfterIdleTicks: 60,
  },
};

export class BotAI {
  private seq: number = 0;
  private lastDirection: Direction = 'down';
  private bombCooldown: number = 0;
  private kickCooldown: number = 0;
  private config: BotDifficultyConfig;
  private reactionDelayRemaining: number = 0;
  private ticksSinceEnemyContact: number = 0;

  // Anti-oscillation: flee stuck detection
  private lastFleePos: string | null = null;
  private fleeStuckTicks: number = 0;

  constructor(difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    this.config = DIFFICULTY_PRESETS[difficulty];
  }

  private getAwarenessRange(playerFireRange: number): number {
    if (this.config.dangerAwareness === 'fireRange') return playerFireRange;
    return this.config.dangerAwareness;
  }

  /**
   * Return DIRECTIONS ordered so lastDirection comes first.
   * This gives BFS a stable tie-break without any commitment mechanism.
   */
  private orderedDirs(): Direction[] {
    if (!this.lastDirection) return DIRECTIONS;
    return [this.lastDirection, ...DIRECTIONS.filter((d) => d !== this.lastDirection)];
  }

  generateInput(
    player: Player,
    state: GameStateManager,
    logger?: GameLogger | null,
  ): PlayerInput | null {
    if (!player.alive) return null;

    this.seq++;
    if (this.bombCooldown > 0) this.bombCooldown--;
    if (this.kickCooldown > 0) this.kickCooldown--;

    const pos = player.position;
    const bombPositions = Array.from(state.bombs.values()).map((b) => b.position);
    const otherPlayers = Array.from(state.players.values())
      .filter((p) => p.id !== player.id && p.alive)
      .map((p) => p.position);

    // Track enemy proximity for roaming behavior
    const nearestEnemyDist = this.getNearestEnemyManhattan(pos, state, player);
    if (nearestEnemyDist !== null && nearestEnemyDist <= 8) {
      this.ticksSinceEnemyContact = 0;
    } else {
      this.ticksSinceEnemyContact++;
    }

    const awarenessRange = this.getAwarenessRange(player.fireRange);
    const danger = this.getDangerCells(state, awarenessRange, pos);
    const amInDanger = danger.has(`${pos.x},${pos.y}`);

    const logDecision = (decision: string, details?: any) => {
      logger?.logBotDecision(player.id, player.username, decision, { pos, ...details });
    };

    // === PRIORITY 1: Kick threatening bomb (only when able to move) ===
    if (
      amInDanger &&
      player.hasKick &&
      this.config.useKick &&
      player.canMove() &&
      this.kickCooldown <= 0
    ) {
      const kickDir = this.findKickableBomb(pos, state);
      if (kickDir) {
        this.kickCooldown = 3;
        logDecision('kick', { dir: kickDir });
        return { seq: this.seq, direction: kickDir, action: null, tick: state.tick };
      }
    }

    // === PRIORITY 2: Flee from danger ===
    if (amInDanger) {
      if (this.config.reactionDelay > 0) {
        if (this.reactionDelayRemaining > 0) {
          this.reactionDelayRemaining--;
          return null;
        }
      }

      const escapeDir = this.findEscapeDirection(pos, state, danger, bombPositions, otherPlayers);
      if (escapeDir) {
        const posKey = `${pos.x},${pos.y}`;
        // Detect stuck: same position for 3+ ticks — try alternative direction
        if (posKey === this.lastFleePos) {
          this.fleeStuckTicks++;
          if (this.fleeStuckTicks >= 3) {
            for (const dir of DIRECTIONS) {
              if (
                dir !== escapeDir &&
                state.collisionSystem.canMoveTo(pos.x, pos.y, dir, bombPositions, otherPlayers)
              ) {
                this.lastDirection = dir;
                this.fleeStuckTicks = 0;
                this.lastFleePos = null;
                logDecision('flee_unstick', { dir });
                return { seq: this.seq, direction: dir, action: null, tick: state.tick };
              }
            }
          }
        } else {
          this.lastFleePos = posKey;
          this.fleeStuckTicks = 0;
        }
        this.lastDirection = escapeDir;
        logger?.logBotPathfinding(
          player.id,
          player.username,
          'escape_bfs',
          this.config.escapeSearchDepth,
          null,
        );
        logDecision('flee', { dir: escapeDir });
        return { seq: this.seq, direction: escapeDir, action: null, tick: state.tick };
      }

      // Last resort: any movable direction
      for (const dir of DIRECTIONS) {
        if (state.collisionSystem.canMoveTo(pos.x, pos.y, dir, bombPositions, otherPlayers)) {
          this.lastDirection = dir;
          logDecision('flee_desperate', { dir });
          return { seq: this.seq, direction: dir, action: null, tick: state.tick };
        }
      }
      logDecision('stuck');
      return null;
    } else {
      this.reactionDelayRemaining = this.config.reactionDelay;
      this.lastFleePos = null;
      this.fleeStuckTicks = 0;
    }

    // === PRIORITY 2.5: Detonate remote bombs if enemy is in their blast zone ===
    if (player.hasRemoteBomb) {
      const ownRemoteBombs = Array.from(state.bombs.values()).filter(
        (b) => b.ownerId === player.id && b.bombType === 'remote',
      );
      if (ownRemoteBombs.length > 0) {
        let enemyInBlast = false;
        for (const bomb of ownRemoteBombs) {
          for (const { dx, dy } of Object.values(DIR_DELTA)) {
            for (let i = 0; i <= bomb.fireRange; i++) {
              const cx = bomb.position.x + dx * i;
              const cy = bomb.position.y + dy * i;
              const tile = state.collisionSystem.getTileAt(cx, cy);
              if (tile === 'wall') break;
              if (isDestructibleTile(tile) && i > 0) break;
              for (const other of state.players.values()) {
                if (
                  other.id !== player.id &&
                  other.alive &&
                  other.position.x === cx &&
                  other.position.y === cy
                ) {
                  enemyInBlast = true;
                }
              }
              if (enemyInBlast) break;
            }
            if (enemyInBlast) break;
          }
          if (enemyInBlast) break;
        }
        const shouldDetonate = enemyInBlast || ownRemoteBombs.length >= player.maxBombs;
        if (shouldDetonate) {
          logDecision('detonate_remote', { count: ownRemoteBombs.length });
          return { seq: this.seq, direction: null, action: 'detonate', tick: state.tick };
        }
      }
    }

    // === PRIORITY 3: Bomb placement ===
    if (this.bombCooldown <= 0 && player.canPlaceBomb()) {
      const canEscape =
        !this.config.escapeCheckBeforeBomb ||
        this.canEscapeAfterBomb(pos, state, player, bombPositions, otherPlayers);

      if (canEscape) {
        if (this.isEnemyInBlastRange(pos, state, player)) {
          this.bombCooldown =
            this.config.bombCooldownMin +
            Math.floor(Math.random() * (this.config.bombCooldownMax - this.config.bombCooldownMin));
          logDecision('bomb_offensive', { cooldown: this.bombCooldown });
          return { seq: this.seq, direction: null, action: 'bomb', tick: state.tick };
        }

        if (this.isNearDestructible(pos, state)) {
          this.bombCooldown =
            this.config.bombCooldownMin +
            Math.floor(Math.random() * (this.config.bombCooldownMax - this.config.bombCooldownMin));
          logDecision('bomb_wall', { cooldown: this.bombCooldown });
          return { seq: this.seq, direction: null, action: 'bomb', tick: state.tick };
        }
      }
    }

    // === MOVEMENT DECISIONS: only when player can actually move ===
    if (!player.canMove()) return null;

    // Priority 4: Move toward a power-up (BFS pathfinding)
    const powerUpDir = this.findPowerUpDirection(pos, state, danger, bombPositions, otherPlayers);
    if (powerUpDir) {
      this.lastDirection = powerUpDir;
      logDecision('seek_powerup', { dir: powerUpDir });
      return { seq: this.seq, direction: powerUpDir, action: null, tick: state.tick };
    }

    // Priority 4.5: Move toward hill zone in KOTH mode
    if (state.hillZone) {
      const hillDir = this.findHillZoneDirection(pos, state, danger, bombPositions, otherPlayers);
      if (hillDir) {
        this.lastDirection = hillDir;
        logDecision('seek_hill', { dir: hillDir });
        return { seq: this.seq, direction: hillDir, action: null, tick: state.tick };
      }
    }

    // Priority 5: Move toward nearest enemy (BFS pathfinding)
    if (Math.random() < this.config.huntChance) {
      const huntDir = this.findHuntDirection(
        pos,
        state,
        player,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (huntDir) {
        this.lastDirection = huntDir;
        logger?.logBotPathfinding(
          player.id,
          player.username,
          'hunt_bfs',
          this.config.huntSearchDepth,
          null,
        );
        logDecision('hunt', { dir: huntDir });
        return { seq: this.seq, direction: huntDir, action: null, tick: state.tick };
      }
    }

    // Priority 5.5: Roam toward enemies when idle too long
    if (
      this.config.roamAfterIdleTicks > 0 &&
      this.ticksSinceEnemyContact >= this.config.roamAfterIdleTicks
    ) {
      const roamDir = this.findRoamDirection(
        pos,
        state,
        player,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (roamDir) {
        this.lastDirection = roamDir;
        logDecision('roam', { dir: roamDir, idleTicks: this.ticksSinceEnemyContact });
        return { seq: this.seq, direction: roamDir, action: null, tick: state.tick };
      }
    }

    // Priority 6: Move toward nearest destructible wall
    const wallDir = this.findDestructibleWallDirection(
      pos,
      state,
      player,
      danger,
      bombPositions,
      otherPlayers,
    );
    if (wallDir) {
      this.lastDirection = wallDir;
      logDecision('seek_wall', { dir: wallDir });
      return { seq: this.seq, direction: wallDir, action: null, tick: state.tick };
    }

    // Priority 7: Wander
    const wanderDir = this.pickSafeWander(pos, state, danger, bombPositions, otherPlayers);
    if (wanderDir) {
      this.lastDirection = wanderDir;
      logDecision('wander', { dir: wanderDir });
      return { seq: this.seq, direction: wanderDir, action: null, tick: state.tick };
    }

    return null;
  }

  private getNearestEnemyManhattan(
    pos: Position,
    state: GameStateManager,
    player: Player,
  ): number | null {
    let minDist: number | null = null;
    for (const other of state.players.values()) {
      if (other.id !== player.id && other.alive) {
        const dist = Math.abs(other.position.x - pos.x) + Math.abs(other.position.y - pos.y);
        if (minDist === null || dist < minDist) minDist = dist;
      }
    }
    return minDist;
  }

  private getDangerCells(
    state: GameStateManager,
    awarenessRange: number,
    botPos: Position,
  ): Set<string> {
    const danger = new Set<string>();

    for (const exp of state.explosions.values()) {
      for (const cell of exp.cells) {
        danger.add(`${cell.x},${cell.y}`);
      }
    }

    for (const bomb of state.bombs.values()) {
      const manhattanDist =
        Math.abs(bomb.position.x - botPos.x) + Math.abs(bomb.position.y - botPos.y);
      if (manhattanDist > awarenessRange) continue;

      if (
        this.config.dangerTimerThreshold > 0 &&
        bomb.ticksRemaining > this.config.dangerTimerThreshold &&
        manhattanDist > 2
      ) {
        continue;
      }

      danger.add(`${bomb.position.x},${bomb.position.y}`);
      for (const { dx, dy } of Object.values(DIR_DELTA)) {
        for (let i = 1; i <= bomb.fireRange; i++) {
          const cx = bomb.position.x + dx * i;
          const cy = bomb.position.y + dy * i;
          const tile = state.collisionSystem.getTileAt(cx, cy);
          if (tile === 'wall') break;
          danger.add(`${cx},${cy}`);
          if (isDestructibleTile(tile)) break;
        }
      }
    }

    return danger;
  }

  private findEscapeDirection(
    pos: Position,
    state: GameStateManager,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    const visited = new Set<string>();
    visited.add(`${pos.x},${pos.y}`);
    let frontier: { pos: Position; firstDir: Direction }[] = [];

    for (const dir of DIRECTIONS) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (!danger.has(key)) return dir;
      frontier.push({ pos: newPos, firstDir: dir });
    }

    for (let depth = 0; depth < this.config.escapeSearchDepth && frontier.length > 0; depth++) {
      const next: { pos: Position; firstDir: Direction }[] = [];
      for (const entry of frontier) {
        for (const dir of DIRECTIONS) {
          const newPos = state.collisionSystem.canMoveTo(
            entry.pos.x,
            entry.pos.y,
            dir,
            bombPositions,
            otherPlayers,
          );
          if (!newPos) continue;
          const key = `${newPos.x},${newPos.y}`;
          if (visited.has(key)) continue;
          visited.add(key);
          if (!danger.has(key)) return entry.firstDir;
          next.push({ pos: newPos, firstDir: entry.firstDir });
        }
      }
      frontier = next;
    }

    return null;
  }

  private countEscapeRoutes(
    pos: Position,
    state: GameStateManager,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): number {
    const visited = new Set<string>();
    visited.add(`${pos.x},${pos.y}`);
    let frontier = [pos];
    let safeCount = 0;

    for (let depth = 0; depth < this.config.escapeSearchDepth && frontier.length > 0; depth++) {
      const next: Position[] = [];
      for (const p of frontier) {
        for (const dir of DIRECTIONS) {
          const newPos = state.collisionSystem.canMoveTo(
            p.x,
            p.y,
            dir,
            bombPositions,
            otherPlayers,
          );
          if (!newPos) continue;
          const key = `${newPos.x},${newPos.y}`;
          if (visited.has(key)) continue;
          visited.add(key);
          if (!danger.has(key)) {
            safeCount++;
            next.push(newPos);
          }
        }
      }
      frontier = next;
    }

    return safeCount;
  }

  private isEnemyInBlastRange(pos: Position, state: GameStateManager, player: Player): boolean {
    for (const { dx, dy } of Object.values(DIR_DELTA)) {
      for (let i = 1; i <= player.fireRange + 1; i++) {
        const cx = pos.x + dx * i;
        const cy = pos.y + dy * i;
        const tile = state.collisionSystem.getTileAt(cx, cy);
        if (tile === 'wall' || isDestructibleTile(tile)) break;
        for (const other of state.players.values()) {
          if (
            other.id !== player.id &&
            other.alive &&
            other.position.x === cx &&
            other.position.y === cy
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Before placing a bomb, verify the bot can escape its own blast.
   * Just checks that findEscapeDirection returns a direction — simple and reliable.
   */
  private canEscapeAfterBomb(
    pos: Position,
    state: GameStateManager,
    player: Player,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): boolean {
    const futureBombPositions = [...bombPositions, pos];
    const futureDanger = new Set(this.getDangerCells(state, 999, pos));

    futureDanger.add(`${pos.x},${pos.y}`);
    for (const { dx, dy } of Object.values(DIR_DELTA)) {
      for (let i = 1; i <= player.fireRange; i++) {
        const cx = pos.x + dx * i;
        const cy = pos.y + dy * i;
        const tile = state.collisionSystem.getTileAt(cx, cy);
        if (tile === 'wall') break;
        futureDanger.add(`${cx},${cy}`);
        if (isDestructibleTile(tile)) break;
      }
    }

    return (
      this.findEscapeDirection(pos, state, futureDanger, futureBombPositions, otherPlayers) !== null
    );
  }

  private isNearDestructible(pos: Position, state: GameStateManager): boolean {
    for (const { dx, dy } of Object.values(DIR_DELTA)) {
      if (isDestructibleTile(state.collisionSystem.getTileAt(pos.x + dx, pos.y + dy))) return true;
    }
    return false;
  }

  /**
   * BFS pathfinding toward the nearest power-up.
   * Uses orderedDirs() so lastDirection is explored first, giving stable tie-breaking.
   */
  private findPowerUpDirection(
    pos: Position,
    state: GameStateManager,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    if (state.powerUps.size === 0) return null;

    const powerUpPositions = new Set<string>();
    for (const pu of state.powerUps.values()) {
      powerUpPositions.add(`${pu.position.x},${pu.position.y}`);
    }

    const visited = new Set<string>();
    visited.add(`${pos.x},${pos.y}`);
    let frontier: { pos: Position; firstDir: Direction }[] = [];

    for (const dir of this.orderedDirs()) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (danger.has(key)) continue;
      visited.add(key);
      if (powerUpPositions.has(key)) return dir;
      frontier.push({ pos: newPos, firstDir: dir });
    }

    for (let depth = 0; depth < this.config.powerUpVision && frontier.length > 0; depth++) {
      const next: { pos: Position; firstDir: Direction }[] = [];
      for (const entry of frontier) {
        for (const dir of DIRECTIONS) {
          const newPos = state.collisionSystem.canMoveTo(
            entry.pos.x,
            entry.pos.y,
            dir,
            bombPositions,
            [],
          );
          if (!newPos) continue;
          const key = `${newPos.x},${newPos.y}`;
          if (visited.has(key) || danger.has(key)) continue;
          visited.add(key);
          if (powerUpPositions.has(key)) return entry.firstDir;
          next.push({ pos: newPos, firstDir: entry.firstDir });
        }
      }
      frontier = next;
    }

    return null;
  }

  private findHillZoneDirection(
    pos: Position,
    state: GameStateManager,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    const hill = state.hillZone;
    if (!hill) return null;

    if (
      pos.x >= hill.x &&
      pos.x < hill.x + hill.width &&
      pos.y >= hill.y &&
      pos.y < hill.y + hill.height
    ) {
      return null;
    }

    const targetX = hill.x + Math.floor(hill.width / 2);
    const targetY = hill.y + Math.floor(hill.height / 2);
    const currentDist = Math.abs(pos.x - targetX) + Math.abs(pos.y - targetY);

    const candidates: { dir: Direction; distReduction: number; escape: number }[] = [];
    for (const dir of this.orderedDirs()) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (danger.has(key)) continue;
      const escapeCount = this.countEscapeRoutes(
        newPos,
        state,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (escapeCount < 1) continue;
      const newDist = Math.abs(newPos.x - targetX) + Math.abs(newPos.y - targetY);
      candidates.push({ dir, distReduction: currentDist - newDist, escape: escapeCount });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.distReduction - a.distReduction || b.escape - a.escape);
    if (candidates[0].distReduction <= 0) return null;
    return candidates[0].dir;
  }

  /**
   * BFS toward nearest enemy. orderedDirs() gives lastDirection priority at seed step.
   */
  private findHuntDirection(
    pos: Position,
    state: GameStateManager,
    player: Player,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    const enemyPositions = new Set<string>();
    for (const other of state.players.values()) {
      if (other.id !== player.id && other.alive) {
        enemyPositions.add(`${other.position.x},${other.position.y}`);
      }
    }
    if (enemyPositions.size === 0) return null;

    const visited = new Set<string>();
    visited.add(`${pos.x},${pos.y}`);
    let frontier: { pos: Position; firstDir: Direction }[] = [];

    for (const dir of this.orderedDirs()) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (danger.has(key)) continue;
      const escapeCount = this.countEscapeRoutes(
        newPos,
        state,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (escapeCount < 1) continue;
      visited.add(key);
      if (enemyPositions.has(key)) return dir;
      frontier.push({ pos: newPos, firstDir: dir });
    }

    for (let depth = 0; depth < this.config.huntSearchDepth && frontier.length > 0; depth++) {
      const next: { pos: Position; firstDir: Direction }[] = [];
      for (const entry of frontier) {
        for (const dir of DIRECTIONS) {
          const newPos = state.collisionSystem.canMoveTo(
            entry.pos.x,
            entry.pos.y,
            dir,
            bombPositions,
            [],
          );
          if (!newPos) continue;
          const key = `${newPos.x},${newPos.y}`;
          if (visited.has(key) || danger.has(key)) continue;
          visited.add(key);
          if (enemyPositions.has(key)) return entry.firstDir;
          next.push({ pos: newPos, firstDir: entry.firstDir });
        }
      }
      frontier = next;
    }

    return null;
  }

  /**
   * Roam toward nearest enemy using manhattan heuristic.
   * Tie-break with lastDirection for stability.
   */
  private findRoamDirection(
    pos: Position,
    state: GameStateManager,
    player: Player,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    let nearestEnemy: Position | null = null;
    let nearestDist = Infinity;
    for (const other of state.players.values()) {
      if (other.id !== player.id && other.alive) {
        const dist = Math.abs(other.position.x - pos.x) + Math.abs(other.position.y - pos.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = other.position;
        }
      }
    }
    if (!nearestEnemy) return null;

    const candidates: { dir: Direction; distReduction: number; escape: number }[] = [];
    for (const dir of DIRECTIONS) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (danger.has(key)) continue;
      const escapeCount = this.countEscapeRoutes(
        newPos,
        state,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (escapeCount < 1) continue;
      const newDist = Math.abs(newPos.x - nearestEnemy.x) + Math.abs(newPos.y - nearestEnemy.y);
      candidates.push({ dir, distReduction: nearestDist - newDist, escape: escapeCount });
    }

    if (candidates.length === 0) return null;

    const ld = this.lastDirection;
    candidates.sort((a, b) => {
      if (a.distReduction !== b.distReduction) return b.distReduction - a.distReduction;
      if (a.escape !== b.escape) return b.escape - a.escape;
      return (a.dir === ld ? 0 : 1) - (b.dir === ld ? 0 : 1);
    });

    return candidates[0].dir;
  }

  /**
   * BFS to find direction of nearest reachable destructible wall.
   * Prefers walls toward enemies. Tie-break with lastDirection.
   */
  private findDestructibleWallDirection(
    pos: Position,
    state: GameStateManager,
    player: Player,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    let nearestEnemy: Position | null = null;
    let nearestDist = Infinity;
    for (const other of state.players.values()) {
      if (other.id !== player.id && other.alive) {
        const dist = Math.abs(other.position.x - pos.x) + Math.abs(other.position.y - pos.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = other.position;
        }
      }
    }

    const visited = new Set<string>();
    visited.add(`${pos.x},${pos.y}`);
    let frontier: { pos: Position; firstDir: Direction }[] = [];
    const wallCandidates: { dir: Direction; depth: number; distToEnemy: number }[] = [];

    for (const dir of this.orderedDirs()) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      const key = `${newPos.x},${newPos.y}`;
      if (danger.has(key)) continue;
      visited.add(key);
      for (const { dx, dy } of Object.values(DIR_DELTA)) {
        if (isDestructibleTile(state.collisionSystem.getTileAt(newPos.x + dx, newPos.y + dy))) {
          const distToEnemy = nearestEnemy
            ? Math.abs(newPos.x + dx - nearestEnemy.x) + Math.abs(newPos.y + dy - nearestEnemy.y)
            : 0;
          wallCandidates.push({ dir, depth: 0, distToEnemy });
          break;
        }
      }
      frontier.push({ pos: newPos, firstDir: dir });
    }

    for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
      const next: { pos: Position; firstDir: Direction }[] = [];
      for (const entry of frontier) {
        for (const dir of DIRECTIONS) {
          const newPos = state.collisionSystem.canMoveTo(
            entry.pos.x,
            entry.pos.y,
            dir,
            bombPositions,
            otherPlayers,
          );
          if (!newPos) continue;
          const key = `${newPos.x},${newPos.y}`;
          if (visited.has(key) || danger.has(key)) continue;
          visited.add(key);
          for (const { dx, dy } of Object.values(DIR_DELTA)) {
            if (isDestructibleTile(state.collisionSystem.getTileAt(newPos.x + dx, newPos.y + dy))) {
              const distToEnemy = nearestEnemy
                ? Math.abs(newPos.x + dx - nearestEnemy.x) +
                  Math.abs(newPos.y + dy - nearestEnemy.y)
                : 0;
              wallCandidates.push({ dir: entry.firstDir, depth: depth + 1, distToEnemy });
              break;
            }
          }
          next.push({ pos: newPos, firstDir: entry.firstDir });
        }
      }
      frontier = next;
    }

    if (wallCandidates.length === 0) return null;

    const ld = this.lastDirection;
    wallCandidates.sort((a, b) => {
      const tierA = a.depth <= 1 ? 0 : a.depth <= 4 ? 1 : 2;
      const tierB = b.depth <= 1 ? 0 : b.depth <= 4 ? 1 : 2;
      if (tierA !== tierB) return tierA - tierB;
      if (a.distToEnemy !== b.distToEnemy) return a.distToEnemy - b.distToEnemy;
      return (a.dir === ld ? 0 : 1) - (b.dir === ld ? 0 : 1);
    });

    return wallCandidates[0].dir;
  }

  /**
   * Wander in a safe, non-trapping direction.
   * 85% chance to continue lastDirection for stability.
   */
  private pickSafeWander(
    pos: Position,
    state: GameStateManager,
    danger: Set<string>,
    bombPositions: Position[],
    otherPlayers: Position[],
  ): Direction | null {
    const candidates: { dir: Direction; escape: number }[] = [];

    for (const dir of DIRECTIONS) {
      const newPos = state.collisionSystem.canMoveTo(
        pos.x,
        pos.y,
        dir,
        bombPositions,
        otherPlayers,
      );
      if (!newPos) continue;
      if (danger.has(`${newPos.x},${newPos.y}`)) continue;
      const escapeCount = this.countEscapeRoutes(
        newPos,
        state,
        danger,
        bombPositions,
        otherPlayers,
      );
      if (escapeCount >= 1) {
        candidates.push({ dir, escape: escapeCount });
      }
    }

    if (candidates.length === 0) {
      for (const dir of DIRECTIONS) {
        const newPos = state.collisionSystem.canMoveTo(
          pos.x,
          pos.y,
          dir,
          bombPositions,
          otherPlayers,
        );
        if (newPos && !danger.has(`${newPos.x},${newPos.y}`)) return dir;
      }
      return null;
    }

    // Prefer continuing in the same direction (anti-oscillation)
    const currentDirCandidate = candidates.find((c) => c.dir === this.lastDirection);
    if (currentDirCandidate && Math.random() < 0.85) {
      return currentDirCandidate.dir;
    }

    // Pick randomly from candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled[0].dir;
  }

  private findKickableBomb(pos: Position, state: GameStateManager): Direction | null {
    for (const dir of DIRECTIONS) {
      const { dx, dy } = DIR_DELTA[dir];
      const adjX = pos.x + dx;
      const adjY = pos.y + dy;

      for (const bomb of state.bombs.values()) {
        if (bomb.position.x === adjX && bomb.position.y === adjY && !bomb.sliding) {
          const behindX = adjX + dx;
          const behindY = adjY + dy;
          if (state.collisionSystem.isWalkable(behindX, behindY)) {
            const blocked =
              Array.from(state.bombs.values()).some(
                (b) => b.id !== bomb.id && b.position.x === behindX && b.position.y === behindY,
              ) ||
              Array.from(state.players.values()).some(
                (p) => p.alive && p.position.x === behindX && p.position.y === behindY,
              );
            if (!blocked) {
              return dir;
            }
          }
        }
      }
    }
    return null;
  }
}
