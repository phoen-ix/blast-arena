import * as fs from 'fs';
import * as path from 'path';
import { LogVerbosity } from '@blast-arena/shared';

const LOG_DIR = process.env.GAME_LOG_DIR || '/app/gamelogs';

export interface GameLoggerOptions {
  logDir?: string;
  filename?: string;
  verbosity?: LogVerbosity;
}

export class GameLogger {
  private stream: fs.WriteStream;
  private roomCode: string;
  private filename: string;
  private verbosity: LogVerbosity;

  constructor(
    roomCode: string,
    gameMode: string,
    playerCount: number,
    options?: GameLoggerOptions,
  ) {
    this.roomCode = roomCode;
    this.verbosity = options?.verbosity ?? 'normal';

    const logDir = options?.logDir ?? LOG_DIR;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    this.filename = options?.filename ?? `${ts}_${roomCode}_${gameMode}_${playerCount}p.jsonl`;

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.stream = fs.createWriteStream(path.join(logDir, this.filename), { flags: 'a' });

    this.log('game_init', { roomCode, gameMode, playerCount, verbosity: this.verbosity });
  }

  shouldLogTick(tick: number): boolean {
    if (this.verbosity === 'full') return true;
    if (this.verbosity === 'detailed') return tick % 2 === 0;
    return tick % 5 === 0;
  }

  log(event: string, data: any): void {
    const entry = { t: Date.now(), event, ...data };
    this.stream.write(JSON.stringify(entry) + '\n');
  }

  logTick(tick: number, players: any[], bombs: any[], explosions: any[]): void {
    const tickData: any = {
      t: Date.now(),
      event: 'tick',
      tick,
      players: players.map((p) => ({
        id: p.id,
        name: p.username,
        pos: p.position,
        alive: p.alive,
        kills: p.kills,
        selfKills: p.selfKills,
        dir: p.direction,
        shield: p.hasShield,
        kick: p.hasKick,
        fireRange: p.fireRange,
        speed: p.speed,
        cooldown: p.moveCooldown,
      })),
      bombs: bombs.map((b) => ({
        id: b.id.slice(0, 8),
        pos: b.position,
        owner: b.ownerId,
        fuse: b.ticksRemaining,
        slide: b.sliding,
      })),
      explosions: explosions.map((e) => ({
        id: e.id.slice(0, 8),
        owner: e.ownerId,
        fuse: e.ticksRemaining,
        cells: this.verbosity === 'full' ? e.cells : e.cells.length,
      })),
    };
    this.stream.write(JSON.stringify(tickData) + '\n');
  }

  logBotDecision(botId: number, botName: string, decision: string, details?: any): void {
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'bot_decision',
        botId,
        botName,
        decision,
        ...details,
      }) + '\n',
    );
  }

  logKill(
    killerId: number,
    killerName: string,
    victimId: number,
    victimName: string,
    selfKill: boolean,
  ): void {
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'kill',
        killerId,
        killerName,
        victimId,
        victimName,
        selfKill,
      }) + '\n',
    );
  }

  logBomb(
    event: 'place' | 'detonate',
    ownerId: number,
    ownerName: string,
    pos: any,
    fireRange?: number,
  ): void {
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: `bomb_${event}`,
        ownerId,
        ownerName,
        pos,
        fireRange,
      }) + '\n',
    );
  }

  logMovement(
    playerId: number,
    playerName: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    direction: string,
  ): void {
    if (this.verbosity === 'normal') return;
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'movement',
        playerId,
        playerName,
        from,
        to,
        direction,
      }) + '\n',
    );
  }

  logPowerupPickup(
    playerId: number,
    playerName: string,
    type: string,
    position: { x: number; y: number },
  ): void {
    if (this.verbosity === 'normal') return;
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'powerup_pickup',
        playerId,
        playerName,
        type,
        position,
      }) + '\n',
    );
  }

  logExplosionDetail(
    ownerId: number,
    ownerName: string,
    pos: { x: number; y: number },
    cells: { x: number; y: number }[],
    destroyedWalls: number,
    chainedBombs: number,
  ): void {
    if (this.verbosity !== 'full') return;
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'explosion_detail',
        ownerId,
        ownerName,
        pos,
        cells,
        destroyedWalls,
        chainedBombs,
      }) + '\n',
    );
  }

  logBotPathfinding(
    botId: number,
    botName: string,
    algorithm: string,
    pathLength: number,
    target: { x: number; y: number } | null,
  ): void {
    if (this.verbosity !== 'full') return;
    this.stream.write(
      JSON.stringify({
        t: Date.now(),
        event: 'bot_pathfinding',
        botId,
        botName,
        algorithm,
        pathLength,
        target,
      }) + '\n',
    );
  }

  logGameOver(winnerId: number | null, placements: any[]): void {
    this.log('game_over', { winnerId, placements });
    this.stream.end();
  }

  close(): void {
    this.stream.end();
  }
}
