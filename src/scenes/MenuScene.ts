import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE, toCSS, WORLDS } from '../constants';

/**
 * Title screen. The canvas is split PAST (left, warm) / FUTURE (right, cool)
 * with an animated seam down the middle, a glitching "RIFT" wordmark, and the
 * controls. Press ENTER to start.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE.MENU);
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Split background.
    this.add.rectangle(0, 0, w / 2, h, WORLDS.PAST.bgColor).setOrigin(0, 0);
    this.add.rectangle(w / 2, 0, w / 2, h, WORLDS.FUTURE.bgColor).setOrigin(0, 0);

    // Animated central seam.
    const seam = this.add.rectangle(w / 2, h / 2, 3, h, 0xffffff, 0.85).setOrigin(0.5);
    this.tweens.add({
      targets: seam,
      scaleX: { from: 1, to: 3 },
      alpha: { from: 0.2, to: 0.9 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glitchy title: gold + cyan ghosts behind a white core.
    const titleY = h * 0.34;
    const makeTitle = (color: string, dx: number, dy: number, alpha: number) =>
      this.add
        .text(w / 2 + dx, titleY + dy, 'RIFT', {
          fontFamily: 'monospace',
          fontSize: '112px',
          fontStyle: 'bold',
          color,
        })
        .setOrigin(0.5)
        .setAlpha(alpha);

    const gold = makeTitle(toCSS(WORLDS.PAST.accentColor), -4, 3, 0.85);
    const cyan = makeTitle(toCSS(WORLDS.FUTURE.accentColor), 4, -3, 0.85);
    makeTitle('#f4f4f8', 0, 0, 1).setStroke('#000000', 6);

    this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => {
        const j = Phaser.Math.Between(-5, 5);
        gold.setX(w / 2 - 4 + j);
        cyan.setX(w / 2 + 4 - j);
        this.time.delayedCall(90, () => {
          gold.setX(w / 2 - 4);
          cyan.setX(w / 2 + 4);
        });
      },
    });

    // Subtitle.
    this.add
      .text(w / 2, h * 0.52, 'PASSÉ · FUTUR · UN SEUL RIFT', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#dcdce4',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Blinking play prompt.
    const play = this.add
      .text(w / 2, h * 0.69, '[ ENTRÉE ]  JOUER', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: play,
      alpha: { from: 1, to: 0.35 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Controls.
    this.add
      .text(w / 2, h * 0.84, '←→ / A D  BOUGER      ESPACE / W  SAUTER      F  CHANGER DE MONDE', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#a8a8b4',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => this.startGame());

    this.cameras.main.fadeIn(400);
  }

  private startGame(): void {
    this.registry.set('deaths', 0);
    this.registry.set('world', 'past');
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE.GAME, { level: 0 });
    });
  }
}
