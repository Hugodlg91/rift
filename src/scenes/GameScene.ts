import Phaser from 'phaser';
import {
  CAMERA,
  CELL,
  GAME_HEIGHT,
  getPalette,
  PALETTE,
  SCENE,
  SWITCH_KEY,
  TEX,
  TILE_SIZE,
  TILE_VARIANTS,
  tileEdgeKey,
  tileKey,
  TOTAL_LEVELS,
} from '../constants';
import Ambience from '../audio/Ambience';
import { getSfx } from '../audio/Sfx';
import { LEVELS, validateLevel } from '../levels';
import Atmosphere from '../objects/Atmosphere';
import ParallaxBackground from '../objects/ParallaxBackground';
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
  private lookaheadX = 0;

  private player!: Player;
  private worldManager!: WorldManager;
  private pastGroup!: Phaser.Physics.Arcade.StaticGroup;
  private futureGroup!: Phaser.Physics.Arcade.StaticGroup;
  private exitSprite!: Phaser.GameObjects.Sprite;
  private exitGlow!: Phaser.GameObjects.Image;
  private switchKey!: Phaser.Input.Keyboard.Key;
  private parallax!: ParallaxBackground;
  private atmosphere!: Atmosphere;
  private ambience!: Ambience;
  private checkpoints: {
    x: number;
    y: number;
    pillar: Phaser.GameObjects.Image;
    activated: boolean;
  }[] = [];

  constructor() {
    super(SCENE.GAME);
  }

  init(data: { level?: number }): void {
    this.levelIndex = data.level ?? 0;
    this.levelComplete = false;
    this.lookaheadX = 0;
    this.checkpoints = [];
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
    this.cameras.main.setBackgroundColor(PALETTE.past.bgFar);

    // --- Parallax background (behind everything) ------------------------
    this.parallax = new ParallaxBackground(this);

    // --- Tile layers ----------------------------------------------------
    // Seed the RNG per level so tile variants are identical on every (re)load
    // and respawn of this level — stable look, no reshuffle.
    Phaser.Math.RND.sow([`rift-level-${this.levelIndex}`]);
    this.pastGroup = this.physics.add.staticGroup();
    this.futureGroup = this.physics.add.staticGroup();
    this.buildSolids(level.past, this.pastGroup, 'past');
    this.buildSolids(level.future, this.futureGroup, 'future');

    const spawn = this.findTileCenter(level.past, CELL.SPAWN) ?? { x: TILE_SIZE, y: TILE_SIZE };
    const exit = this.findTileCenter(level.past, CELL.EXIT) ?? { x: widthPx - TILE_SIZE, y: TILE_SIZE };

    // --- Player + world manager ----------------------------------------
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.setDepth(10);
    this.worldManager = new WorldManager(this, this.player, this.pastGroup, this.futureGroup);

    // --- Camera: follow with deadzone (lookahead added per-frame) -------
    this.cameras.main.startFollow(this.player, true, CAMERA.LERP_X, CAMERA.LERP_Y);
    this.cameras.main.setDeadzone(CAMERA.DEADZONE_W, CAMERA.DEADZONE_H);

    // --- Checkpoints ('P' tokens) --------------------------------------
    this.buildCheckpoints(level.past);

    // --- Atmosphere (light wash, vignette, ambient particles) ----------
    this.atmosphere = new Atmosphere(this);

    // --- Audio (shared SFX bus + per-world ambient drone) --------------
    const sfx = getSfx();
    sfx.resume();
    this.ambience = new Ambience(sfx.context, sfx.master);
    this.ambience.start(this.worldManager.world);

    // --- Exit portal (additive glow halo + pulsing portal) -------------
    this.exitGlow = this.add
      .image(exit.x, exit.y, TEX.GLOW)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PALETTE.past.glow);
    this.exitSprite = this.add.sprite(exit.x, exit.y, TEX.EXIT_PAST).setDepth(4);
    this.physics.add.existing(this.exitSprite, true);
    this.tweens.add({
      targets: [this.exitSprite, this.exitGlow],
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
      sfx.death();
    });
    this.player.on('respawn', () => this.worldManager.reset('past'));
    this.player.on('landed', (fallSpeed: number) => {
      // Only the heavy landings shake — keep feedback in service of clarity.
      if (fallSpeed > 520) this.cameras.main.shake(90, 0.0028);
      sfx.land();
    });
    this.player.on('jump', (air: boolean) => (air ? sfx.doubleJump() : sfx.jump()));
    this.events.on('rift-switch', (world: WorldId) => sfx.switchWorld(world === 'future'));
    this.events.on('rift-denied', () => sfx.switchDenied());
    this.input.keyboard!.on('keydown-M', () => sfx.toggleMute());
    this.registry.events.on('changedata-world', this.onWorldData, this);

    // --- HUD overlay ----------------------------------------------------
    this.registry.set('level', this.levelIndex + 1);
    if (this.scene.isActive(SCENE.UI)) this.scene.stop(SCENE.UI);
    this.scene.launch(SCENE.UI, { total: TOTAL_LEVELS, world: this.worldManager.world });

    this.cameras.main.fadeIn(300);

    // The registry emitter is global, so detach our listener on shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-world', this.onWorldData, this);
      this.events.off('rift-switch');
      this.events.off('rift-denied');
      this.ambience.stop();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.levelComplete) return;

    this.player.update(delta);

    if (Phaser.Input.Keyboard.JustDown(this.switchKey)) {
      this.worldManager.switch();
    }

    // Fell out of the world → death.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.player.isAlive && body.top > this.levelHeightPx) {
      this.player.die();
    }

    // Checkpoints: activate the first time the player walks onto one.
    if (this.player.isAlive) {
      for (const cp of this.checkpoints) {
        if (!cp.activated && Math.abs(this.player.x - cp.x) < 16 && Math.abs(this.player.y - cp.y) < 44) {
          this.activateCheckpoint(cp);
        }
      }
    }

    // Camera lookahead: ease the focal point ahead in the travel direction.
    const dir = body.velocity.x > 20 ? 1 : body.velocity.x < -20 ? -1 : 0;
    const t = 1 - Math.pow(1 - CAMERA.LOOKAHEAD_LERP, delta / (1000 / 60));
    this.lookaheadX = Phaser.Math.Linear(this.lookaheadX, -dir * CAMERA.LOOKAHEAD_X, t);
    this.cameras.main.setFollowOffset(this.lookaheadX, 0);

    this.parallax.update(this.cameras.main);
  }

  // -------------------------------------------------------------------------

  private buildSolids(
    grid: LevelCell[][],
    group: Phaser.Physics.Arcade.StaticGroup,
    world: WorldId,
  ): void {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === CELL.SOLID) {
          // A tile with nothing solid above it is a lit "edge"; others get a
          // random interior variant so runs of tiles don't visibly repeat.
          const exposedTop = y === 0 || grid[y - 1][x] !== CELL.SOLID;
          const key = exposedTop
            ? tileEdgeKey(world)
            : tileKey(world, Phaser.Math.RND.between(0, TILE_VARIANTS - 1));
          group.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key);
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

  /** A dormant monolith on the floor at every 'P' cell; lit on first touch. */
  private buildCheckpoints(grid: LevelCell[][]): void {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.CHECKPOINT) continue;
        const cx = x * TILE_SIZE + TILE_SIZE / 2;
        const pillar = this.add
          .image(cx, (y + 1) * TILE_SIZE, TEX.CHECKPOINT) // base on the floor below the cell
          .setOrigin(0.5, 1)
          .setDepth(5)
          .setTint(0x5b5b6b)
          .setAlpha(0.6);
        this.checkpoints.push({ x: cx, y: y * TILE_SIZE + TILE_SIZE / 2, pillar, activated: false });
      }
    }
  }

  private activateCheckpoint(cp: GameScene['checkpoints'][number]): void {
    cp.activated = true;
    this.player.setCheckpoint(cp.x, cp.y); // future deaths respawn here
    getSfx().checkpoint();
    this.cameras.main.flash(120, 255, 255, 255, false);

    cp.pillar.clearTint();
    this.tweens.add({ targets: cp.pillar, alpha: 1, duration: 200 });

    const glow = this.add
      .image(cp.x, cp.pillar.y - TILE_SIZE, TEX.GLOW)
      .setDepth(4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85);
    this.tweens.add({
      targets: glow,
      scale: { from: 1.2, to: 2 },
      alpha: { from: 0.9, to: 0.4 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private onWorldData(_parent: unknown, world: WorldId): void {
    this.exitSprite.setTexture(world === 'past' ? TEX.EXIT_PAST : TEX.EXIT_FUTURE);
    this.exitGlow.setTint(getPalette(world).glow);
    this.parallax.setWorld(world);
    this.atmosphere.setWorld(world);
    this.player.setAccent(world);
    this.ambience.setWorld(world);
  }

  private onReachExit(): void {
    if (this.levelComplete || !this.player.isAlive) return;
    this.levelComplete = true;
    getSfx().exit();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.cameras.main.fadeOut(400);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop(SCENE.UI);
      const next = this.levelIndex + 1;
      if (next < LEVELS.length) {
        this.scene.start(SCENE.INTER, { next });
      } else {
        this.scene.start(SCENE.END);
      }
    });
  }
}
