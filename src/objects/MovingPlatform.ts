import Phaser from 'phaser';
import { MOVING_PLATFORM, TEX } from '../constants';
import type { WorldId } from '../types';

/**
 * A platform that slides horizontally back and forth between its start position
 * and start + RANGE. It uses a static body repositioned each frame (via `tick`,
 * driven by the GameScene), and the GameScene carries any player standing on it.
 */
export default class MovingPlatform extends Phaser.Physics.Arcade.Image {
  readonly world: WorldId;
  /** Horizontal movement applied last `tick` — used to carry a riding player. */
  deltaX = 0;

  private readonly startX: number;
  private dir = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, world: WorldId, tint: number) {
    super(scene, x, y, TEX.MOVING);
    this.world = world;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setTint(tint).setDepth(6);
  }

  /** Advance the platform; call once per frame for the active world only. */
  tick(delta: number): void {
    let nx = this.x + MOVING_PLATFORM.SPEED * (delta / 1000) * this.dir;
    if (nx > this.startX + MOVING_PLATFORM.RANGE) {
      nx = this.startX + MOVING_PLATFORM.RANGE;
      this.dir = -1;
    } else if (nx < this.startX) {
      nx = this.startX;
      this.dir = 1;
    }
    this.deltaX = nx - this.x;
    this.setX(nx);
    (this.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }
}
