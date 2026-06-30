import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  parallaxKey,
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
    this.createCollectibleTexture();
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

  /**
   * High-quality bevelled tile with canvas sub-surface gradient, wider bevel,
   * and world-specific surface detail (cracks v2 for PAST, circuits v2 for FUTURE).
   */
  private makeTile(
    key: string,
    ramp: Ramp,
    accent: number,
    world: WorldId,
    seed: number,
    edge: boolean,
  ): void {
    const s = TILE_SIZE;
    const rnd = new Phaser.Math.RandomDataGenerator([`tile-${world}-${seed}-${edge}`]);

    // Use canvas so we can draw a real radial sub-surface gradient.
    const tex = this.textures.createCanvas(key, s, s);
    if (!tex) return;
    const ctx = tex.context;

    // --- Sub-surface gradient (darkest at edges, lighter in center) ---
    const baseHex = ramp.base;
    const r0 = (baseHex >> 16) & 0xff, g0 = (baseHex >> 8) & 0xff, b0 = baseHex & 0xff;
    const sh = ramp.shadow;
    const rS = (sh >> 16) & 0xff, gS = (sh >> 8) & 0xff, bS = sh & 0xff;
    const hl = ramp.highlight;
    const rH = (hl >> 16) & 0xff, gH = (hl >> 8) & 0xff, bH = hl & 0xff;

    const grad = ctx.createRadialGradient(s * 0.4, s * 0.35, 2, s * 0.5, s * 0.5, s * 0.72);
    grad.addColorStop(0,   `rgba(${rH},${gH},${bH},0.35)`);
    grad.addColorStop(0.5, `rgba(${r0},${g0},${b0},1)`);
    grad.addColorStop(1,   `rgba(${rS},${gS},${bS},0.9)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // --- Bevels via Graphics on top ---
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Outer highlight: wide+soft
    g.fillStyle(ramp.highlight, 0.28);
    g.fillRect(0, 0, s, 5);
    g.fillRect(0, 0, 5, s);
    // Inner highlight: thin+bright
    g.fillStyle(ramp.highlight, 0.55);
    g.fillRect(0, 0, s, 2);
    g.fillRect(0, 0, 2, s);
    // Outer shadow: wide+soft
    g.fillStyle(ramp.shadow, 0.5);
    g.fillRect(0, s - 5, s, 5);
    g.fillRect(s - 5, 0, 5, s);
    // Inner shadow: thin+dark
    g.fillStyle(ramp.shadow, 0.8);
    g.fillRect(0, s - 2, s, 2);
    g.fillRect(s - 2, 0, 2, s);

    if (world === 'past') this.decoratePast(g, ramp.shadow, rnd);
    else this.decorateFuture(g, accent, rnd);

    if (edge) {
      // Gradient accent rim on exposed-top tiles.
      g.fillStyle(accent, 1.0);
      g.fillRect(0, 0, s, 3);
      g.fillStyle(accent, 0.5);
      g.fillRect(0, 3, s, 2);
    }

    // Fine outer stroke
    g.lineStyle(1, ramp.shadow, 0.35);
    g.strokeRect(0.5, 0.5, s - 1, s - 1);

    // Blit graphics to the canvas texture
    g.generateTexture('__tmp_tile__', s, s);
    g.destroy();

    // Composite the graphics over the gradient
    const tmpTex = this.textures.get('__tmp_tile__').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    ctx.drawImage(tmpTex, 0, 0);
    this.textures.remove('__tmp_tile__');

    tex.refresh();
  }

  /**
   * PAST — Realistic cracks: primary fracture line with branching micro-cracks,
   * variable stroke weight, and stone-pitting dots.
   */
  private decoratePast(g: Phaser.GameObjects.Graphics, shadow: number, rnd: Phaser.Math.RandomDataGenerator): void {
    const s = TILE_SIZE;
    const cracks = rnd.between(1, 2);
    for (let i = 0; i < cracks; i++) {
      // Main fracture
      g.lineStyle(1.5, shadow, 0.75);
      g.beginPath();
      let x = rnd.between(5, s - 5);
      let y = rnd.between(3, 7);
      g.moveTo(x, y);
      const segs = rnd.between(3, 5);
      const branchPoints: { x: number; y: number }[] = [];
      for (let j = 0; j < segs; j++) {
        x = Phaser.Math.Clamp(x + rnd.between(-5, 5), 2, s - 2);
        y = Phaser.Math.Clamp(y + rnd.between(4, 8), 2, s - 2);
        g.lineTo(x, y);
        if (rnd.frac() > 0.5) branchPoints.push({ x, y });
      }
      g.strokePath();
      // Micro-branches off the main crack
      g.lineStyle(1, shadow, 0.45);
      for (const bp of branchPoints) {
        g.beginPath();
        g.moveTo(bp.x, bp.y);
        const bx = Phaser.Math.Clamp(bp.x + rnd.between(-6, 6), 2, s - 2);
        const by = Phaser.Math.Clamp(bp.y + rnd.between(2, 5), 2, s - 2);
        g.lineTo(bx, by);
        g.strokePath();
      }
    }
    // Stone pitting: scattered dark specks
    g.fillStyle(shadow, 0.45);
    const pits = rnd.between(6, 12);
    for (let i = 0; i < pits; i++) {
      const px = rnd.between(3, s - 4);
      const py = rnd.between(3, s - 4);
      const pr = rnd.frac() > 0.6 ? 2 : 1;
      g.fillRect(px, py, pr, pr);
    }
    // Occasional small chipped-off area (dark triangle)
    if (rnd.frac() > 0.55) {
      const cx = rnd.between(4, s - 8);
      const cy = rnd.between(3, s - 8);
      g.fillStyle(shadow, 0.6);
      g.fillTriangle(cx, cy, cx + rnd.between(3, 6), cy, cx, cy + rnd.between(3, 5));
    }
  }

  /**
   * FUTURE — PCB-style circuits: L-shaped and T-shaped traces in accent colour,
   * with luminous via-nodes (concentric circles) and connector pads.
   */
  private decorateFuture(g: Phaser.GameObjects.Graphics, accent: number, rnd: Phaser.Math.RandomDataGenerator): void {
    const s = TILE_SIZE;
    const traces = rnd.between(1, 3);
    for (let i = 0; i < traces; i++) {
      const y1 = rnd.between(5, s - 12);
      const x1 = rnd.between(4, 10);
      const xMid = rnd.between(10, s - 10);
      const y2 = rnd.between(y1 + 4, Math.min(s - 5, y1 + 14));
      // Trace shadow (slightly thicker, dark)
      g.lineStyle(3, 0x000000, 0.3);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(xMid, y1);
      g.lineTo(xMid, y2);
      g.strokePath();
      // Trace highlight
      g.lineStyle(1, accent, 0.65);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(xMid, y1);
      g.lineTo(xMid, y2);
      g.strokePath();
      // Via node at the bend: 3 concentric rings
      g.fillStyle(accent, 0.9);
      g.fillCircle(xMid, y1, 2);
      g.fillStyle(accent, 0.3);
      g.fillCircle(xMid, y1, 4);
      g.fillStyle(accent, 0.12);
      g.fillCircle(xMid, y1, 6);
      // Terminal pad at the end
      g.fillStyle(accent, 0.6);
      g.fillRect(xMid - 2, y2 - 2, 4, 4);
      // Optional: small T-branch
      if (rnd.frac() > 0.5) {
        const xBr = Phaser.Math.Clamp(xMid + rnd.between(5, 10), xMid + 2, s - 3);
        g.lineStyle(1, accent, 0.45);
        g.beginPath();
        g.moveTo(xMid, y1);
        g.lineTo(xBr, y1);
        g.strokePath();
        g.fillStyle(accent, 0.55);
        g.fillRect(xBr - 1, y1 - 1, 2, 2);
      }
    }
    // Scan-line texture: faint horizontal lines every 4px
    g.lineStyle(1, 0x000000, 0.08);
    for (let y = 0; y < s; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.strokePath();
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

  /**
   * "RIFT Scout" — a readable humanoid silhouette for a 20×28 hitbox.
   * Drawn on a 24×34 canvas (2px visual margin each side) so shoulders
   * and helmet dome can overhang the physics body slightly.
   * The physics body is explicitly set to 20×28 in Player.ts.
   */
  private createPlayerTexture(key: string, rim?: number): void {
    const TW = 24; // canvas width  (hitbox is 20, +4 for visual breathing room)
    const TH = 34; // canvas height (hitbox is 28, +6 for helmet dome)
    const ox = 2; // left offset so the sprite is centred on the hitbox
    const oy = 4; // top offset (helmet dome sticks up)

    const tex = this.textures.createCanvas(key, TW, TH);
    if (!tex) return;
    const ctx = tex.context;

    // ---- Colour constants ----
    const bodyBase   = '#d4d4e8';
    const bodyShad   = '#888898';
    const bodyLight  = '#f0f0ff';
    const armorDark  = '#3a3a50';
    const armorMid   = '#5a5a78';
    const visorBg    = '#0d1225';
    const visorGlow  = rim !== undefined
      ? '#' + (rim & 0xffffff).toString(16).padStart(6, '0')
      : '#6699ff';
    const outlineCol = '#111118';

    ctx.save();
    // Slight anti-aliasing
    ctx.imageSmoothingEnabled = true;

    // =========================================================
    // LEGS (two narrow pillars at bottom)
    // =========================================================
    const legW = 5, legH = 9;
    const legY = oy + 19;
    const legLX = ox + 2, legRX = ox + 13;
    // Leg gradient
    const legGrad = ctx.createLinearGradient(legLX, legY, legLX + legW, legY);
    legGrad.addColorStop(0, bodyShad);
    legGrad.addColorStop(0.4, bodyBase);
    legGrad.addColorStop(1, bodyShad);
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.roundRect(legLX, legY, legW, legH, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(legRX, legY, legW, legH, 2);
    ctx.fill();
    // Boot cuffs
    ctx.fillStyle = armorDark;
    ctx.fillRect(legLX, legY + legH - 3, legW, 3);
    ctx.fillRect(legRX, legY + legH - 3, legW, 3);
    // Leg outlines
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(legLX, legY, legW, legH, 2); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(legRX, legY, legW, legH, 2); ctx.stroke();

    // =========================================================
    // TORSO (main body armour)
    // =========================================================
    const torsoX = ox + 1, torsoY = oy + 9, torsoW = 18, torsoH = 12;
    const torsoGrad = ctx.createLinearGradient(torsoX, torsoY, torsoX, torsoY + torsoH);
    torsoGrad.addColorStop(0, bodyLight);
    torsoGrad.addColorStop(0.4, bodyBase);
    torsoGrad.addColorStop(1, bodyShad);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 3);
    ctx.fill();
    // Central accent stripe (world colour)
    const stripeX = ox + 9, stripeW = 2;
    const stripeGrad = ctx.createLinearGradient(stripeX, torsoY, stripeX, torsoY + torsoH);
    stripeGrad.addColorStop(0, visorGlow + 'cc');
    stripeGrad.addColorStop(0.5, visorGlow);
    stripeGrad.addColorStop(1, visorGlow + '44');
    ctx.fillStyle = stripeGrad;
    ctx.fillRect(stripeX, torsoY + 2, stripeW, torsoH - 4);
    // Shoulder plates (slightly wider than torso)
    const shoulderGrad = ctx.createLinearGradient(ox, torsoY, ox, torsoY + 6);
    shoulderGrad.addColorStop(0, armorMid);
    shoulderGrad.addColorStop(1, armorDark);
    ctx.fillStyle = shoulderGrad;
    ctx.beginPath(); ctx.roundRect(ox - 1, torsoY, 5, 7, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(ox + torsoW - 3, torsoY, 5, 7, 2); ctx.fill();
    // Torso outline
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 3); ctx.stroke();

    // =========================================================
    // NECK collar
    // =========================================================
    ctx.fillStyle = armorDark;
    ctx.fillRect(ox + 7, oy + 7, 6, 3);

    // =========================================================
    // HELMET (spherical dome)
    // =========================================================
    const helmetCX = ox + TW * 0.5 - ox * 0.5; // centre X
    const helmetCY = oy + 4;                    // centre Y
    const helmetRX = 9, helmetRY = 7;           // radii (wider than tall)
    // Helmet shell gradient
    const helGrad = ctx.createRadialGradient(
      helmetCX - 3, helmetCY - 3, 1,
      helmetCX, helmetCY, helmetRX,
    );
    helGrad.addColorStop(0, bodyLight);
    helGrad.addColorStop(0.5, bodyBase);
    helGrad.addColorStop(1, armorMid);
    ctx.fillStyle = helGrad;
    ctx.beginPath();
    ctx.ellipse(helmetCX, helmetCY, helmetRX, helmetRY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(helmetCX, helmetCY, helmetRX, helmetRY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // =========================================================
    // VISOR (dark horizontal band with glowing inner edge)
    // =========================================================
    const visorX = ox + 2, visorY = oy + 2, visorW = TW - ox * 2 - 2, visorH = 5;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(helmetCX, helmetCY, helmetRX - 0.5, helmetRY - 0.5, 0, 0, Math.PI * 2);
    ctx.clip(); // clip visor to helmet shape
    ctx.fillStyle = visorBg;
    ctx.fillRect(visorX, visorY, visorW, visorH);
    // Inner glow line
    const visorGradLine = ctx.createLinearGradient(visorX, visorY, visorX + visorW, visorY);
    visorGradLine.addColorStop(0, visorGlow + '00');
    visorGradLine.addColorStop(0.3, visorGlow + 'cc');
    visorGradLine.addColorStop(0.7, visorGlow + 'cc');
    visorGradLine.addColorStop(1, visorGlow + '00');
    ctx.fillStyle = visorGradLine;
    ctx.fillRect(visorX, visorY + visorH - 2, visorW, 2);
    ctx.restore();

    // =========================================================
    // HELMET DETAIL — small ridge lines on top
    // =========================================================
    ctx.strokeStyle = bodyShad;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(helmetCX, helmetCY - 1, 5, 3, -0.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // =========================================================
    // ACCENT RIM (Canvas fallback for WebGL glow, or explicit rim)
    // =========================================================
    if (rim !== undefined) {
      ctx.strokeStyle = visorGlow;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      // Rim around torso
      ctx.beginPath(); ctx.roundRect(torsoX + 0.5, torsoY + 0.5, torsoW - 1, torsoH - 1, 3); ctx.stroke();
      // Rim around helmet
      ctx.beginPath();
      ctx.ellipse(helmetCX, helmetCY, helmetRX + 0.5, helmetRY + 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // =========================================================
    // HELMET SHINE — small white specular highlight
    // =========================================================
    const shineGrad = ctx.createRadialGradient(
      helmetCX - 4, helmetCY - 3, 0,
      helmetCX - 3, helmetCY - 2, 5,
    );
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.ellipse(helmetCX - 4, helmetCY - 3, 4, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    tex.refresh();
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

  /** Collectible data-shard: a small diamond with a halo (white → tinted). */
  private createCollectibleTexture(): void {
    const s = 14;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(s / 2, s / 2, s / 2); // soft halo
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(s / 2, 1);
    g.lineTo(s - 2, s / 2);
    g.lineTo(s / 2, s - 1);
    g.lineTo(2, s / 2);
    g.closePath();
    g.fillPath(); // diamond
    g.generateTexture(TEX.COLLECTIBLE, s, s);
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
