import Phaser from 'phaser';
import { getSfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH, SCENE, toCSS, WORLDS } from '../constants';

/** Victory / end screen, shown after the final level. Press ENTER to replay. */
export default class EndScene extends Phaser.Scene {
  constructor() {
    super(SCENE.END);
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.cameras.main.setBackgroundColor(0x05060a);

    this.add
      .text(w / 2, h * 0.3, 'RIFT TRAVERSÉ', {
        fontFamily: 'monospace',
        fontSize: '58px',
        fontStyle: 'bold',
        color: toCSS(WORLDS.FUTURE.accentColor),
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const deaths = (this.registry.get('deaths') as number) ?? 0;
    const flavour = deaths === 0 ? 'Sans une seule chute. Impeccable.' : 'Les trois timelines sont derrière toi.';

    this.add
      .text(w / 2, h * 0.5, flavour, {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#dcdce4',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.6, `MORTS : ${deaths}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: toCSS(WORLDS.PAST.accentColor),
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const again = this.add
      .text(w / 2, h * 0.8, '[ ENTRÉE ]  REJOUER', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: again,
      alpha: { from: 1, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SCENE.MENU);
      });
    });

    this.input.keyboard!.on('keydown-M', () => getSfx().toggleMute());

    this.cameras.main.fadeIn(500);
  }
}
