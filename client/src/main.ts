import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { UIScene } from './scenes/UIScene';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#101225',
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  dom: { createContainer: true },
  scene: [Boot, Preloader, MainMenu, Game, UIScene],
});

// Vite's HMR should dispose the canvas rather than leave duplicate games behind.
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
