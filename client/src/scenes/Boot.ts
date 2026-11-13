import Phaser from 'phaser';

/** Initializes shared game services before any assets or scenes are loaded. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
