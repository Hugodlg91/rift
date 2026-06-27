import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  parallaxKey,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  playerAccentKey,
  SCENE,
  TEX,
  TILE_SIZE,
  TILE_VARIANTS,
  tileEdgeKey,
  tileKey,
} from '../constants';
import { validateAllLevels } from '../levels';
import type { WorldId } from '../types';

type Ramp = { shadow: number; base: number; highlight: number };

/**
 * Generates every texture used by the game programmatically (no external
 * assets) and then hands off to the MenuScene. Phase B adds 3-tone tiles with
 * random variants + lit edge tiles, parallax silhouettes, a vignette and a
 * radial glow.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }

  create(): void {
    if (import.meta.env.DEV) validateAllLevels();
    this.buildTiles();
    this.buildParallax();
    this.createPlayerTexture(TEX.PLAYER); // neutral (WebGL: rim comes from postFX glow)
    this.createPlayerTexture(playerAccentKey('past'), PALETTE.past.accent);
    this.createPlayerTexture(playerAccentKey('future'), PALETTE.future.accent);
    this.createExitTexture(TEX.EXIT_PAST, PALETTE.past.glow, PALETTE.past.accent);
    this.createExitTexture(TEX.EXIT_FUTURE, PALETTE.future.glow, PALETTE.future.accent);
    this.createDustTexture();
    this.createCheckpointTexture();
    this.createHazardTextures();
    this.createOneWayTexture();
    this.createMovingTexture();
    this.createCollapseTexture();
    this.createButtonTexture();
    this.createDoorTexture();
    this.makeVignette();
    this.makeGlow();

    this.scene.start(SCENE.MENU);
  }

  // -- Tiles ----------------------------------------------------------------

  private buildTiles(): void {
    (['past', 'future'] as const).forEach((world) => {
      const pal = PALETTE[world];
      const ramp: Ramp = { shadow: pal.tileShadow, base: pal.tileMid, highlight: pal.tileHighlight };
      for (let v = 0; v < TILE_VARIANTS; v++) {
        this.makeTile(tileKey(world, v), ramp, pal.accent, world, v, false);
      }
      this.makeTile(tileEdgeKey(world), ramp, pal.accent, world, 99, true);
    });
  }

  /** 3-tone bevelled tile (light top-left, shadow bottom-right) + world detail. */
  private makeTile(
    key: string,
    ramp: Ramp,
    accent: number,
    world: WorldId,
    seed: number,
    edge: boolean,
  ): void {
    const s = TILE_SIZE;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const rnd = new Phaser.Math.RandomDataGenerator([`tile-${world}-${seed}-${edge}`]);

    g.fillStyle(ramp.base, 1);
    g.fillRect(0, 0, s, s);
    // Light bevel (top-left).
    g.fillStyle(ramp.highlight, 0.45);
    g.fillRect(0, 0, s, 3);
    g.fillRect(0, 0, 3, s);
    // Shadow (bottom-right).
    g.fillStyle(ramp.shadow, 0.7);
    g.fillRect(0, s - 3, s, 3);
    g.fillRect(s - 3, 0, 3, s);

    if (world === 'past') this.decoratePast(g, ramp.shadow, rnd);
    else this.decorateFuture(g, accent, rnd);

    // Lit accent rim on top-edge tiles (rule: ground outline brighter than fill).
    if (edge) {
      g.fillStyle(accent, 0.95);
      g.fillRect(0, 0, s, 2);
    }

    g.lineStyle(1, ramp.shadow, 0.4);
    g.strokeRect(0.5, 0.5, s - 1, s - 1);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  private decoratePast(g: Phaser.GameObjects.Graphics, shadow: number, rnd: Phaser.Math.RandomDataGenerator): void {
    const s = TILE_SIZE;
    g.lineStyle(1, shadow, 0.7);
    const cracks = rnd.between(1, 2);
    for (let i = 0; i < cracks; i++) {
      g.beginPath();
      let x = rnd.between(4, s - 4);
      let y = rnd.between(2, 6);
      g.moveTo(x, y);
      const segs = rnd.between(2, 3);
      for (let j = 0; j < segs; j++) {
        x = Phaser.Math.Clamp(x + rnd.between(-6, 6), 2, s - 2);
        y = Phaser.Math.Clamp(y + rnd.between(6, 10), 2, s - 2);
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.fillStyle(shadow, 0.5);
    for (let i = 0; i < 8; i++) g.fillRect(rnd.between(2, s - 3), rnd.between(2, s - 3), 1, 1);
  }

  private decorateFuture(g: Phaser.GameObjects.Graphics, accent: number, rnd: Phaser.Math.RandomDataGenerator): void {
    const s = TILE_SIZE;
    const traces = rnd.between(1, 2);
    for (let i = 0; i < traces; i++) {
      const y = rnd.between(7, s - 7);
      const xMid = rnd.between(9, s - 9);
      g.lineStyle(1, accent, 0.4);
      g.beginPath();
      g.moveTo(2, y);
      g.lineTo(xMid, y);
      g.lineTo(xMid, rnd.between(3, s - 3));
      g.strokePath();
      g.fillStyle(accent, 0.7);
      g.fillRect(xMid - 1, y - 1, 3, 3);
    }
  }

  // -- Parallax -------------------------------------------------------------

  private buildParallax(): void {
    (['past', 'future'] as const).forEach((world) => {
      for (let layer = 0; layer < 3; layer++) this.makeParallaxLayer(parallaxKey(world, layer), world, layer);
    });
  }

  private makeParallaxLayer(key: string, world: WorldId, layer: number): void {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const pal = PALETTE[world];
    const bgs = [pal.bgFar, pal.bgMid, pal.bgNear];
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Far layer paints the full background; nearer layers are silhouettes only.
    if (layer === 0) {
      g.fillStyle(bgs[0], 1);
      g.fillRect(0, 0, W, H);
    }

    const silColor = layer === 0 ? pal.bgMid : layer === 1 ? pal.bgNear : pal.tileShadow;
    const silAlpha = layer === 0 ? 1 : 0.92;
    const baseY = H * (0.52 + layer * 0.13);
    const rnd = new Phaser.Math.RandomDataGenerator([`px-${world}-${layer}`]);

    let x = -10;
    while (x < W) {
      const w = rnd.between(28, 64);
      const h = rnd.between(28, 90) + layer * 26;
      const top = baseY - h;
      g.fillStyle(silColor, silAlpha);
      g.fillRect(x, top, w, H - top);

      if (world === 'past') {
        // Carve a broken notch out of the ruin's top.
        g.fillStyle(bgs[Math.max(0, layer - 1)], 1);
        g.fillRect(x + rnd.between(4, Math.max(5, w - 8)), top, rnd.between(3, 7), rnd.between(5, 14));
      } else {
        // Scatter lit windows on the tower.
        g.fillStyle(pal.accent, 0.22);
        for (let wy = top + 6; wy < H - 6; wy += 11) {
          for (let wx = x + 4; wx < x + w - 4; wx += 8) {
            if (rnd.frac() > 0.55) g.fillRect(wx, wy, 2, 3);
          }
        }
      }
      x += w + rnd.between(6, 22);
    }

    g.generateTexture(key, W, H);
    g.destroy();
  }

  // -- Player / exit / dust -------------------------------------------------

  private createPlayerTexture(key: string, rim?: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const w = PLAYER_WIDTH;
    const h = PLAYER_HEIGHT;

    g.fillStyle(0xe7e7f2, 1);
    g.fillRoundedRect(0, 0, w, h, 6);
    g.fillStyle(0x23232e, 1);
    g.fillRoundedRect(3, 6, w - 6, 7, 2);
    g.lineStyle(2, 0x16161d, 1);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 6);
    if (rim !== undefined) {
      // Thin accent liseré at the very edge (Canvas fallback for the glow).
      g.lineStyle(1.5, rim, 1);
      g.strokeRoundedRect(0.75, 0.75, w - 1.5, h - 1.5, 6);
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private createExitTexture(key: string, coreColor: number, ringColor: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const s = TILE_SIZE;
    const cx = s / 2;
    const cy = s / 2;

    g.fillStyle(ringColor, 0.12);
    g.fillCircle(cx, cy, 15);
    g.fillStyle(ringColor, 0.18);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(coreColor, 0.35);
    g.fillCircle(cx, cy, 8);
    g.lineStyle(2, coreColor, 0.9);
    g.strokeCircle(cx, cy, 9);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, 3);

    g.generateTexture(key, s, s);
    g.destroy();
  }

  private createDustTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture(TEX.DUST, 6, 6);
    g.destroy();
  }

  /** A 1×2-tile monolith. Drawn white so a world-accent tint colours it; the
   *  GameScene dims it when dormant and lights it on activation. */
  private createCheckpointTexture(): void {
    const w = TILE_SIZE;
    const h = TILE_SIZE * 2;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.8);
    g.fillRoundedRect(w / 2 - 5, 2, 10, h - 4, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(w / 2 - 2, 7, 4, h - 14); // bright inner core
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(w / 2 - 9, h - 8, 18, 6, 2); // base
    g.generateTexture(TEX.CHECKPOINT, w, h);
    g.destroy();
  }

  /** Hazards: PAST stone spikes, FUTURE laser bar. Death on contact. */
  private createHazardTextures(): void {
    const s = TILE_SIZE;
    // PAST — a row of spikes pointing up.
    const past = this.make.graphics({ x: 0, y: 0 }, false);
    const n = 4;
    const sw = s / n;
    past.fillStyle(PALETTE.past.tileShadow, 1);
    for (let i = 0; i < n; i++) past.fillTriangle(i * sw, s, i * sw + sw / 2, s * 0.28, i * sw + sw, s);
    past.fillStyle(PALETTE.past.hazard, 1);
    for (let i = 0; i < n; i++) past.fillTriangle(i * sw + sw * 0.3, s, i * sw + sw / 2, s * 0.34, i * sw + sw * 0.7, s);
    past.generateTexture(TEX.HAZARD_PAST, s, s);
    past.destroy();
    // FUTURE — a glowing laser beam with emitter nodes.
    const fut = this.make.graphics({ x: 0, y: 0 }, false);
    fut.fillStyle(PALETTE.future.hazard, 0.22);
    fut.fillRect(0, s * 0.36, s, s * 0.28);
    fut.fillStyle(PALETTE.future.hazard, 1);
    fut.fillRect(0, s * 0.47, s, 4);
    fut.fillStyle(0xffffff, 0.9);
    fut.fillRect(0, s * 0.49, s, 1.5);
    fut.fillStyle(PALETTE.future.glow, 1);
    fut.fillCircle(2, s * 0.5, 3);
    fut.fillCircle(s - 2, s * 0.5, 3);
    fut.generateTexture(TEX.HAZARD_FUTURE, s, s);
    fut.destroy();
  }

  /** One-way platform: a thin slab (white → tinted per world at runtime). */
  private createOneWayTexture(): void {
    const s = TILE_SIZE;
    const h = 10;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(0, 2, s, h - 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, s, 2.5); // bright top lip you land on
    g.generateTexture(TEX.ONEWAY, s, h);
    g.destroy();
  }

  /** Moving platform: a rounded slab (white → tinted per world at runtime). */
  private createMovingTexture(): void {
    const w = TILE_SIZE;
    const h = 16;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.88);
    g.fillRoundedRect(0, 0, w, h, 3);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(2, h - 4, w - 4, 2);
    g.generateTexture(TEX.MOVING, w, h);
    g.destroy();
  }

  /** Collapsing platform: a cracked slab (white → tinted per world). */
  private createCollapseTexture(): void {
    const w = TILE_SIZE;
    const h = 16;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0x000000, 0.45);
    g.beginPath();
    g.moveTo(9, 0);
    g.lineTo(13, h);
    g.moveTo(21, 0);
    g.lineTo(17, h);
    g.strokePath();
    g.generateTexture(TEX.COLLAPSE, w, h);
    g.destroy();
  }

  /** Button: a low pressure plate (white → tinted per world). */
  private createButtonTexture(): void {
    const w = TILE_SIZE;
    const h = 10;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(0, h - 3, w, 3); // base
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(w * 0.2, 0, w * 0.6, h - 2, 2); // raised pad
    g.generateTexture(TEX.BUTTON, w, h);
    g.destroy();
  }

  /** Door: a 1×2-tile barrier with slats (white → tinted per world). */
  private createDoorTexture(): void {
    const w = TILE_SIZE;
    const h = TILE_SIZE * 2;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(2, 0, w - 4, h);
    g.fillStyle(0x000000, 0.3);
    for (let y = 6; y < h; y += 10) g.fillRect(4, y, w - 8, 2); // slats
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(1, 0, w - 2, h);
    g.generateTexture(TEX.DOOR, w, h);
    g.destroy();
  }

  // -- Canvas textures (smooth radial gradients) ----------------------------

  private makeVignette(): void {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const tex = this.textures.createCanvas(TEX.VIGNETTE, W, H);
    if (!tex) return;
    const ctx = tex.context;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.78);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
  }

  private makeGlow(): void {
    const size = 64;
    const tex = this.textures.createCanvas(TEX.GLOW, size, size);
    if (!tex) return;
    const ctx = tex.context;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
