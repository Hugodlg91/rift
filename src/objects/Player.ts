import Phaser from 'phaser';
import {
  JUMP_VELOCITY,
  MAX_AIR_JUMPS,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  RESPAWN_DELAY_MS,
  TEX,
} from '../constants';

/** Total jumps allowed: one from the ground + the configured air jumps. */
const MAX_JUMPS = 1 + MAX_AIR_JUMPS;

/**
 * The player character. Handles horizontal movement, (double) jumping and the
 * death / respawn cycle. Because textures are generated procedurally we fake
 * "animation" with flipping and tweens rather than spritesheet frames.
 *
 * Emits:
 *  - `died`     — the instant the player dies (before the respawn delay).
 *  - `respawn`  — just before the player is repositioned (lets the scene reset
 *                 the world so the spawn tile is on solid ground again).
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  private jumpsUsed = 0;

  isAlive = true;
  readonly spawnX: number;
  readonly spawnY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEX.PLAYER);
    this.spawnX = x;
    this.spawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    // Collide with the world edges, but the GameScene disables the *bottom*
    // edge so falling out the bottom is a death rather than a wall.
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(PLAYER_SPEED * 2, 1200);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Player['keys'];
  }

  override update(): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;
    if (onFloor) this.jumpsUsed = 0;

    // --- Horizontal movement -------------------------------------------
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;

    if (left && !right) {
      body.setVelocityX(-PLAYER_SPEED);
      this.setFlipX(true);
    } else if (right && !left) {
      body.setVelocityX(PLAYER_SPEED);
      this.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // --- Jump -----------------------------------------------------------
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w);

    if (jumpPressed && this.jumpsUsed < MAX_JUMPS) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpsUsed++;
      // Quick squash-and-stretch on take-off.
      this.scene.tweens.add({
        targets: this,
        scaleY: 1.18,
        scaleX: 0.86,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  /** Kill the player: freeze physics, play a death flourish, then respawn. */
  die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
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

  /** Reposition at the spawn and restore control. */
  private respawn(): void {
    // Let the scene reset the world first so the spawn tile is solid again.
    this.emit('respawn');

    this.setAngle(0);
    this.setScale(1);
    this.clearTint();
    this.setFlipX(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(this.spawnX, this.spawnY);

    this.jumpsUsed = 0;
    this.isAlive = true;

    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
  }
}
