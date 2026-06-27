import Phaser from 'phaser';
import { TEX } from '../constants';
import type { WorldId } from '../types';

/**
 * The signature "Echo": a frozen, semi-transparent silhouette of the player left
 * at the position they switched away from. It is a solid static platform — but
 * only in the world it was created for — and dissolves after a short lifetime.
 * The GameScene owns at most one at a time and drives its lifecycle.
 */
export default class EchoPlatform extends Phaser.Physics.Arcade.Image {
  readonly world: WorldId;

  constructor(scene: Phaser.Scene, x: number, footY: number, world: WorldId, tint: number) {
    super(scene, x, footY + EchoPlatform.HALF, TEX.PLAYER); // top edge sits at the feet
    this.world = world;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setTint(tint).setAlpha(0.5).setDepth(8);
  }

  private static get HALF(): number {
    return 14; // half the player silhouette height
  }

  /** Solid + visible only while its world is the active one. */
  setActiveWorld(on: boolean): void {
    this.setVisible(on);
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) body.enable = on;
  }

  /** Fade out then remove (called by the GameScene at end of life). */
  dissolve(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}
