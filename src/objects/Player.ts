import Phaser from 'phaser';
import {
  FEEL,
  getPalette,
  GRAVITY_Y,
  JUMP_VELOCITY,
  MAX_AIR_JUMPS,
  PALETTE,
  PLAYER_HEIGHT,
  playerAccentKey,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  RESPAWN_DELAY_MS,
  TEX,
} from '../constants';
import type { WorldId } from '../types';

/** Move `current` toward `target` by at most `maxDelta`. */
function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
}

/**
 * The player character with a full game-feel layer (Phase A):
 *  - acceleration / friction (no instant velocity), reduced air control
 *  - coyote time, jump buffering, variable jump height
 *  - apex hang + fast fall (per-frame gravity modulation)
 *  - corner correction when a jump clips a ceiling edge
 *  - procedural squash & stretch (spring back to 1) and run/turn/landing dust
 *
 * All tuning lives in `FEEL` (constants.ts). Emits `died`, `respawn`, `landed`.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  // Jump state (ms timers + counters).
  private coyoteMs = 0;
  private bufferMs = 0;
  private airJumps = MAX_AIR_JUMPS;
  private jumpCutArmed = false;
  private jumpHeldPrev = false;

  // Per-frame motion bookkeeping.
  private wasOnGround = true;
  private airborneMs = 0; // time since leaving the ground (gates real landings vs. micro-bounces)
  private lastVelY = 0;
  private lastDir = 0;
  private runDustMs = 0;

  // Procedural squash & stretch (visual scale, springs back to 1).
  private squashX = 1;
  private squashY = 1;

  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  // Rim glow tinted with the current world's accent — a constant reminder of
  // which timeline you're in (WebGL only; a no-op under the Canvas renderer).
  private accentGlow?: Phaser.FX.Glow;

  isAlive = true;
  // Respawn point — starts at the level spawn, moves to an activated checkpoint.
  private spawnX: number;
  private spawnY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.PLAYER);
    this.spawnX = x;
    this.spawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    // Collide with world edges; the GameScene leaves the bottom open (fall = death).
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(PLAYER_SPEED * 3, 1400);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Player['keys'];

    this.dust = scene.add
      .particles(0, 0, TEX.DUST, {
        lifespan: 360,
        speed: { min: 18, max: 70 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.55, end: 0 },
        gravityY: 220,
        tint: 0xc8c0b0,
        emitting: false,
      })
      .setDepth(9);

    // World-accent rim: postFX glow on WebGL, a baked-rim texture on Canvas
    // (postFX is WebGL-only). Either way the player always shows the world.
    if (scene.game.renderer.type === Phaser.WEBGL) {
      this.accentGlow = this.postFX.addGlow(PALETTE.past.accent, 3, 0, false, 0.2, 10);
    } else {
      this.setTexture(playerAccentKey('past'));
    }
  }

  /** Reflect the current world's accent on the player (glow on WebGL, rim texture on Canvas). */
  setAccent(world: WorldId): void {
    if (this.accentGlow) this.accentGlow.color = getPalette(world).accent;
    else this.setTexture(playerAccentKey(world));
  }

  /** Move the respawn point (e.g. to an activated checkpoint). */
  setCheckpoint(x: number, y: number): void {
    this.spawnX = x;
    this.spawnY = y;
  }

  override update(delta: number): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;
    const onGround = body.blocked.down || body.touching.down;

    // --- Timers --------------------------------------------------------
    this.coyoteMs = onGround ? FEEL.COYOTE_MS : this.coyoteMs - delta;
    this.bufferMs -= delta;
    if (onGround) this.airJumps = MAX_AIR_JUMPS;

    // --- Input ---------------------------------------------------------
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const inputX = (right ? 1 : 0) - (left ? 1 : 0);

    const jumpHeld =
      this.cursors.up.isDown || this.cursors.space.isDown || this.keys.w.isDown;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w);
    if (jumpPressed) this.bufferMs = FEEL.JUMP_BUFFER_MS;

    // --- Horizontal: accelerate / brake --------------------------------
    const control = onGround ? 1 : FEEL.AIR_CONTROL;
    let vx = body.velocity.x;
    if (inputX !== 0) {
      vx = approach(vx, inputX * PLAYER_SPEED, FEEL.ACCEL * control * dt);
      this.setFlipX(inputX < 0);
    } else {
      vx = approach(vx, 0, FEEL.FRICTION_GROUND * control * dt);
    }
    body.setVelocityX(vx);

    // --- Jump (coyote/ground jump, then air jump) ----------------------
    // Two independent resources so coyote can never grant a bonus jump: the
    // ground jump is gated by `coyoteMs`, the air jump(s) by `airJumps`. A
    // coyote jump consumes the GROUND jump (coyoteMs → 0), NOT an air jump —
    // so coyote + double jump = 2 jumps max, never 3.
    if (this.bufferMs > 0) {
      if (this.coyoteMs > 0) {
        this.performJump(body);
        this.coyoteMs = 0; // consume the ground jump
        this.bufferMs = 0;
        this.emit('jump', false);
      } else if (this.airJumps > 0) {
        this.performJump(body);
        this.airJumps -= 1; // consume one air jump
        this.bufferMs = 0;
        this.emit('jump', true);
      }
    }

    // --- Variable jump height (release cuts the rise) ------------------
    if (this.jumpCutArmed && this.jumpHeldPrev && !jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * FEEL.JUMP_CUT_MULT);
      this.jumpCutArmed = false;
    }
    if (body.velocity.y >= 0) this.jumpCutArmed = false;
    this.jumpHeldPrev = jumpHeld;

    // --- Variable gravity: apex hang + fast fall ----------------------
    // body.gravity.y is ADDED to the world gravity, so neutralise the previous
    // frame's offset before re-applying this one. (setGravityY is an absolute
    // set, so nothing accumulates anyway — the explicit 0 makes that intent
    // bullet-proof.) Effective gravity = world × mult.
    body.setGravityY(0);
    if (!onGround) {
      const vy = body.velocity.y;
      if (vy > 10) {
        body.setGravityY(GRAVITY_Y * (FEEL.FAST_FALL_MULT - 1)); // fast fall → ×1.3 effective
      } else if (Math.abs(vy) < FEEL.APEX_THRESHOLD) {
        body.setGravityY(GRAVITY_Y * (FEEL.APEX_GRAVITY_MULT - 1)); // apex hang → ×0.6 effective
      }
    }

    // --- Corner correction (slip past a ceiling corner while rising) ---
    // Trigger only when we WERE rising (Arcade already zeroed velocity.y this
    // frame on the head-bonk, hence we test last frame's vy) AND actually hit a
    // ceiling. A side wall sets blocked.left/right (not .up), so simply hugging
    // a wall never triggers this. We shift only toward a side whose FULL body
    // box is empty, so the nudge can never push the player into a solid.
    if (this.lastVelY < -10 && body.blocked.up) {
      const px = FEEL.CORNER_CORRECTION_PX;
      const freeAt = (dx: number): boolean =>
        this.scene.physics.overlapRect(body.x + dx, body.y, body.width, body.height, false, true)
          .length === 0;
      if (freeAt(-px)) this.nudgeX(-px, body);
      else if (freeAt(px)) this.nudgeX(px, body);
    }

    // --- Landing -------------------------------------------------------
    // Gate on airtime: when a body settles onto a tile Arcade can eject it for a
    // single frame, flickering `onGround` and re-triggering this edge every frame.
    // Requiring real airtime makes one touchdown fire exactly one land.
    if (!this.wasOnGround && onGround && this.airborneMs >= FEEL.LAND_MIN_AIR_MS) {
      this.onLand(this.lastVelY);
    }

    // --- Run / turn dust ----------------------------------------------
    const running = onGround && inputX !== 0 && Math.abs(vx) > 30;
    if (running) {
      this.runDustMs -= delta;
      if (this.runDustMs <= 0) {
        this.runDustMs = 200;
        this.dust.emitParticleAt(this.x, body.bottom, 1);
      }
    }
    if (onGround && inputX !== 0 && this.lastDir !== 0 && inputX !== this.lastDir) {
      this.dust.emitParticleAt(this.x, body.bottom, 3); // skid puff on turn-around
    }
    if (inputX !== 0) this.lastDir = inputX;

    // --- Procedural squash & stretch + run tilt -----------------------
    // Frame-independent spring back to neutral via exact exponential decay
    // (1 - e^(-k·dt)); the recovery speed is identical at any frame rate.
    const rate = 1 - Math.exp(-dt * 16);
    this.squashX = Phaser.Math.Linear(this.squashX, 1, rate);
    this.squashY = Phaser.Math.Linear(this.squashY, 1, rate);
    this.setScale(this.squashX, this.squashY);
    const targetAngle = running ? (this.flipX ? -5 : 5) : 0;
    this.setAngle(Phaser.Math.Linear(this.angle, targetAngle, rate));

    // --- Bookkeeping for next frame -----------------------------------
    this.wasOnGround = onGround;
    this.airborneMs = onGround ? 0 : this.airborneMs + delta;
    this.lastVelY = body.velocity.y;
  }

  private performJump(body: Phaser.Physics.Arcade.Body): void {
    body.setVelocityY(JUMP_VELOCITY);
    this.jumpCutArmed = true;
    // Stretch up on take-off.
    this.squashX = 0.8;
    this.squashY = 1.28;
  }

  private onLand(fallSpeed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const intensity = Phaser.Math.Clamp(fallSpeed / 700, 0.25, 1);
    // Squash wide on impact, scaled by how fast we fell.
    this.squashX = 1 + 0.3 * intensity;
    this.squashY = 1 - 0.32 * intensity;
    this.dust.emitParticleAt(this.x, body.bottom, Math.round(Phaser.Math.Linear(2, 9, intensity)));
    this.emit('landed', fallSpeed);
  }

  private nudgeX(dx: number, body: Phaser.Physics.Arcade.Body): void {
    this.x += dx;
    body.position.x += dx;
    body.setVelocityY(this.lastVelY); // keep the upward momentum through the corner
  }

  /** Kill the player: freeze physics, play a death flourish, then respawn. */
  die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    body.setGravityY(0);
    body.enable = false;

    this.setTint(0xff4444);
    this.emit('died');

    this.scene.tweens.add({
      targets: this,
      angle: 320,
      scaleX: 0.15,
      scaleY: 0.15,
      alpha: 0.15,
      duration: 480,
      ease: 'Cubic.easeIn',
    });

    this.scene.time.delayedCall(RESPAWN_DELAY_MS, () => this.respawn());
  }

  /** Reposition at the spawn and restore control + all feel state. */
  private respawn(): void {
    // Let the scene reset the world first so the spawn tile is solid again.
    this.emit('respawn');

    this.setAngle(0);
    this.setScale(1);
    this.clearTint();
    this.setFlipX(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setGravityY(0);
    body.reset(this.spawnX, this.spawnY);

    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.airJumps = MAX_AIR_JUMPS;
    this.jumpCutArmed = false;
    this.jumpHeldPrev = false;
    this.wasOnGround = true;
    this.airborneMs = 0;
    this.lastVelY = 0;
    this.lastDir = 0;
    this.runDustMs = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.isAlive = true;

    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
  }
}
