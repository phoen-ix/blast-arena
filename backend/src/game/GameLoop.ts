import { TICK_RATE, TICK_MS } from '@blast-arena/shared';
import { GameStateManager } from './GameState';
import { logger } from '../utils/logger';

export class GameLoop {
  private gameState: GameStateManager;
  private interval: ReturnType<typeof setInterval> | null = null;
  private onTick: (state: ReturnType<GameStateManager['toState']>) => void;
  private onGameOver: () => void;
  private tickRate: number;
  private running: boolean = false;

  constructor(
    gameState: GameStateManager,
    onTick: (state: ReturnType<GameStateManager['toState']>) => void,
    onGameOver: () => void,
    tickRate: number = TICK_RATE
  ) {
    this.gameState = gameState;
    this.onTick = onTick;
    this.onGameOver = onGameOver;
    this.tickRate = tickRate;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.gameState.status = 'playing';

    const tickMs = 1000 / this.tickRate;

    this.interval = setInterval(() => {
      try {
        this.gameState.processTick();
        const state = this.gameState.toState();
        this.onTick(state);

        if (this.gameState.status === 'finished') {
          this.stop();
          this.onGameOver();
        }
      } catch (err) {
        logger.error({ err }, 'Game loop error');
      }
    }, tickMs);

    logger.info({ tickRate: this.tickRate }, 'Game loop started');
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    logger.info('Game loop stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  getState(): GameStateManager {
    return this.gameState;
  }
}
