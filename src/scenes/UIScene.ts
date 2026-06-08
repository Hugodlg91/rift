import Phaser from 'phaser';
import { GAME_WIDTH, getWorld, SCENE, toCSS, TOTAL_LEVELS } from '../constants';
import type { WorldId } from '../types';

/**
 * Transparent HUD overlay, launched in parallel with the GameScene. Shows the
 * current world (top-left), the level and death counter (top-right), and pulses
 * the world indicator whenever the timeline flips. All state is read from the
 * game registry so it survives level restarts.
 */
export default class UIScene extends Phaser.Scene {
  private worldText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private deathsText!: Phaser.GameObjects.Text;
  private total = TOTAL_LEVELS;

  constructor() {
    super(SCENE.UI);
  }

  create(data: { total?: number; world?: WorldId }): void {
    this.total = data.total ?? TOTAL_LEVELS;

    this.worldText = this.add
      .text(14, 12, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.levelText = this.add
      .text(GAME_WIDTH - 14, 12, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.deathsText = this.add
      .text(GAME_WIDTH - 14, 40, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8c8d0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.setWorld((this.registry.get('world') as WorldId) ?? data.world ?? 'past');
    this.setLevel(this.registry.get('level') ?? 1);
    this.setDeaths(this.registry.get('deaths') ?? 0);

    this.registry.events.on('changedata-world', this.onWorld, this);
    this.registry.events.on('changedata-deaths', this.onDeaths, this);
    this.registry.events.on('changedata-level', this.onLevel, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-world', this.onWorld, this);
      this.registry.events.off('changedata-deaths', this.onDeaths, this);
      this.registry.events.off('changedata-level', this.onLevel, this);
    });
  }

  // --- registry handlers ---------------------------------------------------

  private onWorld(_parent: unknown, world: WorldId): void {
    this.setWorld(world);
    this.pulse();
  }

  private onDeaths(_parent: unknown, value: number): void {
    this.setDeaths(value);
  }

  private onLevel(_parent: unknown, value: number): void {
    this.setLevel(value);
  }

  // --- view ----------------------------------------------------------------

  private setWorld(world: WorldId): void {
    const def = getWorld(world);
    this.worldText.setText(def.label).setColor(toCSS(def.accentColor));
  }

  private setLevel(n: number): void {
    this.levelText.setText(`NIVEAU ${n}/${this.total}`);
  }

  private setDeaths(n: number): void {
    this.deathsText.setText(`MORTS ${n}`);
  }

  private pulse(): void {
    this.tweens.add({
      targets: this.worldText,
      scale: { from: 1.4, to: 1 },
      duration: 320,
      ease: 'Back.easeOut',
    });
  }
}
