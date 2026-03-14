import Phaser from 'phaser';
import { SocketClient } from '../network/SocketClient';
import { GameState, PlayerState, BombState, ExplosionState, PowerUpState, TileType } from '@blast-arena/shared';
import { TILE_SIZE } from '@blast-arena/shared';

export class GameScene extends Phaser.Scene {
  private socketClient!: SocketClient;
  private tileMap!: Phaser.GameObjects.Group;
  private playerSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private bombSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private explosionSprites: Map<string, Phaser.GameObjects.Sprite[]> = new Map();
  private powerUpSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private lastInputSeq: number = 0;
  private lastGameState: GameState | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.socketClient = this.registry.get('socketClient');
    const initialState: GameState = this.registry.get('initialGameState');

    // Setup input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Setup tile map
    this.tileMap = this.add.group();
    if (initialState) {
      this.renderMap(initialState.map.tiles, initialState.map.width, initialState.map.height);
      this.updateState(initialState);
    }

    // Listen for state updates
    this.socketClient.on('game:state', (state: GameState) => {
      this.updateState(state);
    });

    this.socketClient.on('game:over', (data: any) => {
      this.registry.set('gameOverData', data);
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene');
    });

    // Center camera
    if (initialState) {
      this.cameras.main.setBounds(
        0, 0,
        initialState.map.width * TILE_SIZE,
        initialState.map.height * TILE_SIZE
      );
    }
  }

  update(): void {
    this.processInput();
  }

  private processInput(): void {
    if (!this.cursors) return;

    let direction: string | null = null;
    let action: string | null = null;

    if (this.cursors.up.isDown || this.wasd?.up.isDown) direction = 'up';
    else if (this.cursors.down.isDown || this.wasd?.down.isDown) direction = 'down';
    else if (this.cursors.left.isDown || this.wasd?.left.isDown) direction = 'left';
    else if (this.cursors.right.isDown || this.wasd?.right.isDown) direction = 'right';

    if (this.spaceKey?.isDown) action = 'bomb';

    if (direction || action) {
      this.lastInputSeq++;
      this.socketClient.emit('game:input', {
        seq: this.lastInputSeq,
        direction: direction as any,
        action: action as any,
        tick: this.lastGameState?.tick || 0,
      });
    }
  }

  private renderMap(tiles: TileType[][], width: number, height: number): void {
    this.tileSprites = [];
    for (let y = 0; y < height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        const textureKey = this.getTileTexture(tile);
        const sprite = this.add.sprite(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, textureKey);
        this.tileSprites[y][x] = sprite;
        this.tileMap.add(sprite);
      }
    }
  }

  private getTileTexture(type: TileType): string {
    switch (type) {
      case 'wall': return 'wall';
      case 'destructible': return 'destructible';
      default: return 'floor';
    }
  }

  private updateState(state: GameState): void {
    this.lastGameState = state;

    // Update tiles (destructible walls may have been destroyed)
    if (state.map.tiles) {
      for (let y = 0; y < state.map.height; y++) {
        for (let x = 0; x < state.map.width; x++) {
          if (this.tileSprites[y]?.[x]) {
            const newTexture = this.getTileTexture(state.map.tiles[y][x]);
            if (this.tileSprites[y][x].texture.key !== newTexture) {
              this.tileSprites[y][x].setTexture(newTexture);
            }
          }
        }
      }
    }

    // Update players
    this.updatePlayers(state.players);

    // Update bombs
    this.updateBombs(state.bombs);

    // Update explosions
    this.updateExplosions(state.explosions);

    // Update power-ups
    this.updatePowerUps(state.powerUps);

    // Update HUD
    this.events.emit('stateUpdate', state);
  }

  private updatePlayers(players: PlayerState[]): void {
    const activeIds = new Set(players.map(p => p.id));

    // Remove despawned players
    for (const [id, sprite] of this.playerSprites) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.playerSprites.delete(id);
      }
    }

    // Update/create players
    players.forEach((player, index) => {
      if (!player.alive) {
        const existing = this.playerSprites.get(player.id);
        if (existing) {
          existing.setAlpha(0.3);
        }
        return;
      }

      let sprite = this.playerSprites.get(player.id);
      if (!sprite) {
        sprite = this.add.sprite(
          player.position.x * TILE_SIZE + TILE_SIZE / 2,
          player.position.y * TILE_SIZE + TILE_SIZE / 2,
          `player_${index % 8}`
        );
        sprite.setDepth(10);
        this.playerSprites.set(player.id, sprite);

        // Add name label
        this.add.text(
          player.position.x * TILE_SIZE + TILE_SIZE / 2,
          player.position.y * TILE_SIZE - 4,
          player.displayName,
          { fontSize: '11px', color: '#fff' }
        ).setOrigin(0.5, 1).setDepth(11);
      }

      // Interpolate position
      const targetX = player.position.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = player.position.y * TILE_SIZE + TILE_SIZE / 2;
      sprite.x = Phaser.Math.Linear(sprite.x, targetX, 0.3);
      sprite.y = Phaser.Math.Linear(sprite.y, targetY, 0.3);
    });
  }

  private updateBombs(bombs: BombState[]): void {
    const activeIds = new Set(bombs.map(b => b.id));

    for (const [id, sprite] of this.bombSprites) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.bombSprites.delete(id);
      }
    }

    for (const bomb of bombs) {
      if (!this.bombSprites.has(bomb.id)) {
        const sprite = this.add.sprite(
          bomb.position.x * TILE_SIZE + TILE_SIZE / 2,
          bomb.position.y * TILE_SIZE + TILE_SIZE / 2,
          'bomb'
        );
        sprite.setDepth(5);

        // Pulsing animation
        this.tweens.add({
          targets: sprite,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });

        this.bombSprites.set(bomb.id, sprite);
      }
    }
  }

  private updateExplosions(explosions: ExplosionState[]): void {
    const activeIds = new Set(explosions.map(e => e.id));

    for (const [id, sprites] of this.explosionSprites) {
      if (!activeIds.has(id)) {
        sprites.forEach(s => s.destroy());
        this.explosionSprites.delete(id);
      }
    }

    for (const explosion of explosions) {
      if (!this.explosionSprites.has(explosion.id)) {
        const sprites = explosion.cells.map((cell: { x: number; y: number }) => {
          const sprite = this.add.sprite(
            cell.x * TILE_SIZE + TILE_SIZE / 2,
            cell.y * TILE_SIZE + TILE_SIZE / 2,
            'explosion'
          );
          sprite.setDepth(8);
          sprite.setAlpha(0.9);
          return sprite;
        });
        this.explosionSprites.set(explosion.id, sprites);
      }
    }
  }

  private updatePowerUps(powerUps: PowerUpState[]): void {
    const activeIds = new Set(powerUps.map(p => p.id));

    for (const [id, sprite] of this.powerUpSprites) {
      if (!activeIds.has(id)) {
        sprite.destroy();
        this.powerUpSprites.delete(id);
      }
    }

    for (const powerUp of powerUps) {
      if (!this.powerUpSprites.has(powerUp.id)) {
        const sprite = this.add.sprite(
          powerUp.position.x * TILE_SIZE + TILE_SIZE / 2,
          powerUp.position.y * TILE_SIZE + TILE_SIZE / 2,
          `powerup_${powerUp.type}`
        );
        sprite.setDepth(3);

        // Floating animation
        this.tweens.add({
          targets: sprite,
          y: sprite.y - 4,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.powerUpSprites.set(powerUp.id, sprite);
      }
    }
  }

  shutdown(): void {
    this.playerSprites.forEach(s => s.destroy());
    this.bombSprites.forEach(s => s.destroy());
    this.explosionSprites.forEach(sprites => sprites.forEach(s => s.destroy()));
    this.powerUpSprites.forEach(s => s.destroy());
    this.playerSprites.clear();
    this.bombSprites.clear();
    this.explosionSprites.clear();
    this.powerUpSprites.clear();
  }
}
