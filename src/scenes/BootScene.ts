import Phaser from 'phaser';
import { PLAYER_HEIGHT, PLAYER_WIDTH, SCENE, TEX, TILE_SIZE, WORLDS } from '../constants';

/**
 * Generates every texture used by the game programmatically (no external
 * assets) and then hands off to the MenuScene.
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.BOOT);
  }

  create(): void {
    this.createPastTile();
    this.createFutureTile();
    this.createPlayerTexture();
    this.createExitTexture(TEX.EXIT_PAST, WORLDS.PAST.flashColor, WORLDS.PAST.accentColor);
    this.createExitTexture(TEX.EXIT_FUTURE, WORLDS.FUTURE.flashColor, WORLDS.FUTURE.accentColor);

    this.scene.start(SCENE.MENU);
  }

  /** Warm, cracked stone block for the PAST world. */
  private createPastTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const s = TILE_SIZE;

    g.fillStyle(WORLDS.PAST.platformColor, 1);
    g.fillRect(0, 0, s, s);

    // Top highlight + bottom shadow for a touch of depth.
    g.fillStyle(0xa37d18, 0.5);
    g.fillRect(0, 0, s, 4);
    g.fillStyle(0x5c4509, 0.5);
    g.fillRect(0, s - 4, s, 4);

    // A few cracks.
    g.lineStyle(1, 0x4a3508, 0.7);
    g.beginPath();
    g.moveTo(7, 4);
    g.lineTo(12, 16);
    g.lineTo(9, 28);
    g.moveTo(22, 6);
    g.lineTo(20, 18);
    g.lineTo(26, 27);
    g.strokePath();

    // Grain speckles.
    g.fillStyle(0x4a3508, 0.5);
    for (let i = 0; i < 10; i++) {
      g.fillRect(Phaser.Math.Between(2, s - 3), Phaser.Math.Between(2, s - 3), 1, 1);
    }

    // Border.
    g.lineStyle(1, WORLDS.PAST.accentColor, 0.4);
    g.strokeRect(0.5, 0.5, s - 1, s - 1);

    g.generateTexture(TEX.TILE_PAST, s, s);
    g.destroy();
  }

  /** Cool, circuit-etched panel for the FUTURE world. */
  private createFutureTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const s = TILE_SIZE;

    g.fillStyle(WORLDS.FUTURE.platformColor, 1);
    g.fillRect(0, 0, s, s);

    // Darker inset panel.
    g.fillStyle(0x06304f, 1);
    g.fillRect(3, 3, s - 6, s - 6);

    // Circuit traces.
    g.lineStyle(1, WORLDS.FUTURE.accentColor, 0.5);
    g.beginPath();
    g.moveTo(3, 10);
    g.lineTo(14, 10);
    g.lineTo(14, 22);
    g.lineTo(s - 3, 22);
    g.moveTo(22, 3);
    g.lineTo(22, 14);
    g.strokePath();

    // Glowing nodes.
    g.fillStyle(WORLDS.FUTURE.accentColor, 0.9);
    g.fillRect(13, 21, 3, 3);
    g.fillStyle(WORLDS.FUTURE.accentColor, 0.6);
    g.fillRect(21, 13, 3, 3);

    // Neon border.
    g.lineStyle(1, WORLDS.FUTURE.accentColor, 0.6);
    g.strokeRect(0.5, 0.5, s - 1, s - 1);

    g.generateTexture(TEX.TILE_FUTURE, s, s);
    g.destroy();
  }

  /** Neutral, rounded character that reads on both backgrounds. */
  private createPlayerTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const w = PLAYER_WIDTH;
    const h = PLAYER_HEIGHT;

    g.fillStyle(0xe7e7f2, 1);
    g.fillRoundedRect(0, 0, w, h, 6);

    // Visor — neutral dark band so it works in past & future.
    g.fillStyle(0x23232e, 1);
    g.fillRoundedRect(3, 6, w - 6, 7, 2);

    // Outline.
    g.lineStyle(2, 0x16161d, 1);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 6);

    g.generateTexture(TEX.PLAYER, w, h);
    g.destroy();
  }

  /** Glowing portal used to mark the level exit. */
  private createExitTexture(key: string, coreColor: number, ringColor: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const s = TILE_SIZE;
    const cx = s / 2;
    const cy = s / 2;

    // Soft outer glow built from layered translucent circles.
    g.fillStyle(ringColor, 0.12);
    g.fillCircle(cx, cy, 15);
    g.fillStyle(ringColor, 0.18);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(coreColor, 0.35);
    g.fillCircle(cx, cy, 8);

    // Bright ring.
    g.lineStyle(2, coreColor, 0.9);
    g.strokeCircle(cx, cy, 9);

    // Hot core.
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, 3);

    g.generateTexture(key, s, s);
    g.destroy();
  }
}
