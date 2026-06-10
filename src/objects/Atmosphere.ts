import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, getPalette, PALETTE, TEX } from '../constants';
import type { WorldId } from '../types';

/**
 * Scene-wide atmosphere: a full-screen light wash (OVERLAY) that unifies the
 * palette, a vignette that focuses the eye, and per-world ambient particles
 * (slow falling ash in the PAST, rising data-motes in the FUTURE).
 */
export default class Atmosphere {
  private readonly wash: Phaser.GameObjects.Rectangle;
  private readonly pastAmbient: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly futureAmbient: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.pastAmbient = scene.add
      .particles(0, 0, TEX.DUST, {
        x: { min: 0, max: GAME_WIDTH },
        y: -8,
        speedY: { min: 10, max: 26 },
        speedX: { min: -8, max: 8 },
        lifespan: 8000,
        scale: { min: 0.15, max: 0.4 },
        alpha: { start: 0.35, end: 0 },
        tint: PALETTE.past.glow,
        frequency: 300,
        quantity: 1,
        maxParticles: 34, // hard ceiling for low-end devices
        emitting: false,
      })
      .setDepth(2)
      .setScrollFactor(0);

    this.futureAmbient = scene.add
      .particles(0, 0, TEX.DUST, {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 8,
        speedY: { min: -28, max: -12 },
        speedX: { min: -6, max: 6 },
        lifespan: 8000,
        scale: { min: 0.12, max: 0.34 },
        alpha: { start: 0.5, end: 0 },
        tint: PALETTE.future.glow,
        blendMode: 'ADD',
        frequency: 320,
        quantity: 1,
        maxParticles: 30, // hard ceiling for low-end devices
        emitting: false,
      })
      .setDepth(2)
      .setScrollFactor(0);

    this.wash = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, PALETTE.past.glow, 0.12)
      .setScrollFactor(0)
      .setDepth(40)
      .setBlendMode(Phaser.BlendModes.OVERLAY);

    // Vignette sits above the gameplay; the HUD is a separate scene on top.
    scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TEX.VIGNETTE).setScrollFactor(0).setDepth(60);

    this.setWorld('past');
  }

  setWorld(world: WorldId): void {
    this.wash.setFillStyle(getPalette(world).glow, 0.12);
    if (world === 'past') {
      this.pastAmbient.start();
      this.futureAmbient.stop();
    } else {
      this.futureAmbient.start();
      this.pastAmbient.stop();
    }
  }
}
