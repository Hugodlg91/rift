import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, otherWorld, parallaxKey } from '../constants';
import type { WorldId } from '../types';

/**
 * Three procedurally-generated parallax layers per world (far → near), rendered
 * as viewport-locked TileSprites so they always cover the screen no matter how
 * wide the level is. Each layer's texture scrolls at a fraction of the camera
 * (depth), and switching worlds cross-fades between the two stacks.
 */
export default class ParallaxBackground {
  private static readonly SCROLL = [0.1, 0.3, 0.6];
  private static readonly DEPTH = [-30, -20, -10];

  private readonly scene: Phaser.Scene;
  private readonly layers: Record<WorldId, Phaser.GameObjects.TileSprite[]>;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const build = (world: WorldId): Phaser.GameObjects.TileSprite[] =>
      [0, 1, 2].map((layer) =>
        scene.add
          .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, parallaxKey(world, layer))
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(ParallaxBackground.DEPTH[layer]),
      );

    this.layers = { past: build('past'), future: build('future') };
    this.setImmediate('past');
  }

  /** Scroll each layer's texture to track the camera — call once per frame. */
  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    (['past', 'future'] as const).forEach((world) => {
      this.layers[world].forEach((ts, layer) => {
        ts.tilePositionX = camera.scrollX * ParallaxBackground.SCROLL[layer];
        ts.tilePositionY = camera.scrollY * ParallaxBackground.SCROLL[layer];
      });
    });
  }

  /** Cross-fade to the given world's layers. */
  setWorld(world: WorldId): void {
    this.fade(this.layers[world], 1);
    this.fade(this.layers[otherWorld(world)], 0);
  }

  private setImmediate(world: WorldId): void {
    this.layers[world].forEach((ts) => ts.setAlpha(1));
    this.layers[otherWorld(world)].forEach((ts) => ts.setAlpha(0));
  }

  private fade(sprites: Phaser.GameObjects.TileSprite[], alpha: number): void {
    sprites.forEach((ts) =>
      this.scene.tweens.add({ targets: ts, alpha, duration: 280, ease: 'Sine.easeInOut' }),
    );
  }
}
