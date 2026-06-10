import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, otherWorld, parallaxKey } from '../constants';
import type { WorldId } from '../types';

/**
 * Three procedurally-generated parallax layers per world (far → near). Only one
 * world's stack is visible at a time; switching cross-fades between them. Scroll
 * factors are set now so the layers move correctly once the camera scrolls
 * (Phase D).
 */
export default class ParallaxBackground {
  private static readonly SCROLL = [0.1, 0.3, 0.6];
  private static readonly DEPTH = [-30, -20, -10];

  private readonly scene: Phaser.Scene;
  private readonly layers: Record<WorldId, Phaser.GameObjects.Image[]>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const build = (world: WorldId): Phaser.GameObjects.Image[] =>
      [0, 1, 2].map((layer) =>
        scene.add
          .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, parallaxKey(world, layer))
          .setScrollFactor(ParallaxBackground.SCROLL[layer])
          .setDepth(ParallaxBackground.DEPTH[layer]),
      );

    this.layers = { past: build('past'), future: build('future') };
    this.setImmediate('past');
  }

  /** Cross-fade to the given world's layers. */
  setWorld(world: WorldId): void {
    this.fade(this.layers[world], 1);
    this.fade(this.layers[otherWorld(world)], 0);
  }

  private setImmediate(world: WorldId): void {
    this.layers[world].forEach((img) => img.setAlpha(1));
    this.layers[otherWorld(world)].forEach((img) => img.setAlpha(0));
  }

  private fade(images: Phaser.GameObjects.Image[], alpha: number): void {
    images.forEach((img) =>
      this.scene.tweens.add({ targets: img, alpha, duration: 280, ease: 'Sine.easeInOut' }),
    );
  }
}
