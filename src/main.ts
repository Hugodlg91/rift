import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY_Y, WORLDS } from './constants';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import UIScene from './scenes/UIScene';
import InterLevelScene from './scenes/InterLevelScene';
import EndScene from './scenes/EndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: WORLDS.PAST.bgColor,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, InterLevelScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export default new Phaser.Game(config);
