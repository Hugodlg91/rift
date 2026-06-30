import Phaser from 'phaser';
import { getSfx } from '../audio/Sfx';
import { GAME_HEIGHT, GAME_WIDTH, SCENE, toCSS, WORLDS } from '../constants';
import { CHAPTERS } from '../levels';

type MenuState = 'MAIN' | 'CHAPTERS' | 'OPTIONS';

export default class MenuScene extends Phaser.Scene {
  private menuState: MenuState = 'MAIN';
  private selectedIndex = 0;

  // UI Groups
  private mainGroup!: Phaser.GameObjects.Group;
  private chaptersGroup!: Phaser.GameObjects.Group;
  private optionsGroup!: Phaser.GameObjects.Group;

  // Main Menu items
  private mainItems: Phaser.GameObjects.Text[] = [];
  // Chapters items
  private chapterItems: Phaser.GameObjects.Text[] = [];
  // Options items
  private optionItems: Phaser.GameObjects.Text[] = [];

  private sfx!: ReturnType<typeof getSfx>;

  constructor() {
    super(SCENE.MENU);
  }

  create(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.sfx = getSfx();

    // Background
    this.add.rectangle(0, 0, w / 2, h, WORLDS.PAST.bgColor).setOrigin(0, 0);
    this.add.rectangle(w / 2, 0, w / 2, h, WORLDS.FUTURE.bgColor).setOrigin(0, 0);

    // Seam
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

    // Title
    const titleY = h * 0.28;
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

    this.mainGroup = this.add.group();
    this.chaptersGroup = this.add.group();
    this.optionsGroup = this.add.group();

    this.buildMainMenu(w, h);
    this.buildChaptersMenu(w, h);
    this.buildOptionsMenu(w, h);

    // Controls text at bottom
    this.add
      .text(w / 2, h * 0.92, '↑ ↓ NAVIGUER      ENTRÉE VALIDER      ÉCHAP RETOUR', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a8a8b4',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Setup input
    this.input.keyboard!.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard!.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard!.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard!.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard!.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard!.on('keydown-SPACE', () => this.confirmSelection());
    this.input.keyboard!.on('keydown-ESC', () => this.goBack());
    
    // Unlock Audio Context
    const unlock = () => {
      this.sfx.resume();
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('keydown', unlock);

    this.switchState('MAIN');
    this.cameras.main.fadeIn(400);
  }

  private createMenuItem(x: number, y: number, text: string, group: Phaser.GameObjects.Group): Phaser.GameObjects.Text {
    const item = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#a8a8b4',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    group.add(item);
    return item;
  }

  private buildMainMenu(w: number, h: number): void {
    const startY = h * 0.55;
    const spacing = 60;
    this.mainItems = [
      this.createMenuItem(w / 2, startY, 'JOUER', this.mainGroup),
      this.createMenuItem(w / 2, startY + spacing, 'CHAPITRES', this.mainGroup),
      this.createMenuItem(w / 2, startY + spacing * 2, 'OPTIONS', this.mainGroup)
    ];
  }

  private buildChaptersMenu(w: number, h: number): void {
    const startY = h * 0.5;
    const spacing = 45;
    
    // CHAPTERS is a Record<number, {name: string}>
    Object.entries(CHAPTERS).forEach(([numStr, chap], i) => {
      this.chapterItems.push(
        this.createMenuItem(w / 2, startY + i * spacing, `CHAPITRE ${numStr} : ${chap.name}`, this.chaptersGroup)
      );
    });
    this.chaptersGroup.setVisible(false);
  }

  private buildOptionsMenu(w: number, h: number): void {
    const startY = h * 0.6;
    this.optionItems = [
      this.createMenuItem(w / 2, startY, `SON : ${this.sfx.isMuted ? 'NON' : 'OUI'}`, this.optionsGroup)
    ];
    this.optionsGroup.setVisible(false);
  }

  private switchState(newState: MenuState): void {
    this.menuState = newState;
    this.selectedIndex = 0;

    this.mainGroup.setVisible(newState === 'MAIN');
    this.chaptersGroup.setVisible(newState === 'CHAPTERS');
    this.optionsGroup.setVisible(newState === 'OPTIONS');

    this.updateSelectionDisplay();
  }

  private getActiveItems(): Phaser.GameObjects.Text[] {
    if (this.menuState === 'MAIN') return this.mainItems;
    if (this.menuState === 'CHAPTERS') return this.chapterItems;
    if (this.menuState === 'OPTIONS') return this.optionItems;
    return [];
  }

  private moveSelection(dir: number): void {
    const items = this.getActiveItems();
    if (items.length === 0) return;
    
    this.sfx.menuHover();
    
    this.selectedIndex += dir;
    if (this.selectedIndex < 0) this.selectedIndex = items.length - 1;
    if (this.selectedIndex >= items.length) this.selectedIndex = 0;
    
    this.updateSelectionDisplay();
  }

  private updateSelectionDisplay(): void {
    const items = this.getActiveItems();
    items.forEach((item, idx) => {
      // Remove any existing arrows so they don't accumulate
      const rawText = item.text.replace(/^►\s*|\s*◄$/g, '');
      
      if (idx === this.selectedIndex) {
        item.setColor('#ffffff');
        item.setScale(1.2);
        item.setText(`► ${rawText} ◄`);
      } else {
        item.setColor('#a8a8b4');
        item.setScale(1.0);
        item.setText(rawText);
      }
    });
  }

  private goBack(): void {
    if (this.menuState !== 'MAIN') {
      this.sfx.menuHover();
      this.switchState('MAIN');
    }
  }

  private confirmSelection(): void {
    this.sfx.menuSelect();

    if (this.menuState === 'MAIN') {
      if (this.selectedIndex === 0) this.startGame(0);
      else if (this.selectedIndex === 1) this.switchState('CHAPTERS');
      else if (this.selectedIndex === 2) this.switchState('OPTIONS');
    } 
    else if (this.menuState === 'CHAPTERS') {
      // Each chapter has 4 levels, so chapter 1 -> level 0, chapter 2 -> level 4, etc.
      this.startGame(this.selectedIndex * 4);
    }
    else if (this.menuState === 'OPTIONS') {
      if (this.selectedIndex === 0) {
        const muted = this.sfx.toggleMute();
        this.optionItems[0].setText(`SON : ${muted ? 'NON' : 'OUI'}`);
        this.updateSelectionDisplay();
      }
    }
  }

  private startGame(startLevel: number): void {
    // Prevent multiple enters
    this.input.keyboard!.removeAllListeners();

    this.registry.set('deaths', 0);
    this.registry.set('world', 'past');
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE.GAME, { level: startLevel });
    });
  }
}
