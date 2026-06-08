import Phaser from 'phaser';
import {
  CELL,
  GAME_HEIGHT,
  SCENE,
  SWITCH_KEY,
  TEX,
  TILE_SIZE,
  TOTAL_LEVELS,
  WORLDS,
} from '../constants';
import { LEVELS, validateLevel } from '../levels';
import Player from '../objects/Player';
import WorldManager from '../objects/WorldManager';
import type { LevelCell, WorldId } from '../types';

/**
 * Main gameplay scene. Builds one level (two static-tile layers), wires up the
 * player, WorldManager, exit and death detection, then chains to the next
 * level — or to the end screen after the last one.
 */
export default class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private levelHeightPx = GAME_HEIGHT;
  private levelComplete = false;

  private player!: Player;
  private worldManager!: WorldManager;
  private pastGroup!: Phaser.Physics.Arcade.StaticGroup;
  private futureGroup!: Phaser.Physics.Arcade.StaticGroup;
  private exitSprite!: Phaser.GameObjects.Sprite;
  private switchKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE.GAME);
  }

  init(data: { level?: number }): void {
    this.levelIndex = data.level ?? 0;
    this.levelComplete = false;
  }

  create(): void {
    const level = LEVELS[this.levelIndex];
    if (import.meta.env.DEV) validateLevel(level, `level${this.levelIndex + 1}`);

    const widthPx = level.width * TILE_SIZE;
    const heightPx = level.height * TILE_SIZE;
    this.levelHeightPx = heightPx;

    this.physics.world.setBounds(0, 0, widthPx, heightPx);
    // Walls on left/right/top, but the bottom is open so a fall = death.
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, widthPx, heightPx);
    this.cameras.main.setBackgroundColor(WORLDS.PAST.bgColor);

    // --- Tile layers ----------------------------------------------------
    this.pastGroup = this.physics.add.staticGroup();
    this.futureGroup = this.physics.add.staticGroup();
    this.buildSolids(level.past, this.pastGroup, TEX.TILE_PAST);
    this.buildSolids(level.future, this.futureGroup, TEX.TILE_FUTURE);

    const spawn = this.findTileCenter(level.past, CELL.SPAWN) ?? { x: TILE_SIZE, y: TILE_SIZE };
    const exit = this.findTileCenter(level.past, CELL.EXIT) ?? { x: widthPx - TILE_SIZE, y: TILE_SIZE };

    // --- Player + world manager ----------------------------------------
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.setDepth(10);
    this.worldManager = new WorldManager(this, this.player, this.pastGroup, this.futureGroup);

    // --- Exit portal ----------------------------------------------------
    this.exitSprite = this.add.sprite(exit.x, exit.y, TEX.EXIT_PAST).setDepth(4);
    this.physics.add.existing(this.exitSprite, true);
    this.tweens.add({
      targets: this.exitSprite,
      scale: { from: 0.8, to: 1.15 },
      alpha: { from: 0.7, to: 1 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.physics.add.overlap(this.player, this.exitSprite, () => this.onReachExit());

    // --- Input ----------------------------------------------------------
    this.switchKey = this.input.keyboard!.addKey(SWITCH_KEY);

    // --- Wiring ---------------------------------------------------------
    this.player.on('died', () => {
      this.registry.inc('deaths', 1);
      this.cameras.main.shake(150, 0.008);
    });
    this.player.on('respawn', () => this.worldManager.reset('past'));
    this.registry.events.on('changedata-world', this.onWorldData, this);

    // --- HUD overlay ----------------------------------------------------
    this.registry.set('level', this.levelIndex + 1);
    if (this.scene.isActive(SCENE.UI)) this.scene.stop(SCENE.UI);
    this.scene.launch(SCENE.UI, { total: TOTAL_LEVELS, world: this.worldManager.world });

    this.cameras.main.fadeIn(300);

    // The registry emitter is global, so detach our listener on shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-world', this.onWorldData, this);
    });
  }

  override update(): void {
    if (this.levelComplete) return;

    this.player.update();

    if (Phaser.Input.Keyboard.JustDown(this.switchKey)) {
      this.worldManager.switch();
    }

    // Fell out of the world → death.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.player.isAlive && body.top > this.levelHeightPx) {
      this.player.die();
    }
  }

  // -------------------------------------------------------------------------

  private buildSolids(
    grid: LevelCell[][],
    group: Phaser.Physics.Arcade.StaticGroup,
    texture: string,
  ): void {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === CELL.SOLID) {
          group.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, texture);
        }
      }
    }
  }

  private findTileCenter(grid: LevelCell[][], token: LevelCell): { x: number; y: number } | null {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === token) {
          return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
        }
      }
    }
    return null;
  }

  private onWorldData(_parent: unknown, world: WorldId): void {
    this.exitSprite.setTexture(world === 'past' ? TEX.EXIT_PAST : TEX.EXIT_FUTURE);
  }

  private onReachExit(): void {
    if (this.levelComplete || !this.player.isAlive) return;
    this.levelComplete = true;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.cameras.main.fadeOut(400);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENE.UI);
      const next = this.levelIndex + 1;
      if (next < LEVELS.length) {
        this.scene.start(SCENE.GAME, { level: next });
      } else {
        this.scene.start(SCENE.END);
      }
    });
  }
}
