import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, getWorld, SCENE, toCSS, TOTAL_LEVELS } from '../constants';
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
  private shardsText!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
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

    this.shardsText = this.add
      .text(GAME_WIDTH - 14, 60, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffe08a',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.tutorialText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(8,8,12,0.62)',
        padding: { x: 9, y: 5 },
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setAlpha(0);

    this.setWorld((this.registry.get('world') as WorldId) ?? data.world ?? 'past');
    this.setLevel(this.registry.get('level') ?? 1);
    this.setDeaths(this.registry.get('deaths') ?? 0);
    this.setTutorial((this.registry.get('tutorial') as string) ?? '');
    this.renderShards();

    this.registry.events.on('changedata-world', this.onWorld, this);
    this.registry.events.on('changedata-deaths', this.onDeaths, this);
    this.registry.events.on('changedata-level', this.onLevel, this);
    this.registry.events.on('changedata-tutorial', this.onTutorial, this);
    this.registry.events.on('changedata-shards', this.renderShards, this);
    this.registry.events.on('changedata-shardsTotal', this.renderShards, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-world', this.onWorld, this);
      this.registry.events.off('changedata-deaths', this.onDeaths, this);
      this.registry.events.off('changedata-level', this.onLevel, this);
      this.registry.events.off('changedata-tutorial', this.onTutorial, this);
      this.registry.events.off('changedata-shards', this.renderShards, this);
      this.registry.events.off('changedata-shardsTotal', this.renderShards, this);
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

  private onTutorial(_parent: unknown, text: string): void {
    this.setTutorial(text);
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

  private setTutorial(text: string): void {
    if (text) this.tutorialText.setText(text);
    this.tweens.add({ targets: this.tutorialText, alpha: text ? 1 : 0, duration: 250 });
  }

  private renderShards(): void {
    const total = (this.registry.get('shardsTotal') as number) ?? 0;
    const got = (this.registry.get('shards') as number) ?? 0;
    this.shardsText.setText(total > 0 ? `◆ ${got}/${total}` : '');
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
