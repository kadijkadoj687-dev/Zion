import Phaser from 'phaser';

/** Placeholder asset pipeline. Add sprites, audio, and localization assets here. */
export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
