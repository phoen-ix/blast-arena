import { Position, TileType } from '@blast-arena/shared';
import { PuzzleConfig, SwitchVariant } from '@blast-arena/shared';
import {
  isSwitchTile,
  isSwitchActive,
  getSwitchColor,
  getSwitchTile,
  getGateColor,
  isGateOpen,
  getGateTile,
  CRUMBLE_DELAY_TICKS,
} from '@blast-arena/shared';

/** Minimal interface required from the game state to process puzzle tiles */
export interface PuzzleGameState {
  tick: number;
  map: { width: number; height: number; tiles: TileType[][] };
  players: Map<number, { alive: boolean; isBuddy?: boolean; position: Position }>;
  bombs: Map<string, { position: Position }>;
  explosions: Map<string, { cells: Position[] }>;
  setTileTracked(x: number, y: number, type: TileType): void;
}

/** Entity position for crumbling floor checks (campaign enemies) */
export interface CrumblingEntity {
  position: Position;
  alive: boolean;
  canPassWalls?: boolean;
}

/**
 * Standalone processor for puzzle tile mechanics (switches, gates, crumbling floors).
 * Extracted from CampaignGame to be reusable in both campaign and multiplayer modes.
 */
export class PuzzleTileProcessor {
  private switchStates: Map<string, boolean> = new Map();
  private switchVariants: Map<string, SwitchVariant> = new Map();
  private crumblingVisited: Map<string, number> = new Map();
  private crumblingOccupied: Set<string> = new Set();
  private prevSwitchOccupied: Set<string> = new Set();
  private prevSwitchBlasted: Set<string> = new Set();
  private hasSwitches = false;
  private hasCrumbling = false;

  constructor(gameState: PuzzleGameState, puzzleConfig?: PuzzleConfig) {
    // Load switch variants from config
    if (puzzleConfig?.switchVariants) {
      for (const [key, variant] of Object.entries(puzzleConfig.switchVariants)) {
        this.switchVariants.set(key, variant);
      }
    }

    // Initialize switch states from tile grid (detect pre-placed switches)
    for (let y = 0; y < gameState.map.height; y++) {
      for (let x = 0; x < gameState.map.width; x++) {
        const tile = gameState.map.tiles[y][x];
        if (isSwitchTile(tile)) {
          const key = `${x},${y}`;
          this.switchStates.set(key, isSwitchActive(tile));
          this.hasSwitches = true;
        }
        if (tile === 'crumbling') {
          this.hasCrumbling = true;
        }
      }
    }
  }

  /** Returns true if the map has any puzzle tiles that need processing */
  get hasPuzzleTiles(): boolean {
    return this.hasSwitches || this.hasCrumbling;
  }

  /**
   * Process puzzle tiles for one tick.
   * @param gameState The current game state
   * @param enemies Optional iterable of enemy entities (for campaign crumbling floor checks)
   */
  processTick(gameState: PuzzleGameState, enemies?: Iterable<CrumblingEntity>): void {
    if (this.switchStates.size === 0 && this.crumblingVisited.size === 0) {
      // Still check for crumbling tiles that entities might be standing on
      this.processCrumblingFloors(gameState, enemies);
      return;
    }

    this.processSwitchesAndGates(gameState);
    this.processCrumblingFloors(gameState, enemies);
  }

