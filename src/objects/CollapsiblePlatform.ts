import Phaser from 'phaser';
import { COLLAPSE, TEX } from '../constants';
import type { WorldId } from '../types';

type Phase = 'solid' | 'falling' | 'gone';

/**
 * A platform that shakes and drops shortly after the player steps on it, then
 * returns after a delay. Solid only in its own world. The GameScene drives the
 * trigger via the player collider; the timers run on the scene clock.
 */
export default class CollapsiblePlatform extends Phaser.Physics.Arcade.Image {
  readonly world: WorldId;
  private phase: Phase = 'solid';
  private worldActive = false;
  private readonly baseX: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, world: WorldId, tint: number) {
    super(scene, x, y, TEX.COLLAPSE);
    this.world = world;
    this.baseX = x;
    this.baseY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setTint(tint).setDepth(6);
  }

  /** Player rested on it → begin the fall sequence (called by the collider). */
  trigger(): void {
    if (this.phase !== 'solid' || !this.worldActive) return;
    this.phase = 'falling'; // stays solid through the warning shake
    this.scene.tweens.add({ targets: this, x: this.baseX + 1.5, duration: 45, yoyo: true, repeat: 5 });
    this.scene.time.delayedCall(COLLAPSE.FALL_DELAY_MS, () => this.fall());
  }

  private fall(): void {
    this.phase = 'gone';
    this.setX(this.baseX);
    this.syncSolidity();
    this.scene.tweens.add({ targets: this, y: this.baseY + 26, alpha: 0, duration: 220, ease: 'Quad.easeIn' });
    this.scene.time.delayedCall(COLLAPSE.RESET_MS, () => this.reset());
  }

  private reset(): void {
    this.phase = 'solid';
    this.setPosition(this.baseX, this.baseY).setAlpha(1).setVisible(this.worldActive);
    this.syncSolidity();
  }

  /** Show + solidify only in the active world (never while gone). */
  setActiveWorld(on: boolean): void {
    this.worldActive = on;
    this.setVisible(on && this.phase !== 'gone');
    this.syncSolidity();
  }

  private syncSolidity(): void {
    const body = this.body as Phaser.Physics.Arcade.StaticBody | null;
    if (!body) return;
    body.enable = this.worldActive && this.phase !== 'gone';
    body.updateFromGameObject();
  }
}
