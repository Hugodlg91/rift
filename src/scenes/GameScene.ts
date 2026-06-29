import Phaser from 'phaser';
import {
  CAMERA,
  CELL,
  ECHO,
  GAME_HEIGHT,
  getChapterGrade,
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
import CollapsiblePlatform from '../objects/CollapsiblePlatform';
import EchoPlatform from '../objects/EchoPlatform';
import MovingPlatform from '../objects/MovingPlatform';
import ParallaxBackground from '../objects/ParallaxBackground';
import Player from '../objects/Player';
import WorldManager from '../objects/WorldManager';
import type { Ability, LevelCell, WorldId } from '../types';

/** Contextual tutorial per newly-introduced ability: prompt text + the player
 *  event that dismisses it (fired on first use). */
const TUTORIALS: Partial<Record<Ability, { text: string; event: string }>> = {
  dash: { text: 'NOUVELLE CAPACITÉ — DASH : [MAJ]', event: 'dash' },
  wallJump: { text: 'NOUVELLE CAPACITÉ — SAUT MURAL : saute contre un mur', event: 'walljump' },
  echo: { text: 'NOUVELLE CAPACITÉ — ECHO : au switch, ta position laisse une plateforme', event: 'echo' },
};

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
  // Per-world hazard / one-way / moving elements (Phase E); toggled on switch.
  private hazards: Phaser.Physics.Arcade.Image[] = [];
  private oneWays: Phaser.Physics.Arcade.Image[] = [];
  private movingPlatforms: MovingPlatform[] = [];
  private collapsibles: CollapsiblePlatform[] = [];
  private buttons: Phaser.Physics.Arcade.Image[] = []; // data: world, pressed
  private doors: Phaser.Physics.Arcade.Image[] = []; // data: world, open
  private collectibles: Phaser.Physics.Arcade.Image[] = []; // data: world, collected
  private shardsCollected = 0;
  // Signature Echo (Phase F): at most one active at a time.
  private echo?: EchoPlatform;
  private echoCollider?: Phaser.Physics.Arcade.Collider;

  constructor() {
    super(SCENE.GAME);
  }

  init(data: { level?: number }): void {
    this.levelIndex = data.level ?? 0;
    this.levelComplete = false;
    this.lookaheadX = 0;
    this.checkpoints = [];
    this.hazards = [];
    this.oneWays = [];
    this.movingPlatforms = [];
    this.collapsibles = [];
    this.buttons = [];
    this.doors = [];
    this.collectibles = [];
    this.shardsCollected = 0;
    this.echo = undefined;
    this.echoCollider = undefined;
  }

  create(): void {
    const meta = LEVELS[this.levelIndex];
    const level = meta.data;
    const grade = getChapterGrade(meta.chapter);
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

    // --- Abilities (gated per level) -----------------------------------
    this.player.setAbilities(meta.abilities);
    this.worldManager.setSwitchEnabled(meta.abilities.includes('switch'));

    // --- Camera: follow with deadzone (lookahead added per-frame) -------
    this.cameras.main.startFollow(this.player, true, CAMERA.LERP_X, CAMERA.LERP_Y);
    this.cameras.main.setDeadzone(CAMERA.DEADZONE_W, CAMERA.DEADZONE_H);

    // --- Checkpoints ('P' tokens) --------------------------------------
    this.buildCheckpoints(level.past);

    // --- Hazards / one-way / moving platforms (per world, Phase E) -----
    (['past', 'future'] as const).forEach((w) => {
      const grid = w === 'past' ? level.past : level.future;
      this.buildHazards(grid, w);
      this.buildOneWays(grid, w);
      this.buildMovingPlatforms(grid, w);
      this.buildCollapsibles(grid, w);
      this.buildButtons(grid, w);
      this.buildDoors(grid, w);
      this.buildCollectibles(grid, w);
    });
    this.physics.add.overlap(this.player, this.hazards, () => this.onHazard());
    this.physics.add.collider(this.player, this.oneWays, undefined, (playerObj, platObj) => {
      const pb = (playerObj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
      const ob = (platObj as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      // One-way: only collide when descending onto the top (jump up through it).
      return pb.velocity.y >= 0 && pb.bottom <= ob.top + 8;
    });
    this.physics.add.collider(this.player, this.movingPlatforms);
    this.physics.add.collider(this.player, this.collapsibles, (_p, c) =>
      (c as CollapsiblePlatform).trigger(),
    );
    this.physics.add.collider(this.player, this.doors);
    this.physics.add.overlap(this.player, this.buttons, (_p, b) =>
      this.onButton(b as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, this.collectibles, (_p, c) =>
      this.onCollect(c as Phaser.Physics.Arcade.Image),
    );
    this.registry.set('shardsTotal', this.collectibles.length);
    this.registry.set('shards', 0);
    this.setElementsWorld(this.worldManager.world);

    // --- Atmosphere (light wash, vignette, ambient particles) ----------
    this.atmosphere = new Atmosphere(this, meta.chapter);

    // Per-chapter saturation grade (WebGL only; a no-op under Canvas). Pushes
    // chapter 2 electric and chapter 3 cold/washed-out without new assets.
    if (this.game.renderer.type === Phaser.WEBGL && grade.saturate !== 0) {
      this.cameras.main.postFX.addColorMatrix().saturate(grade.saturate, true);
    }

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
      targets: this.exitSprite,
      scale: { from: 0.8, to: 1.15 },
      alpha: { from: 0.7, to: 1 },
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // The halo scales with the chapter grade — chapter 3 leans on glow.
    this.tweens.add({
      targets: this.exitGlow,
      scale: { from: 0.8 * grade.glow, to: 1.3 * grade.glow },
      alpha: { from: 0.6, to: 1 },
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
    this.player.on('dash', () => sfx.dash());
    this.events.on('rift-switch', (world: WorldId) => {
      sfx.switchWorld(world === 'future');
      if (this.player.hasAbility('echo')) this.spawnEcho(world);
    });
    this.events.on('rift-denied', () => sfx.switchDenied());
    this.input.keyboard!.on('keydown-M', () => sfx.toggleMute());
    this.registry.events.on('changedata-world', this.onWorldData, this);

    // --- Contextual tutorial (a newly unlocked ability) ----------------
    this.registry.set('tutorial', '');
    if (meta.introduces) {
      const tut = TUTORIALS[meta.introduces];
      if (tut) {
        this.registry.set('tutorial', tut.text);
        this.player.once(tut.event, () => this.registry.set('tutorial', ''));
      }
    }

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

    // Moving platforms: advance the active world's, carry a player riding one.
    const pworld = this.worldManager.world;
    for (const mp of this.movingPlatforms) {
      if (mp.world !== pworld) continue;
      mp.tick(delta);
      const mb = mp.body as Phaser.Physics.Arcade.StaticBody;
      if (
        body.blocked.down &&
        Math.abs(body.bottom - mb.top) < 6 &&
        body.right > mb.left &&
        body.left < mb.right
      ) {
        body.position.x += mp.deltaX; // ride the platform horizontally
      }
    }

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

  // --- Hazards / one-way / moving platforms (Phase E) ----------------------

  private buildHazards(grid: LevelCell[][], world: WorldId): void {
    const key = world === 'past' ? TEX.HAZARD_PAST : TEX.HAZARD_FUTURE;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.HAZARD) continue;
        const img = this.physics.add
          .staticImage(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key)
          .setDepth(5);
        img.setData('world', world);
        this.hazards.push(img);
      }
    }
  }

  private buildOneWays(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).tileHighlight;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.ONEWAY) continue;
        const img = this.physics.add
          .staticImage(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + 6, TEX.ONEWAY)
          .setTint(tint)
          .setDepth(5);
        img.setData('world', world);
        this.oneWays.push(img);
      }
    }
  }

  private buildMovingPlatforms(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).accent;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.MOVING) continue;
        this.movingPlatforms.push(
          new MovingPlatform(this, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, world, tint),
        );
      }
    }
  }

  /** Show + enable only the elements belonging to the active world. */
  private setElementsWorld(world: WorldId): void {
    const toggle = (obj: Phaser.Physics.Arcade.Image | MovingPlatform, on: boolean): void => {
      obj.setVisible(on);
      const body = obj.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
      if (body) body.enable = on;
    };
    for (const hz of this.hazards) toggle(hz, hz.getData('world') === world);
    for (const ow of this.oneWays) toggle(ow, ow.getData('world') === world);
    for (const mp of this.movingPlatforms) toggle(mp, mp.world === world);
    for (const c of this.collapsibles) c.setActiveWorld(c.world === world);
    for (const b of this.buttons) toggle(b, b.getData('world') === world);
    for (const d of this.doors) {
      const active = d.getData('world') === world && !d.getData('open');
      toggle(d, active);
    }
    for (const it of this.collectibles) {
      toggle(it, it.getData('world') === world && !it.getData('collected'));
    }
  }

  private onHazard(): void {
    if (this.player.isAlive && !this.player.dashing) this.player.die();
  }

  /** Leave an echo platform at the player's feet, solid in the world just entered. */
  private spawnEcho(world: WorldId): void {
    this.clearEcho();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.echo = new EchoPlatform(this, this.player.x, body.bottom, world, getPalette(world).accent);
    this.echoCollider = this.physics.add.collider(this.player, this.echo);
    this.echo.setActiveWorld(this.worldManager.world === world);
    this.player.emit('echo'); // dismisses the echo tutorial on first use
    this.time.delayedCall(ECHO.LIFETIME_MS, () => this.clearEcho());
  }

  private clearEcho(): void {
    if (this.echoCollider) {
      this.echoCollider.destroy();
      this.echoCollider = undefined;
    }
    if (this.echo) {
      this.echo.dissolve();
      this.echo = undefined;
    }
  }

  // --- Collapsing platforms / buttons / doors (Phase F2) -------------------

  private buildCollapsibles(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).tileMid;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.COLLAPSE) continue;
        this.collapsibles.push(
          new CollapsiblePlatform(this, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + 8, world, tint),
        );
      }
    }
  }

  private buildButtons(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).accent;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.BUTTON) continue;
        const img = this.physics.add
          .staticImage(x * TILE_SIZE + TILE_SIZE / 2, (y + 1) * TILE_SIZE - 5, TEX.BUTTON)
          .setTint(tint)
          .setDepth(5);
        img.setData('world', world);
        img.setData('pressed', false);
        this.buttons.push(img);
      }
    }
  }

  private buildDoors(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).accent;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.DOOR) continue;
        const img = this.physics.add
          .staticImage(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE, TEX.DOOR) // spans this cell + the one below
          .setTint(tint)
          .setDepth(5);
        img.setData('world', world);
        img.setData('open', false);
        this.doors.push(img);
      }
    }
  }

  /** Latching pressure plate: opens every door in its own world. */
  private onButton(button: Phaser.Physics.Arcade.Image): void {
    if (button.getData('pressed')) return;
    button.setData('pressed', true);
    button.setScale(1, 0.55).setTint(0xffffff); // depress + light up
    const world = button.getData('world') as WorldId;
    for (const d of this.doors) if (d.getData('world') === world) this.openDoor(d);
  }

  private openDoor(door: Phaser.Physics.Arcade.Image): void {
    if (door.getData('open')) return;
    door.setData('open', true);
    const body = door.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) body.enable = false;
    this.tweens.add({
      targets: door,
      alpha: 0,
      scaleY: 0.1,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => door.setVisible(false),
    });
  }

  // --- Collectibles (Phase F3) ---------------------------------------------

  private buildCollectibles(grid: LevelCell[][], world: WorldId): void {
    const tint = getPalette(world).glow;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] !== CELL.COLLECTIBLE) continue;
        const item = this.physics.add
          .staticImage(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TEX.COLLECTIBLE)
          .setTint(tint)
          .setDepth(7);
        item.setData('world', world);
        item.setData('collected', false);
        this.tweens.add({
          targets: item,
          y: item.y - 4,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.collectibles.push(item);
      }
    }
  }

  private onCollect(item: Phaser.Physics.Arcade.Image): void {
    if (item.getData('collected')) return;
    item.setData('collected', true);
    const body = item.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) body.enable = false;
    this.shardsCollected += 1;
    this.registry.set('shards', this.shardsCollected);
    getSfx().collectible();
    this.tweens.add({
      targets: item,
      scale: 1.9,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => item.setVisible(false),
    });
  }

  private onWorldData(_parent: unknown, world: WorldId): void {
    this.exitSprite.setTexture(world === 'past' ? TEX.EXIT_PAST : TEX.EXIT_FUTURE);
    this.exitGlow.setTint(getPalette(world).glow);
    this.parallax.setWorld(world);
    this.atmosphere.setWorld(world);
    this.player.setAccent(world);
    this.ambience.setWorld(world);
    this.setElementsWorld(world);
    if (this.echo) this.echo.setActiveWorld(world === this.echo.world);
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
