import Phaser from 'phaser';
import { getSfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH, SCENE, toCSS, TOTAL_LEVELS, WORLDS } from '../constants';

/**
 * Between-levels interstitial: confirms the level just cleared and the run's
 * death count, then continues to the next level on ENTER/SPACE. Shown only
 * between levels — the final level goes straight to the victory screen.
 */
export default class InterLevelScene extends Phaser.Scene {
  constructor() {
    super(SCENE.INTER);
  }

  create(data: { next?: number }): void {
    const next = data.next ?? 1; // 0-based index of the level to play next
    const cleared = next; // the level just finished, 1-based, equals `next`
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(0x06070c);

    this.add
      .text(w / 2, h * 0.32, `NIVEAU ${cleared} FRANCHI`, {
        fontFamily: 'monospace',
        fontSize: '40px',
        fontStyle: 'bold',
        color: toCSS(WORLDS.PAST.accentColor),
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.5, `PROCHAIN : NIVEAU ${next + 1} / ${TOTAL_LEVELS}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: toCSS(WORLDS.FUTURE.accentColor),
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const deaths = (this.registry.get('deaths') as number) ?? 0;
    this.add
      .text(w / 2, h * 0.6, `MORTS : ${deaths}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#a8a8b4',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(w / 2, h * 0.8, '[ ENTRÉE / ESPACE ]  CONTINUER', {
        fontFamily: 'monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: { from: 1, to: 0.4 }, duration: 700, yoyo: true, repeat: -1 });

    const go = (): void => {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.start(SCENE.GAME, { level: next }),
      );
    };
    this.input.keyboard!.once('keydown-ENTER', go);
    this.input.keyboard!.once('keydown-SPACE', go);
    this.input.keyboard!.on('keydown-M', () => getSfx().toggleMute());

    this.cameras.main.fadeIn(250);
  }
}
