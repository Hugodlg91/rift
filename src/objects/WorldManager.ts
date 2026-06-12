import Phaser from 'phaser';
import { DENIED_FLASH_COLOR, getWorld, otherWorld, SWITCH_COOLDOWN_MS } from '../constants';
import type { WorldDef, WorldId } from '../types';
import Player from './Player';

/**
 * Owns the PAST/FUTURE state and everything tied to flipping between them:
 * which platform group collides & renders, the safety (anti-crush) check, the
 * cooldown, and the flash/shake/background transition.
 *
 * Emits `world-changed` on the scene's event emitter so the UIScene can react.
 */
export default class WorldManager {
  private currentWorld: WorldId = 'past';
  private cooldown = false;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly pastGroup: Phaser.Physics.Arcade.StaticGroup;
  private readonly futureGroup: Phaser.Physics.Arcade.StaticGroup;
  private readonly pastCollider: Phaser.Physics.Arcade.Collider;
  private readonly futureCollider: Phaser.Physics.Arcade.Collider;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    pastGroup: Phaser.Physics.Arcade.StaticGroup,
    futureGroup: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.scene = scene;
    this.player = player;
    this.pastGroup = pastGroup;
    this.futureGroup = futureGroup;

    this.pastCollider = scene.physics.add.collider(player, pastGroup);
    this.futureCollider = scene.physics.add.collider(player, futureGroup);

    this.applyWorldState();
  }

  get world(): WorldId {
    return this.currentWorld;
  }

  /** Toggle PAST <-> FUTURE, unless on cooldown, dead, or it would crush the player. */
  switch(): void {
    if (this.cooldown || !this.player.isAlive) return;

    const target = otherWorld(this.currentWorld);
    const targetGroup = target === 'past' ? this.pastGroup : this.futureGroup;

    if (!this.isSwitchSafe(targetGroup)) {
      this.playDeniedEffect();
      this.startCooldown(SWITCH_COOLDOWN_MS / 2);
      this.scene.events.emit('rift-denied');
      return;
    }

    const from = getWorld(this.currentWorld);
    this.currentWorld = target;
    const to = getWorld(target);

    this.applyWorldState();
    this.playTransitionEffect(from, to);
    this.startCooldown(SWITCH_COOLDOWN_MS);
    // Distinct from the registry world-change (which also fires on respawn),
    // so SFX only play on a real player-initiated switch.
    this.scene.events.emit('rift-switch', this.currentWorld);
  }

  /** Force a world instantly (used on respawn so the spawn tile is solid). */
  reset(world: WorldId = 'past'): void {
    this.currentWorld = world;
    this.cooldown = false;
    this.applyWorldState();
    this.scene.cameras.main.setBackgroundColor(getWorld(world).bgColor);
  }

  // -------------------------------------------------------------------------

  /**
   * Sync collision + visibility to `currentWorld` and publish the new world on
   * the game registry. Consumers (GameScene, UIScene) react to
   * `changedata-world`, which only fires when the value actually changes.
   */
  private applyWorldState(): void {
    const past = this.currentWorld === 'past';
    this.pastCollider.active = past;
    this.futureCollider.active = !past;
    this.setGroupVisible(this.pastGroup, past);
    this.setGroupVisible(this.futureGroup, !past);
    this.scene.registry.set('world', this.currentWorld);
  }

  private setGroupVisible(group: Phaser.Physics.Arcade.StaticGroup, visible: boolean): void {
    for (const child of group.getChildren()) {
      (child as Phaser.GameObjects.Sprite).setVisible(visible);
    }
  }

  /**
   * AABB test: would the player overlap any solid tile of the target world?
   * The player box is inset by a couple of pixels so merely grazing an edge
   * (or standing on a shared platform) doesn't count as a crush.
   */
  private isSwitchSafe(targetGroup: Phaser.Physics.Arcade.StaticGroup): boolean {
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    const inset = 2;
    const x1 = pb.x + inset;
    const y1 = pb.y + inset;
    const x2 = pb.right - inset;
    const y2 = pb.bottom - inset;

    for (const child of targetGroup.getChildren()) {
      const tb = child.body as Phaser.Physics.Arcade.StaticBody | null;
      if (!tb) continue;
      if (x1 < tb.right && x2 > tb.x && y1 < tb.bottom && y2 > tb.y) {
        return false;
      }
    }
    return true;
  }

  private playTransitionEffect(from: WorldDef, to: WorldDef): void {
    const cam = this.scene.cameras.main;
    const flash = Phaser.Display.Color.IntegerToColor(to.flashColor);
    cam.flash(160, flash.red, flash.green, flash.blue);
    cam.shake(110, 0.006);
    this.tweenBackground(from.bgColor, to.bgColor, 280);
  }

  private playDeniedEffect(): void {
    const cam = this.scene.cameras.main;
    const c = Phaser.Display.Color.IntegerToColor(DENIED_FLASH_COLOR);
    cam.flash(90, c.red, c.green, c.blue);
    cam.shake(60, 0.004);
  }

  private tweenBackground(fromInt: number, toInt: number, duration: number): void {
    const from = Phaser.Display.Color.IntegerToColor(fromInt);
    const to = Phaser.Display.Color.IntegerToColor(toInt);
    const cam = this.scene.cameras.main;
    this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t);
        cam.setBackgroundColor(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
    });
  }

  private startCooldown(ms: number): void {
    this.cooldown = true;
    this.scene.time.delayedCall(ms, () => {
      this.cooldown = false;
    });
  }
}