  private processSwitchesAndGates(gameState: PuzzleGameState): void {
    if (this.switchStates.size === 0) return;

    // Build set of positions currently occupied by players or bombs
    const currentOccupied = new Set<string>();
    for (const player of gameState.players.values()) {
      if (!player.alive) continue;
      currentOccupied.add(`${player.position.x},${player.position.y}`);
    }
    for (const bomb of gameState.bombs.values()) {
      currentOccupied.add(`${bomb.position.x},${bomb.position.y}`);
    }

    // Build set of positions covered by active explosions
    const explodedPositions = new Set<string>();
    for (const explosion of gameState.explosions.values()) {
      for (const cell of explosion.cells) {
        explodedPositions.add(`${cell.x},${cell.y}`);
      }
    }

    // Track which colors changed state (for gate toggling)
    const colorStateChanged = new Map<string, boolean>();

    for (const [key, wasActive] of this.switchStates) {
      const variant = this.switchVariants.get(key) ?? 'toggle';
      const isOccupied = currentOccupied.has(key);
      const wasOccupied = this.prevSwitchOccupied.has(key);
      const isBlasted = explodedPositions.has(key);
      const wasBlasted = this.prevSwitchBlasted.has(key);
      const blastHit = isBlasted && !wasBlasted; // rising edge — first tick of explosion
      const color = getSwitchColor(
        gameState.map.tiles[Number(key.split(',')[1])][Number(key.split(',')[0])],
      );
      if (!color) continue;

      let newActive = wasActive;

      switch (variant) {
        case 'toggle': {
          const steppedOn = isOccupied && !wasOccupied;
          if (steppedOn || blastHit) {
            newActive = !wasActive;
          }
          break;
        }
        case 'pressure': {
          newActive = isOccupied || blastHit;
          break;
        }
        case 'oneshot': {
          if (!wasActive) {
            const steppedOn = isOccupied && !wasOccupied;
            if (steppedOn || blastHit) {
              newActive = true;
            }
          }
          break;
        }
      }

      if (newActive !== wasActive) {
        this.switchStates.set(key, newActive);
        const [sx, sy] = key.split(',').map(Number);
        gameState.setTileTracked(sx, sy, getSwitchTile(color, newActive));
        colorStateChanged.set(color, newActive);
      }
    }

    // Update gates for colors whose switch state changed
    if (colorStateChanged.size > 0) {
      for (const [color] of colorStateChanged) {
        // OR logic: gates are open if ANY switch of that color is active
        let anyActive = false;
        for (const [switchKey, active] of this.switchStates) {
          const switchColor = getSwitchColor(
            gameState.map.tiles[Number(switchKey.split(',')[1])][Number(switchKey.split(',')[0])],
          );
          if (switchColor === color && active) {
            anyActive = true;
            break;
          }
        }

        // Toggle all gates of this color
        for (let y = 0; y < gameState.map.height; y++) {
          for (let x = 0; x < gameState.map.width; x++) {
            const tile = gameState.map.tiles[y][x];
            const gateColor = getGateColor(tile);
            if (gateColor === color) {
              const shouldBeOpen = anyActive;
              const isOpen = isGateOpen(tile);
              if (shouldBeOpen !== isOpen) {
                gameState.setTileTracked(x, y, getGateTile(gateColor, shouldBeOpen));
              }
            }
          }
        }
      }
    }

    // Update previous occupied/blasted sets for next tick
    this.prevSwitchOccupied = new Set<string>();
    this.prevSwitchBlasted = new Set<string>();
    for (const key of this.switchStates.keys()) {
      if (currentOccupied.has(key)) {
        this.prevSwitchOccupied.add(key);
      }
      if (explodedPositions.has(key)) {
        this.prevSwitchBlasted.add(key);
      }
    }
  }

  private processCrumblingFloors(
    gameState: PuzzleGameState,
    enemies?: Iterable<CrumblingEntity>,
  ): void {
    const tick = gameState.tick;

    // Build set of currently occupied crumbling positions
    // (alive players except buddies, alive enemies except those with canPassWalls)
    const currentCrumbling = new Set<string>();
    for (const player of gameState.players.values()) {
      if (!player.alive || player.isBuddy) continue;
      const key = `${player.position.x},${player.position.y}`;
      if (gameState.map.tiles[player.position.y]?.[player.position.x] === 'crumbling') {
        currentCrumbling.add(key);
      }
    }
    if (enemies) {
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.canPassWalls) continue;
        const key = `${enemy.position.x},${enemy.position.y}`;
        if (gameState.map.tiles[enemy.position.y]?.[enemy.position.x] === 'crumbling') {
          currentCrumbling.add(key);
        }
      }
    }

    // Check previously visited crumbling tiles that are no longer occupied
    for (const [key, visitedTick] of this.crumblingVisited) {
      if (!currentCrumbling.has(key) && !this.crumblingOccupied.has(key)) {
        // Already stepped off — waiting for crumble delay
        if (tick - visitedTick >= CRUMBLE_DELAY_TICKS) {
          const [cx, cy] = key.split(',').map(Number);
          gameState.setTileTracked(cx, cy, 'pit');
          this.crumblingVisited.delete(key);
        }
      } else if (!currentCrumbling.has(key) && this.crumblingOccupied.has(key)) {
        // Entity just stepped off this tick — record the step-off tick
        this.crumblingVisited.set(key, tick);
      }
    }

    // Track currently occupied crumbling positions
    for (const key of currentCrumbling) {
      if (!this.crumblingVisited.has(key)) {
        this.crumblingVisited.set(key, tick);
      }
    }

    // Update occupied set for next tick comparison
    this.crumblingOccupied = currentCrumbling;
  }
}
