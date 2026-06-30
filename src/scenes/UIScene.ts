import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, getWorld, SCENE, toCSS, TOTAL_LEVELS } from '../constants';
import type { WorldId } from '../types';
import type GameScene from './GameScene';

/**
 * Modern HUD Overlay (Phase H):
 * - Animated World Badge (3D flip)
 * - Timer (speedrun style)
 * - Toasts (ephemeral notifications)
 * - Ability Gauges (Dash cooldown)
 */
export default class UIScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private worldText!: Phaser.GameObjects.Text;
  private worldBg!: Phaser.GameObjects.Rectangle;
  
  private levelText!: Phaser.GameObjects.Text;
  private deathsText!: Phaser.GameObjects.Text;
  private shardsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  
  private toastText!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
  
  private dashGauge!: Phaser.GameObjects.Graphics;
  private dashIcon!: Phaser.GameObjects.Text;
  
  private total = TOTAL_LEVELS;
  private gameScene!: GameScene;

  constructor() {
    super(SCENE.UI);
  }

  create(data: { total?: number; world?: WorldId }): void {
    this.total = data.total ?? TOTAL_LEVELS;
    this.gameScene = this.scene.manager.getScene(SCENE.GAME) as GameScene;

    // --- World Badge ---
    this.worldBg = this.add.rectangle(0, 0, 110, 36, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 1);
      
    this.worldText = this.add.text(55, 18, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    
    this.worldContainer = this.add.container(14, 14, [this.worldBg, this.worldText]).setScrollFactor(0);

    // --- Abilities (Dash) ---
    this.dashGauge = this.add.graphics().setScrollFactor(0);
    this.dashIcon = this.add.text(32, 70, 'DASH', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    
    // --- Right Info Panel ---
    const rightX = GAME_WIDTH - 14;
    
    this.timerText = this.add.text(rightX, 14, '00:00.00', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0);

    this.levelText = this.add.text(rightX, 42, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c8c8d0',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0);

    this.deathsText = this.add.text(rightX, 60, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a8a8b4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0);

    this.shardsText = this.add.text(rightX, 78, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0);

    // --- Toasts & Tutorials ---
    this.toastText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setAlpha(0);

    this.tutorialText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(8,8,12,0.62)',
      padding: { x: 9, y: 5 },
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setScrollFactor(0).setAlpha(0);

    // --- Initialize ---
    this.setWorld((this.registry.get('world') as WorldId) ?? data.world ?? 'past');
    this.setLevel(this.registry.get('level') ?? 1);
    this.setDeaths(this.registry.get('deaths') ?? 0);
    this.setTutorial((this.registry.get('tutorial') as string) ?? '');
    this.renderShards();

    // --- Listeners ---
    this.registry.events.on('changedata-world', this.onWorld, this);
    this.registry.events.on('changedata-deaths', this.onDeaths, this);
    this.registry.events.on('changedata-level', this.onLevel, this);
    this.registry.events.on('changedata-tutorial', this.onTutorial, this);
    this.registry.events.on('changedata-shards', this.renderShards, this);
    this.registry.events.on('changedata-shardsTotal', this.renderShards, this);
    this.game.events.on('toast', this.showToast, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-world', this.onWorld, this);
      this.registry.events.off('changedata-deaths', this.onDeaths, this);
      this.registry.events.off('changedata-level', this.onLevel, this);
      this.registry.events.off('changedata-tutorial', this.onTutorial, this);
      this.registry.events.off('changedata-shards', this.renderShards, this);
      this.registry.events.off('changedata-shardsTotal', this.renderShards, this);
      this.game.events.off('toast', this.showToast, this);
    });
  }

  override update(): void {
    // Timer
    const timeMs = (this.registry.get('runTimer') as number) ?? 0;
    const mins = Math.floor(timeMs / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const centis = Math.floor((timeMs % 1000) / 10);
    this.timerText.setText(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
    );

    // Dash Gauge
    if (this.gameScene?.player?.hasAbility('dash')) {
      this.dashIcon.setVisible(true);
      this.dashGauge.setVisible(true);
      
      const ready = this.gameScene.player.dashReady;
      this.dashIcon.setAlpha(ready ? 1 : 0.4);
      
      this.dashGauge.clear();
      // Draw radial background
      this.dashGauge.lineStyle(4, 0x444444, 0.8);
      this.dashGauge.beginPath();
      this.dashGauge.arc(32, 70, 24, 0, Math.PI * 2);
      this.dashGauge.strokePath();

      // Draw radial fill (if ready, full circle. If not, maybe just empty for now, 
      // or we could track dashMs in player, but dash is instant and recharged on ground. 
      // So it's binary: ready or not).
      if (ready) {
        this.dashGauge.lineStyle(4, 0xffffff, 1);
        this.dashGauge.beginPath();
        this.dashGauge.arc(32, 70, 24, 0, Math.PI * 2);
        this.dashGauge.strokePath();
      }
    } else {
      this.dashIcon.setVisible(false);
      this.dashGauge.setVisible(false);
    }
  }

  // --- handlers ---

  private showToast(message: string): void {
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    this.toastText.setY(GAME_HEIGHT / 4 + 20);
    
    // Kill existing tweens on toastText to prevent conflicts
    this.tweens.killTweensOf(this.toastText);

    this.tweens.add({
      targets: this.toastText,
      y: GAME_HEIGHT / 4,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Power2',
      hold: 500,
    });
  }

  private onWorld(_parent: unknown, world: WorldId): void {
    this.setWorld(world);
    this.flipBadge();
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

  // --- view ---

  private setWorld(world: WorldId): void {
    const def = getWorld(world);
    this.worldText.setText(def.label).setColor(toCSS(def.accentColor));
    this.worldBg.setFillStyle(world === 'past' ? 0x111111 : 0x0a1515, 0.9);
    this.worldBg.setStrokeStyle(2, def.accentColor, 1);
  }

  private setLevel(n: number): void {
    this.levelText.setText(`NIVEAU ${n}/${this.total}`);
  }

  private setDeaths(n: number): void {
    this.deathsText.setText(`MORTS : ${n}`);
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

  private flipBadge(): void {
    this.tweens.killTweensOf(this.worldContainer);
    this.worldContainer.setScale(1, 1);
    
    this.tweens.add({
      targets: this.worldContainer,
      scaleX: 0,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}
